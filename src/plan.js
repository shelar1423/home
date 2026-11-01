// Shelar Residence — transcribed from "2D_R0_JSW_Shelar Residence_31102026.pdf".
//
// Plan coordinates are metres, read straight off the sheets:
//   X runs left → right across the sheet (0 … 11.0, the 36′1″ building width)
//   Z runs from the back wall (0) towards the road (7.11, the 23′4″ depth)
// The road is in front (+Z). Heights are taken from the "Height details" sheet.
// The drawing is marked NTS, so positions are scaled from the sheet and rounded.

export const W = 11.0, D = 7.11;
export const STOREY = 3.353;          // 11′ floor to floor
export const SLAB = 0.15;
export const LEVEL_Y = [0.762, 4.115, 7.468, 10.82];   // +2′6″, +13′6″, +24′6″, +35′6″
export const ROOF_Y = 14.173;                         // +46′6″
export const PARKING_Y = 0.61;                        // +2′0″

// Openings: a/b are absolute plan positions along the wall's long axis.
// swing: +1 opens towards +perpendicular (+Z for an X wall, +X for a Z wall).
export const door = (a, b, name, hinge = 'a', swing = 1) => ({ t: 'door', a, b, name, hinge, swing });
export const dbl = (a, b, name, swing = 1) => ({ t: 'double', a, b, name, swing });
export const slide = (a, b, name = 'Sliding door') => ({ t: 'slide', a, b, name });
export const win = (a, b, sill = 0.9, head = 2.1) => ({ t: 'win', a, b, sill, head });
export const vent = (a, b) => ({ t: 'win', a, b, sill: 1.65, head: 2.1, vent: true });
export const open = (a, b, head = 2.4) => ({ t: 'open', a, b, head });

const wall = (x1, z1, x2, z2, o = [], opts = {}) => ({ r: [x1, z1, x2, z2], o, ...opts });

