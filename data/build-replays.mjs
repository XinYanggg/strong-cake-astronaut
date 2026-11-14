// Converts raw DONKI notifications into game/data/replay-events.json (the game's event format).
//   node data/build-replays.mjs
// Reads data/raw/notifications-*.json (from fetch-raw.mjs), or the small sample in data/samples/ if there is none.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { makeEvent } from '../game/spaceWeather.ts';

// The events we want in the game. Change a date here to feature a different day.
const FEATURED = {
    bigFlare: '2024-10-03',      // X9.0 flare, the strongest of the year
    particleStorm: '2024-05-09', // particle event in the May 2024 storm week
};

const here = new URL('./', import.meta.url);
const files = (await readdir(new URL('raw/', here)).catch(() => [])).filter(f => f.startsWith('notifications-')).sort();
let notifications = [];
if (files.length) {
    for (const f of files) notifications.push(...JSON.parse(await readFile(new URL(`raw/${f}`, here), 'utf8')));
    console.log(`using data/raw (${notifications.length} messages)`);
} else {
    notifications = JSON.parse(await readFile(new URL('samples/donki_notifications.json', here), 'utf8'));
    console.log('data/raw not found: using the small May 2024 sample');
}

const day = n => n.messageIssueTime.slice(0, 10);
const rank = c => 'ABCMX'.indexOf(c[0]) * 100 + parseFloat(c.slice(1));
const byDay = new Map();
for (const n of notifications) { const d = day(n); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(n); }

/** Facts one day's own alert messages (not later reports) tell us. */
function factsFor(date) {
    const msgs = byDay.get(date) ?? [];
    const f = { date, flare: null, flareUrl: null, kp: 0, gstUrl: null, sep: false, sepUrl: null, cmeSpeed: 0, cmeUrl: null, count: msgs.length };
    for (const n of msgs) {
        const b = n.messageBody ?? '';
        const flares = n.messageType === 'Report' ? [] : [...b.matchAll(/\b([MX]\d{1,2}\.\d)\b(?:-class)?\s+(?:solar\s+)?flare|flare[^.]{0,40}?\b([MX]\d{1,2}\.\d)\b/g)].map(m => m[1] ?? m[2]);
        for (const c of flares) if (!f.flare || rank(c) > rank(f.flare)) { f.flare = c; f.flareUrl = n.messageURL; }
        if (n.messageType === 'SEP') { f.sep = true; f.sepUrl = n.messageURL; }
        if (n.messageType === 'GST') { const m = b.match(/Kp index has reached level ([\d.]+)/); if (m && Number(m[1]) > f.kp) { f.kp = Number(m[1]); f.gstUrl = n.messageURL; } }
        if (n.messageType === 'CME') { const m = b.match(/Estimated speed: ~(\d+)/); if (m && Number(m[1]) > f.cmeSpeed) { f.cmeSpeed = Number(m[1]); f.cmeUrl = n.messageURL; } }
    }
    return f;
}
const all = [...byDay.keys()].sort().map(factsFor);
const picks = [];
const mk = (d, o) => picks.push(makeEvent({ id: `replay-${o.type}-${d.date}`, source: 'NASA DONKI', mode: 'replay', date: d.date, ...o }));

// 1. The featured big flare (falls back to the strongest flare found)
const flareDay = factsFor(FEATURED.bigFlare).flare ? factsFor(FEATURED.bigFlare) : [...all].filter(d => d.flare).sort((a, b) => rank(b.flare) - rank(a.flare))[0];
if (flareDay) mk(flareDay, { type: 'solar_flare', nasaName: `Solar Flare ${flareDay.flare}`, realClass: flareDay.flare, sourceUrl: flareDay.flareUrl, facts: { flareClass: flareDay.flare } });
// 2. The strongest geomagnetic storm
const storm = [...all].sort((a, b) => b.kp - a.kp)[0];
if (storm?.kp >= 5) mk(storm, { type: 'geomagnetic_storm', nasaName: `Geomagnetic Storm Kp ${Math.round(storm.kp)}`, realClass: `Kp ${storm.kp}`, sourceUrl: storm.gstUrl, facts: { kp: storm.kp } });
// 3. A particle event
const sepDay = factsFor(FEATURED.particleStorm).sep ? factsFor(FEATURED.particleStorm) : all.find(d => d.sep);
if (sepDay) mk(sepDay, { type: 'particle_storm', nasaName: 'Solar Energetic Particle Event', realClass: sepDay.flare ?? 'SEP', sourceUrl: sepDay.sepUrl, facts: { particleEvent: true } });
// 4. Moderate flare days: M-class, no particle event, no big storm. One from each of these months, so they differ.
for (const month of ['2024-01', '2024-06', '2024-11']) {
    const mid = all.find(d => d.date.startsWith(month) && d.flare?.startsWith('M') && !d.sep && d.kp < 5);
    if (mid) mk(mid, { type: 'solar_flare', nasaName: `Solar Flare ${mid.flare}`, realClass: mid.flare, sourceUrl: mid.flareUrl, facts: { flareClass: mid.flare } });
}
// 5. Moderate geomagnetic storms: Kp 5 to 6.99 (NOAA G1 to G2), no flare or particle event that day
for (const month of ['2024-03', '2024-08']) {
    const g = all.find(d => d.date.startsWith(month) && d.kp >= 5 && d.kp < 7 && !d.flare && !d.sep);
    if (g) mk(g, { type: 'geomagnetic_storm', nasaName: `Geomagnetic Storm Kp ${g.kp.toFixed(1)}`, realClass: `Kp ${g.kp}`, sourceUrl: g.gstUrl, facts: { kp: g.kp } });
}
// 6. A harmless CME day: a slow CME and nothing else
const cme = all.find(d => d.cmeSpeed >= 300 && d.cmeSpeed <= 800 && !d.flare && !d.sep && d.kp < 5);
if (cme) mk(cme, { type: 'cme', nasaName: `Coronal Mass Ejection, about ${cme.cmeSpeed} km/s`, realClass: `${cme.cmeSpeed} km/s`, sourceUrl: cme.cmeUrl, facts: {} });
// 7. A quiet day: a date in the range with no alert at all
let quiet = null;
for (let t = Date.parse(all[0].date); t <= Date.parse(all.at(-1).date); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (!byDay.has(d)) { quiet = d; break; }
}
picks.push(makeEvent({ id: `replay-quiet-${quiet ?? 'none'}`, source: 'NASA DONKI', sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/', nasaName: 'Quiet Sun', date: quiet ?? all[0].date, type: 'quiet', realClass: 'none', mode: 'replay', facts: {} }));

await mkdir(new URL('../game/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../game/data/replay-events.json', import.meta.url), JSON.stringify(picks, null, 2) + '\n');
for (const e of picks) console.log(e.risk.padEnd(9), e.date, e.nasaName.padEnd(46), e.sourceUrl);
console.log(`wrote ${picks.length} events to game/data/replay-events.json`);
