import { W, D, LEVEL_Y, PARKING_Y, PARKING_X, BUMP, STOREY, STAIRS, FLOORS } from './plan.js';

// A walkable-cell grid per storey. Cells are 10 cm; the grid is inflated by the
// walker's radius so a path through free cells never clips a wall.
const CELL = 0.1, RADIUS = 0.2;
const X0 = -1.5, Z0 = -1.5, X1 = W + 1.5, Z1 = 22;
const NX = Math.ceil((X1 - X0) / CELL), NZ = Math.ceil((Z1 - Z0) / CELL);
export const PLOT_FRONT = D + 0.36;
const ROAD_Z = PLOT_FRONT + 1.2;

class Grid {
  constructor(level) { this.level = level; this.raw = new Uint8Array(NX * NZ).fill(1); this.free = null; }
  cell(x, z) { return [Math.floor((x - X0) / CELL), Math.floor((z - Z0) / CELL)]; }
  set(r, v) {
    const [a, b] = this.cell(Math.min(r[0], r[2]), Math.min(r[1], r[3])), [c, d] = this.cell(Math.max(r[0], r[2]) - 1e-6, Math.max(r[1], r[3]) - 1e-6);
    for (let j = Math.max(0, b); j <= Math.min(NZ - 1, d); j++) for (let i = Math.max(0, a); i <= Math.min(NX - 1, c); i++) this.raw[j * NX + i] = v;
  }
  inflate() {
    const n = Math.ceil(RADIUS / CELL), out = new Uint8Array(NX * NZ), offs = [];
    for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) if (Math.hypot(di, dj) * CELL <= RADIUS + 0.01) offs.push([di, dj]);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      if (this.raw[j * NX + i]) { out[j * NX + i] = 1; continue; }
      for (const [di, dj] of offs) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ || this.raw[jj * NX + ii]) { out[j * NX + i] = 1; break; } }
    }
    this.free = out;
  }
  ok(x, z) { const [i, j] = this.cell(x, z); return i >= 0 && j >= 0 && i < NX && j < NZ && !this.free[j * NX + i]; }
  okCell(i, j) { return i >= 0 && j >= 0 && i < NX && j < NZ && !this.free[j * NX + i]; }
  center(i, j) { return [X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL]; }
  nearest(x, z, max = 2.5) {
    if (this.ok(x, z)) return [x, z];
    const [ci, cj] = this.cell(x, z), R = Math.ceil(max / CELL);
    for (let r = 1; r <= R; r++) {
      let best = null, bd = Infinity;
      for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || !this.okCell(i, j)) continue;
        const [px, pz] = this.center(i, j), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = [px, pz]; }
      }
      if (best) return best;
    }
    return null;
  }
  los(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / (CELL * 0.5));
    for (let k = 0; k <= n; k++) { const t = k / n; if (!this.ok(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  path(ax, az, bx, bz) {
    const s = this.nearest(ax, az, 1), e = this.nearest(bx, bz, 3);
    if (!s || !e) return null;
    const [si, sj] = this.cell(...s), [ei, ej] = this.cell(...e), start = sj * NX + si, goal = ej * NX + ei;
    const g = new Float32Array(NX * NZ).fill(Infinity), from = new Int32Array(NX * NZ).fill(-1), closed = new Uint8Array(NX * NZ);
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const h = (k) => { const dx = Math.abs((k % NX) - ei), dz = Math.abs(Math.floor(k / NX) - ej); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    g[start] = 0; push(start, h(start));
    let found = false, guard = 0;
    while (heap.length && guard++ < 200000) {
      const k = pop(); if (closed[k]) continue; closed[k] = 1; if (k === goal) { found = true; break; }
      const i = k % NX, j = Math.floor(k / NX);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (!this.okCell(ii, jj)) continue;
        if (di && dj && (!this.okCell(i + di, j) || !this.okCell(i, j + dj))) continue;
        const nk = jj * NX + ii, ng = g[k] + (di && dj ? 1.414 : 1);
        if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + h(nk)); }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = goal; k !== -1; k = from[k]) cells.push(this.center(k % NX, Math.floor(k / NX)));
    cells.reverse(); cells[0] = s; cells[cells.length - 1] = e;
    // string-pull to straight segments
    const out = [cells[0]]; let anchor = 0;
    for (let i = 2; i < cells.length; i++) if (!this.los(...cells[anchor], ...cells[i])) { out.push(cells[i - 1]); anchor = i - 1; }
    out.push(cells[cells.length - 1]);
    return out;
  }
}

export function buildNav(floorBuilders, withFurniture = true) {
  const grids = [];
  for (const fb of floorBuilders) {
    const grid = new Grid(fb.i), p = FLOORS[fb.i];
    // open the storey's own footprint, then the street-front at ground level
    grid.set([0.02, 0.02, W - 0.02, D - 0.02], 0);
    if (fb.i === 0) {
      grid.set([BUMP + 0.02, 3.6, 0.02, D - 0.02], 0);
      grid.set([PARKING_X[0], D - 0.05, PARKING_X[1], ROAD_Z], 0);   // gate and driveway
      grid.set([-1.4, ROAD_Z, W + 1.4, Z1 - 0.2], 0);       // the road
    }
    for (const r of fb.walls) grid.set(r, 1);
    for (const r of fb.obstacles) grid.set(r, 1);
    if (withFurniture) for (const r of fb.furnObstacles) grid.set(r, 1);
    for (const r of p.extraBlocks || []) grid.set(r, 1);
    grid.inflate();
    grids.push(grid);
  }
  return grids;
}

export function groundY(level, x, z) {
  if (level > 0) return LEVEL_Y[level];
  if (z > D - 0.02) { if (z <= D + 0.05) return PARKING_Y; const t = Math.min(1, (z - D) / (ROAD_Z - D)); return PARKING_Y * (1 - t); }
  if (x > PARKING_X[0] && x < PARKING_X[1]) return PARKING_Y;
  return LEVEL_Y[0];
}

const inRect = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];