// ── Ground floor ────────────────────────────────────────────────────────────
const ground = {
  name: 'Ground floor', short: 'Ground', y: LEVEL_Y[0],
  blurb: 'A self-contained unit: bedroom with dressing and toilet, hall with open kitchen, utility, covered parking and the entrance lobby with the staircase.',
  outline: [[-0.37, 3.6], [0, 3.6], [0, 0], [W, 0], [W, D], [-0.37, D]],
  rooms: [
    { n: 'Bedroom', d: '10′0″ × 11′0″', r: [0.23, 0.23, 3.25, 3.6], f: 'wood', fan: true },
    { n: 'Dressing', d: '4′6″ × 4′0″', r: [3.37, 2.42, 4.75, 3.6], f: 'wood' },
    { n: 'Toilet', d: '4′6″ × 6′7½″', r: [3.37, 0.23, 4.75, 2.3], f: 'bath' },
    { n: 'Hall / Kitchen', d: '13′4½″ × 10′5½″', r: [0.67, 3.72, 4.75, 6.88], f: 'tile', fan: true },
    { n: 'Utility', d: '3′2″ × 10′10″', r: [-0.14, 3.72, 0.55, 6.88], f: 'bath' },
    { n: 'Parking', d: 'Car + 2 bikes · +2′0″', r: [4.95, 0.23, 8.45, 7.11], f: 'pavers', y: PARKING_Y - LEVEL_Y[0] },
    { n: 'Lobby', d: '8′5½″ × 9′1″', r: [8.65, 4.4, 10.85, 6.88], f: 'granite' },
    { n: 'Staircase', d: 'To first floor', r: [8.65, 0.23, 10.85, 4.4], f: null, stair: true },
  ],
  walls: [
    wall(0, 0, W, 0.23, [win(2.1, 3.25), vent(3.85, 4.5), win(8.95, 10.45, 2.3, 3.0)], { ext: '-z' }),
    wall(0, 0.23, 0.23, 3.6, [win(2.9, 3.5)], { ext: '-x' }),
    wall(-0.37, 3.6, -0.14, 6.88, [win(5.75, 6.55, 1.05, 2.1)], { ext: '-x' }),
    wall(-0.37, 3.6, 0.23, 3.72, [], { ext: '-z' }),
    wall(-0.37, 6.88, 4.95, 7.11, [win(1.4, 2.4, 1.05, 2.1)], { ext: '+z' }),
    wall(4.75, 0.23, 4.95, 6.88, [win(4.3, 5.4), dbl(5.85, 6.8, 'Main door', -1)], { ext: '+x' }),
    wall(8.45, 0.23, 8.65, 4.4, [], { ext: '-x', accent: true }),
    wall(8.45, 6.88, W, 7.11, [], { ext: '+z', accent: true }),
    wall(10.85, 0.23, W, 6.88, [win(5.0, 6.4)], { ext: '+x', accent: true }),
    // interior
    wall(-0.14, 3.6, 4.75, 3.72, [door(2.4, 3.2, 'Bedroom', 'b', -1)]),
    wall(3.25, 0.23, 3.37, 2.3),
    wall(3.25, 2.3, 4.75, 2.42, [door(3.62, 4.4, 'Toilet', 'a', -1)]),
    wall(0.55, 3.72, 0.67, 6.88, [door(4.45, 5.3, 'Utility', 'b', -1)]),
  ],
  furniture: [
    { k: 'bed', x: 1.25, z: 2.07, rot: Math.PI / 2 },
    { k: 'nightstand', x: 0.45, z: 1.02, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 3.12, rot: Math.PI / 2 },
    { k: 'wardrobe', r: [0.23, 0.23, 2.05, 0.8], face: '+z' },
    { k: 'desk', x: 2.65, z: 0.52, w: 1.1, rot: 0 }, { k: 'chair', x: 2.65, z: 1.05, rot: Math.PI },
    { k: 'wardrobe', r: [4.2, 2.42, 4.75, 3.58], face: '-x' },
    { k: 'wc', x: 4.35, z: 0.52, rot: 0 }, { k: 'basin', x: 3.6, z: 1.35, rot: Math.PI / 2 }, { k: 'shower', x: 4.6, z: 1.7 },
    { k: 'tall', r: [0.67, 3.72, 1.6, 4.3], face: '+z' }, { k: 'fridge', x: 2.0, z: 4.07, rot: 0 },
    { k: 'sofa', x: 4.32, z: 4.75, w: 1.9, rot: -Math.PI / 2 },
    { k: 'coffee', x: 3.4, z: 4.75, w: 0.55, d: 1.0 },
    { k: 'rug', r: [2.75, 4.0, 3.95, 5.5], c: '#b49a7a' },
    { k: 'tvunit', x: 3.55, z: 6.72, w: 1.5, rot: Math.PI },
    { k: 'counter', r: [0.67, 6.3, 2.4, 6.88], hob: [1.92, 6.6], wall: '+z' },
    { k: 'counter', r: [0.67, 5.45, 1.27, 6.3], sink: [0.97, 5.85], wall: '-x' },
    { k: 'washer', x: 0.2, z: 4.05, rot: Math.PI / 2 }, { k: 'basin', x: 0.05, z: 6.4, rot: Math.PI / 2 },
    { k: 'car', x: 6.85, z: 2.5, rot: Math.PI },
    { k: 'bike', x: 5.35, z: 1.25, rot: 0 }, { k: 'bike', x: 5.35, z: 3.35, rot: 0 },
    { k: 'plant', x: 10.5, z: 6.5, s: 1 }, { k: 'shoes', x: 10.6, z: 5.35, rot: -Math.PI / 2 },
  ],
  slabHoles: [],
  extraBlocks: [[8.65, 0.23, 10.85, 4.4]],
};

