'use strict';

const url = require('url');
const zlib = require('zlib');
const http = require('http');
const assert = require('assert');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT, 10) || 1337;
const TEN_MB = 10 * Math.pow(2, 20);
const BIG_REPLY = Buffer.alloc(TEN_MB, 0).toString('base64');
const BIG_REPLY_DEFLATED = zlib.deflateSync(BIG_REPLY);
const PAYLOAD_LIMIT = Math.floor(Buffer.byteLength(BIG_REPLY_DEFLATED) / 2);

assert(
  PAYLOAD_LIMIT < Buffer.byteLength(BIG_REPLY_DEFLATED),
  'Payload limit is less than the size of reply that is "too big"'
);

const server = http.createServer((req, res) => {
  const {pathname, query} = url.parse(req.url, true);
  const headers = {'content-type': 'text/plain; charset=UTF-8'};
  let status;
  let reply;

  switch (pathname) {
    case '/fine':
      status = 200;
      reply = 'okay';
      break;

    case '/fine-gzip':
      status = 200;
      headers['content-encoding'] = 'gzip';
      reply = zlib.gzipSync(new Buffer('okay-gzip', 'utf8'));
      break;

    case '/fine-deflate':
      status = 200;
      headers['content-encoding'] = 'deflate';
      reply = zlib.deflateSync(new Buffer('okay-deflate', 'utf8'));
      break;

    case '/too-big':
      status = 200;
      reply = BIG_REPLY;
      break;

    case '/too-big-gzip':
      status = 200;
      headers['content-encoding'] = 'deflate';
      reply = BIG_REPLY_DEFLATED;
      break;

    case '/too-many-redirects':
      status = 301;
      headers['location'] = '/too-many-redirects';
      break;

    case '/bad-redirect':
      status = 301;
      headers['location'] = query.where;
      break;

    default:
      status = 404;
      reply = http.STATUS_CODES[status];
      break;
  }

  res.writeHead(status, headers);
  res.end(reply);
});

module.exports = {
  address: `http://${HOST}:${PORT}`,
  start: done => server.listen(PORT, HOST, done),
  stop: done => server.close(done),

  payloadLimit: PAYLOAD_LIMIT
};
