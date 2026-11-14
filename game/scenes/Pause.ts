import { game } from '../engine.js';
import { defineMenuStyles, menuBackdrop } from '../ui/Menu.js';
import { closeSettings, openSettings, settingsOpen } from './Settings.js';

/**
 * The pause menu, opened over play by the pause button or by P or Escape. `game.scenes.push('pause')` holds play
 * beneath it; Resume is `game.scenes.pop()`.
 */
export const Pause = {
    name: 'pause',
    enter(): void {
        const H = game.screen.height;
        defineMenuStyles();
        menuBackdrop();
        const menu = game.ui.window({ anchor: 'center', w: 460, h: 'auto', title: 'Paused', titleHeight: 56, style: 'space-window', layout: { padding: 26, gap: 14, align: 'stretch' } });
        game.ui.button({ parent: menu, h: 80, text: 'Resume', style: 'good', icon: 'play', onClick: () => game.scenes.pop() });
        game.ui.button({ parent: menu, h: 68, text: 'Settings', style: 'blue', icon: 'settings', onClick: () => { menu.ui.hidden = true; openSettings({ onClose: () => { menu.ui.hidden = false; } }); } });
        game.ui.button({ parent: menu, h: 68, text: 'Restart', icon: 'restart', onClick: () => game.scenes.go('play') });
        game.ui.button({ parent: menu, h: 68, text: 'Title', icon: 'home', onClick: () => game.scenes.go('title') });
        game.ui.muteButton();
        menu.ui.y = -H;
        game.tween.to(menu.ui, { y: 0 }, { duration: 0.35, ease: 'easeOutBack' });
        game.step('pause', () => {
            if (game.input.keyPressed('Escape') || game.input.keyPressed('KeyP')) {
                if (settingsOpen()) { closeSettings(); menu.ui.hidden = false; } else game.scenes.pop();
            }
        });
    },
};
