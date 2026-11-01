// Shelar Residence — built from "2D_R0_JSW_Shelar Residence_31102026.pdf".
//
// Plan axes (metres in the model):
//   X runs left → right across the sheet (0 … 36′1″, the building width)
//   Z runs from the back wall (0) towards the road (23′4″, the depth)
// The road is in front (+Z). Heights come from the "Height details" sheet.
//
// Rooms and walls are laid out in INCHES from the printed room sizes, so each
// room's clear size is exactly what the sheet prints (first figure across the
// sheet, second figure front-to-back). Outer walls are 9″, partitions 4½″.
// Furniture, stairs walking lines and tour stops are in metres.

const IN = 0.0254, m = (v) => +(v * IN).toFixed(4);
const rect = (x1, z1, x2, z2) => [m(x1), m(z1), m(x2), m(z2)];

export const W = m(433), D = m(280);                   // 36′1″ × 23′4″
export const BUMP = m(-20);                            // ground-floor utility projects to the 1′8″ side setback
export const PARKING_X = [m(196.5), m(322.5)];
export const STOREY = 3.353;                           // 11′ floor to floor
export const SLAB = 0.15;
export const LEVEL_Y = [0.762, 4.115, 7.468, 10.82];   // +2′6″, +13′6″, +24′6″, +35′6″
export const ROOF_Y = 14.173;                          // +46′6″
export const PARKING_Y = 0.61;                         // +2′0″

// Openings: a/b are positions in inches along the wall's long axis.
// swing: +1 opens towards +perpendicular (+Z for an X wall, +X for a Z wall).
export const door = (a, b, name, hinge = 'a', swing = 1) => ({ t: 'door', a: m(a), b: m(b), name, hinge, swing });
export const dbl = (a, b, name, swing = 1) => ({ t: 'double', a: m(a), b: m(b), name, swing });
export const slide = (a, b, name = 'Sliding door') => ({ t: 'slide', a: m(a), b: m(b), name });
export const win = (a, b, sill = 0.9, head = 2.1) => ({ t: 'win', a: m(a), b: m(b), sill, head });
export const vent = (a, b) => ({ t: 'win', a: m(a), b: m(b), sill: 1.65, head: 2.1, vent: true });
export const open = (a, b, head = 2.4) => ({ t: 'open', a: m(a), b: m(b), head });

const wall = (x1, z1, x2, z2, o = [], opts = {}) => ({ r: rect(x1, z1, x2, z2), o, ...opts });
const room = (n, d, r, extra = {}) => ({ n, d, r: rect(...r), ...extra });

