import { game } from '../engine.js';
import { ROOMS } from '../outpost.js';
import { MISSIONS, isDone, openMissions } from '../missions.js';
import { run, type SystemId } from '../run.js';
import type { GameEvent } from '../spaceWeather.js';
import { adviceFor } from '../events.js';
import { wrap } from './text.js';
import { closeLabPanel, labPanelOpen, openLabPanel } from './LabPanel.js';
import { closeCropPicker, cropPickerOpen, openCropPicker } from './CropPicker.js';
import { closePowerPanel, openPowerPanel, powerPanelOpen } from './PowerPanel.js';

/** The Tab (missions) and M (map) panels. Only one is open at a time. */
type Kind = 'missions' | 'map' | 'event';
type Piece = { destroy(): void };

let pieces: Piece[] = [];
let current: Kind | null = null;

export const panelOpen = (): boolean => current !== null || powerPanelOpen() || cropPickerOpen() || labPanelOpen();

export function closePanel(): void
{
    for (const p of pieces) p.destroy();
    pieces = [];
    current = null;
    closePowerPanel();
    closeCropPicker();
    closeLabPanel();
}

export function showPowerPanel(only?: SystemId): void
{
    closePanel();
    openPowerPanel(only);
}

export function showCropPicker(bed: number, done: (message: string, planted: boolean) => void): void
{
    closePanel();
    openCropPicker(bed, done);
}

export function showLabPanel(): void
{
    closePanel();
    openLabPanel();
}

