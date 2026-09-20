// 先打折，再减券，最低 0.01 元
export function applyCoupons(price, { percentOff = 0, minus = 0 } = {}) {
  const afterMinus = price - minus;
  const afterPercent = afterMinus * (1 - percentOff / 100);
  return Math.max(0.01, Math.round(afterPercent * 100) / 100);
}
