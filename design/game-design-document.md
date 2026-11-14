# Strong Cake Astronaut: Game Design Document

Version 0.1 (draft)

## 1. Overview

| | |
|---|---|
| Title | Strong Cake Astronaut |
| Genre | 2D top-down exploration and resource-management simulation |
| Audience | Ages 7 to 12 |
| Platform | Browser (keyboard and mouse), published on phaser.io |
| Session length | One mission is about 25 to 30 minutes |
| Style reference | Among Us (walk between rooms, do tasks at stations) |
| Core idea | Real NASA space-weather data changes what happens at a lunar outpost. The player keeps the outpost alive for 5 lunar days. |

**One-line pitch:** You are the astronaut in charge of a moon base. When the Sun acts up, NASA tells you, and every choice you make costs power.

**Educational goals.** After playing, a child should understand that:
1. A base needs power, air, water and food, and they depend on each other.
2. The Sun sends out storms (flares, CMEs, particle events) that are dangerous to astronauts.
3. Scientists on Earth watch the Sun and warn crews, and shelters protect people.
4. Messages between Earth and the Moon take time.

## 2. Design Pillars

1. **NASA data drives play.** A real event must change resources, tasks or choices. Never decoration only.
2. **Every choice has a cost.** There is no "turn everything on". Power is always short.
3. **Calm, then urgent.** Quiet days of farming and checking systems, then a storm alert that forces fast decisions.
4. **Learn without lectures.** Explanations are short, in kid language, and shown when the event happens.
5. **Fair and forgiving.** Failure teaches. Losing a day's crops should not end a child's game without a clear reason and a retry.

## 3. Core Loop

1. Start the lunar day in the Command Center and read the mission board and any NASA alerts.
2. Walk to stations and do tasks (plant, water, check power, repair).
3. Set power allocation for the day at the Power Station.
4. React to events (radiation alert, power shortage, communication failure).
5. End the day. Resources update, crops grow, a day summary shows what happened and why.
6. Repeat until day 5 ends, or a fail condition is reached.

### Time model

A real lunar day is about 29.5 Earth days, so it must be compressed. Proposal: **1 lunar day = 5 real minutes**, so the full mission is about 25 minutes. This is a tuning value in one config file.

## 4. Controls

| Input | Action |
|---|---|
| W A S D | Move astronaut |
| Mouse | Click interface elements (switches, sliders, buttons) |
| E | Interact with the nearest object in range |
| Tab | Open inventory and mission panel |
| M | Open map |
| Esc | Close any panel, or open pause menu |

Accessibility notes: arrow keys also move; every mouse action has a keyboard alternative; large readable text; do not rely on color alone (use icons with alerts); an alarm has a visual flash and a sound, and a mute option.

## 5. The Outpost

Top-down view, one connected map. Rooms are joined by corridors with doors.

| Room | Purpose | Main interactions |
|---|---|---|
| Command Center | Information hub | Mission board, NASA alert monitor, resource overview, communication terminal |
| Greenhouse | Food | Choose crop, plant, set water and light, harvest |
| Power Station | Electricity | See solar generation, battery level and use; allocation panel with switches |
| Radiation Shelter | Safety | Raise shielding, enter shelter, shows who is protected |
| Life Support (later) | Air and water | Check oxygen and water; repair |
| Research Lab (later) | Science points | Study NASA events to earn rewards |
| Outdoor airlock (later) | Outside tasks | Solar panel cleaning, sample collection; unsafe during storms |

**Phase 1 note:** each room can start as a plain labeled box. The player walks in and out. No data yet.

## 6. Resources and Systems

### 6.1 Resources

| Resource | Meaning | Rises by | Falls by |
|---|---|---|---|
| Electricity (units per day) | Daily power budget | Solar panels (daylight), battery | Every running system |
| Battery | Stored electricity | Surplus power | Night, shortfalls |
| Oxygen | Breathable air | Life support running | Crew breathing, life support off |
| Water | Drinking and farming | Recycling | Crops, crew |
| Food | Eating | Harvest | Eaten each day |
| Shielding readiness (0 to 100) | Protection from radiation | Shielding system powered, shelter prepared | Shielding off, damaged |
| Crew health (0 to 100) | Astronaut condition | Rest, food | Radiation exposure, no oxygen, no food |

Oxygen, water and food can begin as one combined **Life Support** bar for simplicity, then be split later as the design notes suggest.

### 6.2 Power budget

Example starting values. They are placeholders and need playtesting.

| System | Daily cost | Notes |
|---|---|---|
| Life support | 30 | Must stay on, with a minimum level |
| Greenhouse | 20 | Scales with lighting level and number of plants |
| Communication | 10 | Needed to receive NASA data and orders |
| Radiation shielding | 25 | Scales with shield level |
| Research lab | 15 | Optional, gives science points |
| **Total at maximum** | **100** | |
| **Available** | **70** | Player must choose |

Each system has levels: Off, Low, Normal, High. The cost scales with the level, so the player can run many systems on low, or a few on high.

