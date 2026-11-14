import { game } from '../engine.js';
import { ROOMS, MISSION_01 } from '../outpost.js';

/** The Tab (missions) and M (map) panels. Only one is open at a time. */
type Kind = 'missions' | 'map';
type Piece = { destroy(): void };

let pieces: Piece[] = [];
let current: Kind | null = null;

export const panelOpen = (): boolean => current !== null;

export function closePanel(): void
{
    for (const p of pieces) p.destroy();
    pieces = [];
    current = null;
}

export function togglePanel(kind: Kind, done: Set<string>, playerX: number, playerY: number, world: { w: number; h: number }): void
{
    const wasThis = current === kind;
    closePanel();
    if (wasThis) return;
    current = kind;
    const W = game.screen.width, H = game.screen.height;
    const pw = 760, ph = 460, px = (W - pw) / 2, py = (H - ph) / 2;

    const g = game.graphics({ layer: 'hud' });
    pieces.push(g);
    g.draw(ctx => {
        ctx.fillStyle = 'rgba(8,12,30,0.88)'; ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#8fb4ff'; ctx.lineWidth = 3; ctx.strokeRect(px, py, pw, ph);
    });
    const text = (s: string, x: number, y: number, size: number, color = '#ffffff', align: 'left' | 'center' = 'left') =>
        pieces.push(game.text(s, x, y, { size, color, align, baseline: 'top' }));

    if (kind === 'missions') {
        text('Mission 01: Establish the Outpost', px + 30, py + 24, 30, '#ffe08a');
        text('Visit each place and press E.', px + 30, py + 68, 18, '#b9c6e6');
        MISSION_01.forEach((t, i) => {
            const ok = done.has(t.id);
            text(`${ok ? '[x]' : '[ ]'}  ${t.label}`, px + 40, py + 120 + i * 48, 26, ok ? '#7dff9b' : '#ffffff');
        });
        text('Inventory: empty (coming later)', px + 30, py + ph - 70, 20, '#b9c6e6');
        text('Tab to close', px + 30, py + ph - 36, 16, '#8a97b8');
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
