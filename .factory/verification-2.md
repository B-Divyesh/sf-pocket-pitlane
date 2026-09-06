# Verify the shared-screen phone-controlled race — Verification 2

## Verdict: FAIL

Pocket Pitlane works on the independently tested game, demo, room, relay, accessibility, and recovery paths. However, four declared public realtime claims do not have the required `@claim:<id>` tag in a test. The claims contract requires exactly one such tag for every claim. This is one medium-severity claim-contract finding covering four untestable-by-identifier claims. Therefore the release cannot receive PASS.

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers and no app installation.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**. A fresh desktop page showed the canvas, the headline, the audience sentence, Create room, and Try it with sample data above the fold. The primary game screen is visible immediately.

## Scope and versions

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation reviewed: `8953c47ee08f51040d3b650399fbc2969bdee14b`
- Documentation revision: `c080e91302d18a0965f755e896b490589c7c9dbf`
- Current factory wrapper commit: `8ad2dca7118a92a48e51461fed569eb862cb20e7`
- Realtime relay health build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`

The live homepage referenced `assets/index-CvKVj2qS.js` and `assets/index-BXyTk74T.css`, exactly matching a clean build of the reviewed static candidate.

## Clean setup and claims

I made a fresh local clone of the committed checkout, ran `npm ci` and `npm --prefix realtime ci`, then ran `npm run check`. It passed: production build, 32 passing browser tests, two intentional mobile-only skips, and 8 passing relay tests.

I then ran every command declared in `.factory/claims.json` separately. All 19 commands exited 0:

| Claim | Command outcome |
| --- | --- |
| sample-sandbox | pass |
| free-first-release | pass |
| race-reaches-end | pass |
| restart-resets-race | pass |
| settings-persist | pass |
| race-recovery | pass |
| offline-demo | pass |
| demo-private | pass |
| keyboard-controls | pass |
| phone-controllers | pass |
| room-limit | pass |
| room-expiry | pass |
| realtime-persistence | pass |
| realtime-rate-limit | pass |
| phone-motion-touch-fallback | pass |
| seeded-hazards | pass |
| real-room-request-scope | pass |
| no-device-data-access | pass |
| realtime-storage-scope | pass |

The complete command transcript is `/work/.evidence/pocket-pitlane-verify-2-claims-local.txt`.

## Live product checks

- Fresh desktop and phone contexts had no console or page errors.
- The live demo opened from the first-screen sample action, retained **Demo — sample data, nothing is saved**, displayed Mika, Ivo, June, and Remy, and Reset demo announced **Sample reset. Nothing was saved.** A real-storage sentinel stayed `real-data-kept`; no demo keys remained after reset.
- A deterministic demo run went from entry through active play to the actual **Race results** screen with all four ordered finishers. The recorded result named June as winner with four listed placements.
- A fresh iPhone-sized client joined independent real room `3X6GS8`, became ready, enabled the host start action, and the host reached the Get ready state with a 90-second timer. The phone's left steering target measured 153 × 98 CSS pixels.
- Invalid controller input gave the recoverable message **Enter all six room characters.**
- The live demo reloaded offline after its first visit and retained its demo banner. The skip link navigated to `#main`; reduced-motion media matched and reduced all transition and animation durations to 0.01 ms.
- Live axe on the home screen found zero violations, including zero serious or critical violations. Route checks found one `h1`, one `main`, and the correct title on `/`, `/demo`, `/privacy`, `/terms`, and `/controller`.
- Privacy and Terms loaded correctly. The site explains that it asks for no personal identity, contacts, camera, or location; local settings and anonymous controller tokens remain in-browser. The privacy page directs a privacy request to the Param Factory operator through the product listing.
- All discovered in-site links returned 200. `robots.txt` and `sitemap.xml` include the published routes. `/not-a-pitlane-route` returned a deliberate, styled HTTP 404 with an accessible Page not found route; this is expected behavior, not a defect.
- Static headers included CSP, `frame-ancestors 'none'`, `X-Content-Type-Options`, Referrer-Policy, and a restrictive Permissions-Policy. Relay `/health` returned 200 and the expected deployed build.
- A controlled live relay allowance run opened WebSockets 1–20 and received HTTP 429 with `Retry-After: 60` for attempts 21 and 22.

Screenshots and machine-readable captures are in `/work/.evidence/pocket-pitlane-verify-2/`, including the first-screen desktop view, phone controller, demo reset, results screen, routes, headers, axe result, offline reload, and live rate-limit response.

## Earlier findings and disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1: post-tap motion permission and denied-permission touch fallback | `phone-motion-touch-fallback` is now declared, tagged, and passed. |
| Verification 1 F-01.2: four moving seeded hazards | `seeded-hazards` is now declared, tagged, and passed. |
| Verification 1 F-01.3: real-room request scope | `real-room-request-scope` is now declared, tagged, and passed. |
| Verification 1 F-01.4: no contact, camera, or location access | `no-device-data-access` is now declared, tagged, and passed. |
| Verification 1 F-01.5: durable room storage scope | `realtime-storage-scope` is now declared, tagged, and passed. |
| Earlier minor reset-feedback defect | Live Reset demo now announces **Sample reset. Nothing was saved.** and preserves real storage. |

## Finding

### F-02 — Medium — four declared realtime claims lack the required test tags

The claims contract requires each public claim to have exactly one test tagged `@claim:<id>`. The clean command audit found no matching tag in either test file for these declared claims:

- `room-limit`
- `room-expiry`
- `realtime-persistence`
- `realtime-rate-limit`

Their commands do run and passed because the relay tests instead use untagged names such as `claim_room_limit` and command-specific `--test-name-pattern` values. That is useful execution evidence but does not satisfy the required public-claim identifier contract. Add the four exact `@claim:` tags to the corresponding relay tests (and retain the existing observable assertions). No product code change was made by this verifier.

## Counts

- Findings: **1**
- Untested claims under the required `@claim:<id>` contract: **4**
- Verdict: **FAIL**
