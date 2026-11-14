import { game, type Sprite } from '../engine.js';
import { spawnPlayer, stepPlayer } from '../entities/Player.js';
import { WORLD, buildOutpost, spawnStations, roomAt, MISSION_01, type StationDef } from '../outpost.js';
import { closePanel, panelOpen, togglePanel } from '../ui/Panels.js';

/**
 * Phase 1: walk the astronaut around an outpost of plain rooms. Stations are placeholder boxes.
 * W A S D move, E interacts, Tab shows missions, M shows the map, Esc closes a panel or pauses.
 */
const REACH = 90;
const MESSAGE_SECONDS = 3.5;

export const Play = {
    name: 'play',
    enter(): void {
        game.background.color('#0b1030');
        game.background.stars({ density: 0.4, twinkle: 1 });
        game.ui.pauseButton();
        game.ui.muteButton();

        game.controls.bind('missions', { keys: ['Tab', 'KeyI'] });
        buildOutpost();
        const stations = spawnStations();
        const player = spawnPlayer(800, 500);
        game.collide.solid('player', 'wall');

        game.rig.follow(player);
        game.rig.smoothing = 0.12;
        game.rig.bounds({ x: 0, y: 0, w: WORLD.w, h: WORLD.h });

        const done = new Set<string>();
        const hudRoom = game.text('', 20, 16, { size: 24, align: 'left', baseline: 'top', stroke: { color: '#000000', width: 3 } });
        game.text('Day 1 of 5   |   WASD move   E interact   Tab or I missions   M map', 20, 48, {
            size: 15, align: 'left', baseline: 'top', color: '#b9c6e6', stroke: { color: '#000000', width: 2 },
        });
        const prompt = game.text('', 0, 0, { size: 18, color: '#ffe08a', layer: 'world', z: 5000, stroke: { color: '#000000', width: 3 } });
        prompt.visible = false;
        const box = game.graphics({ layer: 'hud' });
        const message = game.text('', game.screen.width / 2, game.screen.height - 60, { size: 22, stroke: { color: '#000000', width: 3 } });
        let messageLeft = 0;

        const say = (s: string): void => {
            message.text = s;
            messageLeft = MESSAGE_SECONDS;
        };

        game.step('play', dt => {
            if (game.input.keyPressed('Escape') || game.input.keyPressed('KeyP')) {
                if (panelOpen()) closePanel(); else game.scenes.push('pause');
                return;
            }
            if (game.controls.justPressed('missions')) togglePanel('missions', done, player.x, player.y, WORLD);
            if (game.input.keyPressed('KeyM')) togglePanel('map', done, player.x, player.y, WORLD);

            stepPlayer(player, dt, panelOpen());

            hudRoom.text = roomAt(player.x, player.y)?.name ?? 'Corridor';

            // nearest station within reach
            let near: Sprite<{ def: StationDef }> | null = null;
            let best = REACH;
            for (const s of stations as Sprite<{ def: StationDef }>[]) {
                const d = Math.hypot(s.x - player.x, s.y - player.y);
                if (d < best) { best = d; near = s; }
            }
            if (near && !panelOpen()) {
                prompt.visible = true;
                prompt.text = `E: ${near.data.def.name}`;
                prompt.x = near.x;
                prompt.y = near.y + near.height / 2 + 24;
                if (game.controls.justPressed('action')) {
                    const def = near.data.def;
                    if (def.task) done.add(def.task);
                    say(def.text);
                    if (def.task && done.size === MISSION_01.length) say('Mission 01 complete! (placeholder reward)');
                }
            } else {
                prompt.visible = false;
            }

            messageLeft = Math.max(0, messageLeft - dt);
            box.clear();
            if (messageLeft > 0) {
                const w = 900, h = 56, x = (game.screen.width - w) / 2, y = game.screen.height - 60 - h / 2;
                box.draw(ctx => { ctx.fillStyle = 'rgba(8,12,30,0.85)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#8fb4ff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); });
            } else {
                message.text = '';
            }
        });
    },
    exit(): void {
        closePanel();
    },
};
