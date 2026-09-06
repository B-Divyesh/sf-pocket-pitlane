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

**PASS.** The five untested public promises from Verification 1 now each have a declared, observable outcome test. The static implementation deployed to the live product is `8953c47ee08f51040d3b650399fbc2969bdee14b`. The claims-and-test documentation revision is `4d9e8fecab7c93a77f044815569babfa38bfd83b`; the post-deployment handoff verification report is `4c3b82bd869e2f2b8c1f53d82e6395f130849b77`.

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

## Verification 2

Independent verifier report: `.factory/verification-2.md`.

- Verdict: **FAIL**.
- Reviewed static implementation: `8953c47ee08f51040d3b650399fbc2969bdee14b`; documentation revision: `c080e91302d18a0965f755e896b490589c7c9dbf`; unchanged relay build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- A fresh clone completed `npm ci`, `npm --prefix realtime ci`, `npm run check`, and all 19 declared claim commands successfully. The command transcript is `/work/.evidence/pocket-pitlane-verify-2-claims-local.txt`.
- Fresh live desktop and phone checks confirmed the above-fold game, isolated labeled demo/reset, complete results screen, independent real controller room start, invalid-code recovery, offline demo reload, keyboard/focus/reduced-motion behavior, zero serious/critical axe findings, legal routes, links, styled HTTP 404, relay health, and 20-connection allowance followed by `429 Retry-After: 60`.
- Verification 1's five claim-coverage findings and the earlier reset-feedback minor defect are now demonstrably repaired.
- New F-02 remains: `room-limit`, `room-expiry`, `realtime-persistence`, and `realtime-rate-limit` have runnable passing commands but no exact `@claim:<id>` test tags. This violates the claims contract and leaves four claims untestable by the mandated identifier. No code was changed during verification.

## Repair 2

### Status

**PASS.** Verification 2 F-02 is closed. Each declared public claim now has exactly one matching `@claim:<id>` tag in an outcome-based test.

### Versions and deployment

- Claim-contract implementation SHA: `6bc2734342da329963b865d6b8f2064c842e7fa7`.
- Final static deployment candidate SHA: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`.
- Verification 2 report/factory wrapper SHA: `342d9d6eff41e827769675d5b1e76f0b42dd22b0`.
- The product-owned relay is unchanged at `a955346b3e78fd83e3377c572973c15d9c6b94d9`; live `/health` returned `200`. Its durable `/data` SQLite volume, probes, and one-replica configuration were not changed.
- Static deployment completed successfully. The final live shell references `assets/index-C2HFoYNi.js`.

### What changed

- Tagged the existing observable relay tests as `@claim:room-limit`, `@claim:room-expiry`, `@claim:realtime-persistence`, and `@claim:realtime-rate-limit`.
- Changed the four declared relay commands to select those exact public identifiers, so the claims manifest, command, test name, and asserted outcome agree.
- Updated development-only Vite from 7.1.7 to 7.3.6. Both production and development dependency audits now report zero vulnerabilities.

### Verification

- From the documented clean setup, `npm ci` and `npm --prefix realtime ci` succeeded. All 19 commands declared in `.factory/claims.json` were then run separately and passed.
- `npm run check` passed: production build, 32 browser checks passed, two intentional desktop skips remain for mobile-only checks, and all 8 relay checks passed.
- The four repaired relay tests prove the ninth driver is refused after eight, an expired durable room is unavailable after cleanup, a ready controller and race record survive restart, and attempts 21–22 receive `429` plus `Retry-After: 60`.
- Final build output: JavaScript 34.02 KB raw / 11.11 KB gzip; CSS 10.29 KB raw / 3.12 KB gzip.
- Final `verify-url.sh` result: HTTPS 200, 598 ms load, no console errors, title/lang/main present, one h1, no missing image alt text, and no unlabeled buttons. Playwright Axe on fresh home and phone controller pages found zero serious or critical violations.
- Fresh desktop and phone contexts loaded the final asset with the game canvas, job headline, audience sentence, **Create room**, and **Try it with sample data** on the first screen. Both had no console errors.
- Final live sample verification entered through the visible sample action, showed four named racers and the persistent `Demo — sample data, nothing is saved` label, reset with its confirmation while preserving a real-storage sentinel, and reached the four-finisher `Race results` screen through the deterministic run.
- A fresh independent phone joined a real room, marked ready, enabled the host action, and started the two-driver race. The measured left steering control was 153 × 98 CSS pixels.
- Live checks also covered the keyboard skip link, reduced-motion preference, offline demo reload, internal links, Privacy and Terms route titles, and the styled deliberate HTTP 404. The HTTP 404 is expected behavior, not a defect.
- A controlled live relay allowance opened 20 upgrades and received `429 Retry-After: 60` on attempts 21–22.

Evidence is in `/work/.evidence/pocket-pitlane-repair-2/`. `.factory/catalog-description.txt` was copied unchanged to `/work/.evidence/catalog-description.txt`.

### Finding disposition

| Finding | Disposition |
| --- | --- |
| Verification 1 F-01.1–F-01.5 | Still covered by their declared outcome tests; all pass. |
| Earlier reset feedback defect | Still fixed; reset announces that nothing was saved and preserves real storage. |
| Verification 2 F-02 | Fixed: `room-limit`, `room-expiry`, `realtime-persistence`, and `realtime-rate-limit` each have one exact test tag and a tag-selected command. |

### Known gaps

No known release-blocking gaps remain. Pocket Pitlane remains deliberately free and has no accounts, chat, ads, payments, voice chat, physics simulation, or party-game collection. No billing metadata is required because no paid offer is advertised.

## Verification 3

### Status

**PASS.** Independent verification found zero findings and zero untested declared claims.

### Scope and versions

- Static implementation reviewed: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`.
- Documentation revision supplied for the review: `0dc2a2d`.
- The later factory-wrapper revision is `a6f79263fe3dba16034ba2b800f0dc0f206ee587`; Graphify-only worktree changes were preserved untouched.
- The live static shell referenced `assets/index-C2HFoYNi.js`, matching a clean build of `b3c9efb`.
- The unchanged product relay health endpoint returned HTTP 200 and build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.

