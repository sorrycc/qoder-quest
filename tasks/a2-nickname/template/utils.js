// 前任留下的代码。他已经离职了，联系不上。

function doStuff(a, b) {
  let tmp = 0;
  for (let i = 0; i < a.length; i++) {
    const tmp2 = a[i];
    if (tmp2.x > b) {
      tmp = tmp + tmp2.x * tmp2.y;
    }
  }
  return tmp;
}

function doStuff2(data1) {
  const data2 = [];
  for (const thing of data1) {
    if (!data2.includes(thing.n)) data2.push(thing.n);
  }
  return data2;
}

function handle(s, flag) {
  const aaa = s.trim().split(' ');
  const bbb = aaa.map((q) => q[0].toUpperCase() + q.slice(1));
  return flag ? bbb.join('') : bbb.join(' ');
}

module.exports = { doStuff, doStuff2, handle };