// ── First floor ─────────────────────────────────────────────────────────────
const first = {
  name: 'First floor', short: '1st', y: LEVEL_Y[1],
  blurb: 'The family floor: living room, dining under a double-height stair void, kitchen with utility, guest bedroom and two toilets. Entered from the lobby stair through the main door.',
  rooms: [
    { n: 'Guest bedroom', d: '10′5″ × 10′2″', r: [0.23, 0.23, 3.4, 3.45], f: 'wood', fan: true },
    { n: 'Toilet', d: '6′6″ × 4′0″', r: [0.23, 3.57, 2.2, 4.75], f: 'bath' },
    { n: 'Common toilet', d: '3′11″ × 4′0″', r: [2.3, 3.57, 3.45, 4.75], f: 'bath' },
    { n: 'Utility', d: '3′9″ × 6′11½″', r: [0.23, 4.87, 1.15, 6.88], f: 'bath' },
    { n: 'Kitchen', d: '10′5½″ × 6′11½″', r: [1.27, 4.87, 4.6, 6.88], f: 'tile' },
    { n: 'Dining', d: '10′6″ × 7′1″', r: [4.55, 1.15, 6.75, 3.3], f: null, noLights: true },
    { n: 'Living', d: '12′8½″ × 7′4″', r: [4.72, 3.3, 8.45, 6.88], f: null, fan: true },
    { n: 'Lobby', d: '7′9″ × 9′1″', r: [8.65, 4.4, 10.85, 6.88], f: 'granite' },
    { n: 'Staircase', d: 'Up to second floor', r: [3.6, 0.23, 7.5, 2.4], f: null, stair: true },
  ],
  walls: [
    wall(0, 0, W, 0.23, [win(3.65, 4.5, 1.2, 2.4), win(6.65, 7.45, 1.9, 3.0), win(8.95, 10.45, 0.9, 2.1)], { ext: '-z' }),
    wall(0, 0.23, 0.23, 6.88, [win(2.4, 3.3), vent(3.8, 4.4)], { ext: '-x' }),
    wall(0, 6.88, W, 7.11, [win(2.25, 3.2, 1.05, 2.1), win(5.45, 6.15), win(6.75, 7.5)], { ext: '+z' }),
    wall(10.85, 0.23, W, 6.88, [], { ext: '+x' }),
    // interior
    wall(3.4, 0.23, 3.55, 3.45, [door(2.5, 3.35, 'Guest bedroom', 'b', -1)]),
    wall(0.23, 3.45, 3.55, 3.57, [door(1.42, 2.15, 'Toilet', 'b', 1)]),
    wall(2.2, 3.57, 2.3, 4.75),
    wall(3.45, 3.57, 3.55, 4.75, [door(3.72, 4.58, 'Common toilet', 'a', -1)]),
    wall(0.23, 4.75, 3.55, 4.87),
    wall(1.15, 4.87, 1.27, 6.88, [door(4.95, 5.7, 'Utility', 'b', -1)]),
    wall(4.6, 4.75, 4.72, 6.88),
    wall(8.45, 0.23, 8.65, 6.88, [dbl(5.7, 6.75, 'Main door', -1)]),
  ],
  furniture: [
    { k: 'bed', x: 2.08, z: 1.25, rot: 0 },
    { k: 'nightstand', x: 1.08, z: 0.45, rot: 0 }, { k: 'nightstand', x: 3.08, z: 0.45, rot: 0 },
    { k: 'wardrobe', r: [0.23, 0.23, 0.8, 2.12], face: '+x' },
    { k: 'desk', x: 0.5, z: 2.75, w: 1.0, rot: Math.PI / 2 }, { k: 'chair', x: 1.05, z: 2.75, rot: -Math.PI / 2 },
    { k: 'wc', x: 0.55, z: 4.16, rot: Math.PI / 2 }, { k: 'basin', x: 1.85, z: 4.55, rot: Math.PI }, { k: 'shower', x: 1.3, z: 3.75 },
    { k: 'wc', x: 2.62, z: 4.16, rot: Math.PI / 2 }, { k: 'basin', x: 3.2, z: 3.75, rot: 0, small: true },
    { k: 'washer', x: 0.55, z: 6.55, rot: Math.PI },
    { k: 'counter', r: [1.27, 6.3, 4.6, 6.88], hob: [2.75, 6.6], sink: [3.9, 6.6], wall: '+z' },
    { k: 'counter', r: [1.27, 5.55, 1.85, 6.3], wall: '-x' },
    { k: 'fridge', x: 3.05, z: 5.2, rot: 0 },
    { k: 'sofa', x: 5.55, z: 6.45, w: 1.6, rot: Math.PI },
    { k: 'sofa', x: 5.12, z: 5.25, w: 1.5, rot: Math.PI / 2 },
    { k: 'coffee', x: 6.05, z: 5.5, w: 0.6, d: 1.05 },
    { k: 'rug', r: [5.55, 4.6, 7.4, 6.2], c: '#9c8b74' },
    { k: 'tvunit', x: 8.27, z: 5.0, w: 1.6, rot: -Math.PI / 2 },
    { k: 'dining', x: 5.62, z: 2.6, w: 1.6, d: 0.9 },
    { k: 'tall', r: [7.6, 0.23, 8.45, 0.85], face: '+z' },
    { k: 'plant', x: 8.0, z: 3.0, s: 1.2 }, { k: 'plant', x: 10.45, z: 6.5, s: 0.9 },
    { k: 'shoes', x: 10.6, z: 5.6, rot: -Math.PI / 2 },
  ],
  // Lobby staircase arrives here from the ground floor.
  slabHoles: [[8.65, 0.23, 10.85, 4.4]],
  railings: [[8.65, 4.4, 9.75, 4.4]],
  extraBlocks: [[8.65, 0.23, 10.85, 4.4], [3.6, 0.23, 4.55, 2.4], [4.55, 0.23, 7.5, 1.15], [6.75, 1.15, 7.5, 2.4]],
};

