# Copy audit

This audit covers every full-sentence message on the home, demo, shared-screen
game, and controller paths. It includes the visible setup, game-state, reset,
input, connection, and recovery messages. Labels, button names, room codes,
driver names, and lap values are reviewed as short fragments.

Every sentence is 22 words or fewer. No audited sentence uses a banned
plain-words term.

| Text | Words | Result |
| --- | ---: | --- |
| A free shared-screen racing game for 2–8 people. | 9 | pass |
| Choose a control, then press one key. | 8 | pass |
| Controllers use touch buttons. | 4 | pass |
| The shared screen uses these keyboard controls. | 7 | pass |
| For friends sharing a TV or laptop: phones become controllers and everyone sees the same race. | 15 | pass |
| Runs the four-racer sample. | 4 | pass |
| Starts a four-racer practice race. | 5 | pass |
| Put this screen where everyone can see it. | 8 | pass |
| Open the controller link and tap Ready. | 7 | pass |
| Steer around hazards and use boost when it fills. | 9 | pass |
| It has no accounts, voice chat, ads, or contact access. | 10 | pass |
| The room service only keeps an anonymous controller token and the room state needed to run the race. | 18 | pass |
| Four sample racers are ready. | 5 | pass |
| Start to see the full shared-screen race. | 7 | pass |
| Sample room CALM42. | 3 | pass |
| Nothing is saved. | 3 | pass |
| Create a six-character room. | 4 | pass |
| Your keyboard is the first controller. | 6 | pass |
| Select Create room above, then share the link shown here. | 10 | pass |
| Reconnects this browser to its active room. | 7 | pass |
| Open this link on each phone. | 6 | pass |
| It opens a controller without an account. | 7 | pass |
| Two ready drivers are needed. | 5 | pass |
| Everyone is ready. | 3 | pass |
| Start when the group is set. | 6 | pass |
| The sample has four ready racers. | 6 | pass |
| Create a room, then share the phone controller link. | 9 | pass |
| Resume when everyone can see the shared screen. | 8 | pass |
| The race starts now. | 4 | pass |
| The race pauses while this tab is hidden. | 8 | pass |
| 90-second race complete. | 3 | pass |
| `<winner>` wins this race. | 4 | pass |
| Sample reset. | 2 | pass |
| Nothing was saved. | 3 | pass |
| Creating your room. | 3 | pass |
| Room connected. | 2 | pass |
| Race restored on this browser. | 5 | pass |
| Enter all six room characters. | 5 | pass |
| Joining room. | 2 | pass |
| Joined room `<code>`. | 3 | pass |
| Tap when ready. | 3 | pass |
| Motion permission was not granted. | 5 | pass |
| Touch steering still works. | 4 | pass |
| Phone tilt is on. | 4 | pass |
| This browser cannot use motion. | 5 | pass |
| Could not update this room. | 5 | pass |
| Try again. | 2 | pass |
| Could not join this room. | 5 | pass |
| Check the code. | 3 | pass |
| Could not read the room update. | 6 | pass |
| Could not reach the room service. | 6 | pass |
| Check your connection and try again. | 6 | pass |
| Could not keep the room connected. | 6 | pass |
| Create or join again. | 4 | pass |
| Keyboard steering is active. | 3 | pass |

## README check

README prose was checked after splitting the former 26-word setup sentence.
Its longest sentence is 21 words. The room-service section now uses short
sentences for persistence, expiry, and rate-limit behavior.

## Terminology

| Concept | Term used everywhere |
| --- | --- |
| shared display | shared screen |
| temporary connection | room |
| person racing | driver |
| mobile input page | controller |
| browser exercise data | sample data / demo |
| starting signal | ready |
| special speed action | boost |
| random room credential | controller token |
