'use strict';

const {parse} = require('url');
const {isV4Format, isV6Format, isPrivate} = require('ip');

const isIp = addr => isV4Format(addr) || isV6Format(addr);
const isPrivateIp = addr => isIp(addr) && isPrivate(addr);

class UrlPolicy {
  static validate (url) {
    const parsed = typeof url === 'string'
      ? parse(url)
      : url;

    const {
      protocol,
      hostname
    } = parsed;

    // http/https
    if (protocol !== 'http:' && protocol !== 'https:')
      return new Error(UrlPolicy.Errors.InvalidProtocol);

    // private networks
    if (!hostname || (hostname === 'localhost') || isPrivateIp(hostname))
      return new Error(UrlPolicy.Errors.InvalidHostname);

    return parsed;
  }
}

UrlPolicy.Errors = {
  InvalidProtocol: 'InvalidProtocol',
  InvalidHostname: 'InvalidHostname'
};

module.exports = UrlPolicy;
