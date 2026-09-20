import type { CheckResult, Lang, Settings, TaskDef } from '../../src/types.ts';

export async function fetchTasks(): Promise<TaskDef[]> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error(`tasks ${res.status}`);
  return res.json();
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error(`settings ${res.status}`);
  return res.json();
}

export async function saveSettings(patch: { video?: boolean; levels?: Record<string, boolean> }): Promise<Settings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`settings ${res.status}`);
  return res.json();
}

export async function createSession(taskId: string, lang: Lang): Promise<string> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ taskId, lang }),
  });
  if (!res.ok) throw new Error(`session ${res.status}`);
  return (await res.json()).id;
}

export async function checkSession(id: string): Promise<{ results: CheckResult[]; done: boolean }> {
  const res = await fetch(`/api/sessions/${id}/check`, { method: 'POST' });
  if (!res.ok) throw new Error(`check ${res.status}`);
  return res.json();
}

export function endSession(id: string): void {
  // keepalive lets the request outlive the page when the tab is closing.
  void fetch(`/api/sessions/${id}/end`, { method: 'DELETE', keepalive: true }).catch(() => undefined);
}
