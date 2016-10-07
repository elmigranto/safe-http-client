'use strict';

const url = require('url');
const http = require('http');
const zlib = require('zlib');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT, 10) || 1337;

const createBuf = (byteLength) => Buffer.alloc(byteLength, '0', 'utf8');
const createStr = (byteLength) => createBuf(byteLength).toString('utf8');
const createZip = (byteLength) => zlib.gzipSync(createBuf(byteLength));

const kb = n => n * 1024;
const mb = n => n * kb(1024);
const gb = n => n * mb(1024);

module.exports = {
  createServer: (handle) => {
    const server = http.createServer((req, res) => {
      const {pathname: path} = url.parse(req.url);
      const {status, headers, response} = handle(path);

      res.writeHead(status, headers);
      res.write(response);
      res.end();
    });

    return {
      endpoint: (path) => `http://${HOST}:${PORT}` + path,
      start: (done) => server.listen(PORT, HOST, done),
      stop: (done) => server.close(done)
    };
  },

  kb, mb, gb,
  createBuf,
  createStr,
  createZip
};
