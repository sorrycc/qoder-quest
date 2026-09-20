import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// qodercli keeps one JSONL per conversation under <config root>/projects/<cwd with every non-alphanumeric as ->/.
export function transcriptDir(cwd: string): string {
  const root = process.env.QODER_CONFIG_DIR ?? path.join(os.homedir(), '.qoder');
  return path.join(root, 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
}

/** Everything said in this sandbox so far. Empty until the visitor sends a first message. */
export function readTranscript(cwd: string): string {
  try {
    const dir = transcriptDir(cwd);
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => fs.readFileSync(path.join(dir, name), 'utf8'))
      .join('\n');
  } catch {
    return '';
  }
}

export function removeTranscript(cwd: string): void {
  fs.rmSync(transcriptDir(cwd), { recursive: true, force: true });
}