// ── Second floor ────────────────────────────────────────────────────────────
const second = {
  name: 'Second floor', short: '2nd', y: LEVEL_Y[2],
  blurb: 'Two bedroom suites, each with a walk-in wardrobe, toilet and balcony, either side of a living room with study desks and a pooja room lit from the skylight above.',
  rooms: [
    { n: 'Master bedroom', d: '10′5″ × 10′11″', r: [0.23, 2.52, 3.45, 5.8], f: 'wood', fan: true },
    { n: 'Walk-in wardrobe', d: '5′0″ × 6′9½″', r: [0.23, 0.23, 1.75, 2.4], f: 'wood' },
    { n: 'Toilet', d: '5′0″ × 6′9½″', r: [1.87, 0.23, 3.45, 2.4], f: 'bath' },
    { n: 'Balcony', d: '11′2″ × 3′9″', r: [0.23, 5.95, 3.45, 7.0], f: 'deck' },
    { n: 'Living', d: '13′5″ × 11′0″', r: [3.6, 2.4, 7.65, 5.85], f: null, fan: true },
    { n: 'Study', d: 'Two desks', r: [3.6, 5.85, 5.85, 6.88], f: null },
    { n: 'Pooja', d: '5′5″ × 3′9″', r: [5.95, 5.95, 7.65, 6.88], f: 'marble', noLights: true },
    { n: 'Bedroom', d: '10′0″ × 10′11″', r: [7.75, 2.52, 10.85, 5.8], f: 'wood', fan: true },
    { n: 'Walk-in wardrobe', d: '4′9½″ × 6′9½″', r: [7.75, 0.23, 8.95, 2.4], f: 'wood' },
    { n: 'Toilet', d: '4′10″ × 6′9½″', r: [9.07, 0.23, 10.85, 2.4], f: 'bath' },
    { n: 'Balcony', d: '10′9″ × 3′9″', r: [7.75, 5.95, 10.85, 7.0], f: 'deck' },
    { n: 'Staircase', d: 'Up to penthouse', r: [3.6, 0.23, 7.5, 2.4], f: null, stair: true },
  ],
  walls: [
    wall(0, 0, W, 0.23, [vent(2.35, 3.0), win(3.65, 4.5, 1.2, 2.4), win(6.65, 7.45, 1.9, 3.0)], { ext: '-z' }),
    wall(0, 0.23, 0.23, 5.95, [win(5.1, 5.7)], { ext: '-x' }),
    wall(10.85, 0.23, W, 5.95, [vent(1.0, 1.5), win(4.5, 5.55)], { ext: '+x' }),
    wall(3.45, 6.88, 5.95, 7.11, [win(3.9, 5.6, 0.75, 2.1)], { ext: '+z' }),
    wall(5.95, 6.88, 7.75, 7.11, [], { ext: '+z', wood: true }),
    // interior
    wall(0.23, 2.4, 3.45, 2.52, [open(0.82, 1.75, 2.1)]),
    wall(1.75, 0.23, 1.87, 2.4, [door(1.55, 2.33, 'Toilet', 'a', 1)]),
    wall(3.45, 0.23, 3.6, 6.88, [door(4.95, 5.75, 'Master bedroom', 'b', -1)]),
    wall(0.23, 5.8, 3.45, 5.95, [slide(0.8, 2.6, 'Balcony')], { ext: '+z' }),
    wall(7.5, 0.23, 7.75, 2.4),
    wall(7.65, 2.4, 7.75, 6.88, [door(4.88, 5.72, 'Bedroom', 'b', 1)]),
    wall(7.75, 2.4, 10.85, 2.52, [open(8.35, 8.95, 2.1)]),
    wall(8.95, 0.23, 9.07, 2.4, [door(1.55, 2.33, 'Toilet', 'a', 1)]),
    wall(7.75, 5.8, 10.85, 5.95, [slide(8.3, 9.95, 'Balcony')], { ext: '+z' }),
    wall(5.85, 5.95, 5.95, 6.88, [], { h: 2.4 }),
  ],
  parapets: [
    { r: [0, 7.0, 3.45, 7.11], glass: true }, { r: [0, 5.95, 0.08, 7.11], glass: true },
    { r: [7.75, 7.0, W, 7.11], glass: true }, { r: [10.92, 5.95, W, 7.11], glass: true },
  ],
  furniture: [
    { k: 'bed', x: 1.25, z: 4.08, rot: Math.PI / 2, king: true },
    { k: 'nightstand', x: 0.45, z: 2.88, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 5.28, rot: Math.PI / 2 },
    { k: 'tvunit', x: 3.3, z: 4.05, w: 1.6, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [0.23, 0.23, 0.8, 2.38], face: '+x' }, { k: 'wardrobe', r: [0.8, 0.23, 1.75, 0.8], face: '+z' },
    { k: 'wc', x: 3.1, z: 0.6, rot: -Math.PI / 2 }, { k: 'basin', x: 3.18, z: 1.95, rot: -Math.PI / 2 }, { k: 'shower', x: 2.2, z: 0.45 },
    { k: 'bed', x: 8.78, z: 3.85, rot: Math.PI / 2 },
    { k: 'nightstand', x: 7.97, z: 2.8, rot: Math.PI / 2 },
    { k: 'tvunit', x: 10.7, z: 3.6, w: 1.5, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [7.75, 0.23, 8.3, 2.38], face: '+x' }, { k: 'wardrobe', r: [8.3, 0.23, 8.95, 0.8], face: '+z' },
    { k: 'wc', x: 10.55, z: 0.62, rot: -Math.PI / 2 }, { k: 'basin', x: 10.6, z: 1.95, rot: -Math.PI / 2 }, { k: 'shower', x: 9.6, z: 0.45 },
    { k: 'desk', x: 4.2, z: 6.6, w: 1.15, rot: Math.PI }, { k: 'chair', x: 4.2, z: 6.05, rot: 0 },
    { k: 'desk', x: 5.35, z: 6.6, w: 1.0, rot: Math.PI }, { k: 'chair', x: 5.35, z: 6.05, rot: 0 },
    { k: 'sofa', x: 7.22, z: 4.05, w: 1.5, rot: -Math.PI / 2 },
    { k: 'armchair', x: 5.1, z: 3.85, rot: Math.PI / 2 + 0.35 }, { k: 'armchair', x: 5.1, z: 4.75, rot: Math.PI / 2 - 0.35 },
    { k: 'coffee', x: 6.15, z: 4.3, w: 0.6, d: 1.0 },
    { k: 'rug', r: [5.35, 3.4, 6.95, 5.2], c: '#a79377' },
    { k: 'pooja', x: 6.8, z: 6.7, rot: Math.PI },
    { k: 'plant', x: 0.55, z: 6.6, s: 0.8 }, { k: 'plant', x: 10.4, z: 6.6, s: 0.8 },
    { k: 'balconyChair', x: 2.6, z: 6.5, rot: Math.PI }, { k: 'balconyChair', x: 9.6, z: 6.5, rot: Math.PI },
  ],
  slabHoles: [[3.6, 0.23, 7.5, 2.4]],
  railings: [[4.55, 2.4, 6.75, 2.4]],
  extraBlocks: [[3.6, 0.23, 7.5, 2.4]],
};

