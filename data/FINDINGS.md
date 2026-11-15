# Phase 2: NASA data findings

Tested on 2026-11-14. Raw responses are in `data/samples/`. Re-run the check with `node data/probe.mjs`
(set `NASA_API_KEY` first, see "Needs your action").

## Results

| Source | Endpoint | Works | Browser (CORS) | Key | Gives us |
|---|---|---|---|---|---|
| NASA DONKI | `api.nasa.gov/DONKI/CME` | Yes | Open (`*`) | Yes | CME time, source location, speed and analyses, a text note |
| NASA DONKI | `.../SEP` | Yes | Open | Yes | Solar energetic particle event time, link, linked flare/CME |
| NASA DONKI | `.../GST` | Yes | Open | Yes | Geomagnetic storm with Kp readings every 3 hours |
| NASA DONKI | `.../notifications?type=all` | Yes | Open | Yes | Human-readable alert text (largest file, about 390 KB for 8 days) |
| NASA DONKI | `.../IPS`, `.../RBE` | Yes | Open | Yes | Shock arrival, radiation belt enhancement (optional) |
| NASA DONKI | `.../FLR` | **No, 404** | n/a | Yes | Was meant to give flare class. Broken on the gateway at test time (3 tries) |
| NOAA SWPC | `products/noaa-scales.json` | Yes | Open | No | Current and 3-day R (radio), S (radiation), G (geomagnetic) scales, 0 to 5 |
| NOAA SWPC | `products/noaa-planetary-k-index.json` | Yes | Open | No | Recent Kp values |
| NOAA SWPC | `json/goes/primary/xray-flares-7-day.json` | Yes | Open | No | Flares with begin, max and end class (for example `C1.3`) |
| NOAA SWPC | `json/goes/primary/xray-flares-latest.json` | Yes | Open | No | Current flare class |
| NOAA SWPC | `json/goes/primary/xrays-6-hour.json`, `integral-protons-6-hour.json` | Yes | Open | No | Raw X-ray and proton flux for a live gauge |
| NOAA SWPC | `products/alerts.json` | Yes | Open | No | Official alert messages |

## Key findings

1. **DEMO_KEY is too limited.** It ran out after about 10 calls and then returned HTTP 429 (rate limited). The game cannot use it. A free personal key from https://api.nasa.gov is needed, and even that should not be called by every player (see recommendation).
2. **The DONKI flare endpoint is down**, so flare class has to come from another place. Two options work: the NOAA flare list (live and last 7 days), or the DONKI notification text, which contains lines like "Flare intensity has crossed the threshold of M5.0".
3. **Live data is usually quiet.** Today: scales R0 S0 G0, strongest flare in 7 days M1.9, current class B6.7. The replay library is required, as planned. It also shows most days map to Low risk.
4. **NOAA is not NASA.** It needs no key and allows browser calls, but the info panel must name it as the source ("NOAA Space Weather Prediction Center"). DONKI itself notes that NOAA is the official US source.
5. **DONKI data fits the game.** For the May 2024 window it returned 37 CMEs, 14 SEP events, 2 geomagnetic storms (Kp up to 9.0) and 41 flare notifications. That week works well as the "High risk" replay.

## Field mapping (raw data to game event)

| Game field | DONKI | NOAA |
|---|---|---|
| `id` | `activityID`, `sepID`, `gstID` | `begin_time` + class |
| `date` | `startTime` / `eventTime` | `max_time` |
| `type` | endpoint name | flare / scale |
| `realClass` | flare class parsed from notification text | `max_class` |
| `kp` | `allKpIndex[].kpIndex` | `Kp` |
| `sourceUrl` | `link` or `messageURL` | the endpoint URL |
| `kidExplanation` | written by us, one per event type | same |

## Recommendation for the game

- **Replay library (ship in the game):** a one-time script saves 8 to 12 events as static JSON, mainly from DONKI (the key is only used on our machine, never in the browser). Candidates: May 2024 storm week (High), the Oct 2024 X-class flares, a quiet week (Low), and a moderate M-class flare day.
- **Live mode:** call NOAA SWPC straight from the browser (no key, CORS open): scales, flare list and Kp. Do not call DONKI from players' browsers, to avoid rate limits and exposing a key.
- **Fallback:** if a call fails or nothing relevant is happening, play a replay and label it "Using saved NASA data".
- Risk classification stays open until we choose the final sources. The data suggests using NOAA's S and G scales plus the flare class as the simplest rule.

## Needs your action

1. Get a free NASA API key at https://api.nasa.gov (about 1 minute, it comes by email).
2. Run `NASA_API_KEY=yourkey node data/probe.mjs` to confirm, and tell me when it works. I will then fetch the replay events in phase 3. I did not store any key.

## Open questions

- Is it acceptable that live mode uses NOAA (not NASA) data, labeled clearly? If every source must be NASA, live mode would depend on DONKI through a small server, which is more work.
- Which historical events do you want in the replay library? I suggest the list above.