// ── Ground floor ────────────────────────────────────────────────────────────
// Across: 4½″ | utility 3′2″ | 4½″ | hall 13′4½″ | 9″ | parking | lobby 8′5½″ | 9″
// Bedroom side: 9″ | bedroom 10′0″ | 4½″ | toilet / dressing 4′6″ | 9″
const ground = {
  name: 'Ground floor', short: 'Ground', y: LEVEL_Y[0],
  blurb: 'A self-contained unit: bedroom with dressing and toilet, hall with open kitchen, utility, covered parking and the entrance lobby with the staircase.',
  rooms: [
    room('Bedroom', '10′0″ × 11′0″', [9, 9, 129, 141], { f: 'wood', fan: true }),
    room('Dressing', '4′6″ × 4′0″', [133.5, 93, 187.5, 141], { f: 'wood' }),
    room('Toilet', '4′6″ × 6′7½″', [133.5, 9, 187.5, 88.5], { f: 'bath' }),
    room('Hall / Kitchen', '13′4½″ × 10′5½″', [27, 145.5, 187.5, 271], { f: 'tile', fan: true }),
    room('Utility', '3′2″ × 10′5½″', [-15.5, 145.5, 22.5, 271], { f: 'bath' }),
    room('Parking', 'Car + 2 bikes · +2′0″', [196.5, 9, 322.5, 280], { f: 'pavers', y: PARKING_Y - LEVEL_Y[0] }),
    room('Lobby', '8′5½″ × 9′1″', [322.5, 162, 424, 271], { f: 'granite' }),
    room('Staircase', 'To first floor', [331, 9, 424, 162], { f: null, stair: true }),
  ],
  walls: [
    wall(0, 0, 433, 9, [win(75, 120), vent(145, 175), win(345, 410, 2.3, 3.0)], { ext: '-z' }),
    wall(0, 9, 9, 141, [win(110, 135)], { ext: '-x' }),
    wall(-20, 141, -15.5, 271, [win(222, 252, 1.05, 2.1)], { ext: '-x' }),
    wall(-20, 271, 196.5, 280, [win(55, 95, 1.05, 2.1)], { ext: '+z' }),
    wall(187.5, 9, 196.5, 271, [win(170, 212), dbl(228, 266, 'Main door', -1)], { ext: '+x' }),
    wall(322, 9, 331, 162, [], { ext: '-x', accent: true }),
    wall(322, 271, 433, 280, [], { ext: '+z', accent: true }),
    wall(424, 9, 433, 271, [win(195, 250)], { ext: '+x', accent: true }),
    // interior
    wall(-15.5, 141, 187.5, 145.5, [door(95, 127, 'Bedroom', 'b', -1)]),
    wall(129, 9, 133.5, 88.5),
    wall(133.5, 88.5, 187.5, 93, [door(145, 176, 'Toilet', 'a', -1)]),
    wall(22.5, 145.5, 27, 271, [door(172, 205, 'Utility', 'b', -1)]),
  ],
  furniture: [
    { k: 'bed', x: 1.244, z: 2.1, rot: Math.PI / 2 },
    { k: 'nightstand', x: 0.45, z: 1.07, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 3.13, rot: Math.PI / 2 },
    { k: 'wardrobe', r: [0.229, 0.229, 1.95, 0.8], face: '+z' },
    { k: 'desk', x: 2.6, z: 0.505, w: 1.1, rot: 0 }, { k: 'chair', x: 2.6, z: 1.05, rot: Math.PI },
    { k: 'wardrobe', r: [4.2, 2.37, 4.76, 3.58], face: '-x' },
    { k: 'wc', x: 4.35, z: 0.52, rot: 0 }, { k: 'basin', x: 3.6, z: 1.35, rot: Math.PI / 2 }, { k: 'shower', x: 4.62, z: 1.75 },
    { k: 'tall', r: [0.686, 3.7, 1.6, 4.27], face: '+z' }, { k: 'fridge', x: 2.0, z: 4.05, rot: 0 },
    { k: 'sofa', x: 4.338, z: 4.8, w: 1.9, rot: -Math.PI / 2 },
    { k: 'coffee', x: 3.45, z: 4.8, w: 0.55, d: 1.0 },
    { k: 'rug', r: [2.8, 4.05, 3.95, 5.55], c: '#b49a7a' },
    { k: 'tvunit', x: 3.6, z: 6.68, w: 1.5, rot: Math.PI },
    { k: 'counter', r: [0.686, 6.3, 2.4, 6.883], hob: [1.85, 6.6], wall: '+z' },
    { k: 'counter', r: [0.686, 5.45, 1.27, 6.3], sink: [0.98, 5.85], wall: '-x' },
    { k: 'washer', x: -0.09, z: 4.05, rot: Math.PI / 2 }, { k: 'basin', x: -0.18, z: 6.4, rot: Math.PI / 2 },
    { k: 'car', x: 6.6, z: 2.6, rot: Math.PI },
    { k: 'bike', x: 5.4, z: 1.2, rot: 0 }, { k: 'bike', x: 5.4, z: 3.3, rot: 0 },
    { k: 'plant', x: 10.45, z: 6.55, s: 1 }, { k: 'shoes', x: 10.6, z: 5.4, rot: -Math.PI / 2 },
  ],
  slabHoles: [],
  extraBlocks: [rect(331, 9, 424, 162)],
};

