// Turns raw NASA/NOAA space weather facts into the game's own event format.
// Pure functions with no imports, so the replay builder (Node) and the live mode (browser) share one set of rules.

export type Risk = 'low' | 'moderate' | 'high';
export type EventType = 'solar_flare' | 'cme' | 'geomagnetic_storm' | 'particle_storm' | 'quiet';

export type GameEvent = {
    id: string;
    source: string;
    sourceUrl: string;
    nasaName: string;
    date: string;
    type: EventType;
    realClass: string;
    risk: Risk;
    mode: 'live' | 'replay';
    gameEffects: { radiationLevel: number; solarPowerMultiplier: number; commsQuality: number; durationDays: number };
    kidExplanation: string;
};

/** What was measured. Leave out whatever is unknown. */
export type Facts = {
    flareClass?: string;     // for example 'X9.0', 'M5.0', 'C1.3'
    kp?: number;             // 0 to 9
    sScale?: number;         // NOAA radiation storm scale, 0 to 5
    gScale?: number;         // NOAA geomagnetic storm scale, 0 to 5
    rScale?: number;         // NOAA radio blackout scale, 0 to 5
    particleEvent?: boolean; // NASA reported a solar energetic particle event
};

/** Rules to tune after playtests. High: X flare, Kp 7+, S3+, G4+, or a particle event. Moderate: M flare, Kp 5+, S1+, G1+, R2+. */
export function classifyRisk(f: Facts): Risk {
    const letter = f.flareClass?.[0]?.toUpperCase();
    if (letter === 'X' || (f.kp ?? 0) >= 7 || (f.sScale ?? 0) >= 3 || (f.gScale ?? 0) >= 4 || f.particleEvent) return 'high';
    if (letter === 'M' || (f.kp ?? 0) >= 5 || (f.sScale ?? 0) >= 1 || (f.gScale ?? 0) >= 1 || (f.rScale ?? 0) >= 2) return 'moderate';
    return 'low';
}

const EFFECTS: Record<Risk, GameEvent['gameEffects']> = {
    low: { radiationLevel: 0, solarPowerMultiplier: 1, commsQuality: 1, durationDays: 1 },
    moderate: { radiationLevel: 1, solarPowerMultiplier: 0.9, commsQuality: 0.8, durationDays: 1 },
    high: { radiationLevel: 3, solarPowerMultiplier: 0.8, commsQuality: 0.5, durationDays: 1 },
};

const KID_TEXT: Record<EventType, Record<Risk, string>> = {
    solar_flare: {
        low: 'The Sun sent out a small flash of light. It is too weak to hurt anyone, so work goes on as usual.',
        moderate: 'The Sun sent out a strong flash of light. Radiation may go up, so it is safest to wait in the shelter.',
        high: 'The Sun let out a huge burst of energy. It can harm astronauts, so everyone hides in the shelter and the shield gets power first.',
    },
    cme: {
        low: 'The Sun threw out a cloud of particles. It is not aimed at us, so nothing changes today.',
        moderate: 'The Sun threw out a big cloud of particles. It may reach us soon, so get the shelter ready.',
        high: 'A giant cloud of particles from the Sun is heading our way. Get to the shelter and power the shield.',
    },
    geomagnetic_storm: {
        low: 'Earth feels a small push from the Sun. Radios may crackle a little.',
        moderate: 'Earth is in a magnetic storm. Radio messages may be weak or late.',
        high: 'Earth is in a very strong magnetic storm. Messages from mission control may be lost, and the sky glows with auroras.',
    },
    particle_storm: {
        low: 'A few extra particles from the Sun are flying by. They are harmless right now.',
        moderate: 'Fast particles from the Sun are flying by. Stay close to the shelter.',
        high: 'A storm of fast particles from the Sun is hitting. Go into the shelter now and keep the shield on.',
    },
    quiet: {
        low: 'The Sun is calm today. Great day to work on the greenhouse and the power station.',
        moderate: 'The Sun is calm today.',
        high: 'The Sun is calm today.',
    },
};

export function kidExplanation(type: EventType, risk: Risk): string
{
    return KID_TEXT[type][risk];
}

export function makeEvent(p: {
    id: string; source: string; sourceUrl: string; nasaName: string; date: string;
    type: EventType; realClass: string; mode: GameEvent['mode']; facts: Facts;
}): GameEvent
{
    const risk = classifyRisk(p.facts);
    return {
        id: p.id, source: p.source, sourceUrl: p.sourceUrl, nasaName: p.nasaName, date: p.date, type: p.type,
        realClass: p.realClass, risk, mode: p.mode, gameEffects: { ...EFFECTS[risk] }, kidExplanation: kidExplanation(p.type, risk),
    };
}

/** NOAA's current scales (products/noaa-scales.json), its latest flare, and optionally the latest Kp, as one live event. */
export function eventFromNoaaLive(
    scales: { '0'?: { R?: { Scale: string | null }; S?: { Scale: string | null }; G?: { Scale: string | null } } },
    flare: { current_class?: string; max_class?: string; max_time?: string } | null,
    kp: number | null,
    nowIso: string,
): GameEvent
{
    const now = scales['0'] ?? {};
    const facts: Facts = {
        rScale: Number(now.R?.Scale ?? 0), sScale: Number(now.S?.Scale ?? 0), gScale: Number(now.G?.Scale ?? 0),
        flareClass: flare?.max_class, kp: kp ?? undefined,
    };
    const type: EventType = (facts.sScale ?? 0) > 0 ? 'particle_storm' : (facts.gScale ?? 0) > 0 || (kp ?? 0) >= 5 ? 'geomagnetic_storm' : flare?.max_class && !flare.max_class.startsWith('A') && !flare.max_class.startsWith('B') ? 'solar_flare' : 'quiet';
    const label = type === 'quiet' ? 'Quiet Sun' : type === 'solar_flare' ? `Solar Flare ${flare?.max_class}` : type === 'particle_storm' ? `Radiation Storm S${facts.sScale}` : `Geomagnetic Storm G${facts.gScale}`;
    return makeEvent({
        id: `live-${nowIso.slice(0, 10)}`, source: 'NOAA Space Weather Prediction Center', sourceUrl: 'https://www.swpc.noaa.gov/',
        nasaName: label, date: (type === 'solar_flare' && flare?.max_time ? flare.max_time : nowIso).slice(0, 10), type, realClass: flare?.max_class ?? 'none', mode: 'live', facts,
    });
}
