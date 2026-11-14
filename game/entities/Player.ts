import { game, type Sprite } from '../engine.js';

const SPEED = 230;

export function spawnPlayer(x: number, y: number): Sprite
{
    return game.spawn({
        id: 'astronaut', texture: 'astronaut', x, y, layer: 'world', tags: ['player'],
        collide: { shape: 0, radius: 15 },
    });
}

/** Moves the astronaut with WASD or the arrows. `frozen` stops movement (a panel is open). */
let walkClock = 0;

/** Returns true when the astronaut moved. */
export function stepPlayer(player: Sprite, dt: number, frozen: boolean): boolean
{
    const m = frozen ? { x: 0, y: 0 } : game.controls.axis('move');
    player.x += m.x * SPEED * dt;
    player.y += m.y * SPEED * dt;
    if (m.x < -0.1) player.sx = -1;
    if (m.x > 0.1) player.sx = 1;
    const moving = Math.abs(m.x) + Math.abs(m.y) > 0.1;
    walkClock += moving ? dt : 0;
    player.setFrame(moving ? Math.floor(walkClock * 8) % 2 : 0);
    return moving;
}
