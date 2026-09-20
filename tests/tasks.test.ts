import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runChecks } from '../src/checks.ts';
import { pidsMentioning } from '../src/proc.ts';
import { loadAllTasks, loadConfig, loadFeatures, loadTasks, saveConfig, TASKS_DIR } from '../src/tasks.ts';
import { transcriptDir } from '../src/transcript.ts';
import type { L } from '../src/types.ts';

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
