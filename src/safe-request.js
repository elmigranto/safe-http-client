'use strict';

const {resolve, parse} = require('url');
const request = require('request');
const {noop, once, safeCallSync} = require('./utils');
const Safety = require('./Safety');
const errors = require('./errors');
const {createRestrictions, createOptions} = require('./defaults');

const normalizeOptions = (optionsOrUrlString) => {
  const opts = 'string' === typeof optionsOrUrlString
    ? {uri: optionsOrUrlString}
    : optionsOrUrlString;

  if (opts.url) {
    opts.uri = opts.url;
    delete opts.url;
  }

  if (opts.baseUrl) {
    opts.uri = resolve(opts.baseUrl, opts.uri);
    delete opts.baseUrl;
  }

  return opts;
};

const safeRequest = (restrictions, options, callback) => {
  const limits = {
    network: restrictions.networkLimit,
    encoded: restrictions.encodedLimit,
    decoded: restrictions.decodedLimit
  };

  const validate = {
    uri: restrictions.checkUri,
    address: restrictions.checkAddress
  };

  if (validate.uri && (validate.uri(parse(options.uri)) !== true)) {
    return setImmediate(callback, new Error('InvalidUri'));
  }

  const params = Object.assign(
    {
      followRedirect: (res) => {
        if (!validate.uri)
          return true;

        const redirectTo = res.caseless.has('location') && res.caseless.get('location');
        const url = resolve(res.request.uri.href, redirectTo);
        const valid = validate.uri(parse(url));

        if (valid !== true)
          safety.fail(new Error('InvalidUri'));

        return valid;
      }
    },
    options
  );

  // Create request.
  const req = safeCallSync(request, params);
  if (req instanceof Error)
    return setImmediate(callback, errors._wrapError(req));

  // Create safety thingy.
  const safety = new Safety(req, {limits, validate});

  if (callback !== noop) {
    const finish = once(callback);

    safety.on('success', (body, response, stats) => {
      finish(null, response, body, stats);
    });

    safety.on('error', (error, body, response, stats) => {
      finish(error, response, body, stats);
    });
  }
};

module.exports = (...args) => {
  let restrictions;
  let options;
  let callback;

  // options
  if (args.length === 1) {
    callback = noop;
    options = args[0];
  }
  // options, callback
  // restrictions, options
  else if (args.length === 2) {
    const hasCallback = args[1] instanceof Function;
    restrictions = hasCallback ? {} : args[0];
    options = hasCallback ? args[0] : args[1];
    callback = hasCallback ? args[1] : noop;
  }
  // restrictions, options, callback
  else if (args.length === 3) {
    restrictions = args[0];
    options = args[1];
    callback = args[2];
  }
  else {
    const message = 'Invalid number of arguments: expected 1, 2, or 3, got ';
    throw new Error(message + args.length);
  }

  return safeRequest(
    createRestrictions(restrictions),
    createOptions(normalizeOptions(options)),
    callback
  );
};
