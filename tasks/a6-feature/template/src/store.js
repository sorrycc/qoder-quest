import fs from 'node:fs';

export function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function save(file, todos) {
  fs.writeFileSync(file, JSON.stringify(todos, null, 2));
}

export function add(todos, title) {
  const id = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  return [...todos, { id, title, done: false }];
}

export function complete(todos, id) {
  return todos.map((t) => (t.id === id ? { ...t, done: true } : t));
}
