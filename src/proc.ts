import { execFileSync } from 'node:child_process';

function table(): { pid: number; ppid: number; command: string }[] {
  try {
    return execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
      .split('\n')
      .flatMap((line) => {
        const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
        return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }] : [];
      });
  } catch {
    return [];
  }
}

/** The process and everything under it. Taken before the kill: orphans are re-parented and can't be traced afterwards. */
export function processTree(root: number): number[] {
  const all = table();
  const pids = [root];
  for (let i = 0; i < pids.length; i++) pids.push(...all.filter((p) => p.ppid === pids[i]).map((p) => p.pid));
  return pids;
}

export function killAll(pids: number[], signal: NodeJS.Signals): void {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch {
      // already gone
    }
  }
}

/** Anything still running out of a directory, e.g. what a crashed server left behind. Its own arguments name the sandbox. */
export function pidsMentioning(dir: string): number[] {
  return table()
    .filter((p) => p.command.includes(dir) && p.pid !== process.pid)
    .map((p) => p.pid);
}
