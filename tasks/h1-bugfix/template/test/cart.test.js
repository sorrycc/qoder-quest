import assert from 'node:assert';
import { test } from 'node:test';
import { discount, subtotal, total } from '../src/cart.js';

test('小计要乘以数量', () => {
  assert.strictEqual(subtotal([{ price: 30, qty: 2 }, { price: 15, qty: 1 }]), 75);
});

test('刚好满 100 也要减 20', () => {
  assert.strictEqual(discount(100), 20);
  assert.strictEqual(discount(99), 0);
});

test('满 200 减 50', () => {
  assert.strictEqual(total([{ price: 100, qty: 2 }]), 150);
});
