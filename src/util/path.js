module.exports.getAbURL = function (...args) {
  let arr = [...args];
  let obj = {
    url: '',
    arr: new Array(8)
  };
  arr.forEach(item => {
    if (typeof item === 'string' && item) {
      let aItem = item.trim();
      let arr = /^(https?:)?(\/\/)?([^\/\?\#]+)?(\/)?([^\?\#]+)?(\?[^\#]*)?(\#[^$]*)?$/gi.exec(
        aItem
      );
      if (arr) {
        // http or https
        if (arr[1]) {
          for (let i = 0; i < arr.length; i++) {
            obj.arr[i] = arr[i];
          }
        }
        // just //
        else if (arr[2]) {
          for (let i = 0; i < arr.length; i++) {
            obj.arr[i] = arr[i];
          }
          obj.arr[0] = window.location.protocol;
        }
        // /path
        else if (!arr[3] && arr[4]) {
          for (let i = 4; i < arr.length; i++) {
            obj.arr[i] = arr[i];
          }
        } else {
          // path
          if (arr[3]) {
            let tmp = arr[3];
            if (arr[4]) {
              tmp += arr[4];
            }
            if (arr[5]) {
              tmp += arr[5];
            }
            let tmpArr1 = obj.arr[5].split('/');
            let tmpArr2 = tmp.split('/');
            while (tmpArr2.length) {
              let tmpItem = tmpArr2.shift();
              if (tmpItem === '..') {
                tmpArr1.pop();
              } else if (tmpItem === '.') {
                if (tmpArr1.length) {
                  tmpArr1[tmpArr1.length - 1] = '';
                }
              } else {
                if (tmpArr1.length) {
                  if (tmpArr1[tmpArr1.length - 1] === '') {
                    tmpArr1[tmpArr1.length - 1] = tmpItem;
                  } else {
                    tmpArr1.push(tmpItem);
                  }
                } else {
                  tmpArr1.push(tmpItem);
                }
              }
            }
            if (tmpArr1.length) {
              obj.arr[5] = tmpArr1.join('/');
            } else {
              obj.arr[5] = '/';
            }
          }
          // query
          if (arr[6]) {
            if (!obj.arr[6]) {
              obj.arr[6] = arr[6];
            } else {
              obj.arr[6] += '&' + arr[6].slice(1);
            }
          }
          // hash
          if (arr[7]) {
            obj.arr[7] = arr[7];
          }
        }
      }
    }
  });
  obj.arr.shift();
  return obj.arr.join('');
};