// ── First floor ─────────────────────────────────────────────────────────────
// Across (bedroom row): 9″ | guest bedroom 10′5″ | 4½″ | U-stair core | … | lobby 7′9″ | 9″
// Across (toilets):     9″ | toilet 6′6″ | 4½″ | common toilet 3′11″ | 4½″
// Across (kitchen row): 9″ | utility 3′9″ | 4½″ | kitchen 10′5½″ | 4½″ | living …
// Front-to-back:        9″ | bedroom 10′2″ | 4½″ | toilets 4′0″ | 4½″ | kitchen 6′11½″ | 9″
const first = {
  name: 'First floor', short: '1st', y: LEVEL_Y[1],
  blurb: 'The family floor: living room, dining under a double-height stair void, kitchen with utility, guest bedroom and two toilets. Entered from the lobby stair through the main door.',
  rooms: [
    room('Guest bedroom', '10′5″ × 10′2″', [9, 9, 134, 131], { f: 'wood', fan: true }),
    room('Toilet', '6′6″ × 4′0″', [9, 135.5, 87, 183.5], { f: 'bath' }),
    room('Common toilet', '3′11″ × 4′0″', [91.5, 135.5, 138.5, 183.5], { f: 'bath' }),
    room('Utility', '3′9″ × 6′11½″', [9, 188, 54, 271.5], { f: 'bath' }),
    room('Kitchen', '10′5½″ × 6′11½″', [58.5, 188, 184, 271.5], { f: 'tile' }),
    room('Dining', '10′6″ × 7′1″', [143, 45, 269, 130], { f: null, noLights: true }),
    room('Living', '12′8½″ × 7′4″', [188.5, 130, 322, 271.5], { f: null, fan: true }),
    room('Lobby', '7′9″ × 9′1″', [331, 162, 424, 271], { f: 'granite' }),
    room('Staircase', 'Up to second floor', [138.5, 9, 290.5, 95], { f: null, stair: true }),
  ],
  walls: [
    wall(0, 0, 433, 9, [win(141, 172, 1.2, 2.4), win(257, 288, 1.9, 3.0), win(345, 410)], { ext: '-z' }),
    wall(0, 9, 9, 271.5, [win(95, 128), vent(150, 172)], { ext: '-x' }),
    wall(0, 271.5, 433, 280, [win(89, 126, 1.05, 2.1), win(215, 242), win(266, 296)], { ext: '+z' }),   // 8½″: the printed depths add up to 23′4½″
    wall(424, 9, 433, 271.5, [], { ext: '+x' }),
    // interior
    wall(134, 9, 138.5, 131, [door(98, 130, 'Guest bedroom', 'b', -1)]),
    wall(9, 131, 143, 135.5, [door(56, 85, 'Toilet', 'b', 1)]),
    wall(87, 135.5, 91.5, 183.5),
    wall(138.5, 135.5, 143, 183.5, [door(141, 178, 'Common toilet', 'a', -1)]),
    wall(9, 183.5, 143, 188),
    wall(54, 188, 58.5, 271.5, [door(192, 222, 'Utility', 'b', -1)]),
    wall(184, 183.5, 188.5, 271.5),
    wall(322, 9, 331, 271.5, [dbl(223, 265, 'Main door', -1)]),
  ],
  furniture: [
    { k: 'bed', x: 2.1, z: 1.244, rot: 0 },
    { k: 'nightstand', x: 1.1, z: 0.45, rot: 0 }, { k: 'nightstand', x: 3.1, z: 0.45, rot: 0 },
    { k: 'wardrobe', r: [0.229, 0.229, 0.8, 2.1], face: '+x' },
    { k: 'desk', x: 0.5, z: 2.75, w: 1.0, rot: Math.PI / 2 }, { k: 'chair', x: 1.05, z: 2.75, rot: -Math.PI / 2 },
    { k: 'wc', x: 0.55, z: 4.05, rot: Math.PI / 2 }, { k: 'basin', x: 1.85, z: 4.45, rot: Math.PI }, { k: 'shower', x: 1.3, z: 3.7 },
    { k: 'wc', x: 2.62, z: 4.05, rot: Math.PI / 2 }, { k: 'basin', x: 3.2, z: 3.67, rot: 0, small: true },
    { k: 'washer', x: 0.55, z: 6.55, rot: Math.PI },
    { k: 'counter', r: [1.486, 6.3, 4.674, 6.883], hob: [2.8, 6.6], sink: [3.9, 6.6], wall: '+z' },
    { k: 'counter', r: [1.486, 5.55, 2.06, 6.3], wall: '-x' },
    { k: 'fridge', x: 3.1, z: 5.12, rot: 0 },
    { k: 'sofa', x: 5.6, z: 6.455, w: 1.6, rot: Math.PI },
    { k: 'sofa', x: 5.213, z: 5.3, w: 1.5, rot: Math.PI / 2 },
    { k: 'coffee', x: 6.1, z: 5.55, w: 0.6, d: 1.05 },
    { k: 'rug', r: [5.6, 4.7, 7.4, 6.2], c: '#9c8b74' },
    { k: 'tvunit', x: 7.98, z: 5.0, w: 1.6, rot: -Math.PI / 2 },
    { k: 'dining', x: 5.45, z: 2.6, w: 1.6, d: 0.9 },
    { k: 'tall', r: [7.38, 0.229, 8.18, 0.85], face: '+z' },
    { k: 'plant', x: 7.9, z: 3.0, s: 1.2 }, { k: 'plant', x: 10.45, z: 6.55, s: 0.9 },
    { k: 'shoes', x: 10.6, z: 5.6, rot: -Math.PI / 2 },
  ],
  // Lobby staircase arrives here from the ground floor.
  slabHoles: [rect(331, 9, 424, 162)],
  railings: [[m(331), m(162), m(373), m(162)]],
  extraBlocks: [rect(331, 9, 424, 162), rect(138.5, 9, 174.5, 95), rect(174.5, 9, 290.5, 45), rect(254.5, 45, 290.5, 95)],
};

