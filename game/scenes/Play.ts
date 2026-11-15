import { game, type Sprite } from '../engine.js';
import { spawnPlayer, stepPlayer } from '../entities/Player.js';
import { WORLD, buildOutpost, spawnStations, roomAt, type StationDef } from '../outpost.js';
import { closePanel, panelOpen, showCropPicker, showLabPanel, showPowerPanel, toggleEventPanel, togglePanel } from '../ui/Panels.js';
import { dustSettled, markTask, shortageActive, resetMissions, stepMissionScript, stepMissions } from '../missions.js';
import { createHud } from '../ui/Hud.js';
import { current as currentEvent, stormActive, received, resetEvents, stepEvents } from '../events.js';
import { sfx, soundQueue, startMusic, stopMusic } from '../sound.js';
import { refreshLabPanel } from '../ui/LabPanel.js';
import { refreshPowerPanel } from '../ui/PowerPanel.js';
import { BATTERY_MAX, CROPS, harvest, notices, resetRun, run, stepRun, totalUse } from '../run.js';

/**
 * The play scene: walk the outpost, manage power, keep the days going.
 * W A S D move, E interacts, Tab or I missions, M map, Esc closes a panel or pauses.
 */
const REACH = 90;
const CLEAN_SECONDS = 6;           // wiping the dust off the solar panels (mission 3)

/** What a station says when used. Some read the live state. */
function stationText(def: StationDef): string
{
    switch (def.id) {
        case 'solar-telescope': return def.text;
        case 'solar-display': return `Solar panels give ${run.available} power units today.`;
        case 'battery-bank': return `Battery ${Math.round(run.battery)} of ${BATTERY_MAX}. Using ${totalUse()} per day, solar makes ${run.available}.`;
        case 'water-tank': return `Water: ${Math.round(run.water)} of 100. Life support recycles it. Planting uses some.`;
        default: return def.text;
    }
}

let stepClock = 0;