// ── Penthouse ───────────────────────────────────────────────────────────────
const third = {
  name: 'Penthouse', short: 'Penthouse', y: LEVEL_Y[3],
  blurb: 'A private suite with walk-in wardrobe, toilet and balcony, a lobby at the top of the stairs and a large open terrace with a skylight over the pooja room.',
  rooms: [
    { n: 'Bedroom', d: '10′5″ × 10′11″', r: [0.23, 2.52, 3.45, 5.8], f: 'wood', fan: true },
    { n: 'Walk-in wardrobe', d: '5′0″ × 6′9½″', r: [0.23, 0.23, 1.75, 2.4], f: 'wood' },
    { n: 'Toilet', d: '5′0″ × 6′9½″', r: [1.87, 0.23, 3.45, 2.4], f: 'bath' },
    { n: 'Balcony', d: '11′2″ × 3′9″', r: [0.23, 5.95, 3.45, 7.0], f: 'deck' },
    { n: 'Lobby', d: '12′8″ × 4′0″', r: [3.6, 2.4, 7.5, 3.6], f: 'granite' },
    { n: 'Open terrace', d: '10′8″ × 13′5″ + 10′9″ × 23′4″', r: [3.65, 3.85, 10.85, 7.0], f: 'terrace' },
    { n: 'Open terrace', d: '10′9″ × 23′4″', r: [7.75, 0.23, 10.85, 3.85], f: 'terrace', noLabel: true },
    { n: 'Staircase', d: 'Down to second floor', r: [3.6, 0.23, 7.5, 2.4], f: null, stair: true },
  ],
  walls: [
    wall(0, 0, 7.75, 0.23, [vent(2.35, 2.95), win(3.65, 4.5, 1.2, 2.4), win(6.65, 7.45, 1.2, 2.4)], { ext: '-z' }),
    wall(0, 0.23, 0.23, 5.95, [win(2.6, 3.2)], { ext: '-x' }),
    // interior
    wall(0.23, 2.4, 3.45, 2.52, [open(0.82, 1.75, 2.1)]),
    wall(1.75, 0.23, 1.87, 2.4, [door(1.6, 2.36, 'Toilet', 'a', 1)]),
    wall(3.45, 0.23, 3.65, 7.0, [door(2.52, 3.32, 'Bedroom', 'a', -1)], { ext: '+x' }),
    wall(0.23, 5.8, 3.45, 5.95, [slide(0.8, 2.55, 'Balcony')], { ext: '+z' }),
    wall(7.5, 0.23, 7.75, 3.85, [], { ext: '+x' }),
    wall(3.65, 3.6, 7.5, 3.85, [slide(4.55, 6.25, 'Terrace')], { ext: '+z' }),
  ],
  parapets: [
    { r: [0, 7.0, 3.45, 7.11], glass: true }, { r: [0, 5.95, 0.08, 7.11], glass: true },
    { r: [3.65, 7.0, W, 7.11] }, { r: [10.89, 0, W, 7.11] }, { r: [7.75, 0, W, 0.11] },
  ],
  furniture: [
    { k: 'bed', x: 1.25, z: 4.08, rot: Math.PI / 2, king: true },
    { k: 'nightstand', x: 0.45, z: 2.88, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 5.28, rot: Math.PI / 2 },
    { k: 'tvunit', x: 3.3, z: 4.2, w: 1.5, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [0.23, 0.23, 0.8, 2.38], face: '+x' }, { k: 'wardrobe', r: [0.8, 0.23, 1.75, 0.8], face: '+z' },
    { k: 'wc', x: 3.1, z: 0.6, rot: -Math.PI / 2 }, { k: 'basin', x: 3.18, z: 1.85, rot: -Math.PI / 2 }, { k: 'shower', x: 2.2, z: 0.45 },
    { k: 'balconyChair', x: 2.6, z: 6.5, rot: Math.PI }, { k: 'plant', x: 0.55, z: 6.6, s: 0.8 },
    { k: 'swing', x: 9.3, z: 1.6, rot: Math.PI / 2 },
    { k: 'outdoorSet', x: 9.6, z: 5.5 },
    { k: 'lounger', x: 4.6, z: 5.6, rot: 0 }, { k: 'lounger', x: 5.4, z: 5.6, rot: 0 },
    { k: 'planter', r: [3.75, 6.7, 6.1, 6.98] }, { k: 'planter', r: [7.9, 6.7, 10.8, 6.98] }, { k: 'planter', r: [10.55, 2.0, 10.85, 4.2] },
    { k: 'skylight', r: [6.25, 5.5, 7.5, 6.85] },
    { k: 'ladder', x: 7.85, z: 1.45 },
  ],
  slabHoles: [[3.6, 0.23, 7.5, 2.4], [6.25, 5.5, 7.5, 6.85]],
  railings: [[3.6, 2.4, 6.75, 2.4]],
  extraBlocks: [[3.6, 0.23, 7.5, 2.4]],
};

