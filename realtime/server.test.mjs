import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import net from 'node:net';
import { WebSocket } from 'ws';
import { createRelay, RoomStore } from './server.mjs';

const disposers = [];
afterEach(async () => {
  while (disposers.length) await disposers.pop()();
});

function databaseFile() {
  return join(mkdtempSync(join(tmpdir(), 'pocket-pitlane-')), 'rooms.sqlite');
}

function id(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

function messageQueue(socket) {
  const queued = [];
  const waiting = [];
  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    const resolve = waiting.shift();
    if (resolve) resolve(message);
    else queued.push(message);
  });
  return {
    next() {
      if (queued.length) return Promise.resolve(queued.shift());
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for a room message')), 2_000);
        waiting.push((message) => { clearTimeout(timeout); resolve(message); });
      });
    }
  };
}

async function openSocket(port) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  disposers.push(async () => socket.close());
  return socket;
}

function rawUpgrade(port, count) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    let response = '';
    socket.setTimeout(2_000, () => reject(new Error('Timed out during upgrade')));
    socket.on('connect', () => socket.write(`GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nX-Forwarded-For: 198.51.100.${count}\r\n\r\n`));
    socket.on('data', (chunk) => {
      response += chunk;
      if (response.includes('\r\n\r\n')) { socket.destroy(); resolve(response); }
    });
    socket.on('error', reject);
  });
}

test('claim_room_limit refuses a ninth driver after the host and seven controllers', () => {
  const store = new RoomStore(databaseFile());
  disposers.push(async () => store.close());
  const room = store.hostRoom(id(1));
  for (let number = 2; number <= 8; number += 1) store.joinRoom(room.code, id(number));
  assert.equal(store.load(room.code).players.length, 8);
  assert.throws(() => store.joinRoom(room.code, id(9)), (error) => error.kind === 'full');
});

test('claim_realtime_persists_after_restart reopens a durable room with its ready controller', () => {
  const durableFile = databaseFile();
  const first = new RoomStore(databaseFile(), durableFile);
  const room = first.hostRoom(id(1));
  first.joinRoom(room.code, id(2));
  first.setReady(room.code, id(2), true);
  const raced = first.start(room.code, id(1));
  first.close();
  const restarted = new RoomStore(databaseFile(), durableFile);
  disposers.push(async () => restarted.close());
  const persisted = restarted.load(room.code);
  assert.equal(persisted.players.length, 2);
  assert.equal(persisted.players.find((player) => player.id === id(2)).ready, true);
  assert.equal(persisted.race.seed, raced.seed);
  assert.equal(persisted.race.duration, 90);
});

