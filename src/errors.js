'use strict';

module.exports = {
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
