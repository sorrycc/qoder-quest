import fs from 'node:fs';
import path from 'node:path';

/** Sandbox-relative matches with forward slashes, newest first. Whatever npm installed is never the visitor's work. */
export function globNewest(cwd: string, pattern: string): string[] {
  const mtime = (f: string) => fs.statSync(path.join(cwd, f)).mtimeMs;
  return fs
    .globSync(pattern, { cwd })
    .filter((f) => !f.split(path.sep).includes('node_modules'))
    .sort((a, b) => mtime(b) - mtime(a))
    .map((f) => f.split(path.sep).join('/'));
}
