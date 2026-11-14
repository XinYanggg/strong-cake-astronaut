import { game } from './engine.js';
import { ROOMS, STATIONS, WALL_RECTS, WORLD, wallName } from './outpost.js';

type Ctx = CanvasRenderingContext2D;

/** Every picture the game paints, by name. main.ts calls this once, before the first scene. */

/** A repeatable pseudo-random number (the engine's `game.rng` is not ready this early), so the art is the same every run. */
function lcg(seed: number): () => number
{
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string): void
{
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function body(ctx: Ctx, w: number, h: number, top: string, bottom: string): void
{
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(4, h - 5, w - 8, 5);
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom);
    box(ctx, 1, 1, w - 2, h - 5, 6, g, '#1b2236');
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(5, 3, w - 10, 2);
}

function dot(ctx: Ctx, x: number, y: number, r: number, color: string): void
{
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** One painter per kind of station; each draws into its own width and height. */
const STATION_ART: Record<string, (ctx: Ctx, w: number, h: number) => void> = {
    'mission-board': (c, w, h) => { body(c, w, h, '#f1f4fa', '#c3cbe0'); [0.3, 0.5, 0.7].forEach((f, i) => { c.fillStyle = ['#4caf50', '#2f6fd6', '#d94a4a'][i]; c.fillRect(10, h * f - 3, w - 30, 4); dot(c, w - 14, h * f - 1, 3, '#2f9e44'); }); },
    'nasa-monitor': (c, w, h) => {
        body(c, w, h, '#4a5878', '#2a3350'); box(c, 8, 7, w - 16, h - 20, 4, '#0c2a44');
        c.strokeStyle = '#6fe3ff'; c.lineWidth = 2; c.beginPath();
        for (let x = 10; x < w - 10; x += 2) { const y = h / 2 - 2 + Math.sin(x / 5) * 6; x === 10 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
    },
    'comm-terminal': (c, w, h) => {
        body(c, w, h, '#8995ad', '#58627d');
        c.strokeStyle = '#e8eef7'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, 17, 12, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        c.fillStyle = '#e8eef7'; c.fillRect(w / 2 - 1, 17, 2, 8);
        [0, 1, 2].forEach(i => dot(c, 14 + i * 9, h - 12, 3, ['#ff5d5d', '#ffd34d', '#5fe08a'][i]));
    },
    'life-support': (c, w, h) => {
        body(c, w, h, '#4fa39a', '#2b6c68');
        [0, 1].forEach(i => { box(c, 10 + i * 34, 8, 24, h - 22, 8, '#c7f1ea', '#1b3d3a'); box(c, 13 + i * 34, 20, 18, h - 36, 5, '#5fe0c8'); });
        dot(c, w - 12, 12, 4, '#7dff9b');
    },
    'grow-lights': (c, w, h) => {
        body(c, w, h, '#3a3358', '#241f3a');
        [0, 1, 2].forEach(i => { const x = 14 + i * ((w - 28) / 2); const g = c.createRadialGradient(x, h / 2 - 2, 1, x, h / 2 - 2, 14); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#ff8ad8'); g.addColorStop(1, 'rgba(255,100,200,0)'); c.fillStyle = g; c.fillRect(x - 14, 0, 28, h); });
    },
    'water-tank': (c, w, h) => {
        body(c, w, h, '#9db4cf', '#587497'); box(c, 8, 6, w - 16, h - 18, 10, '#cfe6ff', '#274463');
        box(c, 10, h * 0.45, w - 20, h * 0.4, 6, '#3d9cf0'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(14, 12, 5, h - 32);
    },
    'solar-display': (c, w, h) => {
        body(c, w, h, '#2b4a86', '#172a52'); c.strokeStyle = '#7fa8ff'; c.lineWidth = 1;
        for (let x = 8; x < w - 8; x += 14) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x, h - 10); c.stroke(); }
        for (let y = 8; y < h - 8; y += 12) { c.beginPath(); c.moveTo(6, y); c.lineTo(w - 6, y); c.stroke(); }
        dot(c, w - 14, 12, 5, '#ffe36b');
    },
    'battery-bank': (c, w, h) => {
        body(c, w, h, '#5a6272', '#33394a');
        [0, 1, 2].forEach(i => { box(c, 8 + i * ((w - 16) / 3), 8, (w - 16) / 3 - 4, h - 22, 3, '#14201a'); box(c, 10 + i * ((w - 16) / 3), 12 + i * 3, (w - 16) / 3 - 8, h - 30 - i * 3, 2, '#5fe08a'); });
    },
    'power-panel': (c, w, h) => {
        body(c, w, h, '#c6934a', '#8a5f28');
        for (let i = 0; i < 5; i++) { box(c, 12 + i * ((w - 24) / 4.6), 10, 8, 16, 2, '#2a2118'); box(c, 13 + i * ((w - 24) / 4.6), i % 2 ? 11 : 19, 6, 6, 2, i % 2 ? '#5fe08a' : '#ff6a6a'); }
        box(c, 12, h - 20, w - 24, 8, 3, '#2a2118'); box(c, 13, h - 19, (w - 26) * 0.7, 6, 2, '#ffd34d');
    },
    'shield-controls': (c, w, h) => {
        body(c, w, h, '#a85c86', '#6a3556');
        c.fillStyle = '#9fe3ff'; c.beginPath(); c.moveTo(w / 2, 7); c.lineTo(w / 2 + 14, 13); c.lineTo(w / 2 + 12, 25); c.lineTo(w / 2, 33); c.lineTo(w / 2 - 12, 25); c.lineTo(w / 2 - 14, 13); c.closePath(); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
    },
    'shelter-bunk': (c, w, h) => {
        body(c, w, h, '#7d6aa8', '#4f3f78'); box(c, 6, 6, 28, h - 18, 6, '#ffffff'); box(c, 36, 6, w - 42, h - 18, 6, '#e0709c');
        c.strokeStyle = '#a84470'; c.lineWidth = 2; for (let x = 48; x < w - 8; x += 12) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x, h - 14); c.stroke(); }
    },
    'research-console': (c, w, h) => {
        body(c, w, h, '#7a62c6', '#4a3a86'); box(c, 8, 7, w - 16, h - 20, 4, '#10152e');
        [0.25, 0.5, 0.35, 0.8, 0.6].forEach((v, i) => { c.fillStyle = '#9fe3ff'; c.fillRect(14 + i * ((w - 30) / 5), h - 14 - v * (h - 28), 10, v * (h - 28)); });
    },
    'solar-telescope': (c, w, h) => {
        c.strokeStyle = '#8a8fa3'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h * 0.55); c.lineTo(w / 2 - 18, h - 4); c.moveTo(w / 2, h * 0.55); c.lineTo(w / 2 + 18, h - 4); c.stroke();
        c.save(); c.translate(w / 2, h * 0.5); c.rotate(-0.6); box(c, -30, -9, 60, 18, 6, '#e8eef7', '#1b2236'); box(c, 22, -11, 12, 22, 3, '#4b5b8a'); c.restore();
    },
};

