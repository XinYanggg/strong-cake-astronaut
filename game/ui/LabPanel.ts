import { game } from '../engine.js';
import { soundQueue } from '../sound.js';
import { LEVEL_NAMES, UPGRADES, buyUpgrade, run, sciencePerDay, setLevel } from '../run.js';

/** The research console: spend science points on upgrades. */
type Widget = { destroy(): void };
let root: Widget | null = null;
let warnText = '';
let refresh: () => void = () => {};

export const labPanelOpen = (): boolean => root !== null;
export const refreshLabPanel = (): void => { if (root) refresh(); };

export function closeLabPanel(): void
{
    root?.destroy();
    root = null;
}

export function openLabPanel(): void
{
    if (root) return;
    warnText = '';
    const text = (size: number, color = '#ffffff') => ({ font: `bold ${size}px sans-serif`, textColor: color });
    const win = game.ui.window({ anchor: 'center', w: 900, h: 'auto', title: 'Research Console', layout: { padding: 18, gap: 10, align: 'stretch' } });
    root = win;
    const status = game.ui.label({ parent: win, h: 34, text: '', style: text(22, '#ffe08a') });
    const warn = game.ui.label({ parent: win, h: 28, text: '', style: text(18, '#ff8a8a') });
    const levelRow = game.ui.panel({ parent: win, h: 54, style: { fill: '#00000000' }, layout: { direction: 'row', padding: 0, gap: 8, justify: 'space-between' } });
    game.ui.label({ parent: levelRow, w: 200, h: 46, text: 'Lab power', style: text(22) });
    const levelButtons = LEVEL_NAMES.map((name, level) => game.ui.button({ parent: levelRow, h: 46, text: name, style: 'flat', onClick: () => { warnText = setLevel('lab', level) ?? ''; soundQueue.push(warnText ? 'error' : 'panel'); refresh(); } }));
    const rows = UPGRADES.map(u => {
        const row = game.ui.panel({ parent: win, h: 60, style: { fill: '#00000000' }, layout: { direction: 'row', padding: 0, gap: 12, justify: 'space-between' } });
        game.ui.label({ parent: row, w: 230, h: 50, text: u.name, style: text(22) });
        game.ui.label({ parent: row, w: 380, h: 50, text: u.text, style: text(16, '#b9c6e6') });
        const buy = game.ui.button({ parent: row, h: 50, text: '', style: 'good', onClick: () => { warnText = buyUpgrade(u.id) ?? ''; soundQueue.push(warnText ? 'error' : 'buy'); refresh(); } });
        return { u, buy };
    });
    game.ui.label({ parent: win, h: 26, text: 'Esc to close. Study NASA alerts (N) for bonus points.', style: text(16, '#8a97b8') });

    refresh = () => {
        status.ui.text = `Science points: ${Math.floor(run.science)}   Lab: ${LEVEL_NAMES[run.levels.lab]} (+${sciencePerDay()} a day)`;
        warn.ui.text = warnText || (run.levels.lab === 0 ? 'The lab is off! Turn it on at the Power Control Panel to earn science.' : '');
        levelButtons.forEach((b, level) => { b.ui.style = run.levels.lab === level ? 'good' : 'flat'; });
        for (const { u, buy } of rows) {
            const owned = run.upgrades.includes(u.id);
            buy.ui.text = owned ? 'Owned' : `${u.cost} points`;
            buy.ui.style = owned ? 'flat' : 'good';
        }
    };
    refresh();
}
