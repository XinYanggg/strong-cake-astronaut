# Developer notes

Design: `../design/game-design-document.md`. Overview and commands: `../README.md`.

## How to test
- Scenes: `title`, `play`, `pause`, `gameover`. `npm run -s play -- "scene play"` jumps straight into play.
- Controls: W A S D or arrows move, E uses the nearest machine (within 90 px), Tab or I (or E at the Mission Board) missions, N latest NASA alert,
  M map, Esc closes a window or pauses.
- Debug controls (backquote key, or `cheat <name>` in `play`): `screen <name>`, `skipday`, `win`, `lose`, `battery <n>`,
  `day <n>`, `storm` (20 s before impact), `ripen` (all crops ready), `mission` (finish today's tasks), `goto <station id>`,
  `science <n>`. The run state shows in `inspect`.

## Rules in short
- A day is 300 seconds, the mission is 5 days. Solar power is 70 units a day; all systems at Normal use 69.
- Power is used in real time from a 50-unit battery. An empty battery shuts systems down (brownout), least important first.
- Each system is switched at its own machine: Life Support Unit and Comm Terminal (Command Center), Grow Lights (Greenhouse),
  Shield Controls (Shelter), Research Console (Lab). The Power Station panel is a read-only overview.
- One space weather event a day (quiet, low, moderate, high, high). Earth sends the warning 60 s before the storm. It travels
  15 s at Normal communication, slower with weak communication, never when it is off. The storm lasts 60 s, cuts solar power
  and adds radiation. The shield blocks 80% of it, standing in the shelter another 90%.
- Missions (one per day): 1 establish the outpost, 2 grow food, 3 power shortage (solar at 60% from 0:30; clean the panels at
  the Power Station from 1:10), 4 radiation alert (20 s in the shelter), 5 communication failure (relay breaks at 0:40; repair at
  the Comm Terminal).
- Live mode uses today's NOAA event on the day that matches its risk (quiet 1, low 2, moderate 3, high 4).

## Map of the source
- `main.ts` boot. `scenes/` Title, Play, Pause, GameOver; Settings and About are windows opened from the title and pause menu.
- `run.ts` state and rules. `events.ts` daily events. `missions.ts` missions and scripted trouble.
- `spaceWeather.ts` risk rules and event format. `live.ts` NOAA live mode. `data/replay-events.json` saved events.
- `outpost.ts` layout (rooms, `WALL_RECTS`, `DOORS`, stations, `CAKE_SPOTS`, `EXTERIOR`). `entities/Player.ts` the astronaut.
- `art.ts` all pictures. `sound.ts` all sounds, music and volume. `ui/Hud.ts` the heads-up display (every part sits in a box; hides while a window is open; messages wrap), `ui/` windows: Panels (mission board, map, event card),
  PowerPanel, LabPanel, CropPicker, Menu (shared menu look).
- `debug.ts` debug controls.

## Simplified or missing
- Modules are rectangles (walls and collisions are plain rectangles).
- Only one live event per mission; other days use saved events.
- Balance numbers are first guesses (top of `run.ts`, `events.ts`, `missions.ts`): playtest and tune.
- The Tab key did not register in the automatic test browser, so I also opens missions. Check Tab in a normal browser.
