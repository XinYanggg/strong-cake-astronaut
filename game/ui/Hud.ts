import { game } from '../engine.js';
import { bannerNow, statusLine } from '../events.js';
import { dataLabel } from '../live.js';
import { troubleLine } from '../missions.js';
import { BATTERY_MAX, DAY_SECONDS, TOTAL_DAYS, notices, run, totalUse } from '../run.js';
import { wrap } from './text.js';

/**
 * The heads-up display, all of it inside boxes: a status panel top left (where you are, the day, the meters), a note box
 * under it for trouble, a controls reminder bottom left, a message box at the bottom centre, and the alert banner at the
 * top. Everything except the banner hides while a window is open, so it never covers one.
 */
const PANEL = { x: 8, y: 8, w: 272, h: 276 };
const MESSAGE_SECONDS = 4.5;
const MESSAGE_LINES = 3;
const MESSAGE_CHARS = 62;
const outline = { color: '#000000', width: 3 };
const thin = { color: '#000000', width: 2 };

export type Hud = {
    /** Shows a message at the bottom for a few seconds. Longer messages wrap onto more lines. */
    say(text: string): void;
    /** Replaces the message for a moment (progress, such as cleaning). */
    progress(text: string): void;
    /** `where` is the name of the room the astronaut is in. */
    update(dt: number, windowOpen: boolean, where: string): void;
};

const box = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = 'rgba(8,12,30,0.8)', stroke = 'rgba(143,180,255,0.7)'): void => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
};

