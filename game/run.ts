 /**
 * The state and rules of one mission: the day clock, the power budget and the resources.
 * No drawing here; scenes and UI read and change `run`.
 */
import { soundQueue } from './sound.js';

export const TOTAL_DAYS = 5;
export const DAY_SECONDS = 300;          // 1 lunar day = 5 real minutes (the design document's proposal)
export const BASE_POWER = 70;            // units the solar panels make on a normal day
export const BATTERY_MAX = 50;           // units the battery holds
const BATTERY_START = 30;
const RESTART_MIN_BATTERY = 10;          // a system shut down by a brownout needs this much battery to start again

export type SystemId = 'life' | 'greenhouse' | 'comms' | 'shield' | 'lab';
export const LEVEL_NAMES = ['Off', 'Low', 'Normal', 'High'] as const;

/** Daily power cost of each system at Off, Low, Normal and High. All at High is 100; all at Normal is 69. */
export const SYSTEMS: { id: SystemId; name: string; cost: [number, number, number, number] }[] = [
    { id: 'life', name: 'Life Support', cost: [0, 12, 21, 30] },
    { id: 'greenhouse', name: 'Greenhouse', cost: [0, 8, 14, 20] },
    { id: 'comms', name: 'Communication', cost: [0, 4, 7, 10] },
    { id: 'shield', name: 'Radiation Shield', cost: [0, 10, 17, 25] },
    { id: 'lab', name: 'Research Lab', cost: [0, 6, 10, 15] },
];

/** Crops: seconds to grow at Normal lights, food when harvested, and water to plant. A day is 300 seconds. */
export type CropId = 'radish' | 'lettuce' | 'potato';
export const CROPS: Record<CropId, { name: string; grow: number; food: number; water: number }> = {
    radish: { name: 'Radish', grow: 60, food: 5, water: 2 },
    lettuce: { name: 'Lettuce', grow: 100, food: 8, water: 4 },
    potato: { name: 'Potato', grow: 200, food: 20, water: 8 },
};
export const BEDS = 4;
/** How fast crops grow at each greenhouse level (Off, Low, Normal, High). */
const GROWTH_SPEED = [0, 0.5, 1, 1.6];
/** The crew eats and drinks this much per day. Life support recycles water: this much per day at each level. */
const FOOD_EATEN = 6;
const WATER_DRUNK = 6;
const WATER_RECYCLED = [0, 5, 12, 20];
const STARVE_DAMAGE = 0.15;      // health per second with no food or no water

/** Research: science points the lab makes per day at each level, and what they buy. */
const SCIENCE_PER_DAY = [0, 4, 8, 12];
export type UpgradeId = 'warn1' | 'warn2' | 'antenna' | 'shield';
export const UPGRADES: { id: UpgradeId; name: string; cost: number; text: string; needs?: UpgradeId }[] = [
    { id: 'warn1', name: 'Early Warning I', cost: 10, text: 'Earth sends storm warnings 30 seconds sooner.' },
    { id: 'warn2', name: 'Early Warning II', cost: 18, text: 'Another 30 seconds sooner.', needs: 'warn1' },
    { id: 'antenna', name: 'Better Antenna', cost: 12, text: 'Messages from Earth travel 50% faster.' },
    { id: 'shield', name: 'Stronger Shield', cost: 15, text: 'The shield blocks 90% of radiation instead of 80%.' },
];

/** Buys an upgrade with science points. Returns a message when it cannot, or null. */
export function buyUpgrade(id: UpgradeId): string | null
{
    const u = UPGRADES.find(x => x.id === id)!;
    if (run.upgrades.includes(id)) return 'You already have this.';
    if (u.needs && !run.upgrades.includes(u.needs)) return `Get ${UPGRADES.find(x => x.id === u.needs)!.name} first.`;
    if (run.science < u.cost) return `You need ${Math.ceil(u.cost - run.science)} more science points.`;
    run.science -= u.cost;
    run.upgrades.push(id);
    return null;
}
export const sciencePerDay = (): number => SCIENCE_PER_DAY[run.levels.lab];

