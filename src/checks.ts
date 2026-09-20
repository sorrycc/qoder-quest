import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { killAll, processTree } from './proc.ts';
import { readTranscript } from './transcript.ts';
import type { Check, CheckResult } from './types.ts';

function read(cwd: string, rel: string): string | null {
  const file = path.resolve(cwd, rel);
  if (!file.startsWith(cwd + path.sep)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function runCommand(cwd: string, cmd: string, args: string[], timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: 'ignore' });
    // `node --test` runs each file in a child of its own. A visitor's infinite loop must not outlive the check.
    const timer = setTimeout(() => killAll(processTree(child.pid!), 'SIGKILL'), timeoutMs);
    child.on('error', () => resolve(false));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function runOne(cwd: string, check: Check): Promise<boolean> {
  switch (check.type) {
    case 'fileExists':
      return fs.globSync(check.glob, { cwd }).length > 0;
    case 'fileContains': {
      const text = read(cwd, check.path);
      return text !== null && new RegExp(check.pattern, check.flags).test(text);
    }
    case 'fileNotContains': {
      const text = read(cwd, check.path);
      return text !== null && !new RegExp(check.pattern, check.flags).test(text);
    }
    case 'transcriptContains':
      return new RegExp(check.pattern, check.flags).test(readTranscript(cwd));
    case 'command':
      return runCommand(cwd, check.cmd, check.args, check.timeoutMs ?? 15_000);
  }
}

export async function runChecks(cwd: string, checks: Check[]): Promise<CheckResult[]> {
  return Promise.all(
    checks.map(async (c) => ({ label: c.label, ok: await runOne(cwd, c).catch(() => false) })),
  );
}
