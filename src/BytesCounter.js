'use strict';

const bytes = Buffer.byteLength;

class Counter {
  constructor (req, onUpdate) {
    this.sockets = new Map();
    this.listeners = [];
    this.onUpdate = onUpdate;
    this.stopped = false;

    this.responseSize = 0;
    this.dataSize = 0;

    this.addListener(req, 'socket', this.onSocket);
    this.addListener(req, 'response', this.onResponse);
    this.addListener(req, 'data', this.onData);
  }

  onSocket (socket) {
    this.addListener(socket, 'data', this.onSocketData, socket);
  }

  onSocketData (socket, chunk) {
    this.sockets.set(socket, {
      read: socket.bytesRead,
      written: socket.bytesWritten
    });

    this.emitUpdate('onSocketData');
  }

  onSocketClose (socket, chunk) {
    const previous = this.sockets.get(socket);
    const same = (socket.bytesRead === previous.read)
              && (socket.bytesWritten === previous.written);

    if (same)
      return;

    this.sockets.set(socket, {
      read: socket.bytesRead,
      written: socket.bytesWritten
    });

    this.emitUpdate('onSocketClose');
  }

  onResponse (response) {
    this.addListener(response, 'data', this.onResponseData);
  }

  onResponseData (chunk) {
    this.responseSize += bytes(chunk);
    this.emitUpdate('onResponseData');
  }

  onData (chunk) {
    this.dataSize += bytes(chunk);
    this.emitUpdate('onData');
  }

  emitUpdate (sender) {
    if (!this.stopped)
      this.onUpdate(sender, this.bytes());
  }

  addListener (emitter, event, method, ...methodArgs) {
    const listener = method.bind(this, ...methodArgs);
    this.listeners.push({emitter, event, listener});
    emitter.on(event, listener);
  }

  cleanListeners () {
    this.listeners.forEach(({emitter, event, listener}) => {
      emitter.removeListener(event, listener);
    });
  }

  stop () {
    this.stopped = true;
    this.cleanListeners();
    this.sockets.clear();
  }

  bytes () {
    let networkRead = 0;
    let networkWritten = 0;

    this.sockets.forEach((val, key) => {
      networkRead += val.read;
      networkWritten += val.written;
    });

    return {
      networkRead,
      networkWritten,
      encoded: this.responseSize,
      decoded: this.dataSize
    };
  }
}

module.exports = Counter;