export const Play = {
    name: 'play',
    enter(): void {
        resetRun();
        resetEvents();
        resetMissions();
        notices.push('Welcome to the moon base! Press E at the Mission Board (or Tab) to see your mission.', 'Walk up to a machine and press E to use it.');
        game.background.color('#0b1030');
        game.background.stars({ density: 0.4, twinkle: 1 });
        game.ui.pauseButton();
        game.ui.muteButton();
        startMusic();

        game.controls.bind('missions', { keys: ['Tab', 'KeyI'] });
        game.controls.bind('alerts', { keys: ['KeyN'] });
        buildOutpost();
        const stations = spawnStations();
        const player = spawnPlayer(800, 500);
        game.collide.solid('player', 'wall');

        game.rig.follow(player);
        game.rig.smoothing = 0.12;
        game.rig.bounds({ x: -320, y: -100, w: WORLD.w + 640, h: WORLD.h + 200 });   // some space around the outpost so the HUD never covers a room

        const bedSprites = (stations as Sprite<{ def: StationDef }>[]).filter(st => st.data.def.bed !== undefined);
        const bedLabels = bedSprites.map(b => game.text('', b.x, b.y - 42, { size: 13, color: '#ffffff', layer: 'world', z: 3000, stroke: { color: '#000000', width: 2 } }));
        const outline = { color: '#000000', width: 3 };
        const hud = createHud();
        const vignette = game.graphics({ layer: 'hud' });
        const prompt = game.text('', 0, 0, { size: 18, color: '#ffe08a', layer: 'world', z: 5000, stroke: outline });
        prompt.visible = false;
        const openAlerts = (): void => {
            const latest = received.at(-1) ?? null;
            toggleEventPanel(latest);
            if (latest && !run.studied.includes(latest.id) && run.levels.lab > 0) { run.studied.push(latest.id); run.science += 3; notices.push('Research bonus! Studying this NASA alert gave you 3 science points.'); }
            if (latest && latest.risk !== 'low' && latest.type !== 'quiet') markTask('m4.read');
        };
        let cleanLeft = 0;
        const say = (s: string): void => hud.say(s);

        game.step('play', dt => {
            if (game.input.keyPressed('Escape') || game.input.keyPressed('KeyP')) {
                if (panelOpen()) closePanel(); else game.scenes.push('pause');
                return;
            }
            if (game.controls.justPressed('missions')) togglePanel('missions', player.x, player.y, WORLD);
            if (game.input.keyPressed('KeyM')) togglePanel('map', player.x, player.y, WORLD);

            const moved = stepPlayer(player, dt, panelOpen());
            stepClock -= dt;
            if (moved && stepClock <= 0) { sfx('step'); stepClock = 0.3; }
            while (soundQueue.length) sfx(soundQueue.shift()!);

            if (game.controls.justPressed('alerts')) openAlerts();

            const inShelter = roomAt(player.x, player.y)?.id === 'shelter';
            stepEvents(dt);
            stepMissionScript();
            const event = stepRun(dt, inShelter);
            stepMissions({ inShelter, dt });
            if (event === 'win' || event === 'lose') { game.scenes.go('gameover'); return; }
            if (event === 'newday') say(`Day ${run.day} begins.`);

            refreshPowerPanel();
            refreshLabPanel();
            bedSprites.forEach((b, i) => {
                const state = run.beds[i];
                b.setFrame(!state.crop ? 0 : state.progress >= 1 ? 3 : state.progress > 0.4 ? 2 : 1);
                bedLabels[i].text = !state.crop ? 'Empty' : state.progress >= 1 ? `${CROPS[state.crop].name}: READY!` : `${CROPS[state.crop].name} ${Math.floor(state.progress * 100)}%`;
            });
            vignette.clear();
            if (stormActive() && currentEvent && currentEvent.ev.risk !== 'low') {
                const pulse = 0.06 + 0.04 * Math.sin(run.dayTime * 4) + 0.04 * currentEvent.ev.gameEffects.radiationLevel;
                const W = game.screen.width, H = game.screen.height;
                vignette.draw(ctx => { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(255,70,30,0)'); g.addColorStop(1, `rgba(255,70,30,${pulse})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
            }
            hud.update(dt, panelOpen(), roomAt(player.x, player.y)?.name ?? 'Corridor');
            if (cleanLeft > 0) {
                const panels = (stations as Sprite<{ def: StationDef }>[]).find(st => st.data.def.id === 'solar-display')!;
                if (Math.hypot(panels.x - player.x, panels.y - player.y) > REACH) { cleanLeft = 0; say('You walked away, so the cleaning stopped.'); }
                else {
                    cleanLeft -= dt;
                    if (cleanLeft <= 0) { cleanLeft = 0; run.panelsCleaned = true; markTask('m3.clean'); soundQueue.push('mission'); say('The panels are clean! Solar power is back to normal.'); }
                    else hud.progress(`Cleaning the solar panels... ${Math.ceil(cleanLeft)}`);
                }
            }

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
                    sfx('interact');
                    if (def.task) markTask(def.task);
                    if (def.id === 'comm-terminal' && run.commsFailed) { run.commsFailed = false; markTask('m5.repair'); say('Relay repaired. Communication is back!'); return; }
                    if (def.bed !== undefined) {
                        const state = run.beds[def.bed];
                        if (state.crop && state.progress >= 1) { const food = harvest(def.bed); sfx('harvest'); game.particles.burst({ x: near.x, y: near.y, count: 14, layer: 'fx', frame: 'particle:star', speed: [60, 160], lifespan: [0.4, 0.8], color: ['#ffd34d', '#ffffff'] }); say(`Harvested ${food} food!`); }
                        else if (state.crop) say(`${CROPS[state.crop].name} is growing: ${Math.floor(state.progress * 100)}%.${run.levels.greenhouse === 0 ? ' The greenhouse is off!' : ''}${run.water <= 0 ? ' No water!' : ''}`);
                        else showCropPicker(def.bed, (m) => say(m));
                        return;
                    }
                    if (def.id === 'solar-display' && shortageActive()) { if (dustSettled()) { cleanLeft = CLEAN_SECONDS; say('Cleaning the solar panels...'); } else say('The dust is still falling. Wait a little, then clean the panels.'); } else if (def.controls) showPowerPanel(def.controls); else if (def.opens === 'power') showPowerPanel(); else if (def.opens === 'alerts') openAlerts(); else if (def.opens === 'missions') togglePanel('missions', player.x, player.y, WORLD); else if (def.opens === 'lab') showLabPanel(); else say(stationText(def));
                }
            } else {
                prompt.visible = false;
            }

        });
    },
    exit(): void {
        stopMusic();
        closePanel();
    },
};
