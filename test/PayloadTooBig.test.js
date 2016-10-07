'use strict';

const {expect} = require('chai');
const SafeHttpClient = require('../src/SafeHttpClient');
const server = require('./fixtures/server-limits');
const {kb} = require('./fixtures/common');

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

        // Let's make sure we are not downloading too much.
        expect(stats.networkRead).to.be.below(kb(100));
        expect(stats.encoded).to.be.below(kb(20));
        expect(stats.decoded).to.be.below(kb(20));

        done();
      }
    );
  });
});
