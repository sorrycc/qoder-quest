import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';
import { authed, loginCookie, logoutCookie, passwordOk } from './auth.ts';
import { runChecks } from './checks.ts';
import { pidsMentioning } from './proc.ts';
import { SANDBOX_ROOT, wipeSandboxes } from './sandbox.ts';
import { createSession, destroyAll, destroySession, getSession, sessionCount, startPty, stopPty } from './sessions.ts';
import { isEnabled, loadAllTasks, loadConfig, loadFeatures, loadTasks, saveConfig, videoPinned } from './tasks.ts';
import type { ClientMsg, Lang, ServerMsg, Settings } from './types.ts';

const PORT = Number(process.env.PORT ?? 4318);
const ORPHAN_GRACE_MS = 30_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.md': 'text/plain; charset=utf-8',
};

const app = new Hono();

// The site is on the public internet and every session is a shell on this machine, so everything
// past the login page needs the admin password. The page itself (static files) stays open.
app.get('/api/auth', (c) => c.json({ authed: authed(c.req.header('cookie')) }));

// Wrong guesses queue up behind each other, one a second across all clients, so a short password
// can't be brute-forced by guessing in parallel. A correct password never waits.
let failures: Promise<unknown> = Promise.resolve();

app.post('/api/login', async (c) => {
  const { password } = await c.req.json<{ password?: string }>().catch(() => ({ password: undefined }));
  if (!passwordOk(password)) {
    await (failures = failures.then(() => new Promise((resolve) => setTimeout(resolve, 1000))));
    return c.json({ error: 'wrong_password' }, 401);
  }
  const secure = c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
  return c.body(null, 204, { 'set-cookie': loginCookie(secure) });
});

app.post('/api/logout', (c) => c.body(null, 204, { 'set-cookie': logoutCookie }));

// For whoever minds the booth: how many visitors are mid-level, and how many qodercli trees exist for them.
// Only two counts, and it is what a monitor curls, so it stays open too.
app.get('/api/health', (c) => c.json({ sessions: sessionCount(), processes: pidsMentioning(SANDBOX_ROOT + path.sep).length }));

for (const guarded of ['/api/*', '/preview/*']) {
  app.use(guarded, async (c, next) => {
    if (!authed(c.req.header('cookie'))) return c.json({ error: 'unauthorized' }, 401);
    await next();
  });
}

// Re-read on every request so a task can be edited on the booth without a restart.
app.get('/api/tasks', (c) => c.json(loadTasks()));

function settings(): Settings {
  const { levels } = loadConfig();
  return {
    video: loadFeatures().video,
    videoPinned: videoPinned() !== undefined,
    levels: loadAllTasks().map((task) => ({
      id: task.id,
      emoji: task.emoji,
      title: task.title,
      level: task.level,
      track: task.track,
      archived: task.archived,
      enabled: isEnabled(task, levels),
      needsVideo: Boolean(task.requires?.includes('video')) && !task.fallback,
    })),
  };
}

app.get('/api/settings', (c) => c.json(settings()));

app.put('/api/settings', async (c) => {
  const patch = await c.req.json<{ video?: boolean; levels?: Record<string, boolean> }>();
  const config = loadConfig();
  if (typeof patch.video === 'boolean') config.video = patch.video;
  const known = new Set(loadAllTasks().map((task) => task.id));
  for (const [id, on] of Object.entries(patch.levels ?? {})) {
    if (known.has(id) && typeof on === 'boolean') config.levels = { ...config.levels, [id]: on };
  }
  saveConfig(config);
  return c.json(settings());
});

app.post('/api/sessions', async (c) => {
  const { taskId, lang } = await c.req.json<{ taskId: string; lang: Lang }>();
  const task = loadTasks().find((t) => t.id === taskId);
  if (!task) return c.json({ error: 'unknown_task' }, 404);
  const session = createSession(task, lang === 'en' ? 'en' : 'zh');
  return c.json({ id: session.id });
});

