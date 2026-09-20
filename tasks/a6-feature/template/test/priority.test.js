// 产品经理写的验收测试。现在是红的，功能做完就绿了。
import assert from 'node:assert';
import { test } from 'node:test';
import { formatList, formatTodo } from '../src/format.js';
import { add } from '../src/store.js';

test('add 支持优先级，默认 medium', () => {
  const todos = add(add([], '写周报'), '修线上 bug', 'high');
  assert.strictEqual(todos[0].priority, 'medium');
  assert.strictEqual(todos[1].priority, 'high');
});

test('非法优先级要报错', () => {
  assert.throws(() => add([], '摸鱼', 'urgent'));
});

test('high 优先级的待办带 🔥', () => {
  assert.ok(formatTodo({ id: 1, title: '修线上 bug', done: false, priority: 'high' }).includes('🔥'));
  assert.ok(!formatTodo({ id: 2, title: '写周报', done: false, priority: 'medium' }).includes('🔥'));
});

test('列表按 high > medium > low 排序', () => {
  let todos = add([], '浇花', 'low');
  todos = add(todos, '写周报');
  todos = add(todos, '修线上 bug', 'high');
  const lines = formatList(todos).split('\n');
  assert.ok(lines[0].includes('修线上 bug'));
  assert.ok(lines[1].includes('写周报'));
  assert.ok(lines[2].includes('浇花'));
});
