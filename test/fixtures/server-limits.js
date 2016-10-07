'use strict';

const {kb, mb, createStr, createZip, createServer} = require('./common');

const ZIP_BOMB = createZip(mb(10));

const redirect = (n) => {
  const location = '/redirect-' + n;

  return {
    status: 301,
    headers: {
      location,
      'x-1-kb': createStr(kb(1))
    },
    response: `301 Moved to ${location}`
  };
};

module.exports = createServer((path) => {
  const status = 200;
  let headers;
  let response;

  switch (path) {
    case '/network-limit-10kb-header': {
      headers = {
        'content-type': 'text/plain',
        'content-encoding': 'UTF-8',
        'x-10-kb': createStr(kb(10))
      };

      response = 'okay';
      break;
    }

    case '/encoded-limit-10kb-zipped': {
      headers = {
        'content-type': 'text/plain',
        'content-encoding': 'gzip'
      };
      response = createZip(kb(10));
      break;
    }

    case '/decoded-limit-1kb-string': {
      headers = {
        'content-type': 'text/plain',
        'content-encoding': 'UTF-8'
      };
      response = createStr(kb(1));
      break;
    }

    case '/zip-bomb-10mb': {
      headers = {
        'content-type': 'text/plain',
        'content-encoding': 'gzip'
      };
      response = ZIP_BOMB;
      break;
    }

    case '/redirect-1': return redirect(2);
    case '/redirect-2': return redirect(3);
    case '/redirect-3-times-with-1kb-header': return redirect(1);
    case '/redirect-3': {
      headers = {
        'content-type': 'text/plain',
        'content-encoding': 'UTF-8'
      };
      response = 'Hello.';
      break;
    }

    default:
      throw new Error('Uknown Path');
  }

  return {status, headers, response};
});