export function togglePanel(kind: Kind, playerX: number, playerY: number, world: { w: number; h: number }): void
{
    const wasThis = current === kind;
    closePanel();
    if (wasThis) return;
    current = kind;
    const W = game.screen.width, H = game.screen.height;
    const pw = 800, ph = 640, px = (W - pw) / 2, py = (H - ph) / 2;

    const g = game.graphics({ layer: 'hud' });
    pieces.push(g);
    g.draw(ctx => {
        ctx.fillStyle = 'rgba(8,12,30,0.96)'; ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#8fb4ff'; ctx.lineWidth = 3; ctx.strokeRect(px, py, pw, ph);
    });
    const text = (s: string, x: number, y: number, size: number, color = '#ffffff', align: 'left' | 'center' = 'left') =>
        pieces.push(game.text(s, x, y, { size, color, align, baseline: 'top' }));

    if (kind === 'missions') {
        text('Mission Board', px + 30, py + 20, 30, '#ffe08a');
        const expanded = new Set(openMissions().reverse().slice(0, 2).map(m => m.id));   // today's mission first, then one old one
        let y = py + 70;
        for (const m of MISSIONS) {
            const done = run.completed.includes(m.id);
            const waiting = m.day > run.day;
            text(`Mission ${m.id.slice(1)}: ${m.title}`, px + 30, y, 24, done ? '#7dff9b' : waiting ? '#8a97b8' : '#ffffff');
            pieces.push(game.text(done ? 'COMPLETED' : waiting ? `Starts on day ${m.day}` : 'In progress', px + pw - 30, y + 2, { size: 18, color: done ? '#7dff9b' : waiting ? '#8a97b8' : '#ffd34d', align: 'right', baseline: 'top' }));
            y += 36;
            if (expanded.has(m.id)) {
                text(m.goal, px + 44, y - 4, 16, '#b9c6e6');
                y += 24;
                for (const t of m.tasks) {
                    const ok = isDone(t.id);
                    text(`${ok ? '[x]' : '[ ]'}  ${t.label}`, px + 54, y, 19, ok ? '#7dff9b' : '#ffffff');
                    y += 28;
                }
                y += 8;
            }
        }
        text(`Badges: ${run.completed.length} of ${MISSIONS.length}`, px + 30, py + ph - 70, 20, '#ffe08a');
        text('Tab or Esc to close', px + 30, py + ph - 36, 16, '#8a97b8');
    } else {
        text('Outpost Map', px + 30, py + 24, 30, '#ffe08a');
        const s = 0.38, mx = px + (pw - world.w * s) / 2, my = py + 90;
        g.draw(ctx => {
            for (const r of ROOMS) {
                ctx.fillStyle = r.color; ctx.fillRect(mx + r.x * s, my + r.y * s, r.w * s, r.h * s);
                ctx.strokeStyle = '#cfd8e8'; ctx.lineWidth = 2; ctx.strokeRect(mx + r.x * s, my + r.y * s, r.w * s, r.h * s);
            }
            ctx.fillStyle = '#ff6fa5'; ctx.beginPath(); ctx.arc(mx + playerX * s, my + playerY * s, 7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        });
        for (const r of ROOMS) text(r.name, mx + (r.x + r.w / 2) * s, my + (r.y + r.h / 2) * s - 8, 14, '#ffffff', 'center');
        text('Pink dot: you.   M to close', px + 30, py + ph - 36, 16, '#8a97b8');
    }
}

const TYPE_NAMES: Record<string, string> = { solar_flare: 'Solar flare', cme: 'Coronal mass ejection', geomagnetic_storm: 'Geomagnetic storm', particle_storm: 'Particle storm', quiet: 'Quiet Sun' };
const RISK_COLORS = { low: '#7dff9b', moderate: '#ffd34d', high: '#ff6a6a' };

/** The space weather information card for an event (or a note that nothing has arrived yet). Toggles. */
export function toggleEventPanel(ev: GameEvent | null): void
{
    const wasThis = current === 'event';
    closePanel();
    if (wasThis) return;
    current = 'event';
    const W = game.screen.width, H = game.screen.height;
    const pw = 860, ph = 500, px = (W - pw) / 2, py = (H - ph) / 2;
    const g = game.graphics({ layer: 'hud' });
    pieces.push(g);
    g.draw(ctx => {
        ctx.fillStyle = 'rgba(8,12,30,0.97)'; ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = ev ? RISK_COLORS[ev.risk] : '#8fb4ff'; ctx.lineWidth = 4; ctx.strokeRect(px, py, pw, ph);
    });
    const text = (s: string, x: number, y: number, size: number, color = '#ffffff') =>
        pieces.push(game.text(s, x, y, { size, color, align: 'left', baseline: 'top' }));
    if (!ev) {
        text('NASA Alerts', px + 30, py + 24, 30, '#ffe08a');
        text('No message from Earth yet.', px + 30, py + 90, 24);
        text('Keep communication on so alerts can reach you.', px + 30, py + 130, 18, '#b9c6e6');
        text('N to close', px + 30, py + ph - 36, 16, '#8a97b8');
        return;
    }
    text(ev.nasaName, px + 30, py + 22, 34, '#ffe08a');
    const rows: [string, string, string?][] = [
        ['Date', `${ev.date}   (${ev.mode === 'live' ? 'LIVE from NOAA, past 7 days' : 'REPLAY of a real past event'})`, ev.mode === 'live' ? '#7dff9b' : '#8fd3ff'], ['Type', TYPE_NAMES[ev.type] ?? ev.type], ['Size', ev.realClass],
        ['Risk for the outpost', ev.risk.toUpperCase(), RISK_COLORS[ev.risk]],
        ['Source', ev.source],
    ];
    rows.forEach(([k, v, c], i) => { text(`${k}:`, px + 30, py + 84 + i * 32, 20, '#8a97b8'); text(v, px + 250, py + 84 + i * 32, 20, c ?? '#ffffff'); });
    text(ev.sourceUrl.replace('https://', ''), px + 250, py + 84 + 5 * 32, 15, '#8fb4ff');
    text('What it means', px + 30, py + 290, 20, '#ffe08a');
    wrap(ev.kidExplanation, 70).forEach((l, i) => text(l, px + 30, py + 320 + i * 28, 21));
    text(`What to do: ${adviceFor(ev)}`, px + 30, py + ph - 76, 19, '#7dff9b');
    text('N to close', px + 30, py + ph - 36, 16, '#8a97b8');
}
