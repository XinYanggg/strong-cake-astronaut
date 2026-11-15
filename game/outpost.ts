import { game, type Sprite } from './engine.js';

/** The outpost layout (world units) and everything built from it. Rooms are plain boxes in phase 1. */
export const WORLD = { w: 1600, h: 1000 };
const WALL = 16;
const DOOR = 100;

export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; color: string };
export type StationDef = { id: string; name: string; room: string; x: number; y: number; w: number; h: number; text: string; task?: string; opens?: 'power' | 'alerts' | 'lab' | 'missions'; bed?: number; controls?: 'life' | 'greenhouse' | 'comms' | 'shield' };

export const ROOMS: Room[] = [
    { id: 'command', name: 'Command Center', x: 600, y: 330, w: 400, h: 340, color: '#2b3a5e' },
    { id: 'greenhouse', name: 'Greenhouse', x: 120, y: 330, w: 360, h: 340, color: '#1f4a3a' },
    { id: 'power', name: 'Power Station', x: 1120, y: 330, w: 360, h: 340, color: '#5a4a1f' },
    { id: 'lab', name: 'Research Lab', x: 1120, y: 770, w: 360, h: 190, color: '#3a2f5e' },
    { id: 'shelter', name: 'Radiation Shelter', x: 600, y: 770, w: 400, h: 190, color: '#5a2b3a' },
];

export const STATIONS: StationDef[] = [
    { id: 'mission-board', name: 'Mission Board', room: 'command', x: 680, y: 380, w: 90, h: 44, text: '', opens: 'missions' },
    { id: 'nasa-monitor', name: 'NASA Alerts', room: 'command', x: 800, y: 380, w: 90, h: 44, text: 'NASA alerts', opens: 'alerts' },
    { id: 'comm-terminal', name: 'Comm Terminal', room: 'command', x: 920, y: 380, w: 90, h: 44, text: 'Communication terminal activated.', task: 'm1.comms', controls: 'comms' },
    { id: 'life-support', name: 'Life Support Unit', room: 'command', x: 690, y: 620, w: 90, h: 44, text: 'Life support: placeholder. Oxygen, water and food come later.', task: 'm1.life', controls: 'life' },
    { id: 'bed-1', name: 'Bed 1', room: 'greenhouse', x: 190, y: 410, w: 76, h: 58, text: '', bed: 0 },
    { id: 'bed-2', name: 'Bed 2', room: 'greenhouse', x: 285, y: 410, w: 76, h: 58, text: '', bed: 1 },
    { id: 'bed-3', name: 'Bed 3', room: 'greenhouse', x: 190, y: 505, w: 76, h: 58, text: '', bed: 2 },
    { id: 'bed-4', name: 'Bed 4', room: 'greenhouse', x: 285, y: 505, w: 76, h: 58, text: '', bed: 3 },
    { id: 'grow-lights', name: 'Grow Lights', room: 'greenhouse', x: 380, y: 380, w: 80, h: 40, text: 'Grow lights: brighter means faster growth and more power.', controls: 'greenhouse' },
    { id: 'water-tank', name: 'Water Tank', room: 'greenhouse', x: 400, y: 610, w: 70, h: 50, text: 'Water tank: placeholder.' },
    { id: 'solar-display', name: 'Solar Panel Display', room: 'power', x: 1210, y: 380, w: 100, h: 44, text: 'Solar energy readout will show here.' },
    { id: 'battery-bank', name: 'Battery Bank', room: 'power', x: 1400, y: 380, w: 90, h: 44, text: 'Battery storage will show here.', task: 'm3.check' },
    { id: 'power-panel', name: 'Power Control Panel', room: 'power', x: 1190, y: 620, w: 110, h: 50, text: 'Power station inspected.', task: 'm1.power', opens: 'power' },
    { id: 'research-console', name: 'Research Console', room: 'lab', x: 1220, y: 825, w: 110, h: 46, text: '', opens: 'lab' },
    { id: 'solar-telescope', name: 'Solar Telescope', room: 'lab', x: 1400, y: 905, w: 100, h: 50, text: 'Through the telescope you see dark sunspots. Flares burst out of them.' },
    { id: 'shield-controls', name: 'Shield Controls', room: 'shelter', x: 690, y: 825, w: 100, h: 44, text: 'Shield controls: placeholder.', controls: 'shield' },
    { id: 'shelter-bunk', name: 'Shelter Bunk', room: 'shelter', x: 900, y: 905, w: 110, h: 50, text: 'A safe place to wait out a solar storm.' },
];


