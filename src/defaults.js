'use strict';

const {isPrivate, isV4Format, isV6Format} = require('ip');
const {mb, withDefaults} = require('./utils');

const isIp = addr => isV4Format(addr) || isV6Format(addr);
const isPrivateIp = addr => isIp(addr) && isPrivate(addr);

const defaultRestrictions = {
  networkLimit: mb(1),
  encodedLimit: mb(1),
  decodedLimit: mb(1),

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
