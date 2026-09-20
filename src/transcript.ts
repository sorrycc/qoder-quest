import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '-');

function projectsRoot(): string {
  return path.join(process.env.QODER_CONFIG_DIR ?? path.join(os.homedir(), '.qoder'), 'projects');
}

// qodercli keeps one JSONL per conversation under <config root>/projects/<cwd with every non-alphanumeric as ->/.
export function transcriptDir(cwd: string): string {
  return path.join(projectsRoot(), sanitize(cwd));
}

/**
 * The exact name depends on how qodercli sees the cwd: a drive letter in either case on Windows, a resolved
 * symlink on macOS. The sandbox's own folder name ends in a random id, so matching on that tail is enough.
 */
function transcriptDirs(cwd: string): string[] {
  const tail = sanitize(path.basename(cwd)).toLowerCase();
  try {
    return fs
      .readdirSync(projectsRoot())
      .filter((name) => name.toLowerCase().endsWith(tail))
      .map((name) => path.join(projectsRoot(), name));
  } catch {
    return [];
  }
}

/** Everything said in this sandbox so far. Empty until the visitor sends a first message. */
export function readTranscript(cwd: string): string {
  try {
    return transcriptDirs(cwd)
      .flatMap((dir) => fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => path.join(dir, name)))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
  } catch {
    return '';
  }
}

export function removeTranscript(cwd: string): void {
  for (const dir of transcriptDirs(cwd)) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
