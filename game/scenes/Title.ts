import { game } from '../engine.js';
import assets from '../assets.json';
import { CAKES } from '../art.js';
import { openSettings } from './Settings.js';
import { loadLiveEvent, useReplayOnly } from '../live.js';

/**
 * The title screen: the first thing the player sees.
 *
 * Usually the game's name (or its logo, if it has one), its title art and music, and the way in. The way in is
 * already here: the Play button, Space or Enter goes to 'play'. Add more buttons (levels, settings) the same way:
 * the skin's styles, an engine icon, and no width, so each fits its icon and caption.
 *
 * Everything this screen shows comes from the 'title' pack in assets.json, or is painted in art.ts. The 'game' pack
 * is still loading while the title is up, so the way in waits for it: it only waits if the player is quicker than
 * the download.
 *
 * A game that drops straight into play can delete this file and go to 'play' from main.ts.
 */
const NAME = 'Strong Cake Astronaut';

/**
 * A title screen designed on phaser.io arrives as a file in the 'title' pack (`title-screen`). With the
 * `title-screen` pack composed, it plays exactly as designed (its art, motion, music and the way into play) and
 * this scene does nothing else. Without one, the plain way in below.
 */
interface TitlePlayer { play(file: unknown, options: { next: string; wait: () => unknown }): unknown }
const designed = (): TitlePlayer | null => {
    const player = (game as unknown as { titleScreen?: TitlePlayer }).titleScreen;
    return player && game.assets.has('title-screen') ? player : null;
};

export const Title = {
    name: 'title',
    enter(): void {
        const player = designed();
        if (player) {
            player.play(game.assets.get('title-screen'), { next: 'play', wait: () => game.assets.load(assets, { pack: 'game' }) });
            return;
        }
        const W = game.screen.width, H = game.screen.height;
        game.spawn({ id: 'title-bg', texture: 'title-bg', layer: 'floor', z: -20000, x: W / 2, y: H / 2 });
        // cakes floating in the sky
        [[110, 150], [380, 70], [820, 120], [1180, 440], [70, 380], [1220, 620], [560, 200]].forEach(([x, y], i) => {
            const cake = game.spawn({ id: 'title-cake', texture: CAKES[i % CAKES.length], layer: 'world', x, y, scale: 1.8 + (i % 3) * 0.3, rot: (i - 3) * 0.25 });
            game.tween.to(cake, { y: y - 14, rot: cake.rot + 0.3 }, { duration: 2 + i * 0.3, yoyo: true, loop: true, ease: 'easeInOutQuad' });
        });
        game.spawn({ id: 'title-astronaut', texture: 'astronaut', layer: 'world', x: 235, y: 505, scale: 3.3 });
        // The name in the skin's `heading`, and Play in its `good` colour (main.ts chooses the skin).
        game.ui.label({ anchor: 'center', y: -H * 0.12, w: W - 64, h: 160, text: NAME, style: 'heading' });
        let starting = false;
        const status = game.text('', W / 2, H * 0.1 + 330, { size: 20, color: '#ffe08a', stroke: { color: '#000000', width: 3 } });
        const start = (useLive: boolean): void => {
            if (starting) return;
            starting = true;
            void (async () => {
                if (useLive) {
                    status.text = 'Asking NOAA what the Sun is doing...';
                    const ok = await loadLiveEvent();
                    status.text = ok ? 'Live data received!' : 'Could not reach NOAA: using saved NASA data.';
                } else {
                    useReplayOnly();
                }
                await game.assets.load(assets, { pack: 'game' });
                game.scenes.go('play');
            })();
        };
        game.ui.button({ anchor: 'center', y: H * 0.1, h: 96, text: 'Play', style: 'good', icon: 'play', onClick: () => start(false) });
        game.ui.button({ anchor: 'center', y: H * 0.1 + 124, h: 72, text: 'Play with live Sun data', icon: 'globe', onClick: () => start(true) });
        game.ui.button({ anchor: 'bottom-right', x: -20, y: -20, h: 64, text: 'Settings', style: 'blue', icon: 'settings', onClick: () => openSettings({ dim: true }) });
        game.text('Play uses saved NASA events. Live uses what NOAA sees on the Sun today.', W / 2, H * 0.1 + 270, { size: 16, color: '#b9c6e6' });
        game.step('title', () => {
            if (game.input.keyPressed('Space') || game.input.keyPressed('Enter')) start(false);
        });
    },
};
