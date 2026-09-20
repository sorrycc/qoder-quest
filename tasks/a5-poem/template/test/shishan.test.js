import assert from 'node:assert';
import { test } from 'node:test';
import { calc } from '../shishan.js';

test('首重', () => {
  assert.strictEqual(calc(1, false, 'local', false, false), 5);
  assert.strictEqual(calc(0.5, false, 'remote', false, false), 15);
  assert.strictEqual(calc(1, false, 'other', false, false), 8);
});

test('续重分两档', () => {
  assert.strictEqual(calc(3, false, 'local', false, false), 9);
  assert.strictEqual(calc(5, false, 'remote', false, false), 35);
  assert.strictEqual(calc(8, false, 'other', false, false), 26);
  assert.strictEqual(calc(10, false, 'remote', false, false), 55);
});

test('节假日、会员、优惠券', () => {
  assert.strictEqual(calc(1, false, 'local', true, false), 8);
  assert.strictEqual(calc(3, true, 'local', false, false), 7.2);
  assert.strictEqual(calc(3, true, 'local', true, true), 7.6);
  assert.strictEqual(calc(1, false, 'local', false, true), 3);
});

test('边界', () => {
  assert.strictEqual(calc(0, true, 'local', true, true), 0);
  assert.strictEqual(calc(-1, false, 'remote', false, false), 0);
});
