// Which levels this visitor cleared, and how fast. Lives in the browser, reset per visitor.

import type { TaskDef } from '../../src/types.ts';

const STORAGE_KEY = 'qoder-quest:progress';

export type Progress = Record<string, { ms: number }>;

/** Booth time is short: one cleared level is enough to clear its whole tier. */
export function clearedTiers(tasks: TaskDef[], progress: Progress): Set<TaskDef['level']> {
  return new Set(tasks.filter((task) => progress[task.id]).map((task) => task.level));
}

export function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // private window
  }
}

export function formatMs(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
