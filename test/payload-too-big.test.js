'use strict';

const {expect} = require('chai');
const server = require('./fixtures/server-limits');
const {kb, mb} = require('../src/utils');
const request = require('../');

describe('Payload Limits', () => {
  before(server.start);
  after(server.stop);

  it('limits amount of bytes read from network', (done) => {
    request(
      {networkLimit: kb(1), checkAddress: false},
      server.endpoint('/network-limit-10kb-header'),
      (err, res, body, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('LimitExceeded');
        expect(stats.network).to.be.above(kb(1));
        done();
      }
    );
  });

  it('limits amount of encoded bytes', (done) => {
    request(
      {encodedLimit: 10, checkAddress: false},
      server.endpoint('/encoded-limit-10kb-zipped'),
      (err, res, body, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('LimitExceeded');
        expect(stats.encoded).to.be.above(10);
        done();
      }
    );
  });

  it('limits amount of decoded bytes', (done) => {
    request(
      {decodedLimit: kb(1), checkAddress: false},
      server.endpoint('/zip-bomb-10mb'),
      (err, res, body, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('LimitExceeded');
        expect(stats.decoded).to.be.above(kb(1));

        // Let's make sure we are not downloading too much.
        expect(stats.network).to.be.below(kb(100));
        expect(stats.encoded).to.be.below(kb(20));
        expect(stats.decoded).to.be.below(kb(20));

        done();
      }
    );
  });

  it('works for multiple sockets', (done) => {
    request(
      {networkLimit: kb(3), checkAddress: false},
      server.endpoint('/redirect-3-times-with-1kb-header'),
      (err, res, body, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('LimitExceeded');
        expect(stats.network).to.be.above(kb(3));
        expect(stats.encoded).to.be.below(1);
        done();
      }
    );
  });

  it('downloading full zip, but not uncompressing it fully', (done) => {
    request(
      {
        networkLimit: kb(100),
        encodedLimit: kb(100),
        decodedLimit: mb(1),
        checkAddress: false
      },
      server.endpoint('/zip-bomb-10mb'),
      (err, res, body, stats) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('LimitExceeded');
        expect(stats.network).to.be.above(kb(10));
        expect(stats.encoded).to.be.above(kb(9));
        expect(stats.decoded).to.be.below(mb(2));
        done();
      }
    );
  });
});
