import { game } from './engine.js';
import { DAY_SECONDS, run } from './run.js';
import { MISSIONS, markTask } from './missions.js';
import { STATIONS } from './outpost.js';

/**
 * The game's debug controls: the ways into it that playing would take minutes to reach (docs/make-a-2d-game.md and docs/00-kernel.md, Debug
 * controls). `bake play` runs them with `cheat`, and a person opens them with the backquote key (`) or `?cheats`.
 *
 * Add the game's own here: a jump to any level, a power-up, infinite lives, win or lose now. A jump starts the game
 * as a player would find it there, and an outcome goes through the game's own path, so what is checked is what a
 * player gets. main.ts adds them at boot, before the first scene, so they work from any screen. Run before the game
 * is ready (`game.ready`), a control waits for it by itself.
 *
 * Register the run's state here too, once the game keeps it in one object: `game.inspect.state(() => run)`. Every
 * inspection then reports it, so a reviewer's change request says "level 14, 1 life, score 8400" from the game itself.
 */
export function addDebugControls(): void
{
    game.cheats.add({
        name: 'screen',
        does: 'Go straight to a screen: title, play or gameover',
        args: 'name',
        run: name => { game.scenes.go(name ?? 'title'); return `screen ${name ?? 'title'}`; },
    });
    game.inspect.state(() => run);
    game.cheats.add({
        name: 'skipday',
        does: 'Jump to the end of the current day (the game plays on from there)',
        run: () => { run.dayTime = DAY_SECONDS - 0.1; return `day ${run.day}`; },
    });
    game.cheats.add({
        name: 'battery',
        does: 'Set the battery level (0 to 50)',
        args: 'n',
        run: n => { run.battery = Math.max(0, Math.min(50, Number(n ?? 25))); return `battery ${run.battery}`; },
    });
    game.cheats.add({
        name: 'storm',
        does: 'Jump to 20 seconds before the storm hits (the warning has been sent)',
        run: () => { run.dayTime = 130; return 'day time 130'; },
    });
    game.cheats.add({
        name: 'day',
        does: 'Start day n (1 to 5) from its beginning',
        args: 'n',
        run: n => { run.day = Math.max(1, Math.min(5, Number(n ?? 1))); run.dayTime = 0; return `day ${run.day}`; },
    });
    game.cheats.add({
        name: 'ripen',
        does: 'Make every planted crop ready to harvest',
        run: () => { for (const b of run.beds) if (b.crop) b.progress = 1; return 'crops ripe'; },
    });
    game.cheats.add({
        name: 'mission',
        does: "Finish today's mission tasks (the game then completes it)",
        run: () => { const m = MISSIONS.find(x => x.day === run.day); m?.tasks.forEach(t => markTask(t.id)); return m ? `mission ${m.id}` : 'none'; },
    });
    game.cheats.add({
        name: 'goto',
        does: 'Put the astronaut next to a station (id such as comm-terminal, bed-1, power-panel, shield-controls, nasa-monitor)',
        args: 'id',
        run: id => {
            const st = STATIONS.find(x => x.id === id);
            const player = [...game.roster.tagged('player')][0];
            if (!st || !player) return `no station ${id}`;
            player.x = st.x; player.y = st.y + st.h / 2 + 30;
            return `at ${st.name}`;
        },
    });
    game.cheats.add({
        name: 'science',
        does: 'Add science points',
        args: 'n',
        run: n => { run.science += Number(n ?? 20); return `science ${run.science}`; },
    });
    game.cheats.add({
        name: 'win',
        does: 'Win now: jump to the last second of day 5',
        run: () => { run.day = 5; run.dayTime = DAY_SECONDS - 0.1; return 'last second of day 5'; },
    });
    game.cheats.add({
        name: 'lose',
        does: 'Lose now: life support empty',
        run: () => { run.levels.life = 0; run.life = 0.01; return 'life support off and almost empty'; },
    });
}
