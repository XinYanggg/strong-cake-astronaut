import { game } from '../engine.js';
import { defineMenuStyles } from '../ui/Menu.js';
import { CAKES } from '../art.js';

/** The About window: who made the game. Opened from the title screen. */
type Widget = { destroy(): void };
let open: Widget[] = [];

export const aboutOpen = (): boolean => open.length > 0;

export function closeAbout(): void
{
    for (const w of open) w.destroy();
    open = [];
}

export function openAbout(): void
{
    if (open.length) return;
    defineMenuStyles();
    const W = game.screen.width, H = game.screen.height;
    open.push(game.ui.panel({ anchor: 'center', w: W, h: H, z: 500, safeArea: false, style: { fill: '#04061acc', radius: 0, border: 0, bevel: 0, gloss: 0, shadow: 0 } }));
    const menu = game.ui.window({ anchor: 'center', w: 560, h: 'auto', z: 501, title: 'About', titleHeight: 56, style: 'space-window', layout: { padding: 28, gap: 10, align: 'stretch' } });
    open.push(menu);
    const line = (text: string, size: number, color: string, h: number) => game.ui.label({ parent: menu, h, text, style: { font: `bold ${size}px sans-serif`, textColor: color } });
    line('Strong Cake Astronaut', 30, '#ffffff', 44);
    line('Developed by Strong Cake', 22, '#ffd0e6', 34);
    line('Farn Xin Yang', 26, '#ffffff', 36);
    line('Wong Tek Ken', 26, '#ffffff', 36);
    line('Space weather data from NASA DONKI and NOAA SWPC.', 15, '#9fb0d8', 24);
    line('Made with Phaser AE.', 15, '#9fb0d8', 24);
    game.ui.button({ parent: menu, h: 68, text: 'Back', style: 'good', icon: 'back', onClick: closeAbout });
    // a few cakes around the window
    CAKES.slice(0, 3).forEach((c, i) => {
        const x = W / 2 + (i === 1 ? 330 : -330), y = H / 2 - 100 + i * 90;
        const cake = game.spawn({ id: 'about-cake', texture: c, layer: 'hud', z: 600, x, y, scale: 2.4 });
        open.push(cake);
        game.tween.to(cake, { y: y - 10 }, { duration: 1.4 + i * 0.3, yoyo: true, loop: true, ease: 'easeInOutQuad' });
    });
}
