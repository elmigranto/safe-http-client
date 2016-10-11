'use strict';

module.exports = {
  BadUri: 'BadUri',
  BadAddress: 'BadAddress',
  LimitExceeded: 'LimitExceeded',
  RequestError: 'RequestError',

  // Wraps error from `request` module.
  _wrapError (reason) {
    const message = (reason.code === 'HPE_HEADER_OVERFLOW')
      ? this.LimitExceeded
      : this.RequestError;

    const error = new Error(message);
    error.reason = reason;

    return error;
  }
};