app.delete('/api/sessions/:id/end', (c) => {
  const session = getSession(c.req.param('id'));
  if (session) destroySession(session);
  return c.body(null, 204);
});

// The page polls every few seconds and a slow check (a hanging test run) can take longer than that.
// Polls that arrive meanwhile share the run in flight instead of starting another pile of processes.
const checking = new Map<string, ReturnType<typeof runChecks>>();

app.post('/api/sessions/:id/check', async (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'unknown_session' }, 404);
  let run = checking.get(session.id);
  if (!run) {
    run = runChecks(session.dir, session.task.checks ?? []).finally(() => checking.delete(session.id));
    checking.set(session.id, run);
  }
  const results = await run;
  return c.json({ results, done: results.every((r) => r.ok) });
});

// What the visitor built, served straight out of their sandbox.
app.get('/preview/:id/*', (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.text('session not found', 404);
  let rel = decodeURIComponent(c.req.path.split('/').slice(3).join('/')) || 'index.html';
  // ImageGen picks its own file names (vibe_images/<name>_<timestamp>.png), so a preview can be a glob: newest match wins.
  if (rel.includes('*')) {
    const mtime = (f: string) => fs.statSync(path.join(session.dir, f)).mtimeMs;
    rel = fs.globSync(rel, { cwd: session.dir }).sort((a, b) => mtime(b) - mtime(a))[0] ?? rel;
  }
  const file = path.resolve(session.dir, rel);
  if (!file.startsWith(session.dir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return c.text('not found', 404);
  }
  const headers = {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
  };
  // Safari won't play a <video> unless byte ranges are honoured.
  const range = /^bytes=(\d*)-(\d*)$/.exec(c.req.header('range') ?? '');
  if (range && (range[1] || range[2])) {
    const size = fs.statSync(file).size;
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end) return c.body(null, 416, { 'content-range': `bytes */${size}` });
    const chunk = Buffer.alloc(end - start + 1);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, chunk, 0, chunk.length, start);
    fs.closeSync(fd);
    return c.body(chunk, 206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}` });
  }
  return c.body(fs.readFileSync(file), 200, headers);
});

app.use('/*', serveStatic({ root: './dist' }));

wipeSandboxes();

const server = serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`qoder-quest → http://localhost:${PORT}`);
});

// One WebSocket per qodercli run. Closing it stops qodercli but keeps the sandbox, so
// reconnecting to the same session restarts the terminal and continues the conversation.
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '', 'http://localhost');
  const session = url.pathname === '/ws' ? getSession(url.searchParams.get('session') ?? '') : undefined;
  if (!session || !authed(req.headers.cookie)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const send = (msg: ServerMsg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
    const cols = Number(url.searchParams.get('cols')) || 100;
    const rows = Number(url.searchParams.get('rows')) || 30;

    // A restart can arrive before the previous socket's close does.
    stopPty(session);
    const term = startPty(session, cols, rows, () => send({ t: 'prompted' }));
    term.onData((d) => send({ t: 'data', d }));
    term.onExit(({ exitCode }) => {
      if (session.pty === term) session.pty = undefined;
      send({ t: 'exit', code: exitCode });
    });
    session.onDestroy = () => ws.close();

    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw)) as ClientMsg;
      session.lastActive = Date.now();
      if (session.pty !== term) return;
      if (msg.t === 'input') term.write(msg.d);
      else if (msg.t === 'resize' && msg.cols >= 2 && msg.rows >= 2) term.resize(msg.cols, msg.rows);
    });
    ws.on('close', () => {
      if (session.pty === term) stopPty(session);
      // A closed tab never sends its goodbye. No restart within the grace period means nobody is there.
      setTimeout(() => !session.pty && destroySession(session), ORPHAN_GRACE_MS).unref();
    });
  });
});

// SIGHUP too: closing the terminal window the server runs in is how a booth day usually ends.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    destroyAll();
    process.exit(0);
  });
}
process.on('uncaughtException', (err) => {
  console.error(err);
  destroyAll();
  process.exit(1);
});
