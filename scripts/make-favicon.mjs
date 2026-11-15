// Draws the cake astronaut's head into favicon files, using the same drawing as the game (game/art.ts).
// Needs the Phaser AE engine folder (for its Playwright and Chromium). Run:  node scripts/make-favicon.mjs
// Writes favicon/: favicon.ico, favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(new URL('../phaser/package.json', import.meta.url));
const { chromium } = require('playwright');
const out = new URL('../favicon/', import.meta.url);
mkdirSync(out, { recursive: true });

const SIZES = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'favicon-48.png': 48, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };

const browser = await chromium.launch();
const page = await browser.newPage();
const images = await page.evaluate((sizes) => {
    // The astronaut, as painted in game/art.ts (standing frame), on a 44 x 64 canvas.
    const astronaut = (ctx) => {
        ctx.fillStyle = '#9aa6b8'; ctx.fillRect(6, 30, 32, 24);
        ctx.fillStyle = '#e8eef7'; ctx.fillRect(12, 48, 8, 14); ctx.fillRect(24, 48, 8, 14);
        ctx.fillStyle = '#5b6b86'; ctx.fillRect(11, 59, 10, 5); ctx.fillRect(23, 59, 10, 5);
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.roundRect(9, 28, 26, 24, 7); ctx.fill();
        ctx.fillStyle = '#ff6fa5'; ctx.fillRect(15, 36, 14, 8);
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.arc(22, 22, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a3a6a'; ctx.beginPath(); ctx.ellipse(22, 23, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.ellipse(19, 20, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d99a5b'; ctx.fillRect(12, 6, 20, 6);
        ctx.fillStyle = '#fff2f7'; ctx.beginPath(); ctx.roundRect(11, 2, 22, 6, 3); ctx.fill();
        ctx.fillStyle = '#e8365d'; ctx.beginPath(); ctx.arc(22, 2, 3, 0, Math.PI * 2); ctx.fill();
    };
    const result = {};
    for (const [name, size] of Object.entries(sizes)) {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const ctx = c.getContext('2d');
        // deep-space rounded square with a pink rim, like the game's menus
        const g = ctx.createLinearGradient(0, 0, 0, size); g.addColorStop(0, '#1d2660'); g.addColorStop(1, '#0b1235');
        const r = size * 0.22;
        ctx.beginPath(); ctx.roundRect(0, 0, size, size, r); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = Math.max(1, size * 0.06); ctx.strokeStyle = '#ff8ac0';
        ctx.beginPath(); ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth, r); ctx.stroke();
        // the head and shoulders, centred
        ctx.save();
        const view = 42, scale = size * 0.84 / view;
        ctx.translate(size / 2 - 22 * scale, size / 2 - 19 * scale);
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = false;
        astronaut(ctx);
        ctx.restore();
        result[name] = c.toDataURL('image/png').split(',')[1];
    }
    return result;
}, SIZES);
await browser.close();

const png = (name) => Buffer.from(images[name], 'base64');
for (const name of Object.keys(SIZES)) if (name !== 'favicon-48.png') writeFileSync(new URL(name, out), png(name));

// favicon.ico: three PNG images (16, 32, 48) in one ICO container.
const parts = ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].map(n => ({ size: SIZES[n], data: png(n) }));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(parts.length, 4);
let offset = 6 + parts.length * 16;
const entries = parts.map(p => {
    const e = Buffer.alloc(16);
    e.writeUInt8(p.size, 0); e.writeUInt8(p.size, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(p.data.length, 8); e.writeUInt32LE(offset, 12);
    offset += p.data.length;
    return e;
});
writeFileSync(new URL('favicon.ico', out), Buffer.concat([header, ...entries, ...parts.map(p => p.data)]));
console.log('wrote favicon/: favicon.ico, favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png');