// Stair rides follow the walking line of the flights; heights are interpolated.
export function stairRide(stair, up) {
  const pts = stair.path.map(([x, z, f]) => [x, z, LEVEL_Y[stair.from] + f * STOREY]);
  if (!up) pts.reverse();
  const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  return { stair, up, pts, lens, total: lens[lens.length - 1], s: 0 };
}
export function sampleRide(ride, s) {
  const { pts, lens } = ride; let i = 1; while (i < lens.length - 1 && lens[i] < s) i++;
  const t = Math.max(0, Math.min(1, (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1))), a = pts[i - 1], b = pts[i];
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: a[2] + (b[2] - a[2]) * t, dx: b[0] - a[0], dz: b[1] - a[1], dy: b[2] - a[2] };
}

// Which stair (if any) the walker is stepping onto, and in which direction.
export function stairTrigger(level, x, z, dx, dz) {
  const towards = -dz / (Math.hypot(dx, dz) || 1) > 0.5;   // heading into the stair (−Z)
  for (const s of STAIRS) {
    if (s.from === level && inRect(s.bottomTrigger, x, z) && towards) return { stair: s, up: true };
    if (s.to === level && inRect(s.topTrigger, x, z) && towards) return { stair: s, up: false };
  }
  return null;
}

// Route across storeys: walk to a stair, ride it, repeat, then walk to the goal.
export function planRoute(grids, from, to) {
  const legs = []; let cur = { ...from };
  for (let guard = 0; cur.level !== to.level && guard < 6; guard++) {
    const up = to.level > cur.level;
    const stair = STAIRS.find((s) => (up ? s.from === cur.level : s.to === cur.level));
    const entry = up ? stair.bottom : stair.top, exit = up ? stair.top : stair.bottom;
    const path = grids[cur.level].path(cur.x, cur.z, entry.x, entry.z);
    if (!path) return null;
    legs.push({ type: 'walk', level: cur.level, path }, { type: 'stair', stair, up });
    cur = { level: up ? stair.to : stair.from, x: exit.x, z: exit.z };
  }
  const path = grids[to.level].path(cur.x, cur.z, to.x, to.z);
  if (!path) return null;
  legs.push({ type: 'walk', level: to.level, path });
  return legs;
}

export { inRect };
