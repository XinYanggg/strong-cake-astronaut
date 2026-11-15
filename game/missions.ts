import { current as currentEvent, stormActive } from './events.js';
import { soundQueue } from './sound.js';
import { BASE_POWER, BATTERY_MAX, notices, run, totalUse } from './run.js';

/**
 * The five missions, one per lunar day. A task is finished by doing something (`markTask`) or by the game
 * noticing a condition (`auto`). A finished mission gives a badge and a small reward, and says what it taught.
 */
type Context = { inShelter: boolean; dt: number };
export type Task = { id: string; label: string; auto?: (c: Context) => boolean };
export type Mission = { id: string; day: number; title: string; goal: string; lesson: string; reward: string; give: () => void; tasks: Task[] };

// Scripted trouble for missions 3 and 5 (seconds into the day)
const SHORTAGE = { from: 30, settles: 70, to: 200, factor: 0.6 };   // dust falls from 0:30, can be cleaned from 1:10, blows away by itself at 3:20
const COMM_FAILS_AT = 40;
const SHELTER_SECONDS = 20;       // mission 4: time to spend in the shelter during the storm
let shelterTime = 0;

export const MISSIONS: Mission[] = [
    {
        id: 'm1', day: 1, title: 'Establish the Outpost', goal: 'Visit each place and press E.',
        lesson: 'A base needs power, air, water and food, and they all depend on each other.', reward: '+10 food',
        give: () => { run.food = Math.min(100, run.food + 10); },
        tasks: [
            { id: 'm1.power', label: 'Inspect the power station' },
            { id: 'm1.plant', label: 'Plant your first crop', auto: () => run.planted >= 1 },
            { id: 'm1.life', label: 'Check the life-support system' },
            { id: 'm1.comms', label: 'Activate the communication terminal' },
        ],
    },
    {
        id: 'm2', day: 2, title: 'Grow Your First Food', goal: 'Plants need water, light and time.',
        lesson: 'Food takes water and power to grow. More light means faster plants but a bigger power bill.', reward: '+15 water',
        give: () => { run.water = Math.min(100, run.water + 15); },
        tasks: [
            { id: 'm2.plant', label: 'Plant 3 crops in total', auto: () => run.planted >= 3 },
            { id: 'm2.harvest', label: 'Harvest a crop', auto: () => run.harvested >= 1 },
            { id: 'm2.food', label: 'Store 25 food', auto: () => run.food >= 25 },
        ],
    },
    {
        id: 'm3', day: 3, title: 'Power Shortage', goal: 'Dust covers the solar panels. Cut your power use, then clean them at the Power Station.',
        lesson: 'Power is limited. When supply drops, you must choose which systems matter most.', reward: '+15 battery',
        give: () => { run.battery = Math.min(BATTERY_MAX, run.battery + 15); },
        tasks: [
            { id: 'm3.check', label: 'Check the Battery Bank' },
            { id: 'm3.balance', label: 'Use no more power than the solar panels make', auto: () => run.day === 3 && ((shortageNow() && run.available < BASE_POWER && totalUse() <= run.available) || run.panelsCleaned) },
            { id: 'm3.clean', label: 'Clean the solar panels at the Power Station' },
        ],
    },
    {
        id: 'm4', day: 4, title: 'Solar Radiation Alert', goal: 'Read the alert, raise the shield and shelter before the storm.',
        lesson: 'Solar storms send radiation. Warning time is short, so shield first and shelter early.', reward: '+20 health',
        give: () => { run.health = Math.min(100, run.health + 20); },
        tasks: [
            { id: 'm4.read', label: 'Read the NASA alert (press N)' },
            { id: 'm4.shield', label: 'Set the shield to High', auto: () => run.day === 4 && run.levels.shield === 3 && !!currentEvent?.arrived },
            { id: 'm4.shelter', label: `Stay in the Radiation Shelter for ${SHELTER_SECONDS} seconds of the storm`, auto: () => run.day === 4 && shelterTime >= SHELTER_SECONDS },
            { id: 'm4.survive', label: 'Get through the storm', auto: () => run.day === 4 && !!currentEvent?.over },
        ],
    },
    {
        id: 'm5', day: 5, title: 'Communication Failure', goal: 'The link to Earth is broken. Fix it before the next alert.',
        lesson: 'Messages from Earth take time, and without communication help cannot reach you.', reward: 'Final mission!',
        give: () => {},
        tasks: [
            { id: 'm5.repair', label: 'Repair the communication relay (Comm Terminal)' },
            { id: 'm5.alert', label: 'Receive the alert from Earth', auto: () => run.day === 5 && !!currentEvent?.arrived },
            { id: 'm5.survive', label: 'Get through the storm', auto: () => run.day === 5 && !!currentEvent?.over },
        ],
    },
];

const shortageNow = (): boolean => run.day === 3 && !run.panelsCleaned && run.dayTime >= SHORTAGE.from && run.dayTime < SHORTAGE.to;
/** True once the dust has settled and the panels can be wiped. */
export const dustSettled = (): boolean => run.dayTime >= SHORTAGE.settles;
export const shortageActive = shortageNow;
let shortageAnnounced = false;
let failureAnnounced = false;

export function resetMissions(): void { shortageAnnounced = false; failureAnnounced = false; shelterTime = 0; }

export const isDone = (taskId: string): boolean => run.tasks.includes(taskId);
export function markTask(taskId: string): void { if (!isDone(taskId)) run.tasks.push(taskId); }

/** Missions whose day has come and which are not finished yet, oldest first. */
export const openMissions = (): Mission[] => MISSIONS.filter(m => m.day <= run.day && !run.completed.includes(m.id));
export const missionToday = (): Mission | undefined => MISSIONS.find(m => m.day === run.day);

/** The scripted trouble: call before stepRun, after the event has set the power available. */
export function stepMissionScript(): void
{
    if (shortageNow()) {
        run.available = Math.round(run.available * SHORTAGE.factor);
        if (!shortageAnnounced) { shortageAnnounced = true; notices.push('Power shortage! Dust covers the solar panels: only 60% power. Turn systems down at their machines, then clean the panels at the Power Station.'); }
    }
    if (run.day === 5 && run.dayTime >= COMM_FAILS_AT && !failureAnnounced) {
        failureAnnounced = true;
        run.commsFailed = true;
        notices.push('Communication failure! The relay is broken. Go to the Comm Terminal and repair it.');
    }
}

/** A line about trouble happening now, for the HUD. */
export const troubleLine = (): string | null => shortageNow() ? (dustSettled() ? 'Power shortage: clean the panels at the Power Station.' : 'Power shortage: dust is still falling...') : null;

/** Checks the open missions' tasks and finishes missions. */
export function stepMissions(c: Context): void
{
    if (stormActive() && c.inShelter) shelterTime += c.dt;
    for (const m of openMissions()) {
        for (const t of m.tasks) if (t.auto && !isDone(t.id) && t.auto(c)) markTask(t.id);
        if (m.tasks.every(t => isDone(t.id))) {
            run.completed.push(m.id);
            m.give();
            soundQueue.push('mission');
            notices.push(`Mission ${m.id.slice(1)} complete: ${m.title}! Badge earned. Reward: ${m.reward}.`);
            notices.push(`You learned: ${m.lesson}`);
        }
    }
}
