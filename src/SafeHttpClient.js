'use strict';

const request = require('request');
const {once, safeCallSync} = require('./utils');

class SafeHttpClient {
  constructor ({
    payloadLimit = Infinity
  } = {}) {
    this.payloadLimit = payloadLimit;
  }

  request (optionsOrUrlString, callback) {
    const opts = 'string' === typeof optionsOrUrlString
      ? {uri: optionsOrUrlString}
      : optionsOrUrlString;

    const params = Object.assign(
      SafeHttpClient.defaults(),
      opts
    );

    const req = safeCallSync(request, params);

    if (req instanceof Error)
      return setImmediate(callback, SafeHttpClient.Errors._wrapError(req));

    const chunks = [];
    let chunksSize = 0;
    let error = null;

    const onError = (err) => {
      error = SafeHttpClient.Errors._wrapError(err);
      finish();
    };

    const onData = (chunk) => {
      chunks.push(chunk);
      chunksSize += Buffer.byteLength(chunk);

      if (chunksSize > this.payloadLimit) {
        error = new Error(SafeHttpClient.Errors.PayloadTooBig);
        req.abort();
        req.removeListener('data', onData);
      }
    };

    const finish = once(() => {
      const cb = body => callback(error, body);

      if (error)
        return cb();

      if (chunks.length === 0)
        return cb();

      return Buffer.isBuffer(chunks[0])
        ? cb(Buffer.concat(chunks, chunksSize))
        : cb(chunks.join(''));
    });

    req
      .on('error', onError)
      .on('data', onData)
      .on('end', finish);
  }


  static defaults () {
    return {
      method: 'get',
      gzip: true
    };
  }
}

SafeHttpClient.Errors = {
  UknownError: 'UknownError',
  PayloadTooBig: 'PayloadTooBig',
  TooManyRedirects: 'TooManyRedirects',
  InvalidURI: 'InvalidURI',

  _wrapError (requestError) {
    const message = this._mapErrorMessage(requestError.message);
    const error = new Error(message);

    Error.captureStackTrace(error, this._wrapError);
    error.reason = requestError;
    return error;
  },

  _mapErrorMessage (message) {
    if (message.startsWith('Exceeded maxRedirects'))
      return this.TooManyRedirects;
    else if (message.startsWith('Invalid URI'))
      return this.InvalidURI;
    else
      return this.UknownError;
  }
};

module.exports = SafeHttpClient;
