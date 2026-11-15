import { game } from '../engine.js';
import { soundQueue } from '../sound.js';
import { CROPS, plant, run, type CropId } from '../run.js';

/** The window for choosing a crop to plant in an empty bed. */
type Widget = { destroy(): void };
let root: Widget | null = null;

export const cropPickerOpen = (): boolean => root !== null;

export function closeCropPicker(): void
{
    root?.destroy();
    root = null;
}

/** `done` is told the message to show and whether a crop was planted. */
export function openCropPicker(bed: number, done: (message: string, planted: boolean) => void): void
{
    if (root) return;
    const text = (size: number, color = '#ffffff') => ({ font: `bold ${size}px sans-serif`, textColor: color });
    const win = game.ui.window({ anchor: 'center', w: 640, h: 440, title: `Bed ${bed + 1}: choose a crop`, layout: { padding: 18, gap: 10, align: 'stretch' } });
    root = win;
    game.ui.label({ parent: win, h: 32, text: `Water in the tank: ${Math.round(run.water)}`, style: text(20, '#8fd3ff') });
    for (const id of Object.keys(CROPS) as CropId[]) {
        const c = CROPS[id];
        const row = game.ui.panel({ parent: win, h: 62, style: { fill: '#00000000' }, layout: { direction: 'row', padding: 0, gap: 12, justify: 'space-between' } });
        game.ui.button({
            parent: row, h: 54, text: c.name, style: 'good',
            onClick: () => {
                const error = plant(bed, id);
                soundQueue.push(error ? 'error' : 'plant');
                closeCropPicker();
                done(error ?? `${c.name} planted in bed ${bed + 1}.`, error === null);
            },
        });
        game.ui.label({ parent: row, w: 330, h: 54, text: `${c.grow}s to grow, ${c.food} food, ${c.water} water`, style: text(18) });
    }
    game.ui.label({ parent: win, h: 28, text: 'Esc to cancel. Growth speed depends on the greenhouse level.', style: text(16, '#8a97b8') });
}
