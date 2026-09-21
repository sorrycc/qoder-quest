import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runChecks } from '../src/checks.ts';
import { pidsMentioning } from '../src/proc.ts';
import { drawIdea, fillPrompt } from '../src/sessions.ts';
import { listRecords, recordSite, removeRecord, saveRecord } from '../src/showcase.ts';
import { windowsCommand } from '../src/pty.ts';
import { loadAllTasks, loadConfig, loadFeatures, loadTasks, saveConfig, TASKS_DIR } from '../src/tasks.ts';
import { transcriptDir } from '../src/transcript.ts';
import type { L, TaskDef } from '../src/types.ts';

// Archived levels can be switched back on from the settings page, so they are held to the same rules.
const everyLevel = Object.fromEntries(loadAllTasks().map((t) => [t.id, true]));
const withVideo = loadTasks(TASKS_DIR, { video: true }, everyLevel);
const withoutVideo = loadTasks(TASKS_DIR, { video: false }, everyLevel);
// Every level as a visitor can meet it: a fallback is a level of its own as far as these tests care.
const tasks = [
  ...withVideo,
  ...withoutVideo.filter((t) => JSON.stringify(t) !== JSON.stringify(withVideo.find((v) => v.id === t.id))).map((t) => ({ ...t, id: `${t.id} (no video)` })),
];
const templateOf = (id: string) => path.join(TASKS_DIR, id.replace(' (no video)', ''), 'template');

const bilingual = (text: L | undefined) => Boolean(text?.zh.trim() && text?.en.trim());

describe('task definitions', () => {
  it.each([withVideo, withoutVideo])('cover every level on both tracks, with some funny ones', (...list) => {
    expect(new Set(list.map((t) => t.level))).toEqual(new Set([1, 2, 3]));
    expect(new Set(list.map((t) => t.track ?? 'main'))).toEqual(new Set(['main', 'hardcore']));
    expect(list.some((t) => t.funny)).toBe(true);
  });

  it('with video off, nothing a visitor can open still waits for a video', () => {
    expect(JSON.stringify(withoutVideo)).not.toMatch(/mp4|VideoGen/);
    expect(JSON.stringify(withVideo)).toMatch(/VideoGen/);
  });

  it('never sends the switches themselves to the browser', () => {
    expect(tasks.every((t) => !('requires' in t) && !('fallback' in t) && !('archived' in t))).toBe(true);
  });

  it('keeps archived levels off the map until they are switched on, and lets any level be switched off', () => {
    const ids = (levels: Record<string, boolean>) => loadTasks(TASKS_DIR, { video: false }, levels).map((t) => t.id);
    expect(ids({})).not.toContain('a1-hello');
    expect(ids({ 'a1-hello': true })).toContain('a1-hello');
    expect(ids({})).toContain('01-lunch');
    expect(ids({ '01-lunch': false })).not.toContain('01-lunch');
  });

  it.each(tasks)('$id has zh and en for every visible string', (task) => {
    const texts = [
      task.title,
      task.tagline,
      task.story,
      task.goal,
      task.openingPrompt,
      ...task.steps.flatMap((s) => (s.prompt ? [s.hint, s.prompt] : [s.hint])),
      ...(task.checks ?? []).map((c) => c.label),
    ];
    expect(texts.every(bilingual)).toBe(true);
  });

  // A prompt is typed into a single-line input: a newline would submit it halfway.
  it.each(tasks)('$id prompts are single-line', (task) => {
    const prompts = [task.openingPrompt, ...task.steps.flatMap((s) => (s.prompt ? [s.prompt] : []))];
    expect(prompts.every((p) => !/[\r\n]/.test(p.zh + p.en))).toBe(true);
  });

  // One idea all day makes every visitor's page look the same.
  it.each(tasks.filter((t) => t.ideas))('$id has plenty of ideas, each filling the whole opening prompt', (task) => {
    expect(task.ideas!.length).toBeGreaterThanOrEqual(300);
    expect(new Set(task.ideas!.map((i) => i.idea.zh)).size).toBe(task.ideas!.length);
    for (const idea of task.ideas!) {
      expect(Object.values(idea).every(bilingual)).toBe(true);
      for (const lang of ['zh', 'en'] as const) {
        const prompt = fillPrompt(task.openingPrompt[lang], idea, lang);
        expect(prompt).not.toMatch(/[{}\r\n]/);
        expect(prompt).toContain(idea.idea[lang]);
      }
    }
  });

  it('deals every idea once before any comes round again', () => {
    const task = { id: 'deck-test', ideas: [1, 2, 3, 4, 5].map((n) => ({ idea: { zh: `${n}`, en: `${n}` } })) };
    const round = () => task.ideas!.map(() => drawIdea(task)!.idea.zh).sort();
    expect(round()).toEqual(['1', '2', '3', '4', '5']);
    expect(round()).toEqual(['1', '2', '3', '4', '5']);
  });

  it.each(tasks.filter((t) => !t.ideas))('$id has no placeholder left to fill', (task) => {
    expect(task.openingPrompt.zh + task.openingPrompt.en).not.toMatch(/\{\w+\}/);
  });

  it.each(tasks.filter((t) => t.checks?.length))('$id is not already cleared by its own template', async (task) => {
    const results = await runChecks(templateOf(task.id), task.checks!);
    expect(results.every((r) => r.ok)).toBe(false);
  });
});

