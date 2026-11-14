import { game } from '../engine.js';
import { result } from '../run.js';
import { sfx } from '../sound.js';
import { CAKES } from '../art.js';

/** The end of a mission: won after the last day, or lost when life support runs out. */
export const GameOver = {
    name: 'gameover',
    enter(): void {
        sfx(result.won ? 'win' : 'lose');
        const W = game.screen.width, H = game.screen.height;
        game.background.color(result.won ? '#0b2a1c' : '#1a0a14');
        game.ui.label({ anchor: 'center', y: -H * 0.18, w: W - 64, h: 140, text: result.won ? 'Mission complete!' : 'Mission failed', style: 'heading' });
        game.text(result.reason, W / 2, H / 2 - 20, { size: 26, stroke: { color: '#000000', width: 3 } });
        game.text(`Mission badges: ${result.badges} of 5`, W / 2, H / 2 + 20, { size: 22, color: '#ffe08a', stroke: { color: '#000000', width: 3 } });
        game.ui.button({ anchor: 'center', y: H * 0.17, h: 88, text: 'Play again', style: 'good', icon: 'restart', onClick: () => game.scenes.go('play') });
        game.ui.button({ anchor: 'center', y: H * 0.17 + 112, h: 72, text: 'Title', icon: 'home', onClick: () => game.scenes.go('title') });
        if (result.won) {
            game.spawn({ id: 'win-astronaut', texture: 'astronaut', layer: 'hud', x: 200, y: 460, scale: 2.6 });
            game.spawn({ id: 'win-astronaut', texture: 'astronaut', layer: 'hud', x: W - 200, y: 460, scale: 2.6, sx: -2.6 });
            CAKES.forEach((c, i) => {
                const cake = game.spawn({ id: 'win-cake', texture: c, layer: 'hud', x: 330 + i * 124, y: 90 + (i % 2) * 40, scale: 2 });
                game.tween.to(cake, { y: cake.y - 14, rot: 0.3 }, { duration: 1 + i * 0.15, yoyo: true, loop: true, ease: 'easeInOutQuad' });
            });
        }
        game.step('gameover', () => {
            if (game.input.keyPressed('Space') || game.input.keyPressed('Enter')) game.scenes.go('play');
        });
    },
};
