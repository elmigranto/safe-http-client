'use strict';

const debug = require('debug');
const pkg = require('../package.json');

const safeCallSync = (fn, ...args) => {
  try {
    return fn(...args);
  }
  catch (e) {
    return e;
  }
};

const utils = {
  debug: debug(pkg.name),
  safeCallSync,

  once (fn) {
    let called = false;

    return function (...args) {
      if (called)
        return;

      fn.call(this, ...args);
      called = true;
    };
  }
};

module.exports = utils;
