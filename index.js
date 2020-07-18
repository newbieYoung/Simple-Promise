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
    switch (this.status) {
      case PENDING:
        this.fulfilledList.push(onFulfilled);
        this.rejectedList.push(onRejected);
        break;
      case FULFILLED:
        onFulfilled(this.value);
        break;
      case REJECTED:
        onRejected(this.value);
        break;
      default:
        break;
    }
    return this;
  }

  SimplePromise.prototype.resolve = function (data) {
    if (this.status !== PENDING) {
      return;
    }
    this.status = FULFILLED;
    this.value = data;

    while (this.fulfilledList.length > 0) {
      let run = this.fulfilledList.shift();
      run(this.value);
    }
  }

  SimplePromise.prototype.reject = function (err) {
    if (this.status !== PENDING) {
      return;
    }
    this.status = REJECTED;
    this.value = err;

    while (this.rejectedList.length > 0) {
      let run = this.rejectedList.shift();
      run(this.value);
    }
  }



  return SimplePromise;
})