### What was verified

- A fresh detached checkout completed `npm ci`, `npm --prefix realtime ci`, `npm run check`, and all 19 declared claim commands. `npm run check` reported 32 passed browser checks, 2 intentional mobile-only desktop skips, and 8 passed relay checks. Every declared claim has exactly one matching `@claim:` test tag.
- The fresh live desktop first screen displayed the playable canvas, `Race with friends on one shared screen`, the audience sentence, Create room, and the sample action. A fresh independent phone joined and readied a real room, enabled the host start control, and started the two-client race. Its left steering button was 153 × 98 CSS px.
- The live sample banner remained visible, its four named racers were populated, Reset demo announced that nothing was saved, real-storage isolation held, and the deterministic run reached the four-finisher Race results end screen.
- The live demo reloaded offline after its first visit. Keyboard skip navigation, reduced-motion behavior, invalid room-code recovery, route titles, privacy request text, legal pages, internal links, and the styled deliberate HTTP 404 all worked. Live axe returned zero violations on home and controller; no console errors occurred.
- Live headers included CSP/frame-ancestors, Referrer-Policy, X-Content-Type-Options, and Permissions-Policy. The relay accepted 20 controlled connection attempts then returned `429 Retry-After: 60` on attempts 21–22.
- A three-second phone-sized headless run measured 60.11 fps. This is an emulated-browser measurement, not a public hardware claim.

### Earlier finding disposition

Verification 1 F-01.1 through F-01.5 remain covered by their exact declared tests. The earlier demo-reset feedback defect remains fixed. Verification 2 F-02 is closed: all four relay claims now have exact tags, tag-selected commands, and passing observable tests.

### Evidence and reports

- Verification report: `.factory/verification-3.md`.
- Evidence: `/work/.evidence/pocket-pitlane-verify-3/`.
- Factory QA copies: `/work/.evidence/qa-report.md` and `/work/.evidence/qa-result.json`.

### Known gaps

None found in this verification. The intentional first-release scope remains: no accounts, chat, ads, payments, voice chat, physics simulation, or party-game collection.

## Review 1

### Status

**PASS — 0 findings and 0 untested claims.**

### Scope and evidence

