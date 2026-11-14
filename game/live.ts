import { game } from './engine.js';
import { eventFromNoaaLive, type GameEvent } from './spaceWeather.js';

/**
 * Live mode: asks NOAA's Space Weather Prediction Center (no key needed, open to browsers) what the Sun is doing
 * now, and turns it into one game event. If the network fails or is slow, the game uses the saved NASA events.
 */
const BASE = 'https://services.swpc.noaa.gov/';
const TIMEOUT_SECONDS = 8;

export const live: { useLive: boolean; event: GameEvent | null; ok: boolean } = { useLive: false, event: null, ok: false };

const rank = (c: string): number => 'ABCMX'.indexOf(c[0]) * 100 + parseFloat(c.slice(1));

type Scales = Parameters<typeof eventFromNoaaLive>[0] & { '0'?: { DateStamp?: string; TimeStamp?: string } };
type Flare = { max_class?: string; max_time?: string };
type Kp = { time_tag?: string; Kp?: number };

async function getJson<T>(path: string, signal: AbortSignal): Promise<T>
{
    const r = await fetch(BASE + path, { signal });
    if (!r.ok) throw new Error(`${path}: http ${r.status}`);
    return (await r.json()) as T;
}

/** Fetches the live event. Returns true when it worked; either way `live` says what to use. */
export async function loadLiveEvent(): Promise<boolean>
{
    live.useLive = true;
    live.event = null;
    live.ok = false;
    const ctrl = new AbortController();
    game.after(TIMEOUT_SECONDS, () => ctrl.abort());
    try {
        const [scales, flares, kp] = await Promise.all([
            getJson<Scales>('products/noaa-scales.json', ctrl.signal),
            getJson<Flare[]>('json/goes/primary/xray-flares-7-day.json', ctrl.signal),
            getJson<Kp[]>('products/noaa-planetary-k-index.json', ctrl.signal),
        ]);
        const strongest = flares.filter(f => f.max_class).sort((a, b) => rank(b.max_class!) - rank(a.max_class!))[0] ?? null;
        const stamp = scales['0']?.DateStamp ? `${scales['0'].DateStamp}T${scales['0'].TimeStamp ?? '00:00:00'}Z` : (kp.at(-1)?.time_tag ?? '1970-01-01');
        live.event = eventFromNoaaLive(scales, strongest, kp.at(-1)?.Kp ?? null, stamp);
        live.ok = true;
    } catch {
        live.event = null;
    }
    return live.ok;
}

export function useReplayOnly(): void { live.useLive = false; live.event = null; live.ok = false; }

/** What the HUD says about where the data comes from. */
export const dataLabel = (): string => !live.useLive ? '' : live.ok ? 'Live data from NOAA is on' : 'Using saved NASA data';
