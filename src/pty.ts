import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as pty from 'node-pty';

const QODERCLI_BIN = process.env.QODERCLI_BIN ?? 'qodercli';

// Auto mode decides most things on its own. These never need a second thought.
const ALLOWED_TOOLS = [
  'Bash(node --test:*)',
  'Bash(node test.js)',
  'Bash(npm test)',
  'Bash(ls:*)',
  'ImageGen',
  'VideoGen',
  'VideoGenRetrieve',
];

// node-pty's prebuilt spawn-helper ships without the exec bit under pnpm, and
// posix_spawnp then fails with a useless "posix_spawnp failed."
function fixSpawnHelper(): void {
  if (process.platform === 'win32') return;
  try {
    const root = path.dirname(createRequire(import.meta.url).resolve('node-pty/package.json'));
    const helper = path.join(root, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper');
    if (fs.existsSync(helper)) fs.chmodSync(helper, 0o755);
  } catch {
    // A compiled build has no prebuilds dir.
  }
}
fixSpawnHelper();

function buildEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  if (!/utf-?8/i.test(env.LANG ?? '')) env.LANG = 'en_US.UTF-8';
  if (!/utf-?8/i.test(env.LC_CTYPE ?? '')) env.LC_CTYPE = 'en_US.UTF-8';
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  return env;
}

export interface SpawnOptions {
  cwd: string;
  /** Pick the sandbox's previous conversation back up. */
  resume: boolean;
  cols: number;
  rows: number;
}

/** qodercli runs as the PTY's own process, no shell in between: when it exits the session is over. */
export function spawnQoder({ cwd, resume, cols, rows }: SpawnOptions): pty.IPty {
  const args = [
    // A clean config root keeps the booth machine's personal skills, MCP servers and hooks out of the demo.
    ...(process.env.QODER_CONFIG_DIR ? ['--config-dir', process.env.QODER_CONFIG_DIR] : []),
    ...(process.env.QODER_MODEL ? ['-m', process.env.QODER_MODEL] : []),
    '-w', cwd,
    '--permission-mode', 'auto',
    '--allowed-tools', ALLOWED_TOOLS.join(','),
    ...(resume ? ['-c'] : []),
  ];
  return pty.spawn(QODERCLI_BIN, args, { name: 'xterm-256color', cols, rows, cwd, env: buildEnv() });
}
