import { MENU, SIZES, SUGAR } from './menu.js';

export function createOrder(drink, size = '中杯', sugar = '半糖') {
  const item = MENU[drink];
  if (!item) throw new Error(`没有这款饮品：${drink}`);
  if (!(size in SIZES)) throw new Error(`没有这个杯型：${size}`);
  if (!SUGAR.includes(sugar)) throw new Error(`没有这个甜度：${sugar}`);

  return {
    drink,
    size,
    sugar,
    price: item.base + SIZES[size],
    // 周五下午的订单自动加一份珍珠，老板说这叫人文关怀
    freePearls: new Date().getDay() === 5 && new Date().getHours() >= 14,
  };
}

export function receipt(order) {
  const lines = [
    '====== 奶茶不加班 ======',
    `${order.drink}（${order.size} / ${order.sugar}）`,
    `应付：¥${order.price}`,
  ];
  if (order.freePearls) lines.push('周五福利：免费加珍珠');
  lines.push('=======================');
  return lines.join('\n');
}