/** Life support change per day at each level (points of 100). */
const LIFE_PER_DAY = [-50, -10, 5, 15];
/** Radiation: health lost per second per radiation level in the open with no shield. The shield removes up to SHIELD_BLOCK of it, the shelter room 90%. */
const RADIATION_DAMAGE = 0.8;
const SHIELD_BLOCK = 0.8;
const SHIELD_BLOCK_UPGRADED = 0.9;
const SHELTER_BLOCK = 0.9;
const HEAL_PER_SECOND = 0.15;
/** The shield readiness each level aims for, and how fast readiness moves (points per second). */
const SHIELD_TARGET = [0, 35, 65, 100];
const SHIELD_SPEED = 10;

export type Run = {
    day: number;                 // 1 to TOTAL_DAYS
    dayTime: number;             // seconds into the day
    levels: Record<SystemId, number>;
    available: number;           // power units the solar panels make today (events change this later)
    battery: number;             // 0 to BATTERY_MAX
    life: number;                // 0 to 100
    shield: number;              // 0 to 100
    water: number;               // 0 to 100
    food: number;                // 0 to 100
    beds: { crop: CropId | null; progress: number }[];   // progress 0 to 1
    panelsCleaned: boolean;      // the dust is off the solar panels (mission 3)
    commsFailed: boolean;        // the communication relay is broken (mission 5)
    tasks: string[];             // finished mission tasks, like 'm1.power'
    completed: string[];         // finished missions, like 'm1'
    planted: number;             // crops planted so far
    harvested: number;           // crops harvested so far
    science: number;             // research points to spend
    upgrades: UpgradeId[];
    studied: string[];           // ids of events whose info card was read (a research bonus)
    health: number;              // the astronaut, 0 to 100
    radiation: number;           // radiation level reaching the outpost now, 0 (none) to 3 (severe); set by events.ts
};

export const result = { won: false, reason: '', badges: 0 };
/** Messages for the player (a brownout, for example). The play scene shows and clears them. */
export const notices: string[] = [];

export function newRun(): Run
{
    return { day: 1, dayTime: 0, levels: { life: 2, greenhouse: 2, comms: 2, shield: 2, lab: 2 }, available: BASE_POWER, battery: BATTERY_START, life: 70, shield: 0, water: 60, food: 12, beds: Array.from({ length: BEDS }, () => ({ crop: null, progress: 0 })), science: 0, upgrades: [], studied: [], panelsCleaned: false, commsFailed: false, tasks: [], completed: [], planted: 0, harvested: 0, health: 100, radiation: 0 };
}

export let run: Run = newRun();
export function resetRun(): void { run = newRun(); result.won = false; result.reason = ''; result.badges = 0; notices.length = 0; }

export const sysCost = (id: SystemId, level: number): number => SYSTEMS.find(s => s.id === id)!.cost[level];
export const totalUse = (): number => SYSTEMS.reduce((sum, s) => sum + (s.id === 'comms' && run.commsFailed ? 0 : s.cost[run.levels[s.id]]), 0);

/** Plants a crop in a bed. Returns a message when it cannot, or null. */
export function plant(bed: number, crop: CropId): string | null
{
    if (run.beds[bed].crop) return 'Something is already growing here.';
    if (run.water < CROPS[crop].water) return `Not enough water to plant ${CROPS[crop].name} (needs ${CROPS[crop].water}).`;
    run.water -= CROPS[crop].water;
    run.beds[bed] = { crop, progress: 0 };
    run.planted += 1;
    return null;
}

/** Harvests a ripe bed. Returns the food gained, or 0 when it is not ready. */
export function harvest(bed: number): number
{
    const b = run.beds[bed];
    if (!b.crop || b.progress < 1) return 0;
    const gain = CROPS[b.crop].food;
    run.food = Math.min(100, run.food + gain);
    run.beds[bed] = { crop: null, progress: 0 };
    run.harvested += 1;
    return gain;
}

