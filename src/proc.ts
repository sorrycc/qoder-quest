import { execFileSync } from 'node:child_process';

const WINDOWS = process.platform === 'win32';

interface Proc {
  pid: number;
  ppid: number;
  command: string;
}

function posixTable(): Proc[] {
  return execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    .split('\n')
    .flatMap((line) => {
      const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
      return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }] : [];
    });
}

// No ps on Windows, and wmic is gone from current builds. PowerShell takes about a second to start,
// so this path is kept to startup, the health check and check timeouts, never the per-visitor teardown.
function windowsTable(): Proc[] {
  const script = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress';
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  const rows = JSON.parse(out) as { ProcessId: number; ParentProcessId: number; CommandLine: string | null }[];
  return rows.map((r) => ({ pid: r.ProcessId, ppid: r.ParentProcessId, command: r.CommandLine ?? '' }));
}

function table(): Proc[] {
  try {
    return WINDOWS ? windowsTable() : posixTable();
  } catch {
    return [];
  }
}

/** The process and everything under it. Taken before the kill: orphans are re-parented and can't be traced afterwards. */
export function processTree(root: number): number[] {
  const all = table();
  const pids = [root];
  for (let i = 0; i < pids.length; i++) pids.push(...all.filter((p) => p.ppid === pids[i] && !pids.includes(p.pid)).map((p) => p.pid));
  return pids;
}

/** SIGKILL is the one signal that means the same everywhere: on Windows Node turns it into TerminateProcess. */
export function killAll(pids: number[]): void {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

/** Ends a process and everything under it, right now. */
export function killTree(root: number): void {
  if (!WINDOWS) return killAll(processTree(root));
  try {
    // Walks the tree itself, in a fraction of the time PowerShell needs just to start.
    execFileSync('taskkill', ['/PID', String(root), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } catch {
    // already gone
  }
}

/** Anything still running out of a directory, e.g. what a crashed server left behind. Its own arguments name the sandbox. */
export function pidsMentioning(dir: string): number[] {
  // Windows paths compare case-insensitively, and a drive letter can come back in either case.
  const norm = (s: string) => (WINDOWS ? s.toLowerCase() : s);
  return table()
    .filter((p) => norm(p.command).includes(norm(dir)) && p.pid !== process.pid)
    .map((p) => p.pid);
}
