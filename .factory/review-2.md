# Run a shared-screen phone-controlled race — Review 2

## Verdict: FAIL

**FAIL — 4 findings and 1 untested public claim.**

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers and no app installation.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**. Fresh 1440×900 desktop and 390×844 phone contexts showed the job headline, audience sentence, Create room, Try it with sample data, and the playable race canvas at scroll position zero.

## Versions reviewed

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation candidate: `b3c9efb1c3c7ee288b6cd0650f20a9532da1e676`
- Documentation baseline: `7c4e72d2967f78e9f076e9e0f1bdd054b2fbefe0`
- Current report/Graphify wrapper: `37d2ac83425847a1f42ab3015c2796b45808a8ab`
- Product-owned relay build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`

The live shell references `assets/index-C2HFoYNi.js` and `assets/index-BXyTk74T.css`. Both files are byte-for-byte matches for a clean candidate build. Later commits contain reports or Graphify output, not a newer product image. Pre-existing `graphify-out` worktree changes were not modified.

## Clean setup and claim commands

A fresh detached clone at the implementation candidate completed the documented `npm ci` and `npm --prefix realtime ci` setup with zero audit vulnerabilities.

- `npm run check` passed: the production build completed, 32 browser checks passed, 2 desktop skips were the declared phone-only checks, and all 8 relay checks passed.
- The build produced `dist/`: JavaScript 34.02 KB raw / 11.11 KB gzip and CSS 10.29 KB raw / 3.12 KB gzip.
- All 19 manifest entries were run separately. Every command exited successfully. There are 18 distinct commands because `sample-sandbox` and `free-first-release` deliberately select the same two-tag test.
- Every declared claim has exactly one matching `@claim:<id>` tag.

The declared tests covered the sample sandbox, free play, deterministic 90-second result, restart, persistent settings, host-refresh recovery, offline demo, sample request scope, remapped keyboard input, independent phone control, room limit, expiry, restart persistence, rate limiting, denied-motion touch fallback, four seeded moving hazards, real-room request scope, device API non-use, and durable storage scope.

The public-copy cross-check found one additional privacy promise that is not represented by a matching manifest entry and is contradicted by the tested storage behavior. It is recorded as F-01 and makes the untested public claim count 1.

## Live game evidence

- **First screen:** Desktop and phone both showed the game itself, the job, the audience, Create room, and the one-click sample action before scrolling. Evidence: `/work/.evidence/pocket-pitlane-review-2/desktop-first-screen.png` and `mobile-first-screen.png`.
- **Sample sandbox:** The visible action opened `/demo`. The persistent label read `Demo — sample data, nothing is saved`; Mika, Ivo, June, and Remy were populated. Reset announced `Sample reset. Nothing was saved.`, removed demo keys, and preserved a real-storage sentinel.
- **Complete deterministic run:** Desktop and phone runs reached the actual `Race results` screen. The ordered result was June 4.09 laps, Ivo 4.06, Remy 4.06, and Mika 3.93. `Race again` entered a new Get ready state. Evidence: `desktop-result-screen.png` and `mobile-result-screen.png`.
- **Pause and settings:** Escape opened `Race paused`; Resume race continued. The settings dialog moved focus to its first control, Escape closed it, and focus returned to the settings button. The declared settings reload and key-remapping tests passed.
- **Real multiplayer:** A fresh independent phone joined and readied a real room, enabling the host to start. Its left steering control measured 153×98 CSS px. The host completed active play, saved state, refreshed, selected Resume saved race, and returned at 87 seconds. Two fresh hosts received different room codes and the second room contained only its host.
- **Normal, invalid, and recovery paths:** Incomplete input said `Enter all six room characters.` A well-formed missing code said `This room no longer exists. Check the code on the shared screen.` The host-refresh, offline reload, pause, and restart paths all recovered.
- **Frame rate:** A three-second phone-controller race produced 181 animation frames in 3007.1 ms, or 60.19 fps. This is an emulated browser measurement, not a public hardware promise.

## Accessibility, privacy, routes, and performance

- Fresh live Axe scans found zero violations on the home, controller, and results screens. Keyboard activation of the skip link bypassed the header: the next Tab target was Create room. Dialog focus return passed.
- Reduced-motion media matched and reduced animation/transition durations to 0.01 ms. At 200% text size on a 390 px viewport, the h1, Create room, and canvas remained present with no horizontal overflow.
- The single dark treatment had no Axe contrast finding. The inspected phone, desktop, controller, results, and 404 screenshots had no clipping or unreadable text.
- The demo reloaded offline after a service-worker-controlled visit. Real-room traffic used only the product origin and its owned relay. No unexpected console or page errors occurred; the deliberate unknown-route request produced the expected browser 404 resource message.
- `/`, `/demo`, `/privacy`, `/terms`, and `/controller` returned 200 with route-specific document titles, one h1, one main, and working internal links. The legal pages and privacy-request direction were present.
- `/not-a-pitlane-review-2-route` returned the expected styled HTTP 404 with a working route back. The 404 status itself is not a defect; F-03 concerns missing required page structure.
- Static responses included CSP with header-level `frame-ancestors 'none'`, HSTS, Referrer-Policy, X-Content-Type-Options, Cross-Origin-Opener-Policy, and restrictive Permissions-Policy.
- Live relay `/health` returned HTTP 200 and build `a955346b...`. A controlled allowance check opened attempts 1–20 and received HTTP 429 with `Retry-After: 60` on attempt 21.
- Lighthouse mobile scored Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.1 s, LCP 1.1 s, TBT 10 ms, and CLS 0. Evidence: `/work/.evidence/pocket-pitlane-review-2/lighthouse-mobile.json`.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1 motion permission and touch fallback | Declared, exactly tagged, and passing. |
| Verification 1 F-01.2 four moving seeded hazards | Declared, exactly tagged, and passing. |
| Verification 1 F-01.3 real-room request scope | Declared, exactly tagged, and passing. |
| Verification 1 F-01.4 contact, camera, and location access | Declared, exactly tagged, and passing. |
| Verification 1 F-01.5 durable room storage scope | Declared, exactly tagged, and passing. |
| Earlier demo-reset feedback defect | Reset announces that nothing was saved and preserves real browser data. |
| Verification 2 F-02 relay claim tags | All four relay claims have one exact tag, tag-selected commands, and passing outcome tests. |
| Verification 3 and Review 1 PASS | Their tested paths still pass. This stricter copy, metadata, and required-structure audit found F-01 through F-04 below. |

## Findings

### F-01 — Medium — the controller-token privacy promise is unlisted and contradicts storage behavior

The live Privacy page says, `Game settings and an anonymous controller token stay in this browser.` README says, `Browser settings and controller tokens stay local.` On the same Privacy page and in declared claim `realtime-storage-scope`, the product says and proves that the relay stores random controller tokens. A token therefore does not stay only in the browser or remain local.

This is a visitor-facing privacy promise with no matching positive entry in `.factory/claims.json`, and the existing storage test proves the opposite behavior. Change the copy to say that the token is stored in the browser and sent to the owned room relay, or change the implementation and add the required claim test. Until then, the privacy disclosure is internally inconsistent and one public claim is untested under its stated wording.

### F-02 — Minor — non-home routes publish the home canonical and social metadata

`/demo`, `/privacy`, `/terms`, and `/controller` set correct document titles, but each retains canonical URL `https://pocket-pitlane.sociobot.in/`. Their Open Graph and Twitter title, URL, and description also remain the home racing metadata. The site-structure contract requires complete route metadata; a privacy or controller URL should not identify itself as a duplicate of the home route.

Update canonical and social metadata with the route, alongside `document.title`.

### F-03 — Minor — the designed 404 omits required standard page structure

The deliberate HTTP 404 is visually styled and has a working return action. It is not defective for returning 404. Its document is missing the required skip link, navigation landmark, consistent header links, Param Factory credit, build identifier, meta description, canonical link, and Open Graph/Twitter metadata. Its header is also nested inside `<main>` instead of providing the standard page landmarks.

Keep the 404 response status and design, but give the page the same required structural shell and metadata as other routes.

### F-04 — Minor — the required copy audit is incomplete and does not match current copy

`.factory/copy-audit.md` says it contains all visitor-facing landing sentences, but it records `The sample starts a four-racer practice race.` while the live sentence is `Starts a four-racer practice race.`, and it omits other current landing and game-screen sentences. README also contains a 26-word setup sentence beginning `A host opens a room...`, above the plain-words hard cap of 22 words.

Regenerate the audit from current copy, include every landing sentence, and split overlong README sentences.

## Counts

- Findings: **4**
- Untested public claims: **1**
- Verdict: **FAIL**
