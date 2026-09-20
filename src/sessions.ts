import { randomUUID } from 'node:crypto';
import type { IPty } from 'node-pty';
import { killAll, killTree, processTree } from './proc.ts';
import { spawnQoder } from './pty.ts';
import { createSandbox, removeSandbox } from './sandbox.ts';
import { readTranscript } from './transcript.ts';
import type { Lang, TaskDef } from './types.ts';

const IDLE_MS = 20 * 60_000;
const READY_FALLBACK_MS = 10_000;
// qodercli takes a few seconds to shut down after a hangup. Past this, whatever is left gets no more patience.
const KILL_GRACE_MS = 8_000;

export interface Session {
  id: string;
  task: TaskDef;
  lang: Lang;
  dir: string;
  pty?: IPty;
  lastActive: number;
  onDestroy?: () => void;
}

const sessions = new Map<string, Session>();

export function createSession(task: TaskDef, lang: Lang): Session {
  const id = randomUUID().slice(0, 8);
  const session: Session = { id, task, lang, dir: createSandbox(task.id, id), lastActive: Date.now() };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

// The TUI positions its text with cursor moves, so the input box's placeholder arrives without its spaces.
function inputBoxDrawn(output: string): boolean {
  return output.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\s/g, '').includes('Typeyourmessage');
}

/** Types text at the qodercli prompt once there is one. Sending it is left to the visitor. */
function typeWhenReady(term: IPty, text: string, onTyped: () => void): void {
  let output = '';
  const type = () => {
    watch.dispose();
    clearTimeout(fallback);
    try {
      term.write(text);
      onTyped();
    } catch {
      // already gone
    }
  };
  const watch = term.onData((d) => {
    output += d;
    if (inputBoxDrawn(output)) type();
  });
  // A qodercli update may reword the placeholder.
  const fallback = setTimeout(type, READY_FALLBACK_MS);
  term.onExit(() => clearTimeout(fallback));
}

export function startPty(session: Session, cols: number, rows: number, onPrompted: () => void): IPty {
  // Nothing said yet means a fresh start. Otherwise a restart continues instead of replaying the opening prompt.
  const resume = readTranscript(session.dir) !== '';
  const term = spawnQoder({ cwd: session.dir, resume, cols, rows });
  session.pty = term;
  if (!resume) typeWhenReady(term, session.task.openingPrompt[session.lang], onPrompted);
  return term;
}

/**
 * A hangup lets qodercli close its MCP servers and save the conversation. It is not trusted to take
 * everything with it: a command it started can sit in its own process group and outlive it, and on a
 * booth that runs all day those add up. So the whole tree is recorded first and swept after a grace period.
 *
 * Windows has no hangup to be polite with: closing the ConPTY is already a hard kill, and one that leaves
 * grandchildren behind. There the tree goes first, while it can still be walked from its root.
 */
export function stopPty(session: Session, now = false): void {
  const term = session.pty;
  session.pty = undefined;
  if (!term) return;
  if (now || process.platform === 'win32') killTree(term.pid);
  const pids = now || process.platform === 'win32' ? [] : processTree(term.pid);
  try {
    term.kill();
  } catch {
    // already gone
  }
  // Not unref'd: the sweep has to happen even if the server is on its way out.
  if (pids.length) setTimeout(() => killAll(pids), KILL_GRACE_MS);
}

export function destroySession(session: Session, now = false): void {
  if (!sessions.delete(session.id)) return;
  stopPty(session, now);
  removeSandbox(session.dir);
  session.onDestroy?.();
}

/** The server is going down and can't wait around: no grace period. */
export function destroyAll(): void {
  for (const s of [...sessions.values()]) destroySession(s, true);
}

export function sessionCount(): number {
  return sessions.size;
}

// A visitor who walks away mid-task shouldn't leave qodercli running all day.
setInterval(() => {
  const now = Date.now();
  for (const s of [...sessions.values()]) {
    if (now - s.lastActive > IDLE_MS) destroySession(s);
  }
}, 60_000).unref();
