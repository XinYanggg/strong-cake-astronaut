import { game } from './engine.js';

/** Every picture the game paints, by name. */
export function paintArt(): void
{
    // The cake astronaut: white suit, glass visor, and a frosted cake with a cherry on top of the helmet.
    game.paint('astronaut', 44, 64, ctx => {
        // backpack
        ctx.fillStyle = '#9aa6b8'; ctx.fillRect(6, 30, 32, 24);
        // legs
        ctx.fillStyle = '#e8eef7'; ctx.fillRect(12, 48, 8, 14); ctx.fillRect(24, 48, 8, 14);
        ctx.fillStyle = '#5b6b86'; ctx.fillRect(11, 59, 10, 5); ctx.fillRect(23, 59, 10, 5);
        // body
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.roundRect(9, 28, 26, 24, 7); ctx.fill();
        ctx.fillStyle = '#ff6fa5'; ctx.fillRect(15, 36, 14, 8);
        // helmet
        ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.arc(22, 22, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a3a6a'; ctx.beginPath(); ctx.ellipse(22, 23, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.ellipse(19, 20, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
        // cake on top: sponge, frosting, cherry
        ctx.fillStyle = '#d99a5b'; ctx.fillRect(12, 6, 20, 6);
        ctx.fillStyle = '#fff2f7'; ctx.beginPath(); ctx.roundRect(11, 2, 22, 6, 3); ctx.fill();
        ctx.fillStyle = '#e8365d'; ctx.beginPath(); ctx.arc(22, 2, 3, 0, Math.PI * 2); ctx.fill();
    });
    game.paint('crate', 64, 64, ctx => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 64);
    });
}
