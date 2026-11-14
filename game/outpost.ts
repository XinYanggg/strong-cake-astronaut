import { game, type Sprite } from './engine.js';

/** The outpost layout (world units) and everything built from it. Rooms are plain boxes in phase 1. */
export const WORLD = { w: 1600, h: 1000 };
const WALL = 16;
const DOOR = 100;

export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; color: string };
export type StationDef = { id: string; name: string; room: string; x: number; y: number; w: number; h: number; text: string; task?: string };

export const ROOMS: Room[] = [
    { id: 'command', name: 'Command Center', x: 600, y: 330, w: 400, h: 340, color: '#2b3a5e' },
    { id: 'greenhouse', name: 'Greenhouse', x: 120, y: 330, w: 360, h: 340, color: '#1f4a3a' },
    { id: 'power', name: 'Power Station', x: 1120, y: 330, w: 360, h: 340, color: '#5a4a1f' },
    { id: 'shelter', name: 'Radiation Shelter', x: 600, y: 770, w: 400, h: 190, color: '#5a2b3a' },
];

export const STATIONS: StationDef[] = [
    { id: 'mission-board', name: 'Mission Board', room: 'command', x: 680, y: 380, w: 90, h: 44, text: 'Mission info will show here.' },
    { id: 'nasa-monitor', name: 'NASA Alerts', room: 'command', x: 800, y: 380, w: 90, h: 44, text: 'NASA alerts will show here (phase 4).' },
    { id: 'comm-terminal', name: 'Comm Terminal', room: 'command', x: 920, y: 380, w: 90, h: 44, text: 'Communication terminal activated.', task: 'comms' },
    { id: 'life-support', name: 'Life Support Unit', room: 'command', x: 690, y: 620, w: 90, h: 44, text: 'Life support: placeholder. Oxygen, water and food come later.', task: 'life' },
    { id: 'planting-beds', name: 'Planting Beds', room: 'greenhouse', x: 210, y: 400, w: 120, h: 56, text: 'Planting beds: you will plant crops here later.', task: 'plant' },
    { id: 'grow-lights', name: 'Grow Lights', room: 'greenhouse', x: 380, y: 380, w: 80, h: 40, text: 'Grow lights: brighter means faster growth and more power.' },
    { id: 'water-tank', name: 'Water Tank', room: 'greenhouse', x: 400, y: 610, w: 70, h: 50, text: 'Water tank: placeholder.' },
    { id: 'solar-display', name: 'Solar Panel Display', room: 'power', x: 1210, y: 380, w: 100, h: 44, text: 'Solar energy readout will show here.' },
    { id: 'battery-bank', name: 'Battery Bank', room: 'power', x: 1400, y: 380, w: 90, h: 44, text: 'Battery storage will show here.' },
    { id: 'power-panel', name: 'Power Control Panel', room: 'power', x: 1300, y: 620, w: 110, h: 50, text: 'Power station inspected. Switches come later.', task: 'power' },
    { id: 'shield-controls', name: 'Shield Controls', room: 'shelter', x: 690, y: 825, w: 100, h: 44, text: 'Shield controls: placeholder.' },
    { id: 'shelter-bunk', name: 'Shelter Bunk', room: 'shelter', x: 900, y: 905, w: 110, h: 50, text: 'A safe place to wait out a solar storm.' },
];

/** The Mission 01 checklist (phase 1 only checks that you visited each station). */
export const MISSION_01 = [
    { id: 'power', label: 'Inspect the power station' },
    { id: 'plant', label: 'Plant your first batch of crops' },
    { id: 'life', label: 'Check the life-support system' },
    { id: 'comms', label: 'Activate the communication terminal' },
];

export function roomAt(x: number, y: number): Room | null
{
    return ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) ?? null;
}

function wall(x1: number, y1: number, x2: number, y2: number): void
{
    game.spawn({
        id: 'wall', texture: 'white', tint: '#cfd8e8', layer: 'world', tags: ['wall'],
        x: (x1 + x2) / 2, y: (y1 + y2) / 2, width: x2 - x1, height: y2 - y1,
    });
}

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

function floor(x: number, y: number, w: number, h: number, color: string): void
{
    game.spawn({ id: 'floor', texture: 'white', tint: color, layer: 'floor', z: -5000, x: x + w / 2, y: y + h / 2, width: w, height: h });
}

export function buildOutpost(): Record<string, Sprite> {
    // floors
    for (const r of ROOMS) floor(r.x, r.y, r.w, r.h, r.color);
    const hall = '#252b40';
    floor(480, 440, 120, DOOR, hall);
    floor(1000, 440, 120, DOOR, hall);
    floor(750, 670, DOOR, 100, hall);

    // room walls, with door gaps
    const door = (c: number): [number, number] => [c - DOOR / 2, c + DOOR / 2];
    wallLine(true, 330, 600, 1000);                         // command top
    wallLine(true, 670, 600, 1000, [door(800)]);            // command bottom
    wallLine(false, 600, 330, 670, [door(490)]);            // command left
    wallLine(false, 1000, 330, 670, [door(490)]);           // command right
    wallLine(true, 330, 120, 480); wallLine(true, 670, 120, 480);          // greenhouse top, bottom
    wallLine(false, 120, 330, 670); wallLine(false, 480, 330, 670, [door(490)]);
    wallLine(true, 330, 1120, 1480); wallLine(true, 670, 1120, 1480);      // power top, bottom
    wallLine(false, 1480, 330, 670); wallLine(false, 1120, 330, 670, [door(490)]);
    wallLine(true, 960, 600, 1000); wallLine(false, 600, 770, 960);        // shelter bottom, left
    wallLine(false, 1000, 770, 960); wallLine(true, 770, 600, 1000, [door(800)]);
    // corridor walls
    wallLine(true, 440, 480, 600); wallLine(true, 540, 480, 600);
    wallLine(true, 440, 1000, 1120); wallLine(true, 540, 1000, 1120);
    wallLine(false, 750, 670, 770); wallLine(false, 850, 670, 770);

    // room names on the floor
    for (const r of ROOMS) {
        game.text(r.name, r.x + r.w / 2, r.y + r.h / 2, { size: 26, color: '#ffffff', alpha: 0.18, layer: 'floor', z: -4000 });
    }
    return {};
}

export function spawnStations(): Sprite[]
{
    const tint: Record<string, string> = { command: '#6f8cc8', greenhouse: '#59b87d', power: '#d6b24a', shelter: '#d9708f' };
    return STATIONS.map(s => {
        const sp = game.spawn({
            id: s.id, texture: 'white', tint: tint[s.room], layer: 'world', tags: ['wall', 'station'],
            x: s.x, y: s.y, width: s.w, height: s.h, data: { def: s },
        });
        game.text(s.name, s.x, s.y - s.h / 2 - 12, { size: 13, color: '#ffffff', layer: 'world', z: 3000, stroke: { color: '#000000', width: 2 } });
        return sp;
    });
}
