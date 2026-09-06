# Run a shared-screen phone-controlled race — Review 1

## Verdict: PASS

**PASS — 0 findings and 0 untested claims.**

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers and no app installation.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**. Fresh desktop and phone browser contexts showed the playable race board, the job headline, the audience sentence, Create room, and Try it with sample data on the first screen.

## Versions and scope

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation candidate: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`
- Documentation baseline reviewed: `d72f93b` (`docs: add verification 3 report`)
- Current factory wrapper: `5e3184200197ede44bbd5d389dcba2f597ef376b`
- Live static assets: `assets/index-C2HFoYNi.js` and `assets/index-BXyTk74T.css`; these match a clean production build of `b3c9efb`.
- Live product-owned relay health: HTTP 200, build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.

Later wrapper and pre-existing `graphify-out` worktree changes were not treated as product changes and were not modified.

## Clean checkout and claims

A fresh detached clone at `b3c9efb` completed the documented `npm ci` and `npm --prefix realtime ci` setup with zero audit vulnerabilities. `npm run check` completed its production build, 34 Playwright checks, and 8 realtime checks successfully. The output was 34.02 KB JavaScript raw / 11.11 KB gzip and 10.29 KB CSS raw / 3.12 KB gzip.

All 19 claim-manifest entries passed from that checkout. There are 18 distinct declared command strings because `sample-sandbox` and `free-first-release` deliberately share the same observable test command. The claim-tag audit found exactly one `@claim:<id>` tag for every entry.

| Claim coverage | Result |
| --- | --- |
| sample-sandbox; free-first-release; race-reaches-end; restart-resets-race; settings-persist; race-recovery; offline-demo; demo-private; keyboard-controls; phone-controllers | pass |
| room-limit; room-expiry; realtime-persistence; realtime-rate-limit; realtime-storage-scope | pass |
| phone-motion-touch-fallback; seeded-hazards; real-room-request-scope; no-device-data-access | pass |

The browser claim commands exercised the real outcomes, including a 90-second deterministic finish, fresh restart, settings reload, independent controller join, denied-motion touch fallback, four moving seeded hazards, offline reload, request scope, and browser API non-use. The relay commands proved the eighth-driver cap, expiry cleanup, SQLite restart persistence, durable storage scope, and rate limit.

## Fresh live checks

- Desktop: title `Pocket Pitlane — Race on one shared screen`, one h1, one main landmark, canvas, Create room, and the sample action were present at scroll position zero. No console errors occurred.
- Demo: the visible one-click action opened `/demo`; its persistent label read `Demo — sample data, nothing is saved`; Mika, Ivo, June, and Remy were populated. Reset announced `Sample reset. Nothing was saved.`, removed demo settings, and preserved a real-storage sentinel.
- Complete run: `/demo?test-run=1` reached the actual Race results end screen. The recorded ordered result was June 4.09 laps, Ivo 4.06, Remy 4.06, Mika 3.93; Race again was visible. Evidence: `/work/.evidence/pocket-pitlane-review-1/live-result-screen.png`.
- Real room: an independent 390×844 phone context opened the host's live controller link, joined, readied, and permitted host race start. The left steering target measured 153×98 CSS px. The host saved an active race snapshot; after reload, Resume saved race restored the live timer at 89 seconds. Evidence: `/work/.evidence/pocket-pitlane-review-1/live-phone-controller.png`.
- Invalid and recovery paths: an incomplete code showed `Enter all six room characters.` with a next step. The host-refresh path above restored an active race. The demo reloaded offline after its service-worker-controlled first visit.
- Accessibility: the first keyboard focus was `Skip to game and content`; reduced-motion media matched; live Axe found zero serious or critical violations on home and phone controller. The first-screen, demo, result, and phone screenshots were inspected visually; no layout or contrast defect was found.
- Routes and links: `/`, `/demo`, `/privacy`, `/terms`, and `/controller` returned 200 with their route titles, one h1, and main landmark. Discovered internal links returned 200. `/not-a-pitlane-route` returned the intentional styled HTTP 404 with Page not found; this is expected behavior, not a defect.
- Privacy and security: home and controller made no console errors; headers include CSP with response-header `frame-ancestors 'none'`, Referrer-Policy, X-Content-Type-Options, and restrictive Permissions-Policy. The privacy route provides the stated factory-operator privacy-request path. The locally exercised request-scope and device-access claims passed.
- Relay: live `/health` returned 200. In a controlled allowance check, 17 upgrades opened from this reviewer IP (three prior room-flow attempts had already consumed the remaining allowance); the next five returned HTTP 429 with `Retry-After: 60`. This proves the live limit and retry header.
- Frame measurement: a phone-sized headless active race produced 181 frames in 3010.3 ms, 60.13 fps. This is a reviewer measurement, not a public performance promise.

## Earlier findings and disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1 motion permission and touch fallback | Declared, exactly tagged, and passing. |
| Verification 1 F-01.2 four seeded moving hazards | Declared, exactly tagged, and passing. |
| Verification 1 F-01.3 real-room request scope | Declared, exactly tagged, and passing. |
| Verification 1 F-01.4 contact, camera, and location access | Declared, exactly tagged, and passing. |
| Verification 1 F-01.5 durable room storage scope | Declared, exactly tagged, and passing. |
| Earlier demo-reset feedback defect | Reset announces that nothing was saved and preserves real browser storage. |
| Verification 2 F-02 relay claim tags | All four relay claims have one exact tag, a tag-selected command, and passing observable tests. |
| Verification 3 PASS | Independently rechecked above; confirmed. |

## Counts

- Findings: **0**
- Untested claims: **0**
- Verdict: **PASS**
