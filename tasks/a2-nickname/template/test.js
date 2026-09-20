// 行为测试：不管函数改成什么名字，按导出顺序验证行为不变。
const assert = require('node:assert');
const fns = Object.values(require('./utils.js'));

assert.strictEqual(fns.length, 3, '应该还是导出 3 个函数');
const [sumAbove, uniqueNames, titleCase] = fns;

const items = [
  { x: 5, y: 2, n: '奶茶' },
  { x: 20, y: 1, n: '咖啡' },
  { x: 30, y: 3, n: '奶茶' },
];

assert.strictEqual(sumAbove(items, 10), 110);
assert.deepStrictEqual(uniqueNames(items), ['奶茶', '咖啡']);
assert.strictEqual(titleCase('hello qoder quest', false), 'Hello Qoder Quest');
assert.strictEqual(titleCase('hello qoder quest', true), 'HelloQoderQuest');

console.log('ok');