// ── Second floor ────────────────────────────────────────────────────────────
// Across: 9″ | master bedroom 10′5″ | 4½″ | living 13′5″ | 4½″ | bedroom 10′0″ | 9″  (= 36′1″)
// Front-to-back: 9″ | wardrobe / toilet 6′9½″ | 4½″ | bedrooms 10′11″ | 4½″ | balcony 3′9″ | railing
const second = {
  name: 'Second floor', short: '2nd', y: LEVEL_Y[2],
  blurb: 'Two bedroom suites, each with a walk-in wardrobe, toilet and balcony, either side of a living room with study desks and a pooja room lit from the skylight above.',
  rooms: [
    room('Master bedroom', '10′5″ × 10′11″', [9, 95, 134, 226], { f: 'wood', fan: true }),
    room('Walk-in wardrobe', '5′0″ × 6′9½″', [9, 9, 69, 90.5], { f: 'wood' }),
    room('Toilet', '5′0″ × 6′9½″', [73.5, 9, 133.5, 90.5], { f: 'bath' }),
    room('Balcony', '11′2″ × 3′9″', [0, 230.5, 134, 275.5], { f: 'deck' }),
    room('Living', '13′5″ × 11′0″', [138.5, 95, 299.5, 227], { f: null, fan: true }),
    room('Study', 'Two desks', [138.5, 227, 230, 271], { f: null }),
    room('Pooja', '5′5″ × 3′9″', [234.5, 226, 299.5, 271], { f: 'marble', noLights: true }),
    room('Bedroom', '10′0″ × 10′11″', [304, 95, 424, 226], { f: 'wood', fan: true }),
    room('Walk-in wardrobe', '4′9½″ × 6′9½″', [304, 9, 361.5, 90.5], { f: 'wood' }),
    room('Toilet', '4′10″ × 6′9½″', [366, 9, 424, 90.5], { f: 'bath' }),
    room('Balcony', '10′9″ × 3′9″', [304, 230.5, 433, 275.5], { f: 'deck' }),
    room('Staircase', 'Up to penthouse', [138.5, 9, 290.5, 95], { f: null, stair: true }),
  ],
  walls: [
    wall(0, 0, 433, 9, [vent(95, 120), win(141, 172, 1.2, 2.4), win(257, 288, 1.9, 3.0)], { ext: '-z' }),
    wall(0, 9, 9, 230.5, [win(200, 222)], { ext: '-x' }),
    wall(424, 9, 433, 230.5, [vent(40, 58), win(175, 218)], { ext: '+x' }),
    wall(134, 271, 230, 280, [win(150, 218, 0.75, 2.1)], { ext: '+z' }),
    wall(230, 271, 304, 280, [], { ext: '+z', wood: true }),
    // interior
    wall(9, 90.5, 134, 95, [open(32, 69, 2.1)]),
    wall(69, 9, 73.5, 90.5, [door(60, 89, 'Toilet', 'a', 1)]),
    wall(134, 9, 138.5, 271, [door(193, 224, 'Master bedroom', 'b', -1)]),
    wall(9, 226, 134, 230.5, [slide(30, 100, 'Balcony')], { ext: '+z' }),
    wall(290.5, 9, 304, 95),
    wall(299.5, 95, 304, 271, [door(192, 224, 'Bedroom', 'b', 1)]),
    wall(304, 90.5, 424, 95, [open(330, 361.5, 2.1)]),
    wall(361.5, 9, 366, 90.5, [door(60, 89, 'Toilet', 'a', 1)]),
    wall(304, 226, 424, 230.5, [slide(325, 390, 'Balcony')], { ext: '+z' }),
    wall(230, 226, 234.5, 271, [], { h: 2.4 }),
  ],
  parapets: [
    { r: rect(0, 275.5, 134, 280), glass: true }, { r: rect(0, 230.5, 3, 280), glass: true },
    { r: rect(304, 275.5, 433, 280), glass: true }, { r: rect(430, 230.5, 433, 280), glass: true },
  ],
  furniture: [
    { k: 'bed', x: 1.244, z: 4.1, rot: Math.PI / 2, king: true },
    { k: 'nightstand', x: 0.45, z: 2.9, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 5.3, rot: Math.PI / 2 },
    { k: 'tvunit', x: 3.2, z: 4.1, w: 1.6, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [0.229, 0.229, 0.8, 2.3], face: '+x' }, { k: 'wardrobe', r: [0.8, 0.229, 1.753, 0.8], face: '+z' },
    { k: 'wc', x: 3.1, z: 0.55, rot: -Math.PI / 2 }, { k: 'basin', x: 3.19, z: 1.9, rot: -Math.PI / 2 }, { k: 'shower', x: 2.2, z: 0.45 },
    { k: 'bed', x: 8.737, z: 3.9, rot: Math.PI / 2 },
    { k: 'nightstand', x: 7.95, z: 2.85, rot: Math.PI / 2 },
    { k: 'tvunit', x: 10.57, z: 3.7, w: 1.5, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [7.722, 0.229, 8.29, 2.3], face: '+x' }, { k: 'wardrobe', r: [8.29, 0.229, 9.182, 0.8], face: '+z' },
    { k: 'wc', x: 10.47, z: 0.6, rot: -Math.PI / 2 }, { k: 'basin', x: 10.56, z: 1.95, rot: -Math.PI / 2 }, { k: 'shower', x: 9.65, z: 0.45 },
    { k: 'desk', x: 4.15, z: 6.6, w: 1.15, rot: Math.PI }, { k: 'chair', x: 4.15, z: 6.05, rot: 0 },
    { k: 'desk', x: 5.3, z: 6.6, w: 1.0, rot: Math.PI }, { k: 'chair', x: 5.3, z: 6.05, rot: 0 },
    { k: 'sofa', x: 7.18, z: 4.05, w: 1.5, rot: -Math.PI / 2 },
    { k: 'armchair', x: 5.1, z: 3.85, rot: Math.PI / 2 + 0.35 }, { k: 'armchair', x: 5.1, z: 4.75, rot: Math.PI / 2 - 0.35 },
    { k: 'coffee', x: 6.15, z: 4.3, w: 0.6, d: 1.0 },
    { k: 'rug', r: [5.35, 3.4, 6.95, 5.2], c: '#a79377' },
    { k: 'pooja', x: 6.75, z: 6.68, rot: Math.PI },
    { k: 'plant', x: 0.5, z: 6.6, s: 0.8 }, { k: 'plant', x: 10.5, z: 6.6, s: 0.8 },
    { k: 'balconyChair', x: 2.6, z: 6.5, rot: Math.PI }, { k: 'balconyChair', x: 9.6, z: 6.5, rot: Math.PI },
  ],
  slabHoles: [rect(138.5, 9, 290.5, 95)],
  railings: [[m(174.5), m(95), m(254.5), m(95)]],
  extraBlocks: [rect(138.5, 9, 290.5, 95)],
};

