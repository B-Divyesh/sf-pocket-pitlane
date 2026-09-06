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

## Repair 1

### Status

**PASS.** The five untested public promises from Verification 1 now each have a declared, observable outcome test. The static implementation deployed to the live product is `8953c47ee08f51040d3b650399fbc2969bdee14b`. The prior claims-and-test documentation revision is `4d9e8fecab7c93a77f044815569babfa38bfd83b`; this handoff revision follows it.

### What changed

- Added five entries to `.factory/claims.json` and five outcome tests:
  - Motion permission is not requested before a phone tap; denied permission still sends a touch-steering frame.
  - The rendered Canvas contains four moving hazards and distinct seeded runs render different hazard positions.
  - A complete host-plus-phone room flow requests only the product site and its owned relay.
  - Home and controller routes do not invoke contact, camera, or location APIs.
  - A durable SQLite room record contains only the permitted anonymous room, generated player-state, and race-state fields.
- The sample test fixture now accepts deterministic seed input only through unlinked verification query parameters documented in `.factory/demo.md`.
- Corrected the privacy wording to include the generated game fields the relay actually stores: room code, timestamps, generated labels/colors, ready state, race state, and random controller tokens.
- Fixed a minor demo recovery defect found during live verification: **Reset demo** now announces `Sample reset. Nothing was saved.` instead of updating a missing status node.
- `.factory/catalog-description.txt` remains the plain verb-first description, and the same text was copied to `/work/.evidence/catalog-description.txt`.

### Verification

- Clean setup: `npm ci`, then `npm --prefix realtime ci`.
- Every one of the 19 commands declared in `.factory/claims.json` was run separately. All passed. The final reset-feedback change also reran `@claim:sample-sandbox`.
- Final `npm run check` passed: production build, 32 browser tests passed with 2 intentional desktop skips for phone-only checks, and all 8 relay tests passed.
- Build output: JavaScript 33.99 KB raw / 11.10 KB gzip; CSS 10.29 KB raw / 3.12 KB gzip.
- Static deployment completed successfully for `8953c47ee08f51040d3b650399fbc2969bdee14b`. The product URL returned HTTPS 200.
- Fresh live desktop check found the game canvas, `Race with friends on one shared screen`, the audience sentence, and **Create room** before scrolling. Fresh live phone check joined an independent real room, marked ready, enabled the host start action, and exposed a 98 px steering target.
- Live demo verification entered through the visible sample action, retained `Demo — sample data, nothing is saved`, showed four named racers, reset with its new confirmation, preserved a real-storage sentinel, and reached the four-finisher `Race results` end screen through the deterministic run.
- Live Privacy and Terms had their route titles, one h1, and main landmark. `/not-a-pitlane-route` returned the deliberate styled HTTP 404. No console errors occurred.
- Final `verify-url.sh` result: HTTPS 200, 594 ms load, title/lang/main present, one h1, no image-alt omissions, and no unlabeled buttons. Live Playwright axe found no serious or critical issues on home or controller. The standalone axe CLI was unavailable because this container has no system Chrome binary; the repository’s Playwright axe integration used its installed browser instead.
- The unchanged realtime service remained on its already-deployed implementation `a955346b3e78fd83e3377c572973c15d9c6b94d9`; live `/health` returned 200. A controlled same-origin allowance run opened 20 WebSockets and received `429 Retry-After: 60` on attempts 21–22.
- Current screenshots, verification JSON, relay health response, and route captures are in `/work/.evidence/pocket-pitlane/repair-1/`.

### Verification 1 finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| F-01.1 Motion permission and touch fallback | Covered by `phone-motion-touch-fallback`; pass. |
| F-01.2 Four seeded moving hazards | Covered by `seeded-hazards`; pass. |
| F-01.3 No ads, analytics, or third-party scripts | Covered by `real-room-request-scope`; pass. |
| F-01.4 No contact, camera, or location access | Covered by `no-device-data-access`; pass. |
| F-01.5 Real-room data scope | Covered by `realtime-storage-scope`; pass. |

### Known gaps

There are no known release-blocking gaps. The product remains intentionally free and has no accounts, chat, advertisements, payments, voice chat, physics simulation, or party-game collection. No billing metadata is needed because no offer is advertised.
