export function createInventory(stock) {
  return { stock, sold: 0 };
}

// 扣库存，返回是否抢到
export function reserve(inv, qty) {
  if (inv.stock - inv.sold < 0) return false;
  inv.sold += qty;
  return true;
}

export function remaining(inv) {
  return inv.stock - inv.sold;
}
