import { game } from '../engine.js';
import { soundQueue } from '../sound.js';
import { SYSTEMS, LEVEL_NAMES, BATTERY_MAX, run, setLevel, totalUse, sysCost, type SystemId } from '../run.js';

/**
 * Power windows. At the Power Station the panel only shows every system (an overview). Each system is switched at its own
 * machine: this same window opens there with just that system's buttons.
 */
type Widget = { destroy(): void };
let root: Widget | null = null;
let warnText = '';
let refresh: () => void = () => {};

/** Called every step while a power window is open, so the numbers move with the battery. */
export const refreshPowerPanel = (): void => { if (root) refresh(); };
export const powerPanelOpen = (): boolean => root !== null;

export function closePowerPanel(): void
{
    root?.destroy();
    root = null;
}

const ABOUT: Record<SystemId, string> = {
    life: 'Keeps the air and water clean. Higher levels refill life support; Off lets it run down.',
    greenhouse: 'The grow lights. Brighter light grows crops faster, but costs more power.',
    comms: 'The antenna to Earth. A stronger signal brings NASA alerts sooner. Off means no messages.',
    shield: 'The radiation shield. Higher levels block more radiation in a storm, and it takes time to charge.',
    lab: 'The research lab. Higher levels make more science points.',
};

const STATUS: Record<SystemId, () => string> = {
    life: () => `Life support is at ${Math.round(run.life)}%, water ${Math.round(run.water)}.`,
    greenhouse: () => `Crops grow ${['not at all', 'at half speed', 'at normal speed', 'fast'][run.levels.greenhouse]} right now.`,
    comms: () => run.commsFailed ? 'The relay is broken! Repair it first (press E here again).' : 'Messages from Earth travel faster at higher levels.',
    shield: () => `Shield readiness is ${Math.round(run.shield)}%.`,
    lab: () => 'The lab makes science points for upgrades.',
};

export function openPowerPanel(only?: SystemId): void
{
    if (root) return;
    warnText = '';
    const text = (size: number, color = '#ffffff') => ({ font: `bold ${size}px sans-serif`, textColor: color });
    const systems = only ? SYSTEMS.filter(s => s.id === only) : SYSTEMS;
    const title = only ? SYSTEMS.find(s => s.id === only)!.name : 'Power Station Overview';
    const win = game.ui.window({ anchor: 'center', w: only ? 780 : 820, h: 'auto', title, layout: { padding: 18, gap: 10, align: 'stretch' } });
    root = win;
    const status = game.ui.label({ parent: win, h: 34, text: '', style: text(22, '#ffe08a') });
    if (only) game.ui.label({ parent: win, h: 52, text: ABOUT[only], style: text(17, '#b9c6e6') });
    const warn = game.ui.label({ parent: win, h: 30, text: '', style: text(18, '#ff8a8a') });
    const costLabels = new Map<SystemId, ReturnType<typeof game.ui.label>>();
    const levelLabels = new Map<SystemId, ReturnType<typeof game.ui.label>>();
    const buttons = new Map<SystemId, ReturnType<typeof game.ui.button>[]>();
    for (const s of systems) {
        const row = game.ui.panel({ parent: win, h: 52, style: { fill: '#00000000' }, layout: { direction: 'row', padding: 0, gap: 8, justify: 'space-between' } });
        game.ui.label({ parent: row, w: 230, h: 44, text: s.name, style: text(22) });
        if (only) {
            buttons.set(s.id, LEVEL_NAMES.map((name, level) => game.ui.button({
                parent: row, h: 46, text: name, style: 'flat',
                onClick: () => { warnText = setLevel(s.id, level) ?? ''; soundQueue.push(warnText ? 'error' : 'panel'); refresh(); },
            })));
        } else {
            levelLabels.set(s.id, game.ui.label({ parent: row, w: 200, h: 44, text: '', style: text(22, '#ffd0e6') }));
        }
        costLabels.set(s.id, game.ui.label({ parent: row, w: 130, h: 44, text: '', style: text(22, '#8fd3ff') }));
    }
    if (only) game.ui.label({ parent: win, h: 28, text: STATUS[only](), style: text(18, '#7dff9b') });
    else {
        for (const line of ['Switch each system at its own machine:', 'Life Support Unit and Comm Terminal: Command Center', 'Grow Lights: Greenhouse.  Shield Controls: Radiation Shelter.', 'Research Console: Research Lab.']) {
            game.ui.label({ parent: win, h: 24, text: line, style: text(16, '#9fb0d8') });
        }
    }
    game.ui.label({ parent: win, h: 26, text: 'Esc to close', style: text(16, '#8a97b8') });

    refresh = () => {
        const net = run.available - totalUse();
        status.ui.text = `Battery ${Math.round(run.battery)}/${BATTERY_MAX}   Using ${totalUse()}/day   Solar ${run.available}/day`;
        warn.ui.text = warnText || (run.commsFailed ? 'The communication relay is broken! Repair it at the Comm Terminal.' : net < 0 ? `Draining the battery: ${-net} units/day more than the solar panels make.` : '');
        for (const s of systems) {
            buttons.get(s.id)?.forEach((b, level) => { b.ui.style = run.levels[s.id] === level ? 'good' : 'flat'; });
            levelLabels.get(s.id)?.ui && (levelLabels.get(s.id)!.ui.text = LEVEL_NAMES[run.levels[s.id]]);
            costLabels.get(s.id)!.ui.text = `${sysCost(s.id, run.levels[s.id])} units`;
        }
    };
    refresh();
}