// ── Penthouse ───────────────────────────────────────────────────────────────
// Left column repeats the second floor. Lobby 12′8″ × 4′0″ at the stair head;
// terrace 10′9″ wide along the right side and 10′8″ deep in front of the lobby.
const third = {
  name: 'Penthouse', short: 'Penthouse', y: LEVEL_Y[3],
  blurb: 'A private suite with walk-in wardrobe, toilet and balcony, a lobby at the top of the stairs and a large open terrace with a skylight over the pooja room.',
  rooms: [
    room('Bedroom', '10′5″ × 10′11″', [9, 95, 134, 226], { f: 'wood', fan: true }),
    room('Walk-in wardrobe', '5′0″ × 6′9½″', [9, 9, 69, 90.5], { f: 'wood' }),
    room('Toilet', '5′0″ × 6′9½″', [73.5, 9, 133.5, 90.5], { f: 'bath' }),
    room('Balcony', '11′2″ × 3′9″', [0, 230.5, 134, 275.5], { f: 'deck' }),
    room('Lobby', '12′8″ × 4′0″', [138.5, 95, 290.5, 143], { f: 'granite' }),
    room('Open terrace', '13′5″ × 10′8″ + 10′9″ × 23′4″', [138.5, 152, 428.5, 275.5], { f: 'terrace' }),
    room('Open terrace', '10′9″ × 23′4″', [299.5, 4.5, 428.5, 152], { f: 'terrace', noLabel: true }),
    room('Staircase', 'Down to second floor', [138.5, 9, 290.5, 95], { f: null, stair: true }),
  ],
  walls: [
    wall(0, 0, 299.5, 9, [vent(95, 118), win(141, 172, 1.2, 2.4), win(257, 288, 1.2, 2.4)], { ext: '-z' }),
    wall(0, 9, 9, 230.5, [win(102, 125)], { ext: '-x' }),
    // interior
    wall(9, 90.5, 134, 95, [open(32, 69, 2.1)]),
    wall(69, 9, 73.5, 90.5, [door(62, 89, 'Toilet', 'a', 1)]),
    wall(134, 9, 138.5, 275.5, [door(98, 129, 'Bedroom', 'a', -1)], { ext: '+x' }),
    wall(9, 226, 134, 230.5, [slide(30, 98, 'Balcony')], { ext: '+z' }),
    wall(290.5, 9, 299.5, 152, [], { ext: '+x' }),
    wall(138.5, 143, 290.5, 152, [slide(175, 243, 'Terrace')], { ext: '+z' }),
  ],
  parapets: [
    { r: rect(0, 275.5, 134, 280), glass: true }, { r: rect(0, 230.5, 3, 280), glass: true },
    { r: rect(138.5, 275.5, 433, 280) }, { r: rect(428.5, 0, 433, 280) }, { r: rect(299.5, 0, 433, 4.5) },
  ],
  furniture: [
    { k: 'bed', x: 1.244, z: 4.1, rot: Math.PI / 2, king: true },
    { k: 'nightstand', x: 0.45, z: 2.9, rot: Math.PI / 2 }, { k: 'nightstand', x: 0.45, z: 5.3, rot: Math.PI / 2 },
    { k: 'tvunit', x: 3.2, z: 4.2, w: 1.5, rot: -Math.PI / 2 },
    { k: 'wardrobe', r: [0.229, 0.229, 0.8, 2.3], face: '+x' }, { k: 'wardrobe', r: [0.8, 0.229, 1.753, 0.8], face: '+z' },
    { k: 'wc', x: 3.1, z: 0.55, rot: -Math.PI / 2 }, { k: 'basin', x: 3.19, z: 1.85, rot: -Math.PI / 2 }, { k: 'shower', x: 2.2, z: 0.45 },
    { k: 'balconyChair', x: 2.6, z: 6.5, rot: Math.PI }, { k: 'plant', x: 0.5, z: 6.6, s: 0.8 },
    { k: 'swing', x: 9.3, z: 1.6, rot: Math.PI / 2 },
    { k: 'outdoorSet', x: 9.6, z: 5.5 },
    { k: 'lounger', x: 4.6, z: 5.6, rot: 0 }, { k: 'lounger', x: 5.4, z: 5.6, rot: 0 },
    { k: 'planter', r: [3.65, 6.7, 6.1, 6.98] }, { k: 'planter', r: [7.9, 6.7, 10.8, 6.98] }, { k: 'planter', r: [10.55, 2.0, 10.86, 4.2] },
    { k: 'skylight', r: [m(246.5), m(216), m(295), m(270)] },
    { k: 'ladder', x: 7.65, z: 1.45 },
  ],
  slabHoles: [rect(138.5, 9, 290.5, 95), rect(246.5, 216, 295, 270)],
  railings: [[m(138.5), m(95), m(254.5), m(95)]],
  extraBlocks: [rect(138.5, 9, 290.5, 95)],
};

