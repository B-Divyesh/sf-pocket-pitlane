# Pocket Pitlane visual thesis

## Direction

Pocket Pitlane uses a **midnight pit-map** direction: a compact aerial race circuit drawn like a clear road sign at night. The track is the first large object on the page. The dark road, pale lane marks, lime ready state, and warm hazard cones make it legible across a room before anyone reads the setup text. This fits a fast couch race better than a landing-page illustration or a generic dashboard.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| sky | `#132837` | page background |
| asphalt | `#0b161f` | canvas and deep surfaces |
| surface | `#193849` | room controls and panels |
| lane | `#d8e7d5` | track boundary and high-contrast detail |
| ink | `#f8f4e8` | primary text |
| muted | `#b7c7cb` | supporting text |
| lime | `#d9f36c` | primary action and ready state |
| coral | `#ff795f` | first car and warning contrast |
| amber | `#ffc95e` | hazards and boost |
| blue | `#65c9e8` | second car |

Primary text on `sky` and `surface` exceeds 4.5:1. Lime buttons use `#17260f` text. The game is intentionally single dark-mode treatment: it supports the track’s road-at-night information hierarchy and explicitly paints every surface.

## Type and spacing

The display and body use a self-hosted-in-practice system stack (`ui-rounded`, Avenir Next, Segoe UI, system sans-serif) to avoid a network font request. Rounded, heavy headings help a room read the important action at distance. Body copy stays at 16 px or larger. The scale is 1.08 / 1.35 / 1.85 / 2–3.6 rem and all layout spacing uses an 8 px rhythm.

## Interaction and motion

The race board has a thick inset line, compact timing capsules, sign-like buttons, and a small lime or amber boost bar below each car. It lets the group see when drafting has charged the one power. Cars move because the race is live; no decorative background animation runs. UI state changes use direct replacement rather than flourishes. `prefers-reduced-motion` removes transitions and smooth scrolling. Escape and hidden tabs pause a race, the keyboard controls can be remapped, and the result screen gives a direct restart.

## Asset plan and provenance

All game art is original, authored in code:

- The oval road, checkered line, moving cones, and car bodies are Canvas 2D vector drawing in `src/main.ts`.
- `public/favicon.svg`, `public/apple-touch-icon.svg`, and `public/social-card.svg` are hand-authored vector derivatives of the same circuit and car shapes.
- No stock images, generated imagery, external fonts, external scripts, brands, or third-party art are shipped.

The social card is a 1200×630 original circuit composition. It has no user-facing text that a player must read.

## Game pacing

A normal round lasts 90 seconds. Four rotating hazards shift lane position during the round. Drafting behind another car fills a boost meter; boost adds temporary speed. The server creates a seed for each real race and the fixed 60 Hz game loop applies that seed to the hazard and demo-driver patterns. The intended difficulty is readable at two players, busier at four, and a deliberate visual crowd at eight.
