'use strict';

const {isPrivate, isV4Format, isV6Format} = require('ip');
const {withDefaults} = require('./utils');

const isIp = addr => isV4Format(addr) || isV6Format(addr);
const isPrivateIp = addr => isIp(addr) && isPrivate(addr);

const defaultRestrictions = {
  networkLimit: Infinity,
  encodedLimit: Infinity,
  decodedLimit: Infinity,

  checkUri: (uri) => {
    return (uri.protocol === 'http:' || uri.protocol === 'https:')
        && (uri.hostname !== 'localhost')
        && !isPrivateIp(uri.hostname);
  },
  checkAddress: (addr, family, hostname) => !isPrivate(addr)
};

const defaultOptions = {
  method: 'get',
  gzip: true,
  timeout: 20e3
};

module.exports = {
  createRestrictions: withDefaults(defaultRestrictions),
  createOptions: withDefaults(defaultOptions)
};