Design check: with 70 units the player can run life support (30) + greenhouse (20) + communication (10) = 60, leaving only 10 for shielding. A storm forces a real choice.

Power supply should also vary: solar generation is lower during lunar night and during dust or damage events, so the 70 is a normal-day figure and not a constant.

### 6.3 Food production

1. Select crop at a planting bed.
2. Plant seeds (uses seeds and a little water).
3. Allocate water and light.
4. Crops move through stages: seed, sprout, growing, ready.
5. Harvest to add food.

Trade-offs:
- More light: faster growth, more electricity.
- Less light: saves electricity, slower growth.
- More plants: more food, more water and power.

Starting crop options (simple for kids): lettuce (fast, low food), potato (slow, high food), radish (very fast, low food).

### 6.4 Radiation protection

When a relevant solar event arrives:
1. Mission control receives a message (after a communication delay).
2. An alarm sounds.
3. A warning banner appears with an icon and a short explanation.
4. The player prepares the shelter.
5. The player decides how to split power and where the astronaut stays.

| Risk level | Effect | Recommended action |
|---|---|---|
| Low | Normal operations continue | Optional: keep shielding at Low |
| Moderate | Radiation rises in outdoor areas and the Greenhouse | Enter the shelter; raise shielding |
| High | Outdoor tasks are blocked; exposure damages health and equipment | Shelter immediately; prioritize shielding over greenhouse |

If the astronaut is outside the shelter when exposure builds, health drops and a "dose" meter fills. Shielding level reduces how fast.

### 6.5 Communication delay

Real Earth to Moon signal delay is about 1.3 seconds one way. That is too short to feel in a game, so the game **exaggerates it** (for example 10 to 20 seconds) and labels it clearly as a gameplay setting. Effects:
- Orders and NASA alerts arrive with a visible "message traveling" indicator.
- If communication is off or low on power, alerts arrive late or not at all.
- A communication failure mission teaches why a base cannot rely on instant help.

## 7. NASA Data Integration

### 7.1 Data goals

Use real data wherever it exists, and fall back to historical replays so the game always has something to react to.

### 7.2 Candidate sources (to verify in Phase 2)

| Source | Use | Status |
|---|---|---|
| NASA DONKI (api.nasa.gov, Space Weather Database Of Notifications, Knowledge, Information) | Solar flares (FLR), coronal mass ejections (CME), solar energetic particles (SEP), geomagnetic storms (GST), notifications | Primary candidate. Needs a free API key (DEMO_KEY works for testing with limits) |
| NOAA Space Weather Prediction Center (services.swpc.noaa.gov) | Current alerts, X-ray flux, proton flux, Kp index | Strong backup for live data. Not NASA, so credit it correctly |
| NASA SDO (Solar Dynamics Observatory) images | Sun picture in the Command Center | Optional visual |
| NASA lunar data (for example day/night timing) | Flavor and realism | Optional |

Confirm each endpoint, its fields, rate limits and terms of use before relying on it.

### 7.3 Event pipeline

1. **Fetch** from the API (or load a replay file).
2. **Normalize** into one game event format (below).
3. **Classify** into Low, Moderate or High risk using simple rules.
4. **Schedule** into the game timeline (a real event is shown at the next suitable moment, not mid-action).
5. **Present** as alarm, banner and information panel.
6. **Apply** effects to resources.

Suggested classification (to be tuned):

| Real data | Game risk |
|---|---|
| C-class flare or minor CME | Low |
| M-class flare, SEP event, geomagnetic storm Kp 5 to 6 | Moderate |
| X-class flare, strong SEP event, Kp 7 or more | High |

### 7.4 Game event format

```json
{
  "id": "2024-05-10-X-flare",
  "source": "NASA DONKI",
  "sourceUrl": "https://...",
  "nasaName": "Solar Flare X3.9",
  "date": "2024-05-10",
  "type": "solar_flare",
  "realClass": "X3.9",
  "risk": "high",
  "mode": "live | replay",
  "gameEffects": {
    "radiationLevel": 3,
    "solarPowerMultiplier": 0.8,
    "commsQuality": 0.5,
    "durationDays": 1
  },
  "kidExplanation": "The Sun threw out a burst of energy. It can be harmful to astronauts, so they hide in a shelter."
}
```

### 7.5 Historical replay mode

A library of 8 to 12 real past events stored locally as JSON, covering all three risk levels and including:
- A few quiet periods (to teach that most days are calm).
- Large events (for example the May 2024 solar storms, the Halloween 2003 storms).

Modes:
- **Live mode:** uses today's data. If nothing relevant happened in the last few days, the game inserts a replay event so the mission is never empty.
- **Replay mode:** plays a chosen historical event (also useful for the demo and for testing).
- **Offline fallback:** if the network or API fails, switch to replay automatically and show a small "Using saved NASA data" label.

### 7.6 Event information panel

