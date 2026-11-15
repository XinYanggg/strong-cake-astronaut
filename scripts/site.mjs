// Builds the game and refreshes site/ (the folder you host, for example on Vercel).
//   npm run -s site
// site/ is a copy of dist/ plus the favicon files (favicon/) and tab title and icon tags in index.html.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));   // decodes spaces in the folder path
const run = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status ?? 1); };

if (!existsSync(`${root}phaser/bin/bake.mjs`)) { console.error('The Phaser AE engine is missing. Run: bash scripts/setup.sh'); process.exit(1); }
run('node', ['phaser/bin/bake.mjs', 'build', 'game', 'dist']);

rmSync(`${root}site`, { recursive: true, force: true });
cpSync(`${root}dist`, `${root}site`, { recursive: true });
rmSync(`${root}site/.phaser-ae-output.json`, { force: true });

// favicon files go to the site root (browsers also ask for /favicon.ico by itself)
for (const f of readdirSync(`${root}favicon`)) cpSync(`${root}favicon/${f}`, `${root}site/${f}`);

const tags = [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<meta name="theme-color" content="#0b1235">',
].join('');
let html = readFileSync(`${root}site/index.html`, 'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Strong Cake Astronaut</title>').replace('</head>', `${tags}</head>`);
writeFileSync(`${root}site/index.html`, html);
console.log('site/ is ready: the game, the favicon and the title.');