export function roomAt(x: number, y: number): Room | null
{
    return ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) ?? null;
}

export type Rect = { x1: number; y1: number; x2: number; y2: number };
/** Every wall piece (the outpost's hull), worked out once so art.ts can paint each size. */
export const WALL_RECTS: Rect[] = [];
const wall = (x1: number, y1: number, x2: number, y2: number): void => { WALL_RECTS.push({ x1, y1, x2, y2 }); };
export const wallName = (r: Rect): string => `wall-${Math.round(r.x2 - r.x1)}x${Math.round(r.y2 - r.y1)}`;

/** A wall along a line, with gaps (door openings) left out. */
function wallLine(horizontal: boolean, fixed: number, from: number, to: number, gaps: [number, number][] = []): void
{
    const half = WALL / 2;
    let cursor = from;
    for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
        if (a > cursor) horizontal ? wall(cursor - half, fixed - half, a, fixed + half) : wall(fixed - half, cursor - half, fixed + half, a);
        cursor = b;
    }
    if (cursor < to) horizontal ? wall(cursor, fixed - half, to + half, fixed + half) : wall(fixed - half, cursor, fixed + half, to + half);
}

function floor(x: number, y: number, w: number, h: number, color: string, texture = 'white'): void
{
    game.spawn({ id: 'floor', texture, tint: texture === 'white' ? color : undefined, layer: 'floor', z: -5000, x: x + w / 2, y: y + h / 2, width: w, height: h });
}

/** The doorways between modules: where they are, and whether the wall they cut is horizontal. */
export const DOORS: { x: number; y: number; horizontal: boolean }[] = [
    { x: 800, y: 670, horizontal: true }, { x: 600, y: 490, horizontal: false }, { x: 1000, y: 490, horizontal: false },
    { x: 480, y: 490, horizontal: false }, { x: 1120, y: 490, horizontal: false }, { x: 1300, y: 670, horizontal: true },
    { x: 800, y: 770, horizontal: true }, { x: 1300, y: 770, horizontal: true },
];

function layoutWalls(): void
{
    const door = (c: number): [number, number] => [c - DOOR / 2, c + DOOR / 2];
    wallLine(true, 330, 600, 1000);                         // command top
    wallLine(true, 670, 600, 1000, [door(800)]);            // command bottom
    wallLine(false, 600, 330, 670, [door(490)]);            // command left
    wallLine(false, 1000, 330, 670, [door(490)]);           // command right
    wallLine(true, 330, 120, 480); wallLine(true, 670, 120, 480);          // greenhouse top, bottom
    wallLine(false, 120, 330, 670); wallLine(false, 480, 330, 670, [door(490)]);
    wallLine(true, 330, 1120, 1480); wallLine(true, 670, 1120, 1480, [door(1300)]);      // power top, bottom
    wallLine(false, 1480, 330, 670); wallLine(false, 1120, 330, 670, [door(490)]);
    wallLine(true, 960, 600, 1000); wallLine(false, 600, 770, 960);        // shelter bottom, left
    wallLine(false, 1000, 770, 960); wallLine(true, 770, 600, 1000, [door(800)]);
    // research lab (south of the power station)
    wallLine(true, 770, 1120, 1480, [door(1300)]); wallLine(true, 960, 1120, 1480);
    wallLine(false, 1120, 770, 960); wallLine(false, 1480, 770, 960);
    wallLine(false, 1250, 670, 770); wallLine(false, 1350, 670, 770);
    // corridor walls
    wallLine(true, 440, 480, 600); wallLine(true, 540, 480, 600);
    wallLine(true, 440, 1000, 1120); wallLine(true, 540, 1000, 1120);
    wallLine(false, 750, 670, 770); wallLine(false, 850, 670, 770);
}
layoutWalls();

