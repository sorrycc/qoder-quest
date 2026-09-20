// 周五下午 5:59 提交的代码
var list = [];

function getData(cb) {
  setTimeout(function () {
    list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    cb(list);
  }, 1000);
}

function process(cb) {
  getData(function (d) {
    var r = [];
    for (var i = 0; i < d.length; i++) {
      if (d[i] % 2 == 0) {
        if (d[i] > 2) {
          r.push(d[i] * 2);
        }
      }
    }
    // TODO: 周一再说
    cb(r);
  });
}

process(function (x) {
  console.log('result: ' + x);
});
