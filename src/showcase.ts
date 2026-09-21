import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { globNewest } from './glob.ts';
import type { Lang, ShowcaseRecord, TaskDef } from './types.ts';

// Next to the sandboxes, but never wiped: this is what visitors take home and what the booth reviews afterwards.
export const SHOWCASE_ROOT = path.join(os.homedir(), '.qoder-quest', 'showcase');

export type StoredRecord = Omit<ShowcaseRecord, 'url'>;

/** What saveRecord needs from a session. */
export interface Showable {
  task: TaskDef;
  lang: Lang;
  dir: string;
  idea?: string;
  startedAt: number;
  recordId?: string;
}

const SKIP = new Set(['node_modules', '.git']);
const siteDir = (root: string, id: string) => path.join(root, id, 'site');
const metaFile = (root: string, id: string) => path.join(root, id, 'meta.json');

export function readMeta(root: string, id: string): StoredRecord | undefined {
  try {
    return JSON.parse(fs.readFileSync(metaFile(root, id), 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Copies the sandbox as it stands. Called when the level is cleared and again when the session ends, so the
 * page a visitor kept polishing is the one they get, and a page that never passed is still there to review.
 */
export function saveRecord(session: Showable, cleared: boolean, root = SHOWCASE_ROOT): StoredRecord | undefined {
  const entry = session.task.showcase ? globNewest(session.dir, session.task.showcase)[0] : undefined;
  if (!entry) return undefined;
  const id = (session.recordId ??= randomUUID().slice(0, 8));
  const before = readMeta(root, id);
  const record: StoredRecord = {
    id,
    taskId: session.task.id,
    lang: session.lang,
    idea: session.idea,
    entry,
    logo: globNewest(session.dir, '**/logo*.{png,jpg,jpeg,webp,svg}')[0],
    // Once cleared, the time on the clock at that moment is the one that counts.
    cleared: before?.cleared || cleared,
    ms: before?.cleared ? before.ms : Date.now() - session.startedAt,
    createdAt: before?.createdAt ?? Date.now(),
  };
  // Copied aside first: a file caught mid-write must not cost the visitor the copy they already have.
  const fresh = `${siteDir(root, id)}.new`;
  try {
    fs.rmSync(fresh, { recursive: true, force: true });
    fs.cpSync(session.dir, fresh, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
    fs.rmSync(siteDir(root, id), { recursive: true, force: true });
    fs.renameSync(fresh, siteDir(root, id));
    fs.writeFileSync(metaFile(root, id), `${JSON.stringify(record, null, 2)}\n`);
  } catch {
    fs.rmSync(fresh, { recursive: true, force: true });
    return before;
  }
  return record;
}

export function listRecords(root = SHOWCASE_ROOT): StoredRecord[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .flatMap((id) => readMeta(root, id) ?? [])
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function removeRecord(id: string, root = SHOWCASE_ROOT): void {
  if (/^[\w-]+$/.test(id)) fs.rmSync(path.join(root, id), { recursive: true, force: true });
}

/** The folder a record's files are served from, if there is such a record. */
export function recordSite(id: string, root = SHOWCASE_ROOT): string | undefined {
  return /^[\w-]+$/.test(id) && readMeta(root, id) ? siteDir(root, id) : undefined;
}