export const FLOORS = [ground, first, second, third];

// Roof over the penthouse rooms (upper terrace sheet): L-shaped slab with a 1′ parapet.
export const ROOF = {
  outline: [[0, 0], [7.75, 0], [7.75, 3.85], [3.65, 3.85], [3.65, D], [0, D]],
  tank: [1.2, 1.35],
};

// Stairs. Paths are [x, z, rise-fraction] along the walking line; flights render treads.
const r = 1 / 22;
const internal = (base) => ({
  id: 'internal-' + base, from: base, to: base + 1,
  label: ['', 'Second floor', 'Penthouse'][base],
  bottom: { x: 4.075, z: 2.85, yaw: Math.PI }, top: { x: 7.125, z: 2.85, yaw: 0 },
  bottomTrigger: [3.6, 2.1, 4.55, 2.78], topTrigger: [6.75, 2.1, 7.5, 2.78],
  path: [[4.075, 2.85, 0], [4.075, 2.4, 0], [4.075, 1.15, 5 * r], [4.075, 0.69, 6.5 * r], [4.55, 0.69, 7 * r],
    [6.75, 0.69, 15 * r], [7.125, 0.69, 16.5 * r], [7.125, 1.15, 17 * r], [7.125, 2.4, 1], [7.125, 2.85, 1]],
  flights: [
    { axis: 'z', x1: 3.6, x2: 4.55, s0: 2.4, s1: 1.15, k0: 1, n: 5 },
    { rect: [3.6, 0.69, 4.55, 1.15], k: 6 }, { rect: [3.6, 0.23, 4.55, 0.69], k: 7 },
    { axis: 'x', z1: 0.23, z2: 1.15, s0: 4.55, s1: 6.75, k0: 8, n: 8 },
    { rect: [6.75, 0.23, 7.5, 0.69], k: 16 }, { rect: [6.75, 0.69, 7.5, 1.15], k: 17 },
    { axis: 'z', x1: 6.75, x2: 7.5, s0: 1.15, s1: 2.4, k0: 18, n: 4, last: true },
  ],
});
export const STAIRS = [
  {
    id: 'lobby', from: 0, to: 1, label: 'First floor',
    bottom: { x: 9.2, z: 4.85, yaw: Math.PI }, top: { x: 10.3, z: 4.85, yaw: 0 },
    bottomTrigger: [8.65, 4.05, 9.75, 4.78], topTrigger: [9.75, 4.05, 10.85, 4.78],
    path: [[9.2, 4.85, 0], [9.2, 4.4, 0], [9.2, 1.05, 10 * r], [9.2, 0.64, 11 * r], [10.3, 0.64, 11 * r],
      [10.3, 1.05, 12 * r], [10.3, 4.4, 1], [10.3, 4.85, 1]],
    flights: [
      { axis: 'z', x1: 8.65, x2: 9.75, s0: 4.4, s1: 1.05, k0: 1, n: 10 },
      { rect: [8.65, 0.23, 10.85, 1.05], k: 11 },
      { axis: 'z', x1: 9.75, x2: 10.85, s0: 1.05, s1: 4.4, k0: 12, n: 10, last: true },
    ],
  },
  internal(1), internal(2),
];