Opens from the alert or from the Command Center log. Fields:
- NASA event name
- Event date
- Event type (flare, CME, particle storm, geomagnetic storm)
- Original NASA source, with link text
- Simple explanation for kids (max about 40 words, reading level age 7 to 9)
- A "Live" or "Replay" tag

## 8. Missions and Tasks

Mission structure: each mission has a goal, 3 to 5 tasks, a lesson, and a reward.

| # | Mission | Tasks | What players learn |
|---|---|---|---|
| 01 | Establish the Outpost | Inspect power station; plant first crops; check life support; activate communication terminal | Basic survival needs |
| 02 | Grow Your First Food | Choose a crop; set water and light; harvest | Food production, resource allocation |
| 03 | Power Shortage | Read the low-power warning; reduce one system; restore balance | Energy management |
| 04 | Solar Radiation Alert | Receive warning; raise shielding; move to shelter; wait it out | Radiation risk and shelter choices |
| 05 | Communication Failure | Lose link; find cause; restore communication; read missed alerts | Communication limits and delay |

Mapping to days (proposal): Day 1 = Mission 01; Day 2 = Mission 02; Day 3 = Mission 03; Day 4 = Mission 04; Day 5 = Mission 05 plus a final solar event.

Rewards: science points, a badge per mission, and new options (more crop types, extra battery).

## 9. Win, Lose and Scoring

**Win:** survive 5 lunar days with life support running and crew health above 0.

**Lose (any of):**
- Life support off long enough that oxygen reaches 0.
- Crew health reaches 0.
- Food and water both at 0 for 2 days.

Every loss shows a plain-language reason ("The shield was off during the storm") and a retry from the start of that day.

**Score (optional):** days survived, crew health, food stored, tasks completed, how well the player responded to alerts.

## 10. User Interface

- **HUD (always visible):** day and time, electricity bar, life-support bar, shielding bar, crew health, alert icon.
- **Alert banner:** appears top-center, colored by risk plus icon, with alarm sound.
- **Panels:** Inventory/Mission (Tab), Map (M), Power control panel, Greenhouse panel, Event information panel.
- **Map:** shows rooms, the astronaut's position, and room status icons (power on, radiation safe).
- **Screen format:** a top-down base fits a landscape screen best. The generated project defaults to portrait (720×1280), so choose landscape when building the game.

## 11. Art and Audio

- Style: friendly, bright pixel art; rounded characters; clear color-coding for rooms.
- Mascot idea: a cake-shaped or cake-themed astronaut ("Strong Cake") to match the title. Confirm the intended meaning with the team.
- Audio: calm ambient music, soft footsteps, interaction clicks, clear alarm for alerts, a gentle sound for success.
- Keep alarm sounds non-scary for young children.

## 12. Technical Notes

- Engine: Phaser AE (2D core), published on phaser.io.
- Data layer: a separate module that fetches, normalizes and classifies NASA data, so the game only sees the game event format.
- Cache the last good API response and keep local replay files, so the game works offline.
- Do not expose API keys in the browser build if a key is needed. If a key is required, use a small proxy, or pre-fetch events into static JSON.
- Configuration file for all tuning numbers (day length, costs, thresholds, delay time).
- Save: simple progress save per mission day.

## 13. Development Phases

| Phase | Goal | Done when |
|---|---|---|
| 1. Prototype | Astronaut moves through outpost with labeled empty rooms | WASD works, walls and doors work, E near a room object shows a placeholder message |
| 2. Data discovery | Find and test NASA/NOAA endpoints | A script prints real events with the fields we need; limits and terms noted |
| 3. Data conversion | Turn raw data into the game event format | Sample raw files convert correctly; classification tested on past events |
| 4. Integration | Connect data to gameplay | An event changes power, shielding and food; alerts and info panel work; replay and live modes work |
| 5. Testing | Balance and bug fixing | Playtest with kids in the target age range; the 70-unit budget feels tight but fair |
| 6. Refinement | Polish until satisfied | Art, audio, tutorial and accessibility pass |

Suggested split for a hackathon: build resources and power first (Phase 1 plus simple numbers), then add the radiation alert as the first data-driven feature, since it shows the concept best.

## 14. Risks and Open Questions

| Item | Note |
|---|---|
| Real events are rare | Solved with replay library and fallback inserts |
| API limits or downtime | Cache and offline fallback |
| Too much information for ages 7 to 12 | Keep text short; reveal details only when the player opens a panel |
| Physics accuracy vs fun | Real radiation and delay values are simplified. Label gameplay settings as such |
| Balance | All costs and timings in config; needs playtests |
| Open: lunar day length | 5 real minutes per day proposed. Confirm |
| Open: single or multiple astronauts | "Among Us style" suggests a crew. Decide if there are AI crewmates in v1 |
| Open: name | Confirm what "Strong Cake" refers to, for art and story |
| Open: language | English only, or more? |

## 15. Out of Scope for the First Version

Multiplayer, voice chat, mobile touch controls, many outposts, a full tech tree.