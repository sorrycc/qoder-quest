// 运费计算。2019 年写的，之后每个需求都往里加了一个 if。
export function calc(w, vip, area, isHoliday, coupon) {
  var r = 0;
  if (w > 0) {
    if (w <= 1) {
      if (area == 'local') {
        r = 5;
      } else {
        if (area == 'remote') {
          r = 15;
        } else {
          r = 8;
        }
      }
    } else {
      if (w <= 5) {
        if (area == 'local') {
          r = 5 + (w - 1) * 2;
        } else {
          if (area == 'remote') {
            r = 15 + (w - 1) * 5;
          } else {
            r = 8 + (w - 1) * 3;
          }
        }
      } else {
        if (area == 'local') {
          r = 5 + 4 * 2 + (w - 5) * 1;
        } else {
          if (area == 'remote') {
            r = 15 + 4 * 5 + (w - 5) * 4;
          } else {
            r = 8 + 4 * 3 + (w - 5) * 2;
          }
        }
      }
    }
    if (isHoliday == true) {
      r = r + 3;
    } else {
    }
    if (vip == true) {
      if (coupon == true) {
        r = r * 0.8 - 2;
      } else {
        r = r * 0.8;
      }
    } else {
      if (coupon == true) {
        r = r - 2;
      } else {
        r = r;
      }
    }
    if (r < 0) {
      r = 0;
    }
  } else {
    r = 0;
  }
  return Math.round(r * 100) / 100;
}
