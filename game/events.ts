import { game } from './engine.js';
import replay from './data/replay-events.json';
import type { GameEvent } from './spaceWeather.js';
import { live } from './live.js';
import { soundQueue } from './sound.js';
import { BASE_POWER, DAY_SECONDS, notices, run } from './run.js';

/**
 * Space weather events in a mission. Each day has one: Earth sends a warning, it travels to the outpost
 * (slower with weaker communication), and the storm itself hits at a fixed time whether or not the warning arrived.
 * Phase 4 step 2 uses the saved replay events; live NOAA data comes in the next step.
 */
const EVENTS = replay as GameEvent[];
/** The kind of event planned for each day (day 1 is first). */
const DAY_PLAN: ('quiet' | 'low' | 'moderate' | 'high')[] = ['quiet', 'low', 'moderate', 'high', 'high'];
const STORM_AT = 150;              // seconds into the day when the storm hits
const WARNING_LEAD = 60;           // Earth sends its warning this long before the storm
const WARNING_TRAVEL = 15;         // seconds of travel at Normal communication (the real delay is about 1.3 s; exaggerated for play)
const COMM_SPEED = [0, 0.5, 1, 1.8]; // Off, Low, Normal, High: how fast a message travels
const STORM_SECONDS = 60;
const BANNER_AFTER = 10;           // the banner stays this long after the storm ends

export type EventState = {
    ev: GameEvent;
    sent: boolean;
    progress: number;              // seconds of travel done
    arrived: boolean;
    over: boolean;
    stormSounded?: boolean;
};

let used = new Set<string>();
let lastDay = 0;
export let current: EventState | null = null;
/** Every event received so far this mission, newest last (for the NASA Alerts station). */
export const received: GameEvent[] = [];

export function resetEvents(): void { used = new Set(); lastDay = 0; current = null; received.length = 0; }

function pick(kind: 'quiet' | 'low' | 'moderate' | 'high'): GameEvent
{
    // In live mode today's real event takes the day that matches its risk; the other days use saved events.
    const l = live.useLive ? live.event : null;
    if (l && !used.has(l.id) && (l.type === 'quiet' ? 'quiet' : l.risk) === kind) { used.add(l.id); return l; }
    const fits = (e: GameEvent) => kind === 'quiet' ? e.type === 'quiet' : e.type !== 'quiet' && e.risk === kind;
    const options = EVENTS.filter(e => fits(e) && !used.has(e.id));
    const list = options.length ? options : EVENTS.filter(fits);
    const ev = game.rng.pick(list.length ? list : EVENTS);
    used.add(ev.id);
    return ev;
}

const lead = (): number => WARNING_LEAD + (run.upgrades.includes('warn1') ? 30 : 0) + (run.upgrades.includes('warn2') ? 30 : 0);
const travel = (): number => WARNING_TRAVEL / (run.upgrades.includes('antenna') ? 1.5 : 1);
const sentAt = (ev: GameEvent): number => ev.type === 'quiet' ? 60 : STORM_AT - lead();
export const stormStart = (): number => STORM_AT;
/** True while the storm is hitting the outpost. */
export const stormActive = (): boolean => !!current && current.ev.type !== 'quiet' && run.dayTime >= STORM_AT && run.dayTime < STORM_AT + STORM_SECONDS;

/** Runs the event for this step. Call before stepRun. */
export function stepEvents(dt: number): void
{
    if (run.day !== lastDay) {
        lastDay = run.day;
        current = { ev: pick(DAY_PLAN[Math.min(run.day, DAY_PLAN.length) - 1]), sent: false, progress: 0, arrived: false, over: false };
    }
    const s = current!;
    if (!s.sent && run.dayTime >= sentAt(s.ev)) s.sent = true;
    if (s.sent && !s.arrived) {
        s.progress += dt * (run.commsFailed ? 0 : COMM_SPEED[run.levels.comms]);
        if (s.progress >= travel()) {
            s.arrived = true;
            received.push(s.ev);
            soundQueue.push(s.ev.risk === 'low' || s.ev.type === 'quiet' ? 'chime' : 'alarm');
            const late = run.dayTime >= STORM_AT && s.ev.type !== 'quiet';
            notices.push(late ? `Message from Earth, but too late: ${s.ev.nasaName} has already hit! Press N.` : `NASA alert: ${s.ev.nasaName}. Press N to read it.`);
        }
    }
    const active = stormActive();
    if (active && !s.stormSounded && s.ev.risk !== 'low') { s.stormSounded = true; soundQueue.push('storm'); }
    const fx = s.ev.gameEffects;
    run.available = Math.round(BASE_POWER * (active ? fx.solarPowerMultiplier : 1));
    run.radiation = active ? fx.radiationLevel : 0;
    if (!s.over && s.ev.type !== 'quiet' && run.dayTime >= STORM_AT + STORM_SECONDS) {
        s.over = true;
        if (s.ev.risk !== 'low') notices.push('The storm has passed. Well done!');
    }
}

export type Banner = { text: string; color: string };
const COLORS = { low: '#2f8f55', moderate: '#c98a1c', high: '#c93636' };
const clock = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.ceil(sec % 60)).padStart(2, '0')}`;

/** What the warning banner says now, or null for none. */
export function bannerNow(): Banner | null
{
    const s = current;
    if (!s?.arrived || s.ev.type === 'quiet') return null;
    const t = run.dayTime;
    const color = COLORS[s.ev.risk];
    if (s.ev.risk === 'low') return t < STORM_AT + STORM_SECONDS ? { color, text: `Low alert: ${s.ev.nasaName}. No danger.` } : null;
    if (t < STORM_AT) return { color, text: `${s.ev.risk.toUpperCase()} ALERT: ${s.ev.nasaName}. Hits in ${clock(STORM_AT - t)}` };
    if (t < STORM_AT + STORM_SECONDS) return { color, text: `${s.ev.nasaName} is hitting now! ${clock(STORM_AT + STORM_SECONDS - t)} left` };
    if (t < STORM_AT + STORM_SECONDS + BANNER_AFTER) return { color: COLORS.low, text: 'The storm has passed.' };
    return null;
}

/** A short line for the HUD about the message from Earth, or null. */
export function statusLine(): string | null
{
    const s = current;
    if (!s?.sent || s.arrived) return null;
    if (run.commsFailed) return 'The communication relay is broken! Repair it at the Comm Terminal.';
    if (run.levels.comms === 0) return 'Communication is off! Messages from Earth cannot reach you.';
    return `Message from Earth is traveling... ${Math.round(s.progress / travel() * 100)}%`;
}

export const adviceFor = (ev: GameEvent): string =>
    ev.type === 'quiet' ? 'Nothing to do. Look after the greenhouse and the power station.'
        : ev.risk === 'low' ? 'Carry on as usual.'
            : ev.risk === 'moderate' ? 'Raise the shield and wait in the Radiation Shelter.'
                : 'Go to the Radiation Shelter now and give the shield power first.';
