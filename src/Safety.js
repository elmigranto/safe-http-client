'use strict';

const {EventEmitter} = require('events');
const errors = require('./errors');

class BytesCounter {
  constructor () {
    this.network = 0;
    this.encoded = 0;
    this.decoded = 0;
  }

  addBytes (field, chunk) {
    this[field] += Buffer.byteLength(chunk);
  }
}

class Safety extends EventEmitter {
  constructor (req, {limits, validate}) {
    super();
    this.req = req;
    this.limits = limits;
    this.validate = validate;

    this.counter = new BytesCounter();
    this.response = undefined;
    this.chunks = [];
    this.listeners = [];

    this.addListener(req, 'socket', this.onSocket);
    this.addListener(req, 'response', this.onResponse);
    this.addListener(req, 'data', this.onData);
    this.addListener(req, 'end', this.succeed);
    this.addListener(req, 'error', this.onError);
  }

  //
  // Event Handlers
  //

  onSocket (socket) {
    this.addListener(socket, 'data', this.onSocketData);

    if (this.validate.address instanceof Function)
      this.addListener(socket, 'lookup', this.onSocketLookup, socket);
  }

  onSocketLookup (socket, err, addr, family, hostname) {
    if (err)
      return;

    if (this.validate.address(addr, family, hostname) !== true)
      this.fail(new Error(errors.BadAddress));
  }

  onResponse (response) {
    this.response = response;
    this.addListener(response, 'data', this.onResponseData);
  }

  onError (err) {
    this.fail(errors._wrapError(err));
  }

  increaseCounter (kind, chunk) {
    this.counter.addBytes(kind, chunk);

    if (this.counter[kind] > this.limits[kind]) {
      const error = new Error(errors.LimitExceeded);
      return this.fail(error, kind);
    }
  }

  onSocketData (chunk) {
    this.increaseCounter('network', chunk);
  }

  onResponseData (chunk) {
    this.increaseCounter('encoded', chunk);
  }

  onData (chunk) {
    this.chunks.push(chunk);
    this.increaseCounter('decoded', chunk);
  }

  addListener (emitter, event, method, ...args) {
    const listener = method.bind(this, ...args);
    this.listeners.push({emitter, event, listener});
    emitter.on(event, listener);
  }

  cleanListeners () {
    this.listeners.forEach(({emitter, event, listener}) => {
      emitter.removeListener(event, listener);
    });
  }

  //
  // Output
  //

  abort () {
    if (this.req.timeout && this.req.timeoutTimer) {
      clearTimeout(this.req.timeoutTimer);
      this.req.timeoutTimer = null;
    }

    this.req.abort();
  }

  emit (...args) {
    this.cleanListeners();
    super.emit(...args);
  }

  fail (error, reason) {
    const body = null;
    const response = this.response;
    const stats = this.bytes();

    this.abort();
    this.emit('error', error, body, response, stats);
  }

  succeed () {
    let body = null;
    const response = this.response;
    const stats = this.bytes();

    if (this.chunks.length > 0) {
      body = Buffer.isBuffer(this.chunks[0])
        ? Buffer.concat(this.chunks, this.counter.decoded)
        : this.chunks.join('');
    }

    this.emit('success', body, response, stats);
  }

  bytes () {
    return {
      network: this.counter.network,
      encoded: this.counter.encoded,
      decoded: this.counter.decoded
    };
  }
}

module.exports = Safety;
