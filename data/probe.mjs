// Phase 2 probe: fetch each candidate NASA/NOAA source and print what the game can use.
// Usage: NASA_API_KEY=yourkey node data/probe.mjs   (DEMO_KEY is used if no key is set; it is heavily rate limited)
const KEY = process.env.NASA_API_KEY ?? 'DEMO_KEY';
const START = process.env.START ?? '2024-05-08';
const END = process.env.END ?? '2024-05-15';
const get = async (url) => {
    const r = await fetch(url);
    return { status: r.status, remaining: r.headers.get('x-ratelimit-remaining'), body: r.ok ? await r.json() : null };
};
const donki = (kind, extra = '') => get(`https://api.nasa.gov/DONKI/${kind}?startDate=${START}&endDate=${END}&api_key=${KEY}${extra}`);
const swpc = (path) => get(`https://services.swpc.noaa.gov/${path}`);

const line = (name, r, note) => console.log(`${name.padEnd(22)} http ${r.status}  ${note(r.body ?? [])}  (key calls left: ${r.remaining ?? 'n/a'})`);

line('DONKI CME', await donki('CME'), b => `${b.length} events`);
line('DONKI SEP', await donki('SEP'), b => `${b.length} events`);
line('DONKI GST', await donki('GST'), b => `${b.length} storms, max Kp ${Math.max(...b.flatMap(s => s.allKpIndex.map(k => k.kpIndex)))}`);
line('DONKI notifications', await donki('notifications', '&type=all'), b => `${b.length} messages`);
line('DONKI FLR', await donki('FLR'), b => `${b.length} events (404 means the endpoint is down)`);
line('NOAA scales (now)', await swpc('products/noaa-scales.json'), b => `R${b['0']?.R?.Scale} S${b['0']?.S?.Scale} G${b['0']?.G?.Scale}`);
line('NOAA Kp index', await swpc('products/noaa-planetary-k-index.json'), b => `${b.length} readings, latest Kp ${b.at(-1)?.Kp}`);
line('NOAA flares 7 day', await swpc('json/goes/primary/xray-flares-7-day.json'), b => `${b.length} flares, strongest ${b.map(f => f.max_class).sort().at(-1)}`);
line('NOAA flare latest', await swpc('json/goes/primary/xray-flares-latest.json'), b => `current class ${b[0]?.current_class}`);
line('NOAA alerts', await swpc('products/alerts.json'), b => `${b.length} alert messages`);
