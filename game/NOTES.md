# Strong Cake Astronaut: phase 1 notes
Design: ../design/game-design-document.md

## How to test
- Scenes: `title`, `play`, `pause`, `gameover`. `npm run -s play -- "scene play"` jumps in.
- W A S D / arrows move. E uses the nearest station (within 90 px). Tab or I opens missions. M opens the map.
  Esc closes a panel, or opens pause.
- Mission 01 ticks off by using Power Control Panel, Planting Beds, Life Support Unit, Comm Terminal.
- No debug controls yet: nothing takes long to reach.

## Map
- `outpost.ts` layout: rooms, walls, door gaps, stations, Mission 01 list. World is 1600x1000.
- `entities/Player.ts` the cake astronaut and its movement.
- `ui/Panels.ts` the missions and map panels.
- `scenes/Play.ts` the play scene. `art.ts` the painted pictures.

## Missing or simplified
- Stations are placeholder boxes with a text message. No resources, power, crops, events or NASA data.
- The Tab key did not register in the test browser, so I also works. Check Tab in a real browser.
- Day counter is fixed at "Day 1 of 5".
