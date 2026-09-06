# Run a short shared-screen phone-controlled race — Verification 4

## Verdict: PASS

**PASS — 0 findings and 0 untested claims.**

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**.

Fresh 1440×900 desktop and 390×844 phone contexts showed the job headline,
audience sentence, Create room, sample action, and live game canvas at scroll
position zero. Create room precedes the sample action in the page order.

## Versions reviewed

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation candidate: `4724115fa67684275ef9191d6133ee30794be2fe`
- Repair documentation revision: `55281c7afe5f5a08a6ee0e3353b4544c84e28666`
- Current factory and Graphify wrapper: `072eae356a6ded035910416f7a14a35145132de2`
- Product-owned relay build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`

The live shell serves `assets/index-2QXTy8Lf.js` and
`assets/index-BXyTk74T.css`. Their SHA-256 hashes exactly match a clean build
of the implementation candidate. Later commits contain documentation or
Graphify output and do not represent a newer product image. Pre-existing
uncommitted `graphify-out` changes were left untouched.

## Clean checkout and declared claims

A fresh detached checkout at the implementation candidate completed `npm ci`
and `npm --prefix realtime ci`. `npm run check` passed:

- Production build created `dist/`.
- 34 browser checks passed; 2 desktop skips are intentional phone-only checks.
- All 8 realtime checks passed.
- JavaScript is 35.12 KB raw and 11.45 KB gzip.
- CSS is 10.29 KB raw and 3.12 KB gzip.

Every one of the 19 manifest entries was then run as its own command. The
second claim intentionally reuses the sample command, and that command was run
again for the second entry. Every command passed. A source audit also found
exactly one matching test tag for every claim.

| Claim | Result |
| --- | --- |
| `sample-sandbox` | pass |
| `free-first-release` | pass |
| `race-reaches-end` | pass |
| `restart-resets-race` | pass |
| `settings-persist` | pass |
| `race-recovery` | pass |
| `offline-demo` | pass |
| `demo-private` | pass |
| `keyboard-controls` | pass |
| `phone-controllers` | pass |
| `room-limit` | pass |
| `room-expiry` | pass |
| `realtime-persistence` | pass |
| `realtime-rate-limit` | pass |
| `phone-motion-touch-fallback` | pass |
| `seeded-hazards` | pass |
| `real-room-request-scope` | pass |
| `no-device-data-access` | pass |
| `realtime-storage-scope` | pass |

The live page and README claim cross-check found no unlisted public promise.
The copy audit matches the current game paths. An independent README scan found
a longest sentence of 21 words, no sentence over 22 words, and no banned term.

## Game, sample, and multiplayer evidence

- The visible sample action opened `/demo` in one click. Mika, Ivo, June, and
  Remy were populated immediately.
- The `Demo — sample data, nothing is saved` label remained visible during
  active play and on the result screen.
- Reset announced `Sample reset. Nothing was saved.`, removed all demo keys,
  and preserved a real-storage sentinel.
- A recorded deterministic 90-second simulation went from entry through active
  play to `Race results`. June won with 4.09 laps, followed by Ivo, Remy, and
  Mika. The four ordered finishers and `Race again` were present. Race again
  entered a fresh countdown.
- A fresh independent phone joined a live room, requested motion permission
  only after a tap, retained touch steering when permission was denied, became
  ready, enabled the host start action, and sent steering input during play.
- The phone's left steering target measured 153×98 CSS pixels.
- Escape paused the live race. Resume continued it. A host reload exposed
  `Resume saved race` and restored the room with a 90-second live timer.
- A second independent host received a different room code and initially saw
  only its own driver. This confirmed room separation.
- A four-character code returned `Enter all six room characters.` A missing
  six-character room returned `This room no longer exists. Check the code on
  the shared screen.` Both paths kept recovery available.

The recorded run is
`/work/.evidence/pocket-pitlane-verify-4/video/2667fa576639fbc7fdae81fab663d9b1.webm`.
Entry, active-play, pause, recovery, controller, and result screenshots are in
the same evidence directory.

## Accessibility, routes, privacy, and performance

- Live Axe scans found zero serious or critical violations on home, controller,
  results, and 404 screens.
- The first keyboard focus was the skip link. Activating it bypassed site
  navigation. The settings dialog moved focus inside and returned focus to its
  trigger when closed.
- Steering assist and the sound mute setting persisted after reload. The
  interface retained its content without horizontal overflow at 200% text.
- Reduced-motion media matched in a fresh phone context. The longest remaining
  animation or transition duration was 0.01 ms.
- `/`, `/demo`, `/privacy`, `/terms`, and `/controller` returned 200 with one
  h1, one main landmark, route-specific titles, descriptions, canonical URLs,
  and matching Open Graph and Twitter metadata. Controller query data did not
  enter its canonical URL.
- The Privacy page says the browser sends a random controller token to the
  owned relay. It states four-hour expiry and gives a path for privacy requests.
- The deterministic sample made same-origin requests only. The real room flow
  used only the product origin and its owned WebSocket relay.
- The demo reloaded offline after its first service-worker-controlled visit.
- All published route and asset links returned 200. `robots.txt` and
  `sitemap.xml` list the expected routes.
- The unknown test route deliberately returned HTTP 404. Its designed page had
  a skip link, header, navigation, main, footer, route metadata, build label,
  Param Factory credit, and a working route back. Its expected browser 404
  resource message is not a defect; no unexpected console or page errors were
  observed.
- Response headers included CSP with header-level `frame-ancestors 'none'`,
  HSTS, Referrer-Policy, X-Content-Type-Options, Cross-Origin-Opener-Policy,
  and restrictive Permissions-Policy.
- Lighthouse mobile scored 99 Performance and 100 for Accessibility, Best
  Practices, and SEO. FCP was 1.08 s, LCP 1.26 s, TBT 125.5 ms, and CLS 0.
- A three-second phone-sized active race measured 181 frames in 3014.5 ms, or
  60.04 fps. This is an emulated-browser result, not a public hardware claim.

The midnight pit-map presentation matches `.factory/design.md`. The race board
is the dominant first-screen object, the single dark palette is explicit, and
all artwork remains original code-authored Canvas or SVG work. This short
arcade race has no useful missing AI, import, export, or sync step implied by
the brief.

## Backend evidence

- Live `/health` returned HTTP 200 with relay build
  `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- The independent live rooms above stayed isolated. The active first room
  survived its host refresh.
