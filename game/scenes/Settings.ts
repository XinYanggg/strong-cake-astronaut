import { game } from '../engine.js';
import { defineMenuStyles } from '../ui/Menu.js';
import { setVolume, sfx, volumeOf } from '../sound.js';

/** Sound settings: music and effects volume, saved between visits. A window opened inside the pause menu or the title. */

type Widget = { destroy(): void };
let open: Widget[] = [];

export const settingsOpen = (): boolean => open.length > 0;

export function closeSettings(): void
{
    for (const w of open) w.destroy();
    open = [];
}

/** Opens the settings window in the current scene. `onClose` runs after Back. With `dim`, the screen behind is darkened and blocked. */
export function openSettings(opts: { dim?: boolean; onClose?: () => void }): void
{
    if (open.length) return;
    defineMenuStyles();
    const W = game.screen.width, H = game.screen.height;
    if (opts.dim) open.push(game.ui.panel({ anchor: 'center', w: W, h: H, z: 500, safeArea: false, style: { fill: '#04061acc', radius: 0, border: 0, bevel: 0, gloss: 0, shadow: 0 } }));
    const menu = game.ui.window({ anchor: 'center', w: 500, h: 'auto', z: 501, title: 'Settings', titleHeight: 56, style: 'space-window', layout: { padding: 26, gap: 12, align: 'stretch' } });
    open.push(menu);
    const label = { font: 'bold 22px sans-serif', textColor: '#ffd0e6' };
    const row = (text: string, key: 'music' | 'sfx'): void => {
        game.ui.label({ parent: menu, h: 30, text, style: label });
        game.ui.slider({
            parent: menu, h: 34, value: volumeOf(key),
            onChange: v => { setVolume(key, v); if (key === 'sfx') sfx('interact'); },
        });
    };
    row('Music', 'music');
    row('Sound effects', 'sfx');
    game.ui.button({ parent: menu, h: 72, text: 'Back', style: 'good', icon: 'back', onClick: () => { closeSettings(); opts.onClose?.(); } });
}
