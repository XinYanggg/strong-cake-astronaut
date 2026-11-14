// Downloads the DONKI data that the replay builder needs, into data/raw/. Run once:
//   NASA_API_KEY=yourkey node data/fetch-raw.mjs
// Files already downloaded are skipped, so it is safe to run again. The key is never saved.
import { mkdir, writeFile, access } from 'node:fs/promises';
const KEY = process.env.NASA_API_KEY;
if (!KEY) { console.error('Set NASA_API_KEY first.'); process.exit(1); }
const YEAR = process.env.YEAR ?? '2024';
await mkdir(new URL('./raw/', import.meta.url), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(name, url) {
    const file = new URL(`./raw/${name}`, import.meta.url);
    try { await access(file); console.log('have', name); return; } catch {}
    for (let tries = 0; tries < 4; tries++) {
        const r = await fetch(url);
        if (r.ok) { const body = await r.text(); await writeFile(file, body); console.log('saved', name, `${(body.length / 1024).toFixed(0)} KB`); return; }
        console.log(name, 'http', r.status, 'retrying'); await sleep(5000 * (tries + 1));
    }
    console.error('FAILED', name);
}
const q = (kind, a, b) => `https://api.nasa.gov/DONKI/${kind}?startDate=${a}&endDate=${b}&api_key=${KEY}`;
for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const last = new Date(Date.UTC(Number(YEAR), m, 0)).getUTCDate();
    await save(`notifications-${YEAR}-${mm}.json`, q('notifications', `${YEAR}-${mm}-01`, `${YEAR}-${mm}-${last}`) + '&type=all');
    await sleep(500);
}