export function buildOutpost(): Record<string, Sprite> {
    // floors
    game.spawn({ id: 'berm', texture: 'berm', layer: 'floor', z: -9000, x: 800, y: 865 });
    game.spawn({ id: 'moon', texture: 'moon-ground', layer: 'floor', z: -20000, x: WORLD.w / 2, y: WORLD.h / 2, width: 2240, height: 1200 });
    for (const r of ROOMS) floor(r.x, r.y, r.w, r.h, r.color, `floor-${r.id}`);
    // the tunnels between modules
    floor(480, 440, 120, DOOR, '', 'tunnel-h');
    floor(1000, 440, 120, DOOR, '', 'tunnel-h');
    floor(750, 670, DOOR, 100, '', 'tunnel-v');
    floor(1250, 670, DOOR, 100, '', 'tunnel-v');

    // hull plating, then the airlock thresholds in each doorway
    for (const r of WALL_RECTS) {
        game.spawn({ id: 'wall', texture: wallName(r), layer: 'world', tags: ['wall'], x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2, width: r.x2 - r.x1, height: r.y2 - r.y1 });
    }
    for (const d of DOORS) game.spawn({ id: 'threshold', texture: d.horizontal ? 'threshold-h' : 'threshold-v', layer: 'floor', z: -4800, x: d.x, y: d.y });
    spawnExterior();

    spawnCakes();

    // room names on the floor
    for (const r of ROOMS) {
        game.text(r.name, r.x + r.w / 2, r.y + r.h / 2, { size: 26, color: '#ffffff', alpha: 0.18, layer: 'floor', z: -4000 });
    }
    return {};
}

export function spawnStations(): Sprite[]
{
    return STATIONS.map(s => {
        const sp = game.spawn({
            id: s.id, texture: s.bed !== undefined ? 'bed' : `st-${s.id}`, layer: 'world', tags: ['wall', 'station'],
            x: s.x, y: s.y, width: s.w, height: s.h, data: { def: s },
        });
        if (s.bed === undefined) game.text(s.name, s.x, s.y - s.h / 2 - 12, { size: 13, color: '#ffffff', layer: 'world', z: 3000, stroke: { color: '#000000', width: 2 } });
        return sp;
    });
}

/** Little cakes left lying around: x, y, picture, turn (radians), size. They do nothing; they are just a surprise. */
const CAKE_SPOTS: [number, number, string, number, number][] = [
    // command center
    [650, 590, 'cake-cupcake', 0.2, 1], [965, 615, 'cake-slice', -0.3, 1], [870, 480, 'cake-star', 0.4, 1],
    // greenhouse
    [150, 640, 'cake-donut', 0.5, 1], [335, 565, 'cake-mooncake', 0, 1], [360, 470, 'cake-star', -0.2, 0.9],
    // power station
    [1440, 520, 'cake-cupcake', -0.2, 1], [1325, 575, 'cake-mooncake', 0.3, 1], [1160, 500, 'cake-slice', 0.2, 1],
    // radiation shelter
    [965, 825, 'cake-star', 0.1, 1], [640, 925, 'cake-birthday', 0, 1],
    // research lab
    [1440, 820, 'cake-slice', 0.4, 1], [1170, 925, 'cake-mooncake', 0, 1],
    // on the moon outside, a few of them hidden away
    [60, 120, 'cake-birthday', 0.2, 1.2], [560, 250, 'cake-donut', 0.7, 1.1], [1060, 240, 'cake-star', -0.4, 1.2], [1540, 200, 'cake-cupcake', 0.3, 1.2],
    [70, 820, 'cake-mooncake', 0.1, 1.2], [420, 830, 'cake-slice', -0.5, 1.1], [1060, 880, 'cake-donut', 0.2, 1.1], [1540, 880, 'cake-birthday', -0.2, 1.2],
    [780, 170, 'cake-mooncake', 0.5, 1.4], [1500, 560, 'cake-star', 0.3, 1.1],
];

export function spawnCakes(): void
{
    for (const [x, y, texture, rot, scale] of CAKE_SPOTS) {
        game.spawn({ id: 'cake', texture, layer: 'floor', z: -4500, x, y, rot, scale });
    }
}

/** What a moon base has outside its modules: solar fields, a lander, a rover, a mast and tanks. None of it can be reached. */
const EXTERIOR: [string, number, number][] = [
    ['solar-array', 260, 180], ['solar-array', 440, 180], ['solar-array', 1340, 180], ['solar-array', 1520, 180],
    ['mast', 800, 250], ['lander', 160, 850], ['rover', 1060, 705], ['tanks', 1570, 860], ['solar-array', 1580, 520],
];

function spawnExterior(): void
{
    for (const [texture, x, y] of EXTERIOR) game.spawn({ id: texture, texture, layer: 'floor', z: -4600, x, y });
}