/**
 * Sets a system's level. Power is used in real time from the battery, so any level is allowed; what you pick
 * is paid for every second. Only a system the battery had to shut down needs charge to start again.
 * Returns a message when refused, or null.
 */
export function setLevel(id: SystemId, level: number): string | null
{
    if (level > 0 && run.levels[id] === 0 && run.battery < RESTART_MIN_BATTERY) return 'The battery is too low to start this system. Turn something else down and let it charge.';
    run.levels[id] = level;
    return null;
}

/** The order the outpost switches systems off when the battery is empty: least important first. */
const SHUTDOWN_ORDER: SystemId[] = ['lab', 'greenhouse', 'comms', 'shield', 'life'];

/** Moves the clock and the resources on by dt seconds. Returns 'newday', 'win', 'lose' or null. */
export function stepRun(dt: number, inShelter: boolean): 'newday' | 'win' | 'lose' | null
{
    // Power is used second by second: the panels fill the battery, the running systems drain it.
    const supply = run.available / DAY_SECONDS, use = totalUse() / DAY_SECONDS;
    run.battery = Math.max(0, Math.min(BATTERY_MAX, run.battery + (supply - use) * dt));
    if (run.battery <= 0 && use > supply) {
        const victim = SHUTDOWN_ORDER.find(id => run.levels[id] > 0);
        if (victim) { run.levels[victim] = 0; soundQueue.push('brownout'); notices.push(`Brownout! The battery is empty, so ${SYSTEMS.find(x => x.id === victim)!.name} shut down.`); }
    }
    run.life = Math.max(0, Math.min(100, run.life + LIFE_PER_DAY[run.levels.life] * dt / DAY_SECONDS));
    const target = SHIELD_TARGET[run.levels.shield];
    const move = SHIELD_SPEED * dt;
    run.shield += Math.max(-move, Math.min(move, target - run.shield));
    // Food and water: the crew uses them, life support recycles water, the greenhouse grows crops.
    run.food = Math.max(0, run.food - FOOD_EATEN * dt / DAY_SECONDS);
    run.water = Math.max(0, Math.min(100, run.water + (WATER_RECYCLED[run.levels.life] - WATER_DRUNK) * dt / DAY_SECONDS));
    if (run.water > 0) for (const b of run.beds) if (b.crop && b.progress < 1) b.progress = Math.min(1, b.progress + GROWTH_SPEED[run.levels.greenhouse] * dt / CROPS[b.crop].grow);
    run.science += SCIENCE_PER_DAY[run.levels.lab] * dt / DAY_SECONDS;
    const hungry = run.food <= 0 || run.water <= 0;
    const exposure = run.radiation * RADIATION_DAMAGE * (1 - (run.upgrades.includes('shield') ? SHIELD_BLOCK_UPGRADED : SHIELD_BLOCK) * run.shield / 100) * (inShelter ? 1 - SHELTER_BLOCK : 1);
    run.health = Math.max(0, Math.min(100, run.health + (exposure > 0 ? -exposure : hungry ? -STARVE_DAMAGE : HEAL_PER_SECOND) * dt - (exposure > 0 && hungry ? STARVE_DAMAGE * dt : 0)));
    if (run.health <= 0) { result.won = false; result.badges = run.completed.length; result.reason = hungry ? 'The crew ran out of food or water. Grow more crops and keep life support on.' : 'Too much radiation. Next time raise the shield and wait in the shelter.'; return 'lose'; }
    if (run.life <= 0) { result.won = false; result.badges = run.completed.length; result.reason = 'Life support ran out. Keep it running!'; return 'lose'; }
    run.dayTime += dt;
    if (run.dayTime >= DAY_SECONDS) {
        run.dayTime = 0;
        run.day += 1;
        if (run.day > TOTAL_DAYS) { result.won = true; result.badges = run.completed.length; result.reason = `You kept the outpost alive for ${TOTAL_DAYS} lunar days.`; return 'win'; }
        return 'newday';
    }
    return null;
}