describe('loadFeatures', () => {
  const file = path.join(os.tmpdir(), `quest-config-${process.pid}.json`);
  afterEach(() => {
    delete process.env.QUEST_VIDEO;
    fs.rmSync(file, { force: true });
  });

  it('is off without a config file, and follows it when there is one', () => {
    expect(loadFeatures(file).video).toBe(false);
    fs.writeFileSync(file, '{ "video": true }');
    expect(loadFeatures(file).video).toBe(true);
  });

  it('round-trips what the settings page saves', () => {
    saveConfig({ video: true, levels: { 'a1-hello': true } }, file);
    expect(loadConfig(file)).toEqual({ video: true, levels: { 'a1-hello': true } });
  });

  it('lets QUEST_VIDEO override the file', () => {
    fs.writeFileSync(file, '{ "video": true }');
    process.env.QUEST_VIDEO = 'off';
    expect(loadFeatures(file).video).toBe(false);
    process.env.QUEST_VIDEO = 'on';
    expect(loadFeatures(file).video).toBe(true);
  });
});

describe('runChecks', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-quest-'));
    fs.writeFileSync(path.join(dir, 'a.txt'), 'hello qoder');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const label = { zh: 'x', en: 'x' };
  const ok = async (check: Parameters<typeof runChecks>[1][number]) => (await runChecks(dir, [check]))[0].ok;

  it('fileExists matches globs', async () => {
    expect(await ok({ type: 'fileExists', glob: '*.txt', label })).toBe(true);
    expect(await ok({ type: 'fileExists', glob: '*.md', label })).toBe(false);
  });

  it('fileContains and fileNotContains', async () => {
    expect(await ok({ type: 'fileContains', path: 'a.txt', pattern: 'QODER', flags: 'i', label })).toBe(true);
    expect(await ok({ type: 'fileNotContains', path: 'a.txt', pattern: 'claude', label })).toBe(true);
    // A missing file proves nothing, so it fails both ways.
    expect(await ok({ type: 'fileNotContains', path: 'nope.txt', pattern: 'x', label })).toBe(false);
  });

  it('a glob path finds the page wherever Qoder put it, but not in node_modules', async () => {
    const check = { type: 'fileContains', path: '**/index.html', pattern: 'logo\\.png', label } as const;
    expect(await ok(check)).toBe(false);
    fs.mkdirSync(path.join(dir, 'node_modules/pkg'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules/pkg/index.html'), '<img src="logo.png">');
    expect(await ok(check)).toBe(false);
    fs.mkdirSync(path.join(dir, 'web'));
    fs.writeFileSync(path.join(dir, 'web/index.html'), '<img src="logo.png">');
    expect(await ok(check)).toBe(true);
    fs.writeFileSync(path.join(dir, 'index.html'), '<h1>old</h1>');
    expect(await ok(check)).toBe(true);
    expect(await ok({ type: 'fileNotContains', path: '**/index.html', pattern: 'logo', label })).toBe(false);
    expect(await ok({ type: 'fileNotContains', path: '**/index.html', pattern: 'claude', label })).toBe(true);
  });

  it('refuses paths outside the sandbox', async () => {
    expect(await ok({ type: 'fileContains', path: '../../etc/hosts', pattern: '.', label })).toBe(false);
  });

  it('transcriptContains reads what qodercli recorded for this sandbox', async () => {
    const config = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-config-'));
    process.env.QODER_CONFIG_DIR = config;
    try {
      const check = { type: 'transcriptContains', pattern: '<command-name>/roast</command-name>', label } as const;
      // Nothing said yet.
      expect(await ok(check)).toBe(false);
      fs.mkdirSync(transcriptDir(dir), { recursive: true });
      fs.writeFileSync(path.join(transcriptDir(dir), 's.jsonl'), '{"content":"<command-name>/roast</command-name>"}');
      expect(await ok(check)).toBe(true);
    } finally {
      delete process.env.QODER_CONFIG_DIR;
      fs.rmSync(config, { recursive: true, force: true });
    }
  });

  it('a command that hangs fails, and takes its children with it', async () => {
    const marker = `quest-hang-${process.pid}`;
    const script = `require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)', '${marker}']); setTimeout(() => {}, 60000)`;
    expect(await ok({ type: 'command', cmd: 'node', args: ['-e', script], timeoutMs: 1500, label })).toBe(false);
    expect(pidsMentioning(marker)).toEqual([]);
  });

  it('command passes on exit 0', async () => {
    expect(await ok({ type: 'command', cmd: 'node', args: ['-e', 'process.exit(0)'], label })).toBe(true);
    expect(await ok({ type: 'command', cmd: 'node', args: ['-e', 'process.exit(1)'], label })).toBe(false);
  });
});

describe('showcase', () => {
  let root: string;
  let dir: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-showcase-'));
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-sandbox-'));
  });
  afterEach(() => [root, dir].forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  const session = () => ({ task: { id: 'x', showcase: '**/index.html' } as TaskDef, lang: 'zh' as const, dir, idea: '猫的健身房', startedAt: Date.now() - 5000 });

  it('keeps nothing until there is a page', () => {
    expect(saveRecord(session(), false, root)).toBeUndefined();
    expect(listRecords(root)).toEqual([]);
  });

  it('keeps the page from wherever it was built, and stays cleared once cleared', () => {
    fs.mkdirSync(path.join(dir, 'web/node_modules/pkg'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'web/node_modules/pkg/big.js'), '');
    fs.writeFileSync(path.join(dir, 'web/index.html'), 'v1');
    fs.writeFileSync(path.join(dir, 'web/logo_1.png'), '');
    const s = session();
    const first = saveRecord(s, true, root)!;
    expect(first).toMatchObject({ entry: 'web/index.html', logo: 'web/logo_1.png', cleared: true, idea: '猫的健身房' });
    const site = recordSite(first.id, root)!;
    expect(fs.readFileSync(path.join(site, 'web/index.html'), 'utf8')).toBe('v1');
    expect(fs.existsSync(path.join(site, 'web/node_modules'))).toBe(false);

    // The visitor keeps polishing, then leaves: same record, newer page, still cleared with the same time.
    fs.writeFileSync(path.join(dir, 'web/index.html'), 'v2');
    const second = saveRecord(s, false, root)!;
    expect(second).toMatchObject({ id: first.id, cleared: true, ms: first.ms, createdAt: first.createdAt });
    expect(fs.readFileSync(path.join(site, 'web/index.html'), 'utf8')).toBe('v2');
    expect(listRecords(root)).toHaveLength(1);

    removeRecord(first.id, root);
    expect(listRecords(root)).toEqual([]);
    expect(recordSite(first.id, root)).toBeUndefined();
    expect(recordSite('../etc', root)).toBeUndefined();
  });
});

describe('windowsCommand', () => {
  const args = ['-w', 'C:\\Users\\booth pc\\.qoder-quest\\sandboxes\\01-lunch-ab12cd34', '--allowed-tools', 'Bash(node --test:*),ImageGen'];

  it('starts a real executable directly', () => {
    expect(windowsCommand('C:\\tools\\qodercli.exe', args)).toEqual({ file: 'C:\\tools\\qodercli.exe', args });
  });

  it('runs an npm .cmd shim through cmd.exe, quoting what cmd would otherwise split or interpret', () => {
    const cmd = windowsCommand('C:\\Program Files\\nodejs\\qodercli.cmd', args, { ComSpec: 'C:\\Windows\\System32\\cmd.exe' });
    expect(cmd.file).toBe('C:\\Windows\\System32\\cmd.exe');
    expect(cmd.args).toBe(
      '/d /s /c ""C:\\Program Files\\nodejs\\qodercli.cmd" -w "C:\\Users\\booth pc\\.qoder-quest\\sandboxes\\01-lunch-ab12cd34" --allowed-tools "Bash(node --test:*),ImageGen""',
    );
  });
});
