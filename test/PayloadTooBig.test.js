'use strict';

const {expect} = require('chai');
const SafeHttpClient = require('../src/SafeHttpClient');
const server = require('./fixtures/server-limits');
const {kb, mb} = require('./fixtures/common');

describe('Payload Limits', () => {
  before(server.start);
  after(server.stop);

  const client = function ({
    networkLimit = Infinity,
    encodedLimit = Infinity,
    decodedLimit = Infinity
  } = {}) {
    return new SafeHttpClient({
      networkLimit,
      encodedLimit,
      decodedLimit
    });
  };

  const request = (limits, path, callback) => {
    const opts = {
      method: 'get',
      uri: server.endpoint(path),
      encoding: 'utf8'
    };

    client(limits).request(opts, callback);
  };

  it('limits amount of bytes read from network', (done) => {
    request(
      {networkLimit: kb(1)},
      '/network-limit-10kb-header',
      (err, body, res, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(stats.networkRead).to.be.above(kb(1));
        done();
      }
    );
  });

  it('limits amount of encoded bytes', (done) => {
    request(
      {encodedLimit: 10},
      '/encoded-limit-10kb-zipped',
      (err, body, res, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(stats.encoded).to.be.above(10);
        done();
      }
    );
  });

  it('limits amount of decoded bytes', (done) => {
    request(
      {decodedLimit: kb(1)},
      '/zip-bomb-10mb',
      (err, body, res, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(stats.decoded).to.be.above(kb(1));

        // Let's make sure we are not downloading too much.
        expect(stats.networkRead).to.be.below(kb(100));
        expect(stats.encoded).to.be.below(kb(20));
        expect(stats.decoded).to.be.below(kb(20));

        done();
      }
    );
  });

  it('works for multiple sockets', (done) => {
    request(
      {networkLimit: kb(3)},
      '/redirect-3-times-with-1kb-header',
      (err, body, res, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(stats.networkRead).to.be.above(kb(3));
        expect(stats.encoded).to.be.below(1);
        done();
      }
    );
  });

  it('downloading full zip, but not uncompressing it fully', (done) => {
    request(
      {networkLimit: kb(100), encodedLimit: kb(100), decodedLimit: mb(1)},
      '/zip-bomb-10mb',
      (err, body, res, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(stats.networkRead).to.be.above(kb(10));
        expect(stats.encoded).to.be.above(kb(9));
        expect(stats.decoded).to.be.below(mb(2));
        done();
      }
    );
  });
});
