import assert from 'node:assert';
import { test } from 'node:test';
import { countdown } from '../src/countdown.js';
import { applyCoupons } from '../src/coupon.js';
import { createInventory, remaining, reserve } from '../src/inventory.js';

test('库存不能超卖', () => {
  const inv = createInventory(3);
  assert.strictEqual(reserve(inv, 2), true);
  assert.strictEqual(reserve(inv, 2), false);
  assert.strictEqual(remaining(inv), 1);
  assert.strictEqual(reserve(inv, 1), true);
  assert.strictEqual(reserve(inv, 1), false);
  assert.strictEqual(remaining(inv), 0);
});

test('先打折再减券', () => {
  assert.strictEqual(applyCoupons(100, { percentOff: 20, minus: 10 }), 70);
  assert.strictEqual(applyCoupons(5, { minus: 10 }), 0.01);
  assert.strictEqual(applyCoupons(99), 99);
});

test('倒计时格式', () => {
  assert.strictEqual(countdown(59_000), '00:00:59');
  assert.strictEqual(countdown(3_725_000), '01:02:05');
  assert.strictEqual(countdown(-5), '00:00:00');
});
