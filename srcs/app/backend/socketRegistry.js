import { EventEmitter } from 'events';

export class SocketRegistry extends EventEmitter {
  #sockets = new Map();

  add(userId, ws) {
    this.#sockets.set(userId, ws);
    this.emit('added', userId, ws);
  }

  remove(userId) {
    const ws = this.#sockets.get(userId);
    this.#sockets.delete(userId);
    this.emit('removed', userId, ws);
  }

  has(userId) {
    return this.#sockets.has(userId);
  }

  get(userId) {
    return this.#sockets.get(userId);
  }

  broadcast(type, payload) {
    const msg = JSON.stringify({ type, payload });
    for (const ws of this.#sockets.values()) ws.send(msg);
  }
}
