# Pocket Pitlane demo sandbox

Open `/demo` or select **Try it with sample data** from the home screen. The demo provides a four-racer room named `CALM42` with Mika, Ivo, June, and Remy already ready. Select **Start sample race** to see the working shared-screen race.

The banner stays visible for the whole demo: **Demo — sample data, nothing is saved**. **Reset demo** returns the sample race to its first state. **Start for real** removes demo settings and returns to the real room flow.

Demo-only settings and its active-race snapshot use the `demo:pocket-pitlane:*` localStorage namespace. Real settings and a real active-race snapshot use `pocket-pitlane:*`; the demo never reads or writes those real keys. No demo action opens a room WebSocket or sends sample data to another origin.

For deterministic browser verification only, `/demo?test-run=1` runs the same fixed-timestep 90-second sample race at an accelerated simulation clock. `/demo?test-seed=<integer>` selects a deterministic sample track seed. The unlinked `test-hazard-fixture=1` query uses three non-amber racers so the Canvas test can count hazards. None changes the production round length or sample flow.
