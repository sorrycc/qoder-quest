import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { killAll, pidsMentioning, processTree } from './proc.ts';
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
  fs.rmSync(dir, { recursive: true, force: true });
  removeTranscript(dir);
}

/** Leftovers from a previous run (crash, ctrl-c). */
export function wipeSandboxes(): void {
  // A server that was kill -9'd never got to stop its qodercli processes. They are found by the sandbox path
  // in their arguments, never by name: the booth machine may be running other qodercli sessions.
  killAll(pidsMentioning(SANDBOX_ROOT + path.sep).flatMap(processTree), 'SIGKILL');
  fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true });
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}