export const FLOORS = [ground, first, second, third];

// Roof over the penthouse rooms (upper terrace sheet): L-shaped slab with a 1′ parapet.
export const ROOF = {
  outline: [[0, 0], [m(299.5), 0], [m(299.5), m(152)], [m(138.5), m(152)], [m(138.5), D], [0, D]],
  tank: [1.2, 1.35],
};
export const GROUND_OUTLINE = [[BUMP, m(141)], [0, m(141)], [0, 0], [W, 0], [W, D], [BUMP, D]];

// Stairs. Paths are [x, z, rise-fraction] along the walking line; flights render treads.
// Internal U-stair: three 3′ flights around a well, core 12′8″ × 7′2″.
const r = 1 / 22;
const [A1, A2, C1, C2, B2, EDGE] = [m(138.5), m(174.5), m(254.5), m(290.5), m(45), m(95)];
const AX = (A1 + A2) / 2, CX = (C1 + C2) / 2, WZ = m(27), MZ = m(27);
const internal = (base) => ({
  id: 'internal-' + base, from: base, to: base + 1,
  bottom: { x: AX, z: EDGE + 0.44, yaw: Math.PI }, top: { x: CX, z: EDGE + 0.44, yaw: 0 },
  bottomTrigger: [A1, EDGE - 0.3, A2, EDGE + 0.37], topTrigger: [C1, EDGE - 0.3, C2, EDGE + 0.37],
  path: [[AX, EDGE + 0.44, 0], [AX, EDGE, 0], [AX, B2, 5 * r], [AX, WZ, 6.5 * r], [A2, MZ, 7 * r],
    [C1, MZ, 15 * r], [CX, MZ, 16.5 * r], [CX, B2, 17 * r], [CX, EDGE, 1], [CX, EDGE + 0.44, 1]],
  flights: [
    { axis: 'z', x1: A1, x2: A2, s0: EDGE, s1: B2, k0: 1, n: 5, rail: A2 },
    { rect: [A1, WZ, A2, B2], k: 6 }, { rect: [A1, m(9), A2, WZ], k: 7 },
    { axis: 'x', z1: m(9), z2: B2, s0: A2, s1: C1, k0: 8, n: 8, rail: B2 },
    { rect: [C1, m(9), C2, WZ], k: 16 }, { rect: [C1, WZ, C2, B2], k: 17 },
    { axis: 'z', x1: C1, x2: C2, s0: B2, s1: EDGE, k0: 18, n: 4, rail: C1 },
  ],
});
// Lobby stair: two 3′6″ flights with a 9″ well and a landing at the back wall.
const [L1, L2, L3, L4, LAND, LEND] = [m(331), m(373), m(382), m(424), m(51), m(162)];
export const STAIRS = [
  {
    id: 'lobby', from: 0, to: 1,
    bottom: { x: (L1 + L2) / 2, z: LEND + 0.44, yaw: Math.PI }, top: { x: (L3 + L4) / 2, z: LEND + 0.44, yaw: 0 },
    bottomTrigger: [L1, LEND - 0.3, L2, LEND + 0.37], topTrigger: [L3, LEND - 0.3, L4, LEND + 0.37],
    path: [[(L1 + L2) / 2, LEND + 0.44, 0], [(L1 + L2) / 2, LEND, 0], [(L1 + L2) / 2, LAND, 10 * r], [(L1 + L2) / 2, LAND / 2 + 0.1, 11 * r],
      [(L3 + L4) / 2, LAND / 2 + 0.1, 11 * r], [(L3 + L4) / 2, LAND, 12 * r], [(L3 + L4) / 2, LEND, 1], [(L3 + L4) / 2, LEND + 0.44, 1]],
    flights: [
      { axis: 'z', x1: L1, x2: L2, s0: LEND, s1: LAND, k0: 1, n: 10, rail: L2 },
      { rect: [L1, m(9), L4, LAND], k: 11 },
      { axis: 'z', x1: L3, x2: L4, s0: LAND, s1: LEND, k0: 12, n: 10, rail: L3 },
    ],
  },
  internal(1), internal(2),
];

