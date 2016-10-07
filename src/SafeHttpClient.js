'use strict';

const {resolve} = require('url');
const request = require('request');
const {once, safeCallSync} = require('./utils');
const UrlPolicy = require('./UrlPolicy');
const Counter = require('./BytesCounter');

class SafeHttpClient {
  constructor ({
    networkLimit = Infinity, // max bytes to read from socket(s)
    encodedLimit = Infinity, // max bytes for encoded (e.g. deflated data)
    decodedLimit = Infinity  // max bytes for decoded (e.g. inflated data)
  } = {}) {
    this.networkLimit = networkLimit;
    this.encodedLimit = encodedLimit;
    this.decodedLimit = decodedLimit;
  }

  request (optionsOrUrlString, callback) {
    const opts = 'string' === typeof optionsOrUrlString
      ? {uri: optionsOrUrlString}
      : optionsOrUrlString;

    const chunks = [];
    let chunksSize = 0;
    let error = null;
    let response;
    let stats;

    if (opts.url) {
      opts.uri = opts.url;
      delete opts.url;
    }

    if (opts.baseUrl) {
      opts.uri = resolve(opts.baseUrl, opts.uri);
      delete opts.baseUrl;
    }

    const failForUrlPolicyValidation = (err) => {
      error = SafeHttpClient.Errors._wrapError(err);
      error.message = SafeHttpClient.Errors.UrlPolicyViolation;
    };

    const finish = once(() => {
      const cb = body => callback(error, body, response, stats);

      if (error)
        return cb();

      if (chunks.length === 0)
        return cb();

      return Buffer.isBuffer(chunks[0])
        ? cb(Buffer.concat(chunks, chunksSize))
        : cb(chunks.join(''));
    });

    opts.uri = UrlPolicy.validate(opts.uri);

    if (opts.uri instanceof Error) {
      failForUrlPolicyValidation(opts.uri);
      return setImmediate(finish);
    }

    const params = Object.assign(
      SafeHttpClient.defaults(),
      {
        followRedirect: (res) => {
          const redirectTo = res.caseless.has('location') && res.caseless.get('location');
          const url = resolve(res.request.uri.href, redirectTo);
          const ret = UrlPolicy.validate(url);

          if (ret instanceof Error) {
            failForUrlPolicyValidation(ret);
            return false;
          }

          return true;
        }
      },
      opts
    );

    const req = safeCallSync(request, params);

    if (req instanceof Error)
      return setImmediate(callback, SafeHttpClient.Errors._wrapError(req));

    const onError = (err) => {
      error = SafeHttpClient.Errors._wrapError(err);
      finish();
    };

    const counter = new Counter(req, (reason, bytes) => {
      const {networkRead, encoded, decoded} = bytes;
      const die = () => {
        error = new Error(SafeHttpClient.Errors.PayloadTooBig);
        counter.stop();
        req.abort();
      };

      chunksSize = encoded;
      stats = bytes;

      if (networkRead > this.networkLimit)
        return die();

      if (encoded > this.encodedLimit)
        return die();

      if (decoded > this.decodedLimit)
        return die();
    });

    req
      .on('error', onError)
      .on('data', chunk => chunks.push(chunk))
      .on('response', res => response = res)
      .on('end', finish);
  }


  static defaults () {
    return {
      method: 'get',
      gzip: true,
      timeout: 20e3
    };
  }
}

SafeHttpClient.Errors = {
  UknownError: 'UknownError',
  PayloadTooBig: 'PayloadTooBig',
  TooManyRedirects: 'TooManyRedirects',
  InvalidURI: 'InvalidURI',
  UrlPolicyViolation: 'UrlPolicyViolation',
  TimedOut: 'TimedOut',

  _wrapError (reason) {
    const message = reason.code === 'HPE_HEADER_OVERFLOW'
      ? this.PayloadTooBig
      : this._mapErrorMessage(reason.message);

    const error = new Error(message);

    error.reason = reason;
    return error;
  },

  _mapErrorMessage (message) {
    if (message.startsWith('Exceeded maxRedirects'))
      return this.TooManyRedirects;
    else if (message.startsWith('Invalid URI'))
      return this.InvalidURI;
    else if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(message))
      return this.TimedOut;
    else
      return this.UknownError;
  }
};

module.exports = SafeHttpClient;
