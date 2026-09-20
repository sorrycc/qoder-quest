import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as pty from 'node-pty';

const QODERCLI_BIN = process.env.QODERCLI_BIN ?? 'qodercli';
const WINDOWS = process.platform === 'win32';

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

/**
 * Windows only. ConPTY starts processes with CreateProcess, which neither searches PATHEXT nor runs scripts,
 * and an npm-installed qodercli is a qodercli.cmd shim. Find what the name really points at.
 */
export function resolveOnWindows(bin: string, env: Record<string, string | undefined> = process.env): string {
  const exts = path.extname(bin) ? [''] : ['.exe', '.cmd', '.bat'];
  const dirs = /[\\/]/.test(bin) ? [''] : (env.Path ?? env.PATH ?? '').split(';').filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const file = path.win32.join(dir, bin + ext);
      if (fs.existsSync(file)) return file;
    }
  }
  return bin;
}

const quote = (arg: string) => (/[\s&()^|<>"]/.test(arg) ? `"${arg}"` : arg);

/** A .cmd shim has to go through cmd.exe. /s plus one pair of outer quotes is the only form whose inner quoting cmd leaves alone. */
export function windowsCommand(file: string, args: string[], env: Record<string, string | undefined> = process.env): { file: string; args: string[] | string } {
  if (!/\.(cmd|bat)$/i.test(file)) return { file, args };
  return { file: env.ComSpec ?? 'cmd.exe', args: `/d /s /c "${[file, ...args].map(quote).join(' ')}"` };
}

export interface SpawnOptions {
  cwd: string;
  /** Pick the sandbox's previous conversation back up. */
  resume: boolean;
  cols: number;
  rows: number;
}

/** qodercli runs as the PTY's own process, no shell in between: when it exits the session is over. (A Windows .cmd shim needs cmd.exe, which exits with it.) */
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
  const cmd = WINDOWS ? windowsCommand(resolveOnWindows(QODERCLI_BIN), args) : { file: QODERCLI_BIN, args };
  return pty.spawn(cmd.file, cmd.args, { name: 'xterm-256color', cols, rows, cwd, env: buildEnv() });
}
