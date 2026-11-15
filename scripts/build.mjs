// `npm run build`. With the Phaser AE engine present (after scripts/setup.sh) it builds the game into dist/.
// Without it (for example on Vercel, where the engine is not in git) it does nothing and succeeds,
// because the already-built game is committed in site/.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync(new URL('../phaser/bin/bake.mjs', import.meta.url))) {
    console.log('The Phaser AE engine is not installed here, so there is nothing to build: serving the prebuilt site/ folder.');
    process.exit(0);
}
const r = spawnSync('node', ['phaser/bin/bake.mjs', 'build', 'game', 'dist'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
