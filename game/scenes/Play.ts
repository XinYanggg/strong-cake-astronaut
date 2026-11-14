import { game, type Sprite } from '../engine.js';
import { spawnPlayer, stepPlayer } from '../entities/Player.js';
import { WORLD, buildOutpost, spawnStations, roomAt, type StationDef } from '../outpost.js';
import { closePanel, panelOpen, showCropPicker, showLabPanel, showPowerPanel, toggleEventPanel, togglePanel } from '../ui/Panels.js';
import { dustSettled, markTask, missionToday, shortageActive, resetMissions, stepMissionScript, stepMissions, troubleLine } from '../missions.js';
import { bannerNow, current as currentEvent, stormActive, received, resetEvents, statusLine, stepEvents } from '../events.js';
import { sfx, soundQueue, startMusic, stopMusic } from '../sound.js';
import { dataLabel } from '../live.js';
import { refreshLabPanel } from '../ui/LabPanel.js';
import { refreshPowerPanel } from '../ui/PowerPanel.js';
import { BATTERY_MAX, CROPS, harvest, DAY_SECONDS, LEVEL_NAMES, TOTAL_DAYS, notices, resetRun, run, stepRun, totalUse } from '../run.js';

/**
 * The play scene: walk the outpost, manage power, keep the days going.
 * W A S D move, E interacts, Tab or I missions, M map, Esc closes a panel or pauses.
 */
