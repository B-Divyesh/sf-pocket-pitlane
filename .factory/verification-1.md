# Pocket Pitlane verification 1

## Verdict: FAIL

The live product and the reviewed implementation work on the tested paths, but this verification cannot pass because five public claims have no declared observable test. The required result is FAIL whenever any public claim is untested.

## Scope and versions

- Job: let friends sharing a TV or laptop run a short, shared-screen race with phones as controllers and no app install.
- Audience: friends gathered around one shared screen.
- First action before scrolling: **Create room**. The fresh desktop and phone checks found the game canvas, the job headline, audience sentence, Create room, and Try it with sample data on the first screen.
- Live URL: `https://pocket-pitlane.sociobot.in`.
- Implementation reviewed: `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- Documentation revision reviewed: `1405881` (the previous verification handoff text is `dab7c89c2cac2d38e855564c3151a44f3f351e1e`).
- The live shell referenced `assets/index-BfUbp5p_.js` and `assets/index-BXyTk74T.css`, matching a clean build of the implementation candidate. Live relay health returned build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.

## Evidence and checks

### Clean checkout

I made a clean clone of the committed checkout, ran `npm ci` and `npm --prefix realtime ci`, then ran `npm run check` once. It passed: build completed, 26 Playwright checks passed, and 7 relay checks passed.

I also ran every command declared in `.factory/claims.json` separately. All 14 entries passed:

- `sample-sandbox`, `free-first-release`, `race-reaches-end`, `restart-resets-race`, `settings-persist`, `race-recovery`, `offline-demo`, `demo-private`, `keyboard-controls`, and `phone-controllers`.
- `room-limit`, `room-expiry`, `realtime-persistence`, and `realtime-rate-limit`.

### Live desktop and phone

- A fresh desktop page had title `Pocket Pitlane — Race on one shared screen`, one plain-language h1, the canvas, Create room, and the sample action before scrolling.
- The sample action opened `/demo`, showed the persistent `Demo — sample data, nothing is saved` label, displayed four named racers, and Reset demo left a pre-existing real settings key unchanged while removing the demo settings key.
- A live deterministic sample run reached the actual Race results screen with four ordered finishers and Race again. This is the recorded entry → active race → end-screen run.
- A fresh independent iPhone-sized controller joined a new live room, became ready, enabled Start 90-second race after host synchronization, and exposed a 98 px steering target. The host started the race, saved a local active-race snapshot, refreshed, selected Resume saved race, and restored at 89 seconds. No console errors occurred.
- The invalid four-character controller code gave `Enter all six room characters.` with the next action clear.
- Privacy and Terms each had their route-specific title, one h1, and main landmark. An unknown route returned deliberate HTTP 404 with the styled Page not found page; this is expected behavior, not a defect.
- The home and controller pages had no serious or critical axe violations in live checks. Reduced-motion media was honored. The live page produced no console errors. Internal route links returned 200; the explicit unknown route returned 404.
- The live relay health endpoint returned 200. In a controlled same-client-origin allowance check, upgrade attempts 1–20 opened and 21–22 returned `429` with `Retry-After: 60`.

Artifacts are in `/work/.evidence/pocket-pitlane/`, including first-screen desktop, demo, result, real recovery screenshots, live axe output, relay health headers, and rate-limit output.

## Earlier findings and disposition

No earlier standalone review or verification report exists. The earlier handoff described the durable-relay, result-list, HTTP 404, and host-refresh repairs. The present checks exercised their current disposition: local relay expiry and restart-persistence tests passed, live health exposed the candidate build, live 404 was deliberate and styled, a real two-client room started, and the refreshed host recovered the active race.

## Findings

### F-01 — Medium — five public claims are untested

The claims contract requires every visitor-facing claim to have a matching `@claim:` test that asserts its observable result. The following public promises are absent from `.factory/claims.json` and have no matching test:

1. **Phone motion permission and touch fallback** — README Controls and Privacy say motion is requested only after a tap and touch steering works without permission. Add a browser test that verifies no motion permission request before the action, the request after it, and usable touch fallback when permission is denied.
2. **Four seeded moving hazards** — README says there are four moving hazards and each seed varies the run. Add a deterministic game test that observes four hazards and proves the documented seeded variation.
3. **No ads, analytics, or third-party scripts** — Privacy says this for the game generally. `demo-private` records only a deterministic demo flow, so it does not cover normal shared-room and controller pages. Add request-recording coverage for those pages and their real room flow.
4. **No contact, camera, or location access** — README and the home privacy copy make this promise. Add a browser permissions/API test across home and controller routes.
5. **Real-room data scope** — Privacy says the relay stores only a random controller token, ready state, and race state. Add a relay storage-contract test against the durable snapshot that asserts the permitted fields and rejects identity/contact fields.

`untested_claim_count` is therefore **5**. No product-code repair was made because this assignment is verification-only.

