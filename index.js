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
          if (!isFunction(onFulfilled)) { //非函数
            resolve(val) //立即执行
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
    if (this.status !== PENDING) {
      return;
    }

    let self = this;
    let run = function () {
      self.status = FULFILLED;
      self.value = data;
      while (self.fulfilledList.length > 0) {
        let cb = self.fulfilledList.shift();
        cb(self.value);
      }
    }

    setTimeout(run, 0) // 异步
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

  return SimplePromise;
})