test('@claim:realtime-storage-scope keeps only anonymous room identifiers and generated game state in the durable snapshot', () => {
  const durableFile = databaseFile();
  const store = new RoomStore(databaseFile(), durableFile);
  const room = store.hostRoom(id(1));
  store.joinRoom(room.code, id(2));
  store.setReady(room.code, id(2), true);
  store.start(room.code, id(1));
  store.close();

  const snapshot = new DatabaseSync(durableFile);
  const row = snapshot.prepare('SELECT code, host_id, players_json, race_json, seed, created_at, updated_at FROM rooms').get();
  snapshot.close();
  assert.deepEqual(Object.keys(row).sort(), ['code', 'created_at', 'host_id', 'players_json', 'race_json', 'seed', 'updated_at']);
  assert.match(row.code, /^[A-Z2-9]{6}$/);
  assert.match(row.host_id, /^[0-9a-f-]{36}$/i);
  const players = JSON.parse(row.players_json);
  assert.equal(players.length, 2);
  for (const player of players) {
    assert.deepEqual(Object.keys(player).sort(), ['color', 'host', 'id', 'label', 'ready']);
    assert.match(player.id, /^[0-9a-f-]{36}$/i);
    assert.match(player.label, /^(Host|Driver 2)$/);
    assert.match(player.color, /^#[0-9a-f]{6}$/i);
    assert.equal(typeof player.ready, 'boolean');
    assert.equal(typeof player.host, 'boolean');
  }
  const race = JSON.parse(row.race_json);
  assert.deepEqual(Object.keys(race).sort(), ['duration', 'seed', 'startedAt']);
  assert.equal(race.duration, 90);
  assert.equal(typeof race.seed, 'number');
  assert.equal(typeof race.startedAt, 'number');
  assert.doesNotMatch(JSON.stringify(row).toLowerCase(), /"(name|email|contact|phone|camera|location|address)"/);
});

test('claim_room_expiry removes an expired room from the durable snapshot', () => {
  const durableFile = databaseFile();
  const first = new RoomStore(databaseFile(), durableFile);
  const room = first.hostRoom(id(1));
  first.database.prepare('UPDATE rooms SET updated_at = 0 WHERE code = ?').run(room.code);
  first.cleanup();
  first.close();
  const restarted = new RoomStore(databaseFile(), durableFile);
  disposers.push(async () => restarted.close());
  assert.equal(restarted.load(room.code), null);
});

test('claim_realtime_rate_limit returns HTTP 429 with Retry-After after 20 connection attempts', async () => {
  const relay = createRelay({ databasePath: databaseFile() });
  disposers.push(async () => relay.close());
  const port = await relay.listen(0, '127.0.0.1');
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await rawUpgrade(port, 1);
    assert.match(response, /^HTTP\/1\.1 101 /);
  }
  const limited = await rawUpgrade(port, 1);
  assert.match(limited, /^HTTP\/1\.1 429 Too Many Requests/);
  assert.match(limited, /Retry-After: 60/i);
});

test('health reports a ready relay and its build identifier', async () => {
  const relay = createRelay({ databasePath: databaseFile(), buildSha: 'test-build' });
  disposers.push(async () => relay.close());
  const port = await relay.listen(0, '127.0.0.1');
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', build: 'test-build' });
  const root = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);
  assert.deepEqual(await root.json(), { status: 'ok', service: 'pocket-pitlane-realtime' });
});

test('an invalid room request gives a player a next step instead of closing the controller', async () => {
  const relay = createRelay({ databasePath: databaseFile() });
  disposers.push(async () => relay.close());
  const port = await relay.listen(0, '127.0.0.1');
  const controller = await openSocket(port);
  const messages = messageQueue(controller);
  controller.send(JSON.stringify({ type: 'join', room: 'BAD', playerId: id(2) }));
  const response = await messages.next();
  assert.equal(response.type, 'error');
  assert.match(response.error, /not valid\. Try again\./);
});

test('the relay carries an independent controller from join through a started race', async () => {
  const relay = createRelay({ databasePath: databaseFile(), buildSha: 'test-build' });
  disposers.push(async () => relay.close());
  const port = await relay.listen(0, '127.0.0.1');
  const host = await openSocket(port);
  const hostMessages = messageQueue(host);
  host.send(JSON.stringify({ type: 'host', playerId: id(1) }));
  const room = await hostMessages.next();
  assert.equal(room.type, 'room');
  const phone = await openSocket(port);
  const phoneMessages = messageQueue(phone);
  phone.send(JSON.stringify({ type: 'join', room: room.room, playerId: id(2) }));
  const joined = await phoneMessages.next();
  assert.equal(joined.type, 'joined');
  await phoneMessages.next();
  await hostMessages.next();
  phone.send(JSON.stringify({ type: 'ready', ready: true }));
  const updatedHost = await hostMessages.next();
  assert.equal(updatedHost.players.filter((player) => player.ready).length, 2);
  await phoneMessages.next();
  host.send(JSON.stringify({ type: 'start' }));
  const startedHost = await hostMessages.next();
  const startedPhone = await phoneMessages.next();
  assert.equal(startedHost.type, 'race-start');
  assert.equal(startedPhone.type, 'race-start');
  assert.equal(startedHost.players.length, 2);
});