export function createHud(): Hud
{
    const W = game.screen.width, H = game.screen.height;
    const panelGfx = game.graphics({ layer: 'hud' });
    const room = game.text('', PANEL.x + 14, PANEL.y + 8, { size: 22, align: 'left', baseline: 'top', stroke: outline });
    const day = game.text('', PANEL.x + 14, PANEL.y + 36, { size: 15, align: 'left', baseline: 'top', color: '#b9c6e6', stroke: thin });

    const bar = (i: number, fill: string, text: (v: number) => string, extra = {}) => game.bars.create({
        anchor: 'top-left', x: PANEL.x + 12, y: PANEL.y + 66 + i * 26, width: PANEL.w - 24, height: 20, max: 100, value: 100, fill, ...extra,
        label: { text: (b: { value: number }) => text(b.value), size: 13 },
    });
    const battery = bar(0, '#ffd34d', v => `Battery ${Math.round(v)}%  (${totalUse()}/${run.available} a day)`, { zones: [{ below: 0.25, fill: '#ff4b4b', pulse: 2 }] });
    const life = bar(1, '#5fe08a', v => `Life support ${Math.round(v)}%`, { zones: [{ below: 0.3, fill: '#ff4b4b', pulse: 2 }] });
    const shield = bar(2, '#6fb6ff', v => `Shield ${Math.round(v)}%`);
    const health = bar(3, '#ff7a7a', v => `Astronaut health ${Math.round(v)}%`, { zones: [{ below: 0.3, fill: '#ff2b2b', pulse: 2 }] });
    const food = bar(4, '#ffb347', v => `Food ${Math.round(v)}`, { zones: [{ below: 0.15, fill: '#ff4b4b', pulse: 2 }] });
    const water = bar(5, '#4db8ff', v => `Water ${Math.round(v)}`, { zones: [{ below: 0.15, fill: '#ff4b4b', pulse: 2 }] });
    const bars = [battery, life, shield, health, food, water];

    const science = game.text('', PANEL.x + 14, PANEL.y + 226, { size: 14, align: 'left', baseline: 'top', color: '#d9c2ff', stroke: thin });
    const source = game.text(dataLabel(), PANEL.x + 14, PANEL.y + 250, { size: 12, align: 'left', baseline: 'top', color: '#7dff9b', stroke: thin });

    // trouble note under the panel (up to 3 lines)
    const noteGfx = game.graphics({ layer: 'hud' });
    const noteLines = [0, 1, 2].map(i => game.text('', PANEL.x + 14, PANEL.y + PANEL.h + 14 + i * 18, { size: 14, align: 'left', baseline: 'top', color: '#ffe08a', stroke: thin }));

    // controls reminder, bottom left
    const hintGfx = game.graphics({ layer: 'hud' });
    const hints = ['Move: W A S D    Use: E', 'Alerts: N    Map: M'].map((t, i) =>
        game.text(t, 20, H - 50 + i * 18, { size: 13, align: 'left', baseline: 'top', color: '#b9c6e6', stroke: thin }));

    // banner, top centre
    const bannerGfx = game.graphics({ layer: 'hud' });
    const bannerText = game.text('', W / 2, 40, { size: 24, stroke: outline });

    // message, bottom centre
    const msgGfx = game.graphics({ layer: 'hud' });
    const msgLines = Array.from({ length: MESSAGE_LINES }, () => game.text('', W / 2, 0, { size: 20, stroke: outline }));
    let message: string[] = [];
    let messageLeft = 0;

    const setMessage = (text: string, seconds: number): void => { message = wrap(text, MESSAGE_CHARS).slice(0, MESSAGE_LINES); messageLeft = seconds; };

    return {
        say: text => setMessage(text, MESSAGE_SECONDS),
        progress: text => setMessage(text, 0.3),
        update(dt, windowOpen, where): void {
            // the next waiting message, once the last one has had its time
            if (messageLeft <= 0 && notices.length) setMessage(notices.shift()!, MESSAGE_SECONDS);
            messageLeft = Math.max(0, messageLeft - dt);

            const left = Math.ceil(DAY_SECONDS - run.dayTime);
            room.text = where;
            day.text = `Day ${run.day} of ${TOTAL_DAYS}   ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`;
            battery.value = run.battery / BATTERY_MAX * 100;
            life.value = run.life; shield.value = run.shield; health.value = run.health; food.value = run.food; water.value = run.water;
            science.text = `Science points: ${Math.floor(run.science)}`;

            const note = wrap(troubleLine() ?? statusLine() ?? '', 34).slice(0, 3);

            // everything but the banner hides while a window is open
            const show = !windowOpen;
            [room, day, science, source, ...noteLines, ...hints].forEach(t => { t.visible = show; });
            bars.forEach(b => { b.visible = show; });
            panelGfx.clear(); noteGfx.clear(); hintGfx.clear(); msgGfx.clear();
            noteLines.forEach((t, i) => { t.text = show ? (note[i] ?? '') : ''; });
            msgLines.forEach((t, i) => { t.visible = show && messageLeft > 0; t.text = message[i] ?? ''; });
            if (show) {
                panelGfx.draw(ctx => box(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h));
                hintGfx.draw(c => box(c, 8, H - 62, 200, 54));
                if (note.length) noteGfx.draw(c => box(c, PANEL.x, PANEL.y + PANEL.h + 8, PANEL.w, note.length * 18 + 20, 'rgba(60,40,8,0.85)', 'rgba(255,224,138,0.8)'));
                if (messageLeft > 0 && message.length) {
                    const h = message.length * 26 + 20, y0 = H - 40 - h;
                    msgLines.forEach((t, i) => { t.y = y0 + 10 + 13 + i * 26; });
                    msgGfx.draw(c => box(c, W / 2 - 400, y0, 800, h, 'rgba(8,12,30,0.88)'));
                }
            }

            // alert banner: sized to its text
            const banner = bannerNow();
            bannerGfx.clear();
            bannerText.text = banner?.text ?? '';
            if (banner) {
                const w = Math.min(1000, Math.max(520, (bannerText.width || 640) + 56));
                const flash = banner.color !== '#2f8f55' && Math.floor(run.dayTime * 2) % 2 === 0;
                bannerGfx.draw(c => { c.globalAlpha = flash ? 1 : 0.85; box(c, W / 2 - w / 2, 14, w, 52, banner.color, '#ffffff'); c.globalAlpha = 1; });
            }
        },
    };
}