- Reviewed static implementation: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`.
- Documentation baseline: `d72f93b`; current factory wrapper: `5e3184200197ede44bbd5d389dcba2f597ef376b`.
- A fresh detached clone completed `npm ci`, `npm --prefix realtime ci`, `npm run check`, and every claim-manifest command. The check covered 34 browser checks and 8 relay checks; all 19 manifest entries had exactly one matching claim tag and passed.
- The live static asset matched the candidate build. Fresh desktop and phone contexts confirmed the above-fold game, labeled and isolated sample/reset, deterministic four-finisher result screen, independent real phone join/start, active-race host-refresh recovery, invalid-code recovery, offline demo reload, keyboard skip link, reduced motion, legal routes, internal links, and styled deliberate 404.
- Live Axe found no serious or critical violations on home or controller and no console errors were captured. Live relay health returned 200; the controlled allowance run returned `429 Retry-After: 60` after the remaining connection allowance.
- A phone-sized headless active-race measurement was 60.13 fps. It is a reviewer measurement, not a public performance claim.
- Report: `.factory/review-1.md`; evidence: `/work/.evidence/pocket-pitlane-review-1/`.

### Known gaps

No findings in Review 1. Intentional scope remains unchanged: no accounts, chat, ads, payments, voice chat, physics simulation, or party-game collection.

## Review 2

### Status

**FAIL — 4 findings and 1 untested public claim.**

### Scope and verification

- Reviewed static implementation: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`; documentation baseline: `7c4e72d2967f78e9f076e9e0f1bdd054b2fbefe0`; current wrapper: `37d2ac83425847a1f42ab3015c2796b45808a8ab`.
- The live JavaScript and CSS are byte-for-byte matches for the clean candidate build. The relay health endpoint returned 200 with build `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- A fresh detached clone completed `npm ci`, `npm --prefix realtime ci`, `npm run check`, and all 19 manifest entries separately. The build, 32 browser checks, and 8 relay checks passed; every declared claim has one exact test tag.
- Fresh desktop and phone contexts completed the sample and real multiplayer loops through active play and an actual result screen. Sample isolation/reset, restart, pause, settings, keyboard, touch, independent room clients, tenant separation, host-refresh recovery, invalid input, offline reload, reduced motion, 200% text size, links, legal routes, privacy requests, styled 404, health, and 429/`Retry-After` were exercised.
- Live Axe found zero violations on home, controller, and results. Lighthouse mobile scored 100 in Performance, Accessibility, Best Practices, and SEO. A three-second phone-sized active race measured 60.19 fps.

### Findings

1. Medium: Privacy and README say controller tokens stay in the browser/local, while the relay storage claim and test prove that it stores those tokens. The public local-only wording is unlisted and untested as stated.
2. Minor: Demo, Privacy, Terms, and Controller retain the home canonical and social metadata.
3. Minor: The usable, deliberate 404 lacks the required skip link, standard landmarks/header/footer details, and metadata.
4. Minor: `.factory/copy-audit.md` is incomplete/outdated, and README contains a 26-word sentence above the plain-words cap.

Report: `.factory/review-2.md`. Evidence: `/work/.evidence/pocket-pitlane-review-2/`.

## Review 3

### Status

**PASS — 0 findings and 0 untested claims.**

### Scope and verification

- Reviewed live static implementation: `4724115fa67684275ef9191d6133ee30794be2fe`; documentation baseline: `c8b5080cac07400ad9028996713f4292433819ee`; unchanged relay build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- The live JavaScript and CSS SHA-256 values exactly match a clean build of that static candidate.
- A fresh detached checkout passed `npm ci`, `npm --prefix realtime ci`, and `npm run check`: 34 browser checks passed, 2 intentional desktop skips remained, and 8 relay checks passed. All 19 declared claim commands then passed separately, with one exact test tag per claim.
- Fresh desktop and phone contexts confirmed the above-fold playable race, labeled and isolated sample/reset, deterministic four-finisher result screen, independent real phone join/ready/start and steering input, invalid-input recovery, offline demo reload, keyboard skip link, reduced motion, legal routes, privacy request scope, and styled deliberate HTTP 404.
- Live Axe found no serious or critical violations. Normal-route console loads were clean. A three-second phone-sized active race measured 60.25 fps in headless Chromium; this is not a hardware claim.
- Live relay health returned 200. A controlled allowance check returned 20 WebSocket HTTP 101 upgrades and a `429 Retry-After: 60` response. Restart persistence and tenant/storage boundaries passed in the clean owned-SQLite relay suite.

### Earlier finding disposition and evidence

Verification 1 F-01.1 through F-01.5, the earlier reset-feedback defect, Verification 2 F-02, and Review 2 F-01 through F-04 remain closed and were rechecked. No product code changed in this review.

- Review report: `.factory/review-3.md`.
- Evidence: `/work/.evidence/pocket-pitlane-review-3/` and the factory QA copies at `/work/.evidence/qa-report.md` and `/work/.evidence/qa-result.json`.

### Known gaps

None found. Intentional first-release scope remains: no accounts, chat, ads, payments, voice chat, physics simulation, or party-game collection.

## Repair 3

### Status

**PASS.** Review 2's four findings and its one untested contradictory privacy
claim are closed. The static implementation is
`4724115fa67684275ef9191d6133ee30794be2fe`. The documentation report commit
is `55281c7afe5f5a08a6ee0e3353b4544c84e28666`.

### What changed

- Privacy and README now say that browser settings stay local while a random
  controller token is sent to the owned room relay. This matches the existing
  durable-storage outcome test; no token is described as browser-only.
- Every SPA route now updates its title, description, canonical URL, Open
  Graph title/description/URL, and Twitter title/description/URL. Controller
  query data does not enter its canonical URL.
- The deliberate 404 keeps its HTTP 404 status and pit-map style. It now has a
  skip link, sibling header/nav/main/footer landmarks, header links, Param
  Factory credit, build label, description, canonical link, Open Graph, and
  Twitter metadata.
- `.factory/copy-audit.md` now covers full-sentence home, demo, game, and
  controller messages. README prose was split so its longest sentence is 21
  words. The catalog description remains verb-first, 70 characters, and was
  copied to `/work/.evidence/catalog-description.txt`.
- Added browser regressions that observe route-specific metadata and the
  complete accessible 404 shell. They assert rendered browser outcomes,
  landmarks, metadata, navigation back to the game, and an Axe scan rather
  than implementation text.

### Verification

- Clean setup completed with `npm ci` and `npm --prefix realtime ci`.
- `npm run check` passed: production build; 34 browser checks passed with two
  intentional desktop skips for phone-only checks; all eight realtime checks
  passed. The static build is 35.12 KB JavaScript raw / 11.45 KB gzip and
  10.29 KB CSS raw / 3.12 KB gzip.
- All 19 entries in `.factory/claims.json` were run separately from that clean
  setup and passed. The durable `realtime-storage-scope` test continues to
  prove that the relay stores only anonymous room identifiers and generated
  race state, including random controller tokens.
- Static deployment completed for implementation `4724115`. The live shell
  serves `assets/index-2QXTy8Lf.js`. The untouched realtime service remains at
  `a955346b3e78fd83e3377c572973c15d9c6b94d9` with its existing durable `/data`
  SQLite storage, probes, and one-replica deployment.
- Live `verify-url.sh` passed: HTTPS 200, 616 ms load, no console errors,
  title/lang/main present, one h1, no missing image alt text, and no unlabeled
  buttons.
- Fresh 1440 px desktop and iPhone 13 contexts showed the game canvas, job
  headline, audience sentence, **Create room**, and **Try it with sample data**
  at scroll position zero. The first action is **Create room** for friends
  sharing a TV or laptop who want a short phone-controlled race.
- The live sample action showed Mika, Ivo, June, and Remy under the persistent
  `Demo — sample data, nothing is saved` label. Reset announced its result,
  removed demo keys, preserved a real-storage sentinel, and a deterministic
  sample run reached `Race results` with four ordered finishers and `Race again`.
- Fresh live route checks confirmed each non-home canonical and social URL.
  Privacy displays the corrected relay wording. The unknown route returned an
  expected HTTP 404 with skip link, banner, site navigation, main, footer,
  metadata, and a return-to-game link.
- A fresh independent phone joined a live room, readied, enabled the host
  start control, and exposed a 153 x 98 CSS px left steering target. Live Axe
  found zero serious or critical violations on home and controller. No console
  errors occurred.
- Live relay health returned HTTP 200 and the unchanged build. A controlled
  WebSocket allowance accepted 16 remaining attempts, then returned HTTP 429
  with `Retry-After: 60` on the next six attempts. Existing local relay tests
  cover room isolation, durable restart persistence, and expiry.

Evidence for this repair is in `/work/.evidence/pocket-pitlane-repair-3/`.

### Review 2 disposition

| Finding | Disposition |
| --- | --- |
| F-01 controller token described as browser-only | Fixed. Copy now names the owned relay, and the declared durable storage outcome test passes. |
| F-02 route canonical and social metadata | Fixed. Route metadata is updated and observed on Demo, Privacy, Terms, and Controller. |
| F-03 incomplete 404 structure and metadata | Fixed. The actual 404 has the standard accessible shell and route metadata. |
| F-04 stale copy audit and overlong README sentence | Fixed. The audit matches current messages and README prose is within the 22-word cap. |

### Earlier history and known gaps

Verification 1's five claim-coverage findings, the earlier demo-reset feedback
defect, and Verification 2's four relay-tag findings remain covered by their
declared passing outcome tests. Verification 3 and Review 1 remain valid for
their unchanged game and relay paths.

There are no known release-blocking gaps. Pocket Pitlane remains intentionally
free and has no accounts, chat, ads, payments, voice chat, physics simulation,
or party-game collection. No billing offer is advertised, so no billing
metadata is required.

## Verification 4

### Status

**PASS — 0 findings and 0 untested claims.**

### Scope and versions

- Independent report: `.factory/verification-4.md`.
- Static implementation reviewed: `4724115fa67684275ef9191d6133ee30794be2fe`.
- Repair documentation revision: `55281c7afe5f5a08a6ee0e3353b4544c84e28666`.
- Factory and Graphify wrapper at review start:
  `072eae356a6ded035910416f7a14a35145132de2`.
- Unchanged live relay build:
  `a955346b3e78fd83e3377c572973c15d9c6b94d9`.

The live JavaScript and CSS hashes match the clean implementation build.
Pre-existing uncommitted `graphify-out` changes were preserved untouched.

### Verification completed

- A fresh detached checkout completed both documented installs. `npm run check`
  passed with 34 browser checks, 2 intentional mobile-only skips, and all 8
  relay checks.
- All 19 claim-manifest entries were run separately and passed. Every claim has
  exactly one matching test tag.
- Fresh desktop and phone contexts showed the game, job, audience, Create room,
  and sample action before scrolling.
- The isolated sample showed four named racers, retained its sample label,
  reset without changing real browser data, reached an ordered four-finisher
  result screen, and restarted.
- A recorded deterministic run covers entry, active play, the result, and
  restart. A separate real phone joined and readied a live room, sent touch
  input, started the race, and stayed connected through host refresh recovery.
- A second host received a separate room. Invalid short and missing room codes
  produced clear recovery messages.
- Keyboard skip navigation, settings dialog focus return, steering and mute
  persistence, reduced motion, 200% text, offline demo reload, legal pages,
  privacy-request text, route metadata, links, and the structured deliberate
  HTTP 404 all passed.
- Live Axe scans found no serious or critical violations. No unexpected console
  or page errors occurred.
- Lighthouse mobile scored 99 Performance and 100 for Accessibility, Best
  Practices, and SEO. An active phone-sized race measured 60.04 fps.
- Relay health returned 200. Twenty live WebSocket upgrades succeeded; attempt
  21 returned 429 with `Retry-After: 60`. Clean relay tests covered the room
  limit, expiry, SQLite reopen persistence, storage scope, and full room flow.
- Verification 1, Verification 2, and Review 2 findings were each rechecked and
  remain closed, including the earlier minor reset-feedback defect.

Evidence is in `/work/.evidence/pocket-pitlane-verify-4/`. No product code,
deployment, infrastructure, or relay state was modified during verification.

### Known gaps

None found. The intentional first-release exclusions remain unchanged.