// Viewpoints for the guided tour: level, standing point, facing direction, caption.
export const TOUR = [
  { l: 0, x: 6.7, z: 12.2, look: [6.0, 5.5, 3.5], t: 'Welcome to the Shelar Residence', s: 'Four floors on a 36′ × 23′ footprint, facing the road. Parking and the entrance lobby are at street level.' },
  { l: 0, x: 6.3, z: 6.4, look: [6.85, 1.0, 2.0], t: 'Covered parking', s: 'Space for one car and two bikes, open to the road. The parking level is 6″ below the house plinth.' },
  { l: 0, x: 9.7, z: 6.1, look: [9.7, 1.4, 2.0], t: 'Entrance lobby', s: 'The lobby opens off the parking. Its staircase goes up to the first-floor family home.' },
  { l: 0, x: 3.2, z: 5.6, look: [1.0, 1.2, 4.6], t: 'Ground floor · Hall and kitchen', s: 'A separate ground-floor unit. Its main door opens from the parking into the hall with an open kitchen and utility.' },
  { l: 0, x: 2.6, z: 3.05, look: [1.0, 1.0, 1.4], t: 'Ground floor · Bedroom', s: '10′ × 11′ bedroom with a dressing area and attached toilet.' },
  { l: 1, x: 7.7, z: 6.1, look: [5.2, 1.3, 5.2], t: 'First floor · Living room', s: 'Through the main door from the lobby. Sofa seating faces the TV wall.' },
  { l: 1, x: 6.2, z: 4.5, look: [5.6, 2.6, 1.6], t: 'Dining under the stair void', s: 'The dining table sits beneath an open void that rises through the U-shaped staircase.' },
  { l: 1, x: 4.1, z: 4.3, look: [2.8, 1.0, 6.6], t: 'Kitchen and utility', s: 'Granite counters along the front wall with hob, sink and fridge. The utility is behind the side door.' },
  { l: 1, x: 2.9, z: 2.95, look: [1.6, 1.0, 1.0], t: 'Guest bedroom', s: '10′5″ × 10′2″ with wardrobe, study desk and its own toilet.' },
  { l: 2, x: 6.3, z: 3.2, look: [6.8, 1.3, 6.8], t: 'Second floor · Living and pooja', s: 'A family lounge with two study desks. The pooja room is lit by the skylight in the terrace above.' },
  { l: 2, x: 2.8, z: 5.2, look: [0.9, 1.0, 3.8], t: 'Master bedroom', s: 'King bed, walk-in wardrobe, attached toilet and a balcony facing the road.' },
  { l: 2, x: 8.3, z: 5.3, look: [9.6, 1.0, 3.6], t: 'Second bedroom', s: 'A second suite with walk-in wardrobe, toilet and its own balcony.' },
  { l: 3, x: 5.6, z: 3.05, look: [7.0, 1.0, 5.5], t: 'Penthouse lobby', s: 'The staircase ends in a lobby with a sliding door onto the open terrace.' },
  { l: 3, x: 8.7, z: 6.2, look: [6.0, 1.0, 2.0], t: 'Open terrace', s: 'A large open terrace with a swing, seating and the skylight over the pooja room.' },
  { l: 3, x: 2.8, z: 5.2, look: [0.9, 1.0, 3.8], t: 'Penthouse bedroom', s: 'A private suite with walk-in wardrobe, toilet and balcony.' },
];

// Where "go to floor" lands you in walk mode.
export const ARRIVAL = [
  { x: 6.7, z: 9.8, yaw: Math.PI },
  { x: 7.6, z: 6.15, yaw: -Math.PI / 2 - 0.5 },
  { x: 6.0, z: 3.4, yaw: Math.PI * 0.85 },
  { x: 5.6, z: 3.05, yaw: 0.3 },
];
