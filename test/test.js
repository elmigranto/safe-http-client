'use strict';

const {expect} = require('chai');
const SafeHttpClient = require('..');
const {start, stop, address, payloadLimit} = require('./fixtures');

before(start);
after(stop);

describe('SafeHttpClient', () => {
  const client = new SafeHttpClient({
    payloadLimit
  });

  const request = (uri, callback) => {
    const options = {
      baseUrl: address,
      encoding: 'utf8',
      uri
    };

    if (uri.includes('://'))
      delete options.baseUrl;

    client.request(options, callback);
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
        expect(err.message).to.be.equal('InvalidURI');
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
        expect(res).to.be.undefined;
        done();
      });
    });

    it('fails when gzipped chunks are fine, but unarchived data is too big', (done) => {
      client.request(`${address}/too-big-gzip`, (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('PayloadTooBig');
        expect(res).to.be.undefined;
        done();
      });
    });
  });

  describe('Bad redirects', () => {
    it('fails on too many redirects', (done) => {
      request('/too-many-redirects', (err, res) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('TooManyRedirects');
        expect(res).to.be.undefined;
        done();
      });
    });
  });
});