// Viewpoints for the guided tour: level, standing point, facing direction, caption.
export const TOUR = [
  { l: 0, x: 6.6, z: 12.2, look: [6.0, 5.5, 3.5], t: 'Welcome to the Shelar Residence', s: 'Four floors on a 36′1″ × 23′4″ footprint, facing the road. Parking and the entrance lobby are at street level.' },
  { l: 0, x: 6.0, z: 6.4, look: [6.6, 1.0, 2.0], t: 'Covered parking', s: 'Space for one car and two bikes, open to the road. The parking level is 6″ below the house plinth.' },
  { l: 0, x: 9.6, z: 6.1, look: [9.6, 1.4, 2.0], t: 'Entrance lobby', s: 'The 8′5½″ × 9′1″ lobby opens off the parking. Its staircase goes up to the first-floor family home.' },
  { l: 0, x: 3.2, z: 5.65, look: [1.0, 1.2, 4.6], t: 'Ground floor · Hall and kitchen', s: 'A separate ground-floor unit. Its main door opens from the parking into the 13′4½″ × 10′5½″ hall with an open kitchen and utility.' },
  { l: 0, x: 2.6, z: 3.05, look: [1.0, 1.0, 1.4], t: 'Ground floor · Bedroom', s: '10′0″ × 11′0″ bedroom with a dressing area and attached toilet.' },
  { l: 1, x: 7.6, z: 6.15, look: [5.2, 1.3, 5.2], t: 'First floor · Living room', s: 'Through the main door from the lobby. Sofa seating faces the TV wall.' },
  { l: 1, x: 6.2, z: 4.4, look: [5.5, 2.6, 1.6], t: 'Dining under the stair void', s: 'The dining table sits beneath an open void that rises through the U-shaped staircase.' },
  { l: 1, x: 4.1, z: 4.3, look: [2.8, 1.0, 6.6], t: 'Kitchen and utility', s: '10′5½″ × 6′11½″ kitchen with granite counters, hob, sink and fridge. The utility is behind the side door.' },
  { l: 1, x: 2.9, z: 2.95, look: [1.6, 1.0, 1.0], t: 'Guest bedroom', s: '10′5″ × 10′2″ with wardrobe, study desk and its own toilet.' },
  { l: 2, x: 6.3, z: 3.0, look: [6.8, 1.3, 6.8], t: 'Second floor · Living and pooja', s: 'A 13′5″ × 11′0″ family lounge with two study desks. The pooja room is lit by the skylight in the terrace above.' },
  { l: 2, x: 2.8, z: 5.25, look: [0.9, 1.0, 3.8], t: 'Master bedroom', s: '10′5″ × 10′11″ with king bed, walk-in wardrobe, attached toilet and a balcony facing the road.' },
  { l: 2, x: 8.3, z: 5.3, look: [9.6, 1.0, 3.6], t: 'Second bedroom', s: '10′0″ × 10′11″ suite with walk-in wardrobe, toilet and its own balcony.' },
  { l: 3, x: 5.6, z: 3.05, look: [7.0, 1.0, 5.5], t: 'Penthouse lobby', s: 'The staircase ends in a 12′8″ × 4′0″ lobby with a sliding door onto the open terrace.' },
  { l: 3, x: 8.0, z: 3.6, look: [6.0, 0.6, 6.0], t: 'Open terrace', s: 'A large open terrace with a swing, seating and the skylight over the pooja room.' },
  { l: 3, x: 2.8, z: 5.25, look: [0.9, 1.0, 3.8], t: 'Penthouse bedroom', s: 'A private 10′5″ × 10′11″ suite with walk-in wardrobe, toilet and balcony.' },
];

// Where "go to floor" lands you in walk mode.
export const ARRIVAL = [
  { x: 6.6, z: 9.8, yaw: Math.PI },
  { x: 7.6, z: 6.15, yaw: -Math.PI / 2 - 0.5 },
  { x: 6.0, z: 3.4, yaw: Math.PI * 0.85 },
  { x: 5.6, z: 3.05, yaw: 0.3 },
];
