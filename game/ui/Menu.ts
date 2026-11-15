import { game } from '../engine.js';
import { CAKES } from '../art.js';

/**
 * The look shared by the pause menu and the settings screen: a deep-space window with a pink rim, the cake
 * astronaut on one side and a few floating cakes on the other.
 */
export function defineMenuStyles(): void
{
    game.ui.defineStyle('space-window', {
        base: 'panel', fill: '#0b1235', fillTo: '#1d2660', fillAngle: 90, radius: 26, border: 4, borderColor: '#ff8ac0',
        ring: 1, ringInset: 8, ringColor: '#ffffff33', pattern: 'dots', patternColor: '#ffffff14', patternScale: 14,
        shadow: 0.8, shadowColor: '#ff8ac055', shadowBlur: 30,
    });
}

/** The dimmed screen behind a menu, plus the decorations beside it. */
export function menuBackdrop(): void
{
    const W = game.screen.width, H = game.screen.height;
    game.ui.panel({ anchor: 'center', w: W, h: H, safeArea: false, style: { fill: '#04061ab8', radius: 0, border: 0, bevel: 0, gloss: 0, shadow: 0 } });
    const hero = game.spawn({ id: 'menu-astronaut', texture: 'astronaut', layer: 'hud', x: W / 2 - 340, y: H / 2 + 40, scale: 3 });
    game.tween.to(hero, { y: hero.y - 10 }, { duration: 1.6, yoyo: true, loop: true, ease: 'easeInOutQuad' });
    [[W / 2 + 330, H / 2 - 120, 0], [W / 2 + 380, H / 2 + 10, 3], [W / 2 + 320, H / 2 + 130, 4]].forEach(([x, y, k], i) => {
        const cake = game.spawn({ id: 'menu-cake', texture: CAKES[k], layer: 'hud', x, y, scale: 2.4, rot: 0.2 - i * 0.2 });
        game.tween.to(cake, { y: y - 12, rot: cake.rot + 0.3 }, { duration: 1.3 + i * 0.4, yoyo: true, loop: true, ease: 'easeInOutQuad' });
    });
}