export function paintArt(): void
{
    // The cake astronaut (2 frames: standing, and a step): white suit, glass visor, and a frosted cake with a cherry on the helmet.
    game.paint('astronaut', 44, 64, (ctx, i) => {
        const swing = i === 0 ? 0 : 3;
        ctx.fillStyle = '#9aa6b8'; ctx.fillRect(6, 30, 32, 24);
        ctx.fillStyle = '#e8eef7'; ctx.fillRect(12, 48 - swing, 8, 14 + swing); ctx.fillRect(24, 48 + swing, 8, 14 - swing);
        ctx.fillStyle = '#5b6b86'; ctx.fillRect(11, 59 - swing, 10, 5); ctx.fillRect(23, 59 + swing, 10, 5);
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.roundRect(9, 28, 26, 24, 7); ctx.fill();
        ctx.fillStyle = '#ff6fa5'; ctx.fillRect(15, 36, 14, 8);
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.arc(22, 22, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a3a6a'; ctx.beginPath(); ctx.ellipse(22, 23, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.ellipse(19, 20, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d99a5b'; ctx.fillRect(12, 6, 20, 6);
        ctx.fillStyle = '#fff2f7'; ctx.beginPath(); ctx.roundRect(11, 2, 22, 6, 3); ctx.fill();
        ctx.fillStyle = '#e8365d'; ctx.beginPath(); ctx.arc(22, 2, 3, 0, Math.PI * 2); ctx.fill();
    }, { frames: 2 });

    // Stations: one picture per station, painted at its size.
    for (const s of STATIONS) {
        if (s.bed !== undefined) continue;
        game.paint(`st-${s.id}`, s.w, s.h, (ctx) => (STATION_ART[s.id] ?? ((c, w, h) => body(c, w, h, '#8895b8', '#56628a')))(ctx, s.w, s.h));
    }

    // Planting beds, 4 frames: empty soil, seedlings, growing, ready to pick.
    game.paint('bed', 76, 58, (ctx, i) => {
        box(ctx, 1, 4, 74, 52, 8, '#6e4a2e', '#2a1a10');
        for (let r = 0; r < 3; r++) { ctx.fillStyle = '#5a3a22'; ctx.fillRect(8, 14 + r * 14, 60, 4); }
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
            const x = 14 + k * 16, y = 16 + r * 14;
            if (i === 1) { ctx.fillStyle = '#7fd36b'; ctx.fillRect(x - 1, y - 6, 3, 7); }
            if (i === 2) { dot(ctx, x, y - 6, 6, '#3f9b52'); dot(ctx, x - 3, y - 9, 4, '#5fc273'); }
            if (i === 3) { dot(ctx, x, y - 6, 6, '#3f9b52'); dot(ctx, x, y - 10, 5, '#ffd34d'); }
        }
    }, { frames: 4 });

    // Room floors: metal tiles in each room's colour.
    for (const r of ROOMS) {
        game.paint(`floor-${r.id}`, r.w, r.h, (ctx) => {
            ctx.fillStyle = r.color; ctx.fillRect(0, 0, r.w, r.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
            for (let x = 0; x <= r.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, r.h); ctx.stroke(); }
            for (let y = 0; y <= r.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(r.w, y); ctx.stroke(); }
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            for (let x = 0; x < r.w; x += 40) for (let y = 0; y < r.h; y += 40) { ctx.fillRect(x + 3, y + 3, 2, 2); ctx.fillRect(x + 35, y + 35, 2, 2); }
        });
    }

    // The lunar ground around the outpost (painted at half size, shown at twice the size).
    const gw = 1120, gh = 600, rand = lcg(7);
    game.paint('moon-ground', gw, gh, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, gh); g.addColorStop(0, '#6c6f7d'); g.addColorStop(1, '#4a4d5c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, gw, gh);
        for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.05})`; ctx.fillRect(rand() * gw, rand() * gh, 2, 2); }
        for (let i = 0; i < 45; i++) {
            const x = rand() * gw, y = rand() * gh, r = 8 + rand() * 34;
            ctx.fillStyle = 'rgba(30,32,44,0.45)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(210,214,230,0.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        }
    });

    // The title picture: stars, the Earth, and the moon's horizon.
    game.paint('title-bg', 1280, 720, (ctx) => {
        const sky = ctx.createLinearGradient(0, 0, 0, 720); sky.addColorStop(0, '#04061a'); sky.addColorStop(1, '#1a1f4a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, 1280, 720);
        const r = lcg(21);
        for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; const s = r() < 0.1 ? 3 : 2; ctx.fillRect(r() * 1280, r() * 520, s, s); }
        const eg = ctx.createRadialGradient(1010, 170, 10, 1000, 180, 110); eg.addColorStop(0, '#7fc4ff'); eg.addColorStop(0.7, '#2b6fd0'); eg.addColorStop(1, '#16397a');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(1000, 180, 110, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4caf6a'; ctx.beginPath(); ctx.ellipse(970, 160, 40, 28, 0.5, 0, Math.PI * 2); ctx.ellipse(1040, 215, 34, 22, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(1010, 130, 60, 10, 0.2, 0, Math.PI * 2); ctx.fill();
        const gnd = ctx.createLinearGradient(0, 560, 0, 720); gnd.addColorStop(0, '#8a8d9c'); gnd.addColorStop(1, '#4a4d5c');
        ctx.fillStyle = gnd; ctx.beginPath(); ctx.moveTo(0, 640); ctx.quadraticCurveTo(640, 560, 1280, 650); ctx.lineTo(1280, 720); ctx.lineTo(0, 720); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 9; i++) { const x = r() * 1280, y = 660 + r() * 50; ctx.fillStyle = 'rgba(30,32,44,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 30 + r() * 40, 8 + r() * 6, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    paintCakes();
    paintHull();
    void WORLD;
}

/** Names of the small cake pictures scattered around the outpost and the title screen. */
export const CAKES = ['cake-cupcake', 'cake-slice', 'cake-mooncake', 'cake-star', 'cake-donut', 'cake-birthday'] as const;

/** Little cakes: just for fun. */
function paintCakes(): void
{
    const outline = '#5a3a3a';
    game.paint('cake-cupcake', 30, 30, (c) => {
        c.fillStyle = '#ff9fc4'; c.beginPath(); c.moveTo(5, 15); c.lineTo(25, 15); c.lineTo(22, 28); c.lineTo(8, 28); c.closePath(); c.fill();
        c.strokeStyle = '#d9608f'; c.lineWidth = 1.5; for (let x = 10; x < 23; x += 4) { c.beginPath(); c.moveTo(x, 16); c.lineTo(x - 1 + (x - 15) / 8, 27); c.stroke(); }
        dot(c, 15, 12, 9, '#fff2f7'); dot(c, 10, 14, 5, '#fff2f7'); dot(c, 20, 14, 5, '#fff2f7');
        dot(c, 15, 4, 3.5, '#e8365d'); c.strokeStyle = outline; c.lineWidth = 1; c.beginPath(); c.arc(15, 12, 9, Math.PI, 0); c.stroke();
    });
    game.paint('cake-slice', 30, 30, (c) => {
        c.fillStyle = '#d99a5b'; c.beginPath(); c.moveTo(3, 25); c.lineTo(27, 25); c.lineTo(27, 12); c.lineTo(3, 17); c.closePath(); c.fill();
        c.fillStyle = '#fff2f7'; c.fillRect(3, 19, 24, 3); c.fillStyle = '#fff2f7'; c.beginPath(); c.moveTo(3, 17); c.lineTo(27, 12); c.lineTo(27, 14); c.lineTo(3, 20); c.closePath(); c.fill();
        c.fillStyle = '#ff5d8a'; c.beginPath(); c.moveTo(3, 13); c.lineTo(27, 8); c.lineTo(27, 12); c.lineTo(3, 17); c.closePath(); c.fill();
        dot(c, 20, 7, 4, '#e8365d'); c.fillStyle = '#4caf50'; c.fillRect(19, 2, 2, 3);
    });
    game.paint('cake-mooncake', 30, 30, (c) => {
        dot(c, 15, 15, 13, '#b8742c'); dot(c, 15, 15, 10.5, '#d99a4a');
        c.strokeStyle = '#8a5418'; c.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(15 + Math.cos(a) * 5, 15 + Math.sin(a) * 5, 4, 2, a, 0, Math.PI * 2); c.stroke(); }
        dot(c, 15, 15, 2.5, '#8a5418');
    });
    game.paint('cake-star', 30, 30, (c) => {
        const star = (r1: number, r2: number): void => { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(15 + Math.cos(a) * r, 16 + Math.sin(a) * r); } c.closePath(); };
        c.fillStyle = '#e6a85a'; star(14, 6.5); c.fill();
        c.fillStyle = '#ffe36b'; star(12, 5.5); c.fill();
        c.fillStyle = '#ff7aa8'; [[15, 11], [10, 18], [20, 18], [15, 19]].forEach(([x, y]) => dot(c, x, y, 1.6, '#ff7aa8'));
        c.strokeStyle = outline; c.lineWidth = 1; star(14, 6.5); c.stroke();
    });
    game.paint('cake-donut', 30, 30, (c) => {
        dot(c, 15, 15, 13, '#d99a5b'); dot(c, 15, 14, 12, '#ff8ac0'); dot(c, 15, 15, 4.5, '#6a4a3a');
        const bits = [[8, 8, '#ffffff'], [21, 9, '#6fe3ff'], [22, 19, '#ffe36b'], [9, 21, '#7dff9b'], [15, 5, '#ffffff'], [14, 24, '#6fe3ff']] as const;
        bits.forEach(([x, y, col], i) => { c.fillStyle = col; c.save(); c.translate(x, y); c.rotate(i); c.fillRect(-2, -0.8, 4, 1.6); c.restore(); });
    });
    game.paint('cake-birthday', 30, 30, (c) => {
        box(c, 3, 18, 24, 10, 3, '#ff9fc4', outline); box(c, 7, 11, 16, 8, 3, '#fff2f7', outline);
        c.fillStyle = '#6fe3ff'; c.fillRect(13, 5, 4, 7); dot(c, 15, 4, 2.5, '#ffd34d'); dot(c, 15, 3.5, 1.2, '#ff6a3a');
        [8, 14, 20].forEach(x => dot(c, x, 23, 1.5, '#ffffff'));
    });
}

/** The outpost's shell and the things around it, painted like a real moon base seen from above. */
function paintHull(): void
{
    // Hull plating: metal panels with seams and rivets, one picture per wall size.
    const done = new Set<string>();
    for (const r of WALL_RECTS) {
        const name = wallName(r);
        if (done.has(name)) continue;
        done.add(name);
        const w = Math.round(r.x2 - r.x1), h = Math.round(r.y2 - r.y1), horizontal = w >= h;
        game.paint(name, w, h, (c) => {
            const g = horizontal ? c.createLinearGradient(0, 0, 0, h) : c.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, '#d7deec'); g.addColorStop(0.5, '#a9b4cb'); g.addColorStop(1, '#7c88a6');
            c.fillStyle = g; c.fillRect(0, 0, w, h);
            c.strokeStyle = '#2f3a58'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
            c.strokeStyle = 'rgba(40,50,80,0.45)'; c.lineWidth = 1;
            const len = horizontal ? w : h;
            for (let p = 40; p < len - 10; p += 40) { c.beginPath(); if (horizontal) { c.moveTo(p, 2); c.lineTo(p, h - 2); } else { c.moveTo(2, p); c.lineTo(w - 2, p); } c.stroke(); }
            c.fillStyle = '#2f3a58';
            for (let p = 8; p < len - 4; p += 20) { c.beginPath(); c.arc(horizontal ? p : w / 2, horizontal ? h / 2 : p, 1.6, 0, Math.PI * 2); c.fill(); }
        });
    }

    // Tunnels: ribbed floors with a light strip down each side.
    game.paint('tunnel-h', 120, 100, (c) => {
        c.fillStyle = '#2c3350'; c.fillRect(0, 0, 120, 100);
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 3; for (let x = 6; x < 120; x += 14) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 100); c.stroke(); }
        c.fillStyle = '#ffe8a0'; c.fillRect(0, 4, 120, 3); c.fillRect(0, 93, 120, 3);
    });
    game.paint('tunnel-v', 100, 100, (c) => {
        c.fillStyle = '#2c3350'; c.fillRect(0, 0, 100, 100);
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 3; for (let y = 6; y < 100; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(100, y); c.stroke(); }
        c.fillStyle = '#ffe8a0'; c.fillRect(4, 0, 3, 100); c.fillRect(93, 0, 3, 100);
    });

    // Airlock thresholds: a hazard-striped sill in every doorway.
    const stripes = (c: Ctx, w: number, h: number): void => {
        c.fillStyle = '#ffcf3a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a2a30'; c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
        for (let i = -h; i < w + h; i += 16) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 8, h); c.lineTo(i + 8 + h, 0); c.lineTo(i + h, 0); c.closePath(); c.fill(); }
        c.restore();
    };
    game.paint('threshold-h', 100, 12, (c) => stripes(c, 100, 12));
    game.paint('threshold-v', 12, 100, (c) => stripes(c, 12, 100));

    // The regolith berm piled around the radiation shelter (real bases bury their shelter in moon dust).
    const bw = 400 + 90, bh = 190 + 90, rand = lcg(33);
    game.paint('berm', bw, bh, (c) => {
        const g = c.createRadialGradient(bw / 2, bh / 2, bh * 0.2, bw / 2, bh / 2, bw * 0.6); g.addColorStop(0, '#8d909e'); g.addColorStop(1, '#5f6272');
        box(c, 0, 0, bw, bh, 44, g);
        c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 3; c.beginPath(); c.roundRect(5, 5, bw - 10, bh - 10, 40); c.stroke();
        for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.08})`; c.fillRect(rand() * bw, rand() * bh, 2, 2); }
    });

    const shadow = (c: Ctx, x: number, y: number, w: number, h: number): void => { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, Math.PI * 2); c.fill(); };

    // A solar array: panels on a frame.
    game.paint('solar-array', 150, 100, (c) => {
        shadow(c, 80, 88, 66, 9);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
            const x = 6 + k * 48, y = 6 + r * 44;
            box(c, x, y, 44, 40, 3, '#1f3f7a', '#aeb8d0');
            c.strokeStyle = '#5f8fe0'; c.lineWidth = 1;
            for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + i * 11, y + 2); c.lineTo(x + i * 11, y + 38); c.stroke(); }
            c.beginPath(); c.moveTo(x + 2, y + 20); c.lineTo(x + 42, y + 20); c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 3, y + 3, 14, 8);
        }
    });
    // A comms mast with a dish.
    game.paint('mast', 60, 100, (c) => {
        shadow(c, 30, 92, 24, 6);
        c.strokeStyle = '#cfd6e6'; c.lineWidth = 4; c.beginPath(); c.moveTo(30, 90); c.lineTo(30, 30); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.moveTo(14, 90); c.lineTo(30, 40); c.lineTo(46, 90); c.stroke();
        c.fillStyle = '#e8eef7'; c.beginPath(); c.ellipse(30, 24, 22, 11, -0.4, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#4b5b8a'; c.lineWidth = 2; c.stroke();
        dot(c, 30, 24, 3, '#ff5d5d');
    });
    // The lander that brought the crew: a descent stage with four legs.
    game.paint('lander', 140, 140, (c) => {
        shadow(c, 74, 128, 56, 9);
        c.strokeStyle = '#9aa3b8'; c.lineWidth = 6; for (const [x, y] of [[14, 14], [126, 14], [14, 126], [126, 126]]) { c.beginPath(); c.moveTo(70, 70); c.lineTo(x, y); c.stroke(); dot(c, x, y, 8, '#cfd6e6'); }
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(70 + Math.cos(a) * 38, 70 + Math.sin(a) * 38); } c.closePath();
        c.fillStyle = '#d9a43a'; c.fill(); c.strokeStyle = '#6a4d12'; c.lineWidth = 3; c.stroke();
        dot(c, 70, 70, 18, '#e8eef7'); dot(c, 70, 70, 10, '#5b6b86');
    });
    // A moon rover.
    game.paint('rover', 76, 50, (c) => {
        shadow(c, 40, 44, 32, 5);
        for (const [x, y] of [[10, 8], [10, 36], [58, 8], [58, 36]]) box(c, x, y, 14, 12, 4, '#2a2a30');
        box(c, 12, 12, 52, 26, 6, '#e8eef7', '#4b5b8a'); box(c, 18, 16, 20, 18, 3, '#2a3a6a'); dot(c, 52, 25, 5, '#ffd34d');
    });
    // Oxygen and fuel tanks.
    game.paint('tanks', 90, 60, (c) => {
        shadow(c, 46, 54, 40, 5);
        [0, 1, 2].forEach(i => { box(c, 6 + i * 28, 6, 24, 44, 11, '#c9d2e4', '#3a4864'); c.fillStyle = ['#ffd34d', '#6fe3ff', '#ff8ac0'][i]; c.fillRect(8 + i * 28, 22, 20, 8); });
    });
}
