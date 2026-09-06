# Run a short shared-screen phone-controlled race — Review 3

## Verdict: PASS

**PASS — 0 findings and 0 untested claims.**

## Job, audience, and first action

- **Job:** Run a short shared-screen race with phones as controllers.
- **Audience:** Friends sharing one TV or laptop.
- **First action before scrolling:** **Create room**.

Fresh 1440×900 desktop and 390×844 phone contexts showed the playable Canvas,
the job headline, audience sentence, Create room, and the sample action at
scroll position zero. The game, not a menu wall, is the first large object.

## Versions reviewed

- Live URL: `https://pocket-pitlane.sociobot.in`
- Static implementation candidate: `4724115fa67684275ef9191d6133ee30794be2fe`
- Documentation baseline: `c8b5080cac07400ad9028996713f4292433819ee`
- Product-owned relay build: `a955346b3e78fd83e3377c572973c15d9c6b94d9`

The live shell references `assets/index-2QXTy8Lf.js` and
`assets/index-BXyTk74T.css`. SHA-256 comparisons exactly matched a clean build
of the static candidate. The live relay health endpoint returned HTTP 200 and
the stated relay build. Later changes are reports or Graphify output, not a
newer product image.

The repository verification report `.factory/verification-4.md` was read in
full. The separately named `factory-evidence/pocket-pitlane-verify-4/qa-report.md`
path was not mounted in this checkout; this review independently repeated the
material product and claim checks below.

## Clean checkout and claims

A detached clean worktree at the static candidate completed `npm ci` and
`npm --prefix realtime ci`.

- `npm run check` passed: production build, 34 passing browser checks, 2
  intentional desktop skips for phone-only checks, and 8 passing relay checks.
- The build produced `dist/`; JavaScript is 35.12 KB raw / 11.45 KB gzip and
  CSS is 10.29 KB raw / 3.12 KB gzip.
- Every command in the 19-entry `.factory/claims.json` manifest was run
  separately and passed.
- A source audit found exactly one `@claim:<id>` tag for each manifest id.

The passed claim commands cover sample isolation and free play, race completion,
restart, settings, refresh recovery, offline demo reload, request privacy,
keyboard controls, phone controllers, room limit and expiry, SQLite restart
persistence, rate limiting, motion/touch fallback, seeded hazards, real-room
request scope, device API access, and durable storage scope. There are no
untested claims.

## Game and demo evidence

- The one-click sample opened `/demo`, immediately populated Mika, Ivo, June,
  and Remy, and retained `Demo — sample data, nothing is saved` through play.
- Reset announced `Sample reset. Nothing was saved.`, removed demo keys, and
  retained a real-storage sentinel.
- A live deterministic sample run went from entry through active play to the
  actual `Race results` screen. It listed June (4.09 laps), Ivo (4.06), Remy
  (4.06), and Mika (3.93), with `Race again` available.
- A fresh desktop host created room `KAWEHD`; an independent fresh phone joined,
  readied, enabled the host start action after synchronization, and sent a left
  steering input during the active race. The phone left target measured
  153×98 CSS pixels.
- A normal live sample race measured 181 frames in 3004.1 ms (60.25 fps) in a
  phone-sized headless Chromium context. This is an emulated-browser
  measurement, not a public hardware performance promise.
- Four-character input returned `Enter all six room characters.` Earlier live
  verification also independently covered missing-six-character recovery and
  host-refresh recovery; their declared outcome tests passed again in this
  review's clean run.

Entry, demo, active-race, phone-controller, and result captures are in
`/work/.evidence/pocket-pitlane-review-3/`.

## Accessibility, privacy, routes, and resilience

- Fresh normal-route loads had no console or page errors. The only browser 404
  resource message observed occurred while deliberately loading the unknown
  route; the returned HTTP 404 has the designed Page not found shell and is
  expected behavior, not a defect.
- Live Axe scans found zero serious or critical violations on home, demo,
  privacy, terms, controller, and 404. The first keyboard focus was the skip
  link to `#main`; invalid controller input exposed a clear recovery message.
- Reduced-motion media matched in a phone context; remaining transition or
  animation durations were 0.01 ms. The demo reloaded offline after its first
  service-worker-controlled visit.
- `/`, `/demo`, `/privacy`, `/terms`, and `/controller` returned 200 with one
  h1, one main landmark, route-specific titles, descriptions, and canonical
  URLs. The controller query did not enter its canonical URL. The unknown path
  returned HTTP 404 with the expected route-specific metadata and a working
  way back.
- Recorded deterministic demo requests used only
  `https://pocket-pitlane.sociobot.in`. The live two-client room used the
  product site and its owned relay only.
- Response headers include HTTPS, CSP with header-level
  `frame-ancestors 'none'`, HSTS, Referrer-Policy, X-Content-Type-Options,
  Cross-Origin-Opener-Policy, and restrictive Permissions-Policy.
- The home link set resolves to working anchors or 200 product routes. Privacy
  and Terms remain present and route-specific.

## Backend evidence

- The live relay health endpoint returned HTTP 200 with build
  `a955346b3e78fd83e3377c572973c15d9c6b94d9`.
- The fresh clean relay suite passed the eight-driver boundary, ninth-driver
  refusal, four-hour expiry, SQLite reopen persistence, allowed storage fields,
  invalid-room recovery, health, and independent join-to-race flow.
- A controlled live allowance check made 21 WebSocket upgrade attempts: 20
  returned HTTP 101 and one returned HTTP 429 with `Retry-After: 60`.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1 F-01.1 motion permission and touch fallback | Exact declared test passed. |
| Verification 1 F-01.2 seeded moving hazards | Exact declared test passed. |
| Verification 1 F-01.3 real-room request scope | Exact declared test passed; live origins rechecked. |
| Verification 1 F-01.4 contact, camera, and location access | Exact declared test passed. |
| Verification 1 F-01.5 durable storage scope | Exact declared test passed. |
| Earlier demo-reset feedback defect | Reset announces the result and preserves real storage. |
| Verification 2 F-02 realtime claim tags | Each of the four relay claims has one exact tag and a passing command. |
| Review 2 F-01 controller-token wording | Privacy now names the owned relay and the storage-scope claim passes. |
| Review 2 F-02 route metadata | Non-home routes have their own verified metadata. |
| Review 2 F-03 404 structure | The deliberate 404 has the required shell, metadata, Axe result, and return link. |
| Review 2 F-04 copy audit and README sentence | Current audit and README remain within the plain-words limit. |
| Verification 3, Review 1, and Verification 4 PASS results | Their game, relay, accessibility, recovery, and claim results were independently rechecked. |

## Counts

- Findings: **0**
- Untested claims: **0**
- Verdict: **PASS**
