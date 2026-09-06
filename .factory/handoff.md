# Pocket Pitlane handoff

## Product

Pocket Pitlane is a free 2–8 player top-down race for friends sharing a TV or laptop. The shared screen creates a six-character room. Friends open its controller link on their phones. The first action is **Create room**; **Try it with sample data** opens a four-racer sandbox without setup.

## Implementation and deployment

- Product implementation SHA: `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- Verification documentation SHA: `dab7c89c2cac2d38e855564c3151a44f3f351e1e`.
- Static site: `https://pocket-pitlane.sociobot.in`.
- Product-owned relay: `https://pocket-pitlane-realtime.sociobot.in/health` returned `200` with build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- The relay deployment preserved its existing environment and probes, uses the durable `/data` SQLite share, and remains one replica.

## What was completed

- A shared-screen Canvas race with a 90-second clock, rotating hazards, drafting boost, ordered results, restart, pause, sound setting, steering assist, remappable host keys, touch controls, optional post-tap motion permission, and visible boost meters.
- Real phone controllers use the product-owned WebSocket relay. Rooms are six characters, admit two to eight drivers, survive a relay restart, expire after four hours, and rate-limit connection attempts with `429 Retry-After: 60`.
- Active shared-screen races now save an anonymous browser-local snapshot. After a host refresh, **Resume saved race** reconnects to the room and restores the active timer and car state.
- The demo is isolated under `demo:pocket-pitlane:*`, keeps its persistent banner, contains Mika, Ivo, June, and Remy, and resets without touching real browser data.
- The static site has route-specific titles, Privacy and Terms, security headers, offline demo support, and a real styled HTTP 404 for unknown paths.

## Verification

- Clean setup used `npm ci` and `npm --prefix realtime ci`.
- `npm run check` passed: build, 24 browser checks (two desktop skips are intentional mobile-only checks), and all 7 relay checks.
- Every command in `.factory/claims.json` was run separately and passed, including sample isolation, free play, deterministic results, restart, settings, refresh recovery, offline reload, privacy request scope, keyboard, independent phone controller, room limit, expiry, restart persistence, and rate limiting.
- Local Lighthouse: Performance 100, Accessibility 100; FCP 0.9 s, LCP 1.0 s, TBT 50 ms, CLS 0.
- Initial build assets: JavaScript 33.67 KB raw / 11.00 KB gzip; CSS 10.29 KB raw / 3.12 KB gzip.
- A three-second Playwright iPhone 13 emulation measured 60 fps. This is an emulated-browser measurement, not a public hardware performance claim.
- Final live `verify-url.sh` check: HTTPS 200, load 603 ms, no console errors, title/lang/main present, one h1, no missing image alt text, and no unlabeled buttons.
- Final fresh desktop and phone checks covered the first screen, sample banner and reset, deterministic result screen, independent controller join/ready/start, privacy title, styled 404, and live refresh recovery. No console errors occurred.

Evidence is under `/work/.evidence/pocket-pitlane/`, including desktop, phone, result, recovery, Lighthouse, and live verification captures.

## Earlier history and disposition

No earlier written review report or handoff existed. The repository history was read before changes. Its interrupted relay repairs—durable database path, Azure Files-safe snapshots, root/health readiness, and startup reporting—are present in the final Node relay and were retested through health, persistence, expiry, and rate-limit checks. The later result-list and HTTP 404 findings discovered during this session are fixed and live.

## Known gaps

No known functional gaps remain for the researched first release. The game deliberately has no accounts, chat, ads, payments, physics simulation, or party-game collection. There is no paid offer or billing integration because this first release is free.

## Verification 1

Independent verification report: `.factory/verification-1.md`.

- Verdict: **FAIL** — five public claims lack the required declared observable tests; see F-01 in the report. This is claims coverage, not a failed tested game path.
- Reviewed implementation: `a955346b3e78fd83e3377c572973c15d9c6b94d9`; documentation revision: `1405881` (previous handoff text revision `dab7c89c2cac2d38e855564c3151a44f3f351e1e`).
- In a clean clone, `npm run check` passed (build, 26 browser checks, and 7 relay checks). Every declared claim command was also run separately and passed.
- Fresh live desktop and phone checks confirmed the first screen, isolated demo/reset, deterministic result screen, independent controller join/start, host refresh recovery, route titles, legal pages, reduced motion, live axe, styled HTTP 404, relay health, and the controlled 429/`Retry-After` allowance.
- Evidence is in `/work/.evidence/pocket-pitlane/`. No product code was changed during verification.