const REACH = 90;
const MESSAGE_SECONDS = 4.5;
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
        notices.push('Welcome to the moon base! Press Tab or I to see your mission.', 'Walk up to a station and press E to use it.');
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
        const backing = game.graphics({ layer: 'hud' });
        backing.draw(ctx => { ctx.fillStyle = 'rgba(8,12,30,0.65)'; ctx.fillRect(8, 8, 252, 296); });
        const outline = { color: '#000000', width: 3 };
        const hudRoom = game.text('', 20, 16, { size: 24, align: 'left', baseline: 'top', stroke: outline });
        const hudDay = game.text('', 20, 48, { size: 18, align: 'left', baseline: 'top', stroke: outline });
        game.text('WASD move   E interact   Tab or I missions   N alerts   M map', 20, 72, { size: 14, align: 'left', baseline: 'top', color: '#b9c6e6', stroke: { color: '#000000', width: 2 } });

        const bar = (y: number, fill: string, text: (v: number) => string, extra = {}) => game.bars.create({
            anchor: 'top-left', x: 16, y, width: 230, height: 20, max: 100, value: 100, fill, ...extra,
            label: { text: (b: { value: number }) => text(b.value), size: 13 },
        });
        const powerBar = bar(104, '#ffd34d', v => `Battery ${Math.round(v)}%  (${totalUse()}/${run.available} per day)`, { zones: [{ below: 0.25, fill: '#ff4b4b', pulse: 2 }] });
        const lifeBar = bar(130, '#5fe08a', v => `Life support ${Math.round(v)}%`, { zones: [{ below: 0.3, fill: '#ff4b4b', pulse: 2 }] });
        const shieldBar = bar(156, '#6fb6ff', v => `Shield ${Math.round(v)}%`);
        const healthBar = bar(182, '#ff7a7a', v => `Astronaut health ${Math.round(v)}%`, { zones: [{ below: 0.3, fill: '#ff2b2b', pulse: 2 }] });
        const foodBar = bar(208, '#ffb347', v => `Food ${Math.round(v)}`, { zones: [{ below: 0.15, fill: '#ff4b4b', pulse: 2 }] });
        const waterBar = bar(234, '#4db8ff', v => `Water ${Math.round(v)}`, { zones: [{ below: 0.15, fill: '#ff4b4b', pulse: 2 }] });
        const science = game.text('', 16, 262, { size: 14, align: 'left', baseline: 'top', color: '#d9c2ff', stroke: { color: '#000000', width: 2 } });
        const hudStatus = game.text('', 16, 282, { size: 13, align: 'left', baseline: 'top', color: '#ffe08a', stroke: { color: '#000000', width: 2 } });
        const hudMission = game.text('', game.screen.width / 2, 84, { size: 16, color: '#b9c6e6', stroke: { color: '#000000', width: 2 } });
        game.text(dataLabel(), game.screen.width / 2, 104, { size: 14, color: '#7dff9b', stroke: { color: '#000000', width: 2 } });
        const vignette = game.graphics({ layer: 'hud' });
        const bannerGfx = game.graphics({ layer: 'hud' });
        const bannerText = game.text('', game.screen.width / 2, 40, { size: 24, stroke: outline });

        const prompt = game.text('', 0, 0, { size: 18, color: '#ffe08a', layer: 'world', z: 5000, stroke: outline });
        prompt.visible = false;
        const box = game.graphics({ layer: 'hud' });
        const message = game.text('', game.screen.width / 2, game.screen.height - 60, { size: 22, stroke: outline });
        let messageLeft = 0;
        const openAlerts = (): void => {
            const latest = received.at(-1) ?? null;
            toggleEventPanel(latest);
            if (latest && !run.studied.includes(latest.id) && run.levels.lab > 0) { run.studied.push(latest.id); run.science += 3; notices.push('Research bonus! Studying this NASA alert gave you 3 science points.'); }
            if (latest && latest.risk !== 'low' && latest.type !== 'quiet') markTask('m4.read');
        };
        let cleanLeft = 0;
        const say = (s: string): void => { message.text = s; messageLeft = MESSAGE_SECONDS; };

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

            hudRoom.text = roomAt(player.x, player.y)?.name ?? 'Corridor';
            const left = Math.ceil(DAY_SECONDS - run.dayTime);
            hudDay.text = `Day ${run.day} of ${TOTAL_DAYS}   ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`;
            powerBar.value = run.battery / BATTERY_MAX * 100;
            refreshPowerPanel();
            refreshLabPanel();
            science.text = `Science points: ${Math.floor(run.science)}`;
            if (messageLeft <= 0 && notices.length) say(notices.shift()!);
            lifeBar.value = run.life;
            shieldBar.value = run.shield;
            healthBar.value = run.health;
            foodBar.value = run.food;
            waterBar.value = run.water;
            bedSprites.forEach((b, i) => {
                const state = run.beds[i];
                b.setFrame(!state.crop ? 0 : state.progress >= 1 ? 3 : state.progress > 0.4 ? 2 : 1);
                bedLabels[i].text = !state.crop ? 'Empty' : state.progress >= 1 ? `${CROPS[state.crop].name}: READY!` : `${CROPS[state.crop].name} ${Math.floor(state.progress * 100)}%`;
            });
            hudStatus.text = troubleLine() ?? statusLine() ?? '';
            const today = missionToday();
            hudMission.text = today ? `Mission ${today.id.slice(1)}: ${today.title}` : '';
            vignette.clear();
            if (stormActive() && currentEvent && currentEvent.ev.risk !== 'low') {
                const pulse = 0.06 + 0.04 * Math.sin(run.dayTime * 4) + 0.04 * currentEvent.ev.gameEffects.radiationLevel;
                const W = game.screen.width, H = game.screen.height;
                vignette.draw(ctx => { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(255,70,30,0)'); g.addColorStop(1, `rgba(255,70,30,${pulse})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
            }
            const banner = bannerNow();
            bannerGfx.clear();
            bannerText.text = banner?.text ?? '';
            if (banner) {
                const flash = banner.color !== '#2f8f55' && Math.floor(run.dayTime * 2) % 2 === 0;
                bannerGfx.draw(ctx => { ctx.fillStyle = banner.color; ctx.globalAlpha = flash ? 1 : 0.8; ctx.fillRect(300, 14, 680, 52); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(300, 14, 680, 52); });
            }

            if (cleanLeft > 0) {
                const panels = (stations as Sprite<{ def: StationDef }>[]).find(st => st.data.def.id === 'solar-display')!;
                if (Math.hypot(panels.x - player.x, panels.y - player.y) > REACH) { cleanLeft = 0; say('You walked away, so the cleaning stopped.'); }
                else {
                    cleanLeft -= dt;
                    if (cleanLeft <= 0) { cleanLeft = 0; run.panelsCleaned = true; markTask('m3.clean'); soundQueue.push('mission'); say('The panels are clean! Solar power is back to normal.'); }
                    else { message.text = `Cleaning the solar panels... ${Math.ceil(cleanLeft)}`; messageLeft = 0.3; }
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
                    if (def.id === 'solar-display' && shortageActive()) { if (dustSettled()) { cleanLeft = CLEAN_SECONDS; say('Cleaning the solar panels...'); } else say('The dust is still falling. Wait a little, then clean the panels.'); } else if (def.controls) showPowerPanel(def.controls); else if (def.opens === 'power') showPowerPanel(); else if (def.opens === 'alerts') openAlerts(); else if (def.opens === 'lab') showLabPanel(); else say(stationText(def));
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
        stopMusic();
        closePanel();
    },
};
