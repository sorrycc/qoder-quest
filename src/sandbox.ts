import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { killTree, pidsMentioning } from './proc.ts';
import { TASKS_DIR } from './tasks.ts';
import { removeTranscript } from './transcript.ts';

// Outside the repo so qodercli doesn't pick up this project's git root or config.
export const SANDBOX_ROOT = path.join(os.homedir(), '.qoder-quest', 'sandboxes');

export function createSandbox(taskId: string, sessionId: string): string {
  const dir = path.join(SANDBOX_ROOT, `${taskId}-${sessionId}`);
  fs.mkdirSync(dir, { recursive: true });
  const template = path.join(TASKS_DIR, taskId, 'template');
  if (fs.existsSync(template)) fs.cpSync(template, dir, { recursive: true });
  return dir;
}

export function removeSandbox(dir: string): void {
  if (!dir.startsWith(SANDBOX_ROOT + path.sep)) return;
  // qodercli needs a few seconds to exit, and Windows won't delete a directory that is still some process's
  // working directory (EBUSY) or a file that is still open (EPERM). Keep trying in the background.
  void fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 30, retryDelay: 500 }).catch(() => undefined);
  removeTranscript(dir);
}

/** Leftovers from a previous run (crash, ctrl-c). */
export function wipeSandboxes(): void {
  // A server that was kill -9'd never got to stop its qodercli processes. They are found by the sandbox path
  // in their arguments, never by name: the booth machine may be running other qodercli sessions.
  pidsMentioning(SANDBOX_ROOT + path.sep).forEach(killTree);
  fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}
