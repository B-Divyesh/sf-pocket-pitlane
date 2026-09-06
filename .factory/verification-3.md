# Run a shared-screen phone-controlled race — Verification 3

## Verdict: PASS

Pocket Pitlane has zero findings and zero untested declared claims in this independent verification.

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**. Fresh desktop and phone checks found the game canvas, job headline, audience sentence, Create room, and Try it with sample data on the first screen.

## Versions reviewed

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation candidate: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`
- Documentation revision supplied for this review: `0dc2a2d`
- Current factory-wrapper revision: `a6f79263fe3dba16034ba2b800f0dc0f206ee587`
- Live shell asset: `assets/index-C2HFoYNi.js`, matching a clean build of `b3c9efb`.
- Live relay health: HTTP 200, build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.

The later wrapper and Graphify-only changes do not alter the reviewed product image. Pre-existing `graphify-out` changes were left untouched.

## Clean checkout and claim commands

A fresh detached checkout of `b3c9efb` completed `npm ci` and `npm --prefix realtime ci` with zero audit vulnerabilities.

- `npm run check` passed: production build, 32 browser tests passed, 2 intentional mobile-only desktop skips, and 8 relay tests passed.
- The build produced `dist/`: JavaScript 34.02 KB raw / 11.11 KB gzip; CSS 10.29 KB raw / 3.12 KB gzip.
- All 19 commands declared by `.factory/claims.json` were run separately and passed.
- The tag audit found exactly one `@claim:<id>` tag for each of the 19 claims.

The command transcript is `/work/.evidence/pocket-pitlane-verify-3/claims.txt`; the tag audit is `claim-tag-audit.json`; the full check output is `check.txt`.

## Live product checks

- Fresh desktop: title, one h1, main landmark, job, audience, Create room, sample action, and the playable canvas were above the fold. No console errors occurred.
- Fresh phone: an independent phone opened the room link, joined, marked ready, enabled the host start action, and started a real two-client race. Its left steering target measured 153 × 98 CSS px.
- The one-click sample showed Mika, Ivo, June, and Remy with the persistent `Demo — sample data, nothing is saved` label. Reset announced `Sample reset. Nothing was saved.`, removed demo state, and preserved a real-storage sentinel.
- A deterministic sample run went from entry through active play to the actual `Race results` end screen with four ordered finishers and a restart action.
- Invalid room input gave `Enter all six room characters.` with recovery available.
- The demo reloaded offline after its first visit. The first keyboard focus was the skip link. Reduced-motion media applied 0.01 ms transition durations.
- Live axe found zero violations on both home and controller pages, including zero serious or critical violations.
- Privacy and Terms had their route titles, one h1, and main landmark. The privacy page provides the stated Param Factory operator path for privacy requests.
- Internal routes worked. `/not-a-pitlane-route` returned the deliberate styled HTTP 404 with `Page not found`; this is expected behavior, not a defect.
- Live response headers included CSP with response-header `frame-ancestors 'none'`, Referrer-Policy, X-Content-Type-Options, and a restrictive Permissions-Policy.
- The live relay returned health HTTP 200. A controlled run opened attempts 1–20 and received HTTP 429 with `Retry-After: 60` for attempts 21–22.
- A three-second phone-sized headless browser measurement recorded 181 frames in 3010.9 ms, or 60.11 fps. This is an emulated-browser check, not a hardware performance promise.

Screenshots and machine-readable live evidence are in `/work/.evidence/pocket-pitlane-verify-3/`.

## Earlier findings and disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1 motion permission and touch fallback | `phone-motion-touch-fallback` is declared, exactly tagged, and passed. |
| Verification 1 F-01.2 four moving seeded hazards | `seeded-hazards` is declared, exactly tagged, and passed. |
| Verification 1 F-01.3 real-room request scope | `real-room-request-scope` is declared, exactly tagged, and passed. |
| Verification 1 F-01.4 contact, camera, and location access | `no-device-data-access` is declared, exactly tagged, and passed. |
| Verification 1 F-01.5 durable room storage scope | `realtime-storage-scope` is declared, exactly tagged, and passed. |
| Earlier reset-feedback defect | Reset announces that sample data was not saved and preserves real browser state. |
| Verification 2 F-02 relay claim tags | `room-limit`, `room-expiry`, `realtime-persistence`, and `realtime-rate-limit` each have an exact tag, a tag-selected command, and a passing observable test. |

## Counts

- Findings: **0**
- Untested claims: **0**
- Verdict: **PASS**
