'use strict';

const safeCallSync = (fn, ...args) => {
  try {
    return fn(...args);
  }
  catch (e) {
    return e;
  }
};

const utils = {
  noop: () => {},
  safeCallSync,

  kb: n => n * (1 << 10),
  mb: n => n * (1 << 20),

  once (fn) {
    let called = false;

    return function (...args) {
      if (called)
        return;

      fn.call(this, ...args);
      called = true;
    };
  },

  withDefaults: defaults => rewrites => Object.assign(
    {},
    defaults,
    rewrites
  )
};

module.exports = utils;