- Clean relay checks proved the eight-driver boundary, ninth-driver rejection,
  four-hour expiry, SQLite reopen persistence, allowed storage fields, invalid
  room recovery, health, and an independent join-to-race flow.
- A controlled live allowance check received 20 WebSocket upgrades with HTTP
  101. Attempt 21 returned HTTP 429 with `Retry-After: 60`.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1 motion permission and touch fallback | Declared, exactly tagged, locally passed, and live-rechecked. |
| Verification 1 F-01.2 four moving seeded hazards | Declared, exactly tagged, and passed in both browser projects. |
| Verification 1 F-01.3 real-room request scope | Declared, exactly tagged, passed locally, and live origins were rechecked. |
| Verification 1 F-01.4 contact, camera, and location access | Declared, exactly tagged, and passed in both browser projects. |
| Verification 1 F-01.5 durable room storage scope | Declared, exactly tagged, and passed against a temporary SQLite store. |
| Earlier demo reset feedback defect | Live reset announced the result and preserved real browser data. |
| Verification 2 F-02 four missing realtime tags | Each realtime claim has exactly one test tag and each command passed. |
| Review 2 F-01 contradictory controller-token wording | Live Privacy and README now name the owned relay; the storage claim passed. |
| Review 2 F-02 home metadata on other routes | All non-home route metadata is route-specific and passed live checks. |
| Review 2 F-03 incomplete 404 structure | The deliberate live HTTP 404 has the required structure, metadata, and Axe result. |
| Review 2 F-04 stale copy audit and long README sentence | The audit matches current paths; README's longest sentence is 21 words. |
| Verification 3 and Review 1 PASS | Their game, relay, accessibility, recovery, and claims results were independently confirmed. |

## Counts

- Findings: **0**
- Untested claims: **0**
- Verdict: **PASS**

Detailed evidence is in `/work/.evidence/pocket-pitlane-verify-4/`. The complete
claim transcript is `claim-commands.txt`; the aggregate gate is `check.txt`;
browser results are `live-browser.json`; relay allowance evidence is
`live-rate-limit.json`; and Lighthouse data is `lighthouse-mobile.json`.
