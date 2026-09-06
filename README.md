# Pocket Pitlane

Pocket Pitlane is a free 2–8 player top-down racing game for friends sharing one laptop or TV. A host opens a room on the shared screen, friends open its controller link on their phones, and two ready drivers can start a 90-second race. The host can also use a keyboard.

## Who it is for

It is for a group that wants one short competitive race without an account, app install, chat, or a party-game collection.

## Play it

- Shared screen: `https://pocket-pitlane.sociobot.in`
- Sample sandbox: `https://pocket-pitlane.sociobot.in/demo`
- Phone controller: open the link shown after creating a room.

The first release is free. It does not offer checkout, paid unlocks, accounts, or advertising.

## Controls

- Shared-screen host: Game settings can remap keys. By default, Left/Right steer, Up drives and uses boost, and Escape pauses.
- Phone: hold Left or Right to steer; tap Boost when the shared screen shows a filled car meter. Optional phone tilt asks only after a tap.

A round uses a 90-second race clock. Four moving hazards make each seeded run different. A race ends with an ordered result and can restart from the result screen.

If the shared-screen host reloads during a race, select **Resume saved race**. The active race snapshot stays in that browser and reconnects to its room.

## Run locally

Prerequisites: Node 22+, npm 10+, and Chromium installed for Playwright 1.58.2.

```sh
npm ci
npm run dev
cd realtime && npm ci && PORT=8787 node server.mjs
```

Open `http://127.0.0.1:4173`. The development client uses `ws://127.0.0.1:8787/ws` for the room service. The server writes `pocket-pitlane-room-state.sqlite` in its working directory when `/data` is absent.

## Test and build

```sh
npm run build
npm test
npm run test:realtime
npm run check
```

`npm test` starts a production Vite preview and the local Node room service. It runs desktop and phone-sized browser checks, including the claims in `.factory/claims.json`, offline reload, remapped keyboard use, invalid room recovery, route titles, room joining, and an axe scan. `npm run test:realtime` checks room expiry, SQLite restart persistence, the complete WebSocket room flow, and the 429 plus `Retry-After` allowance.

The realtime service is intentionally separate from static hosting because it owns WebSocket rooms and SQLite state.

## Deploy

Build the static product and deploy it as the product static site:

```sh
npm run build
/opt/fleet/lib/deploy-static.sh pocket-pitlane dist
```

Deploy the owned WebSocket service with durable SQLite storage and one replica:

```sh
WO_DATA_DIR=/data /opt/fleet/lib/deploy-container.sh pocket-pitlane-realtime /work/repo realtime/Dockerfile 8080
```

The client connects to `wss://pocket-pitlane-realtime.sociobot.in/ws` outside local development. The service exposes `/health`, snapshots its SQLite room state to `/data/pocket-pitlane-room-state.sqlite` after each room change, expires rooms after four hours, and permits 20 connection attempts per IP per minute before returning `429 Retry-After: 60`.

## Privacy

Pocket Pitlane has no analytics, ads, third-party scripts, accounts, contact access, camera access, or location access. A real room stores only a random controller token, ready state, and race state. Browser settings and controller tokens stay local. See `/privacy` and `/terms` for the full plain-language policy.

## Product shape

This release deliberately does not include voice chat, physics simulation, cosmetic sales, a game collection, or a social profile. It is one shared-screen race.

## License

MIT. See [LICENSE](LICENSE).
