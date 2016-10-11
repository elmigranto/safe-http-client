'use strict';

const {expect} = require('chai');
const requestFn = require('..');
const {start, stop, address, payloadLimit} = require('./fixtures/old-stuff');

describe('safeRequest()', () => {
  before(start);
  after(stop);

  const request = (url, cb) => {
    const restrictions = {
      encodedLimit: payloadLimit,
      checkAddress: (addr, family, hostname) => hostname === process.env.HOST
    };

    const opts = {
      uri: url.includes('://') ? url : address + url,
      encoding: 'utf8',
      timeout: 85
    };

    requestFn(restrictions, opts, cb);
  };

  describe('Fine requests', () => {
    it('fetches stuff', (done) => {
      request('/fine', (err, res) => {
        expect(err).to.be.null;
        expect(res).to.be.equal('okay');
        done();
      });
    });

    it('fetches gzipped stuff', (done) => {
      request('/fine-gzip', (err, res) => {
        expect(err).to.be.null;
        expect(res).to.equal('okay-gzip');
        done();
      });
    });

    it('fetches deflated stuff', (done) => {
      request('/fine-deflate', (err, res) => {
        expect(err).to.be.null;
        expect(res).to.equal('okay-deflate');
        done();
      });
    });

    it('succeeds with non-200 status codes', (done) => {
      request('/does-not-exist', (err, res) => {
        expect(err).to.be.null;
        expect(res).to.be.equal('Not Found');
        done();
      });
    });
  });

  describe('Error handling', () => {
    it('fails if DNS does not resolve', (done) => {
      request(`http://this-surely-wont-resolve.${Date.now()}`, (err, res) => {
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    it('fails if URI scheme is not http/https', (done) => {
      request('file:///etc/passwd', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.be.equal('InvalidUri');
        expect(res).to.be.undefined;
        done();
      });
    });
  });

  describe('Too big requests', () => {
    it('fails with `PayloadTooBig` message', (done) => {
      request('/too-big', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        done();
      });
    });

    it('fails when gzipped chunks are fine, but unarchived data is too big', (done) => {
      request(`${address}/too-big-gzip`, (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        done();
      });
    });

    it('fails when Node\'s HTTP parser throwed on headers size over the limit', (done) => {
      request('/too-big-headers', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(err.reason).to.be.instanceof(Error);
        expect(err.reason.code).to.equal('HPE_HEADER_OVERFLOW');
        done();
      });
    });
  });

  describe('Bad redirects', () => {
    it('fails on too many redirects', (done) => {
      request('/too-many-redirects', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('TooManyRedirects');
        done();
      });
    });

    it('fails on redirects to localhost', (done) => {
      request(`/bad-redirect?where=${encodeURIComponent('//localhost:8080')}`, (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('InvalidUri');
        done();
      });
    });

    it('fails on redirects to private IP addresses', (done) => {
      requestFn(
        {},
        `${address}/bad-redirect?where=${encodeURIComponent('//[::1]')}`,
        (err, res) => {
          expect(err).to.be.instanceof(Error);
          expect(err.message).to.equal('InvalidAddress');
          done();
        }
      );
    });
  });

  describe('Timeout', () => {
    it('fails if server is too slow to start replying', (done) => {
      request('/delay', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('TimedOut');
        expect(err.reason).to.be.instanceof(Error);
        done();
      });
    });

    it('fails if server is "stuck" inbetween chunks', (done) => {
      request('/delay-chunks', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('TimedOut');
        expect(err.reason).to.be.instanceof(Error);
        done();
      });
    });
  });
});
