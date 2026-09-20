// 满减规则：满 100 减 20，满 200 减 50
const RULES = [
  { threshold: 200, off: 50 },
  { threshold: 100, off: 20 },
];

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function discount(amount) {
  const rule = RULES.find((r) => amount > r.threshold);
  return rule ? rule.off : 0;
}

export function total(items) {
  const amount = subtotal(items);
  return amount - discount(amount);
}
