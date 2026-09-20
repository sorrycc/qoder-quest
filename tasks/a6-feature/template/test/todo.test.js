import assert from 'node:assert';
import { test } from 'node:test';
import { formatTodo } from '../src/format.js';
import { add, complete } from '../src/store.js';

test('add 递增 id', () => {
  const todos = add(add([], 'a'), 'b');
  assert.deepStrictEqual(todos.map((t) => t.id), [1, 2]);
});

test('complete 标记完成', () => {
  const todos = complete(add([], 'a'), 1);
  assert.strictEqual(todos[0].done, true);
});

test('formatTodo 以勾选框开头', () => {
  assert.ok(formatTodo({ id: 1, title: 'a', done: false }).startsWith('[ ] 1. a'));
  assert.ok(formatTodo({ id: 1, title: 'a', done: true }).startsWith('[x] 1. a'));
});
