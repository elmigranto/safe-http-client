'use strict';

const url = require('url');
const {expect} = require('chai');
const {validate} = require('../src/UrlPolicy');

describe('UrlPolicy', () => {
  describe('UrlPolicy.validate()', () => {
    const createErrorChecker = ({message, ctor = Error} = {}) => input => {
      const ret = validate(input);
      expect(ret).to.be.instanceof(ctor);

      if (typeof message === 'string')
        expect(ret.message).to.equal(message);
      else if (message instanceof RegExp)
        expect(ret.message).to.match(message);
    };

    it('returns url.parse() result for valid URIs', () => {
      [
        'http://www.google.com',
        'https://8.8.4.4:443/some-path?with-query#and-hash'
      ].forEach(uri => expect(validate(uri)).to.eql(url.parse(uri)));
    });

    it('returns Error for non-http protocols', () => {
      const check = createErrorChecker({message: 'InvalidProtocol'});
      ['file', 'ftp', 'postgres', 'unix'].forEach(protocol => {
        check(`${protocol}://example.org`);
      });
    });

    it('returns Error for local hostnames / IPs', () => {
      const check = createErrorChecker({message: 'InvalidHostname'});
      [
        '',
        'localhost',
        '127.0.0.1',
        '10.0.0.1',
        '172.16.0.0',
        '169.254.2.3',
        '[fe80::f2de:f1ff:fe3f:307e]'
      ].forEach(hostname => {
        const uri = `http://${hostname}`;
        const uriAndPort = `${uri}:80`;
        check(uri);
        check(uriAndPort);
      });
    });
  });
});
