/* global define module */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = factory()
  } else {
    // Browser globals
    window.SimplePromise = factory(window.Prefix)
  }
})(function () {

  function isFunction(obj) {
    return obj && {}.toString.call(obj) === '[object Function]';
  }

  const PENDING = 'PENDING';
  const FULFILLED = 'FULFILLED';
  const REJECTED = 'REJECTED';

  function SimplePromise(handle) {
    if (!isFunction(handle)) {
      throw new Error('promise params must be a function')
    }

    this.status = PENDING
    this.value = null;

    this.fulfilledList = [];
    this.rejectedList = [];

    // 执行 handle
    try {
      handle(this.resolve.bind(this), this.reject.bind(this))
    } catch (err) {
      this.reject(err);
    }
  }

  SimplePromise.prototype.then = function (onFulfilled, onRejected) {
    let self = this;
    return new SimplePromise(function (resolve, reject) {
      let fulfilled = function (val) {
        try {
          if (!isFunction(onFulfilled)) { //非函数立即执行下一个回调
            resolve(val)
          } else {
            let res = onFulfilled(val);
            if (res instanceof SimplePromise) { //上一个回调返回 promise，则下一个回调必须等待其状态发生变换后才能执行
              res.then(resolve, reject);
            } else { //将上一个回调函数的返回值作为下一个回调的参数且立即执行
              resolve(res)
            }
          }
        } catch (error) {
          reject(error);
        }
      }

      let rejected = function (err) {
        try {
          if (!isFunction(onRejected)) {
            reject(err)
          } else {
            let res = onRejected(err);
            if (res instanceof SimplePromise) {
              res.then(resolve, reject)
            } else {
              reject(res)
            }
          }
        } catch (error) {
          reject(error);
        }
      }

      switch (self.status) {
        case PENDING:
          self.fulfilledList.push(fulfilled); //新的 promise 和上一个 promise 相关联
          self.rejectedList.push(rejected);
          break;
        case FULFILLED:
          fulfilled(self.value);
          break;
        case REJECTED:
          rejected(self.value);
          break;
        default:
          break;
      }
    })
  }

  SimplePromise.prototype.resolve = function (data) {
    let self = this;
    let run = function () {
      if (self.status != PENDING) {
        return;
      }

      let runFulfilled = function (val) {
        self.status = FULFILLED;
        self.value = val;
        while (self.fulfilledList.length > 0) {
          let cb = self.fulfilledList.shift();
          cb(self.value);
        }
      }

      //如果 resolve 的参数为 Promise，则必须等待该 Promise 对象的状态改变后；当前 Promise 的状态才会改变，且当前 Promise 的状态取决于参数 Promise 的状态
      if (data instanceof SimplePromise) {
        data.then(function (value) {
          runFulfilled(value)
        }, function (error) {
          self.reject(error);
        })
      } else {
        runFulfilled(data)
      }

    }

    setTimeout(run, 0) // promise 本身是同步的，但 then、catch 方法是异步的
  }

  SimplePromise.prototype.reject = function (err) {
    if (this.status !== PENDING) {
      return;
    }

    let self = this;
    let run = function () {
      self.status = REJECTED;
      self.value = err;

      while (self.rejectedList.length > 0) {
        let cb = self.rejectedList.shift();
        cb(self.value);
      }
    }

    setTimeout(run, 0) // 异步
  }


  SimplePromise.prototype.catch = function (onRejected) {
    this.then(null, onRejected);
  }

  SimplePromise.prototype.finally = function (callback) {
    return this.then(function (data) {
      callback()
    }, function (err) {
      callback()
    })
  }

  SimplePromise.resolve = function (value) {
    return new SimplePromise(function (resolve, reject) {
      resolve(value)
    })
  }

  SimplePromise.reject = function (err) {
    return new SimplePromise(function (resolve, reject) {
      reject(err);
    })
  }

  SimplePromise.all = function (list) {
    let self = this;
    return new SimplePromise(function (resolve, reject) {
      let values = [];
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        (function (index) {
          self.resolve(list[index]).then(function (data) {
            values[index] = data;
            count++;
            if (count == list.length) { //所有 promise 的状态都变为 fulfilled 时 整体状态才能变为 fulfilled
              resolve(values);
            }
          }, function (err) { //有一个 promise 的状态变为 rejected ，那么整体状态也为 rejected
            reject(err);
          })
        })(i)
      }
    })
  }

  SimplePromise.race = function (list) {
    let self = this;
    return new SimplePromise(function (resolve, reject) {
      for (let i = 0; i < list.length; i++) {
        (function (index) {
          self.resolve(list[index]).then(function (data) { //只要有一个 promise 改变了状态，那么即认为整体状态发生了改变。
            resolve(data);
          }, function (err) {
            reject(err)
          })
        })(i)
      }
    })
  }

  return SimplePromise;
})