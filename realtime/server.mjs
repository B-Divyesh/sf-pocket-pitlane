import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer, WebSocket } from 'ws';

const ROOM_TTL_SECONDS = 4 * 60 * 60;
const CONNECTION_LIMIT = 20;
const CONNECTION_WINDOW_SECONDS = 60;
const COLORS = ['#ff795f', '#65c9e8', '#d9f36c', '#ffc95e', '#cf9dff', '#ff94c7', '#70e1ba', '#f3f1e9'];
const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class RoomError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }

  toClientMessage() {
    return {
      missing: 'This room no longer exists. Check the code on the shared screen.',
      full: 'This room already has eight controllers.',
      notHost: 'Only the shared-screen host can start the race.',
      needTwoReady: 'Two ready drivers are needed before the race starts.',
      invalid: 'That room request was not valid. Try again.',
      database: 'The room service could not save this change. Try again.'
    }[this.kind] ?? 'That room request was not valid. Try again.';
  }
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function randomSeed() {
  return randomBytes(4).readUInt32LE(0);
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRoomCode(value) {
  return typeof value === 'string' && /^[A-Z2-9]{6}$/.test(value);
}

function makeCode() {
  return [...randomBytes(6)].map((byte) => ROOM_CODE_CHARACTERS[byte % ROOM_CODE_CHARACTERS.length]).join('');
}

export class RoomStore {
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      PRAGMA journal_mode=DELETE;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        host_id TEXT NOT NULL,
        players_json TEXT NOT NULL,
        seed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rooms_host ON rooms(host_id);
    `);
  }

  close() {
    this.database.close();
  }

  cleanup() {
    this.database.prepare('DELETE FROM rooms WHERE updated_at < ?').run(now() - ROOM_TTL_SECONDS);
  }

  load(code) {
    const row = this.database.prepare('SELECT code, host_id, players_json, seed, created_at, updated_at FROM rooms WHERE code = ?').get(code);
    if (!row) return null;
    try {
      return {
        code: row.code,
        hostId: row.host_id,
        players: JSON.parse(row.players_json),
        seed: Number(row.seed),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at)
      };
    } catch {
      throw new RoomError('database');
    }
  }

  loadByHost(hostId) {
    const row = this.database.prepare('SELECT code FROM rooms WHERE host_id = ? ORDER BY updated_at DESC LIMIT 1').get(hostId);
    return row ? this.load(row.code) : null;
  }

  save(room) {
    this.database.prepare(`INSERT INTO rooms (code, host_id, players_json, seed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET host_id = excluded.host_id, players_json = excluded.players_json,
        seed = excluded.seed, updated_at = excluded.updated_at`).run(
      room.code, room.hostId, JSON.stringify(room.players), room.seed, room.createdAt, room.updatedAt
    );
  }

  newCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = makeCode();
      if (!this.load(code)) return code;
    }
    throw new RoomError('database');
  }

  hostRoom(hostId) {
    if (!isUuid(hostId)) throw new RoomError('invalid');
    this.cleanup();
    const existing = this.loadByHost(hostId);
    if (existing) return existing;
    const timestamp = now();
    const room = {
      code: this.newCode(),
      hostId,
      players: [{ id: hostId, label: 'Host', color: COLORS[0], ready: true, host: true }],
      seed: randomSeed(),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.save(room);
    return room;
  }

  joinRoom(code, playerId) {
    if (!isRoomCode(code) || !isUuid(playerId)) throw new RoomError('invalid');
    this.cleanup();
    const room = this.load(code);
    if (!room) throw new RoomError('missing');
    if (!room.players.some((player) => player.id === playerId)) {
      if (room.players.length >= 8) throw new RoomError('full');
      const ordinal = room.players.length + 1;
      room.players.push({ id: playerId, label: `Driver ${ordinal}`, color: COLORS[(ordinal - 1) % COLORS.length], ready: false, host: false });
    }
    room.updatedAt = now();
    this.save(room);
    return room;
  }

  setReady(code, playerId, ready) {
    const room = this.load(code);
    if (!room) throw new RoomError('missing');
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player || typeof ready !== 'boolean') throw new RoomError('invalid');
    player.ready = ready;
    room.updatedAt = now();
    this.save(room);
    return room;
  }

  start(code, playerId) {
    const room = this.load(code);
    if (!room) throw new RoomError('missing');
    if (room.hostId !== playerId) throw new RoomError('notHost');
    if (room.players.filter((player) => player.ready).length < 2) throw new RoomError('needTwoReady');
    room.seed = randomSeed();
    room.updatedAt = now();
    this.save(room);
    return room;
  }
}

export class RateLimiter {
  constructor(limit = CONNECTION_LIMIT, windowSeconds = CONNECTION_WINDOW_SECONDS) {
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.windows = new Map();
  }

  allow(client, timestamp = now()) {
    const current = this.windows.get(client);
    const window = !current || timestamp - current.openedAt >= this.windowSeconds ? { openedAt: timestamp, count: 0 } : current;
    if (window.count >= this.limit) return false;
    window.count += 1;
    this.windows.set(client, window);
    return true;
  }
}

function allowedOrigin(origin) {
  return !origin || origin === 'https://pocket-pitlane.sociobot.in' || origin === 'http://127.0.0.1:4173' || origin === 'http://localhost:4173';
}

function requestIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress ?? 'unknown';
}

function rejectUpgrade(socket, status, body, headers = {}) {
  const reason = status === 403 ? 'Forbidden' : status === 429 ? 'Too Many Requests' : 'Not Found';
  const responseHeaders = { Connection: 'close', 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), ...headers };
  socket.write(`HTTP/1.1 ${status} ${reason}\r\n${Object.entries(responseHeaders).map(([name, value]) => `${name}: ${value}`).join('\r\n')}\r\n\r\n${body}`);
  socket.destroy();
}

function roomMessage(room) {
  return { type: 'room', room: room.code, players: room.players };
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export function createRelay({ databasePath, buildSha = 'dev', connectionLimit = CONNECTION_LIMIT } = {}) {
  const store = new RoomStore(databasePath ?? (process.env.DATA_DIR ? `${process.env.DATA_DIR}/pocket-pitlane.sqlite` : '/data/pocket-pitlane.sqlite'));
  const rateLimiter = new RateLimiter(connectionLimit);
  const channels = new Map();
  const wss = new WebSocketServer({ noServer: true });
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok', build: buildSha }));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });

  const publish = (code, message) => {
    for (const socket of channels.get(code) ?? []) send(socket, message);
  };

  const subscribe = (code, socket) => {
    const channel = channels.get(code) ?? new Set();
    channel.add(socket);
    channels.set(code, channel);
  };

  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws') return rejectUpgrade(socket, 404, 'Not found');
    if (!allowedOrigin(request.headers.origin)) return rejectUpgrade(socket, 403, 'This origin cannot open a room controller.');
    if (!rateLimiter.allow(requestIp(request))) return rejectUpgrade(socket, 429, 'Too many connection attempts. Wait a minute and try again.', { 'Retry-After': '60' });
    wss.handleUpgrade(request, socket, head, (websocket) => wss.emit('connection', websocket));
  });

  wss.on('connection', (socket) => {
    let roomCode = null;
    let playerId = null;
    socket.on('message', (raw) => {
      let command;
      try {
        command = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: 'error', error: 'That controller message was not valid. Rejoin the room.' });
        return;
      }
      try {
        if (!command || typeof command.type !== 'string') throw new RoomError('invalid');
        if (command.type === 'host') {
          if (roomCode) throw new RoomError('invalid');
          const room = store.hostRoom(command.playerId);
          roomCode = room.code;
          playerId = command.playerId;
          subscribe(roomCode, socket);
          send(socket, roomMessage(room));
        } else if (command.type === 'join') {
          if (roomCode) throw new RoomError('invalid');
          const room = store.joinRoom(command.room, command.playerId);
          roomCode = room.code;
          playerId = command.playerId;
          subscribe(roomCode, socket);
          send(socket, { type: 'joined', room: room.code, playerId });
          publish(room.code, roomMessage(room));
        } else if (command.type === 'ready') {
          if (!roomCode || !playerId) throw new RoomError('invalid');
          const room = store.setReady(roomCode, playerId, command.ready);
          publish(room.code, roomMessage(room));
        } else if (command.type === 'start') {
          if (!roomCode || !playerId) throw new RoomError('invalid');
          const room = store.start(roomCode, playerId);
          publish(room.code, { type: 'race-start', players: room.players, seed: room.seed });
        } else if (command.type === 'input') {
          if (!roomCode || !playerId || !Number.isFinite(command.steer)) throw new RoomError('invalid');
          publish(roomCode, { type: 'input', playerId, steer: Math.max(-1, Math.min(1, command.steer)), throttle: Boolean(command.throttle), boost: Boolean(command.boost) });
        } else if (command.type === 'ping') {
          send(socket, { type: 'pong' });
        } else {
          throw new RoomError('invalid');
        }
      } catch (error) {
        send(socket, { type: 'error', error: error instanceof RoomError ? error.toClientMessage() : new RoomError('database').toClientMessage() });
      }
    });
    socket.on('close', () => {
      if (!roomCode) return;
      const channel = channels.get(roomCode);
      channel?.delete(socket);
      if (channel?.size === 0) channels.delete(roomCode);
    });
  });

  return {
    server,
    store,
    async listen(port = Number(process.env.PORT ?? 8080), host = '0.0.0.0') {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => { server.off('error', reject); resolve(); });
      });
      return server.address().port;
    },
    async close() {
      for (const client of wss.clients) client.terminate();
      await new Promise((resolve) => server.close(() => resolve()));
      store.close();
    }
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const databasePath = process.env.DATA_DIR
    ? `${process.env.DATA_DIR}/pocket-pitlane.sqlite`
    : (process.env.DATABASE_PATH ?? (existsSync('/data') ? '/data/pocket-pitlane.sqlite' : 'pocket-pitlane.sqlite'));
  const relay = createRelay({ databasePath, buildSha: process.env.BUILD_SHA ?? 'dev' });
  relay.listen().then((port) => console.log(JSON.stringify({ event: 'startup', port, database: databasePath, build: process.env.BUILD_SHA ?? 'dev' }))).catch((error) => {
    console.error(JSON.stringify({ event: 'startup-error', error: 'The room service could not start.' }));
    console.error(error);
    process.exitCode = 1;
  });
}
