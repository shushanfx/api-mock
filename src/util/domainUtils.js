/***
 * 对域名进行校验
console.time("itest1")
for (let i = 0; i < 1000000; i++) {
  module.exports.isMatch(i + "www.sogou.com", "*.sogou.com");
}
console.timeEnd("itest1");

console.time("itest2")
for (let i = 0; i < 1000000; i++) {
  module.exports.isMatch2(i + "www.sogou.com", "*.sogou.com");
}
console.timeEnd("itest2");

  * 两者的差距不是很大，为何我们不用其他的呢？
 */

const matchArray = (arr1, arr2, i1, i2) => {
  if (i1 < 0 && i2 < 0) {
    return true;
  }
  let item1 = arr1[i1];
  let item2 = arr2[i2];
  if (item1 && item2) {
    if (item2 === '*') {
      return matchArray(arr1, arr2, i1 - 1, i2) || matchArray(arr1, arr2, i1 - 1, i2 - 1);
    } else if (item1 === item2) {
      return matchArray(arr1, arr2, i1 - 1, i2 - 1);
    }
  }
  return false;
}

module.exports.isMatch = (domain, pattern) => {
  if (typeof domain === 'string' && domain &&
    typeof pattern === 'string' && pattern) {
    let arr1 = domain.split('.');
    let arr2 = pattern.split('.');
    let i1 = arr1.length - 1;
    let i2 = arr2.length - 1;
    while (i1 >= 0 && i2 >= 0) {
      let item1 = arr1[i1];
      let item2 = arr2[i2];
      if (!item1 || !item2) {
        return false;
      }
      if (item2 === '*') {
        i1--;
        if (i1 < 0 && i2 === 0) {
          return true;
        }
      } else if (item2 === item1) {
        i2--;
        i1--;
        if (i1 < 0 && i2 < 0) {
          return true;
        }
      } else {
        break;
      }
    }
  }
  return false;
}

module.exports.isMatch2 = (domain, pattern) => {
  if (typeof domain === 'string' && domain &&
    typeof pattern === 'string' && pattern) {
    let arr1 = domain.split('.');
    let arr2 = pattern.split('.');
    let i1 = arr1.length - 1;
    let i2 = arr2.length - 1;
    return matchArray(arr1, arr2, i1, i2);
  }
  return false;
}