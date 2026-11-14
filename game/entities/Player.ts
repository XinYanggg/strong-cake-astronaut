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
export function stepPlayer(player: Sprite, dt: number, frozen: boolean): void
{
    const m = frozen ? { x: 0, y: 0 } : game.controls.axis('move');
    player.x += m.x * SPEED * dt;
    player.y += m.y * SPEED * dt;
    if (m.x < -0.1) player.sx = -1;
    if (m.x > 0.1) player.sx = 1;
}
