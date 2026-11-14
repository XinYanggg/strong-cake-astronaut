import { game } from './engine.js';

/** Every sound the game makes, synthesised (no files). Played by name with `game.sound.play`. */
export function defineSounds(): void
{
    game.sound.defineAll({
        // events
        alarm: { notes: [880, 660, 880, 660, 880, 660], duration: 0.22, type: 'square', volume: 0.3 },
        chime: { notes: [660, 880], duration: 0.2, type: 'triangle', volume: 0.5 },
        storm: { type: 'noise', duration: 1.6, filter: { type: 'lowpass', freq: 500, freqEnd: 120 }, curve: 'exponential', volume: 0.5 },
        brownout: [
            { type: 'sine', freq: 220, freqEnd: 50, sweep: 'exponential', duration: 0.6, volume: 0.5 },
            { type: 'noise', duration: 0.4, filter: { type: 'lowpass', freq: 900, freqEnd: 100 }, volume: 0.3 },
        ],
        // the astronaut and the outpost
        step: { type: 'noise', duration: 0.05, filter: { type: 'lowpass', freq: 700 }, volume: 0.12 },
        interact: { type: 'triangle', freq: 520, freqEnd: 780, duration: 0.09, volume: 0.45 },
        error: { type: 'square', freq: 220, freqEnd: 140, duration: 0.16, volume: 0.3 },
        plant: { notes: [392, 523], duration: 0.1, type: 'triangle', volume: 0.5 },
        harvest: { notes: [523, 659, 784], duration: 0.09, type: 'triangle', volume: 0.55 },
        buy: { notes: [659, 880, 1175], duration: 0.09, type: 'square', volume: 0.3 },
        panel: { type: 'triangle', freq: 400, freqEnd: 300, duration: 0.07, volume: 0.35 },
        // results
        mission: { notes: 'C5 E5 G5 C6:2', step: 0.1, type: 'square', volume: 0.35 },
        win: { notes: 'C5 E5 G5 C6 G5 C6:3', step: 0.14, type: 'square', volume: 0.35 },
        lose: { notes: [330, 262, 196, 131], duration: 0.28, type: 'sawtooth', volume: 0.3 },
        // calm background music for the outpost: a slow tune over a soft bass
        theme: [
            { type: 'triangle', tempo: 84, volume: 0.22, notes: 'E4 - G4 - B4 - G4 - A4 - F4 - E4 - - - D4 - F4 - A4 - F4 - G4 - E4 - D4 - - -' },
            { type: 'sine', tempo: 84, volume: 0.3, notes: 'A2 - - - - - - - F2 - - - - - - - G2 - - - - - - - D2 - - - - - - -' },
        ],
    });
}

/** Names queued by the rules (run.ts, events.ts, missions.ts) for the play scene to play. */
export const soundQueue: string[] = [];

/**
 * Volume. The synthesiser plays everything on the engine's sfx bus, so the engine's own music slider would
 * do nothing. The two buses stay at full, and each sound is scaled by the player's setting instead.
 */
export const VOLUME_DEFAULTS = { music: 0.6, sfx: 0.8 };
export type VolumeKind = keyof typeof VOLUME_DEFAULTS;

export const volumeOf = (kind: VolumeKind): number => game.save.read(`volume-${kind}`, VOLUME_DEFAULTS[kind]);

/** Plays a sound effect at the player's effects volume. */
export function sfx(name: string): void
{
    game.sound.play(name, { volume: volumeOf('sfx') });
}

let stopTheme: (() => void) | null = null;
let musicOn = false;

function restartTheme(): void
{
    stopTheme?.();
    stopTheme = volumeOf('music') > 0 ? game.sound.loop('theme', { volume: volumeOf('music') }) : null;
}

export function startMusic(): void { musicOn = true; restartTheme(); }
export function stopMusic(): void { musicOn = false; stopTheme?.(); stopTheme = null; }

/** Saves a volume setting and applies it now. */
export function setVolume(kind: VolumeKind, v: number): void
{
    game.save.write(`volume-${kind}`, v);
    if (kind === 'music' && musicOn) restartTheme();
}
