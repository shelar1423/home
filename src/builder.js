import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { W, D, STOREY, SLAB, LEVEL_Y, ROOF_Y, PARKING_Y, FLOORS, ROOF, STAIRS } from './plan.js';

export const CEIL = STOREY - SLAB;   // clear height of a room
export const CUT = 1.5;               // dollhouse section height above each floor
const RISE = STOREY / 22;

// Planar UVs in metres so every texture keeps its real-world scale.
function worldUV(g, metres) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, k = 1 / metres;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) * k, p.getZ(i) * k);
    else if (ax >= az) uv.setXY(i, p.getZ(i) * k, p.getY(i) * k);
    else uv.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
}

// Collects static geometry by material and merges it into a few draw calls.
class Batch {
  constructor() { this.parts = new Map(); }
  add(g, mat) { if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(g.index ? g.toNonIndexed() : g); }
  build(group, { shadows = true } = {}) {
    for (const [mat, list] of this.parts) {
      for (const g of list) { g.clearGroups(); worldUV(g, mat.userData.metres || 1); }
      const merged = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(merged, mat);
      const glowing = mat.emissive && mat.emissive.getHex() !== 0 && mat.emissiveIntensity > 0.5;
      const transparent = mat.transparent || glowing;
      mesh.castShadow = shadows && !transparent; mesh.receiveShadow = !transparent;
      group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
  }
}

// A local frame for one piece of furniture: position, rotation, and helpers.
class Item {
  constructor(fb, x, z, rot = 0, y = 0) { this.fb = fb; this.rot = rot; this.x = x; this.z = z; this.m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z); }
  put(g, mat, batch = this.fb.batch) { g.applyMatrix4(this.m); batch.add(g, mat); return g; }
  box(cx, cy, cz, w, h, d, mat) { const g = new THREE.BoxGeometry(w, h, d); g.translate(cx, cy, cz); return this.put(g, mat); }
  cyl(cx, cy, cz, r1, r2, h, mat, seg = 18) { const g = new THREE.CylinderGeometry(r1, r2, h, seg); g.translate(cx, cy, cz); return this.put(g, mat); }
  cylX(cx, cy, cz, r, len, mat, seg = 18) { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); g.translate(cx, cy, cz); return this.put(g, mat); }
  cylZ(cx, cy, cz, r, len, mat, seg = 18) { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); g.translate(cx, cy, cz); return this.put(g, mat); }
  sphere(cx, cy, cz, r, mat, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 14, 10); g.scale(sx, sy, sz); g.translate(cx, cy, cz); return this.put(g, mat); }
  torusX(cx, cy, cz, r, t, mat) { const g = new THREE.TorusGeometry(r, t, 8, 22); g.rotateY(Math.PI / 2); g.translate(cx, cy, cz); return this.put(g, mat); }
  // Rod between two local points.
  rod(a, b, r, mat) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r, r, len, 8);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return this.put(g, mat);
  }
  block(w, d, cx = 0, cz = 0) {
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    const px = this.x + cx * c + cz * s, pz = this.z - cx * s + cz * c;
    const hw = (Math.abs(w * c) + Math.abs(d * s)) / 2, hd = (Math.abs(w * s) + Math.abs(d * c)) / 2;
    this.fb.obstacles.push([px - hw, pz - hd, px + hw, pz + hd]);
  }
}

const faceRot = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
function rectItem(fb, r, face) {
  const [x1, z1, x2, z2] = r, rot = faceRot[face], alongX = face === '+z' || face === '-z';
  return { it: new Item(fb, (x1 + x2) / 2, (z1 + z2) / 2, rot), w: alongX ? x2 - x1 : z2 - z1, d: alongX ? z2 - z1 : x2 - x1 };
}

// ── Furniture ───────────────────────────────────────────────────────────────
const F = {
  bed(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot), w = o.king ? 1.83 : 1.52, l = 2.03;
    it.box(0, 0.17, 0.02, w + 0.06, 0.24, l, M.darkWood);
    it.box(0, 0.39, 0.03, w - 0.03, 0.22, l - 0.06, M.linen);
    it.box(0, 0.515, 0.3, w + 0.03, 0.05, l - 0.6, M.duvet);
    it.box(0, 0.47, l / 2 - 0.05, w + 0.03, 0.12, 0.06, M.duvet);
    for (const s of [-1, 1]) it.box(s * w * 0.24, 0.57, -l / 2 + 0.28, w * 0.42, 0.13, 0.36, M.linen);
    it.box(0, 0.62, -l / 2 + 0.47, w * 0.55, 0.12, 0.25, M.fabricMustard);
    it.box(0, 0.78, -l / 2 - 0.02, w + 0.2, 1.0, 0.08, M.fabricBeige);
    it.box(0, 1.3, -l / 2 - 0.03, w + 0.28, 0.05, 0.1, M.darkWood);
    it.block(w + 0.1, l + 0.08);
  },
  nightstand(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.26, 0, 0.45, 0.48, 0.4, M.lightWood); it.box(0, 0.36, 0.2, 0.36, 0.01, 0.01, M.darkWood);
    it.cyl(0, 0.56, 0, 0.06, 0.08, 0.14, M.brass); it.cyl(0, 0.72, 0, 0.1, 0.15, 0.18, M.lamp);
    it.block(0.45, 0.4);
  },
  wardrobe(fb, o, M, tall = false) {
    const { it, w, d } = rectItem(fb, o.r, o.face), h = 2.25;
    it.box(0, h / 2 + 0.05, 0, w, h - 0.1, d, tall ? M.lightWood : M.laminate);
    it.box(0, 0.04, 0, w - 0.04, 0.08, d - 0.04, M.black);
    const n = Math.max(1, Math.round(w / 0.5));
    for (let i = 1; i < n; i++) it.box(-w / 2 + (w * i) / n, h / 2 + 0.05, d / 2 + 0.002, 0.01, h - 0.12, 0.005, M.laminateDark);
    for (let i = 0; i < n; i++) { const cx = -w / 2 + (w * (i + 0.5)) / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06); it.box(cx, 1.15, d / 2 + 0.02, 0.018, 0.5, 0.025, M.chrome); }
    fb.obstacles.push([...o.r]);
  },
  tall(fb, o, M) { F.wardrobe(fb, o, M, true); },
  desk(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot), w = o.w || 1.1;
    it.box(0, 0.74, 0, w, 0.04, 0.55, M.lightWood);
    for (const s of [-1, 1]) it.box(s * (w / 2 - 0.02), 0.37, 0, 0.04, 0.72, 0.52, M.lightWood);
    it.box(0.1, 0.77, 0.02, 0.34, 0.02, 0.24, M.black); it.box(0.1, 0.88, -0.1, 0.34, 0.22, 0.015, M.screen);
    it.cyl(-w / 2 + 0.16, 0.78, -0.12, 0.06, 0.06, 0.03, M.black); it.rod([-w / 2 + 0.16, 0.78, -0.12], [-w / 2 + 0.2, 1.12, -0.05], 0.01, M.black);
    it.cyl(-w / 2 + 0.22, 1.12, -0.02, 0.03, 0.07, 0.08, M.lamp);
    it.block(w, 0.55);
  },
  chair(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.47, 0, 0.48, 0.07, 0.46, M.fabricGrey); it.box(0, 0.8, -0.22, 0.44, 0.52, 0.05, M.fabricGrey);
    it.cyl(0, 0.24, 0, 0.025, 0.025, 0.44, M.chrome); it.cyl(0, 0.04, 0, 0.27, 0.27, 0.03, M.black, 5);
    it.block(0.5, 0.5);
  },
  sofa(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot), w = o.w || 2, d = 0.85, fab = o.fabric || M.fabricBeige;
    it.box(0, 0.1, 0, w, 0.1, d - 0.05, M.black);
    it.box(0, 0.26, 0.03, w - 0.2, 0.22, d - 0.1, fab);
    const n = w > 1.7 ? 3 : 2;
    for (let i = 0; i < n; i++) it.box(-w / 2 + 0.1 + ((w - 0.2) * (i + 0.5)) / n, 0.43, 0.06, (w - 0.2) / n - 0.02, 0.12, d - 0.2, fab);
    it.box(0, 0.6, -d / 2 + 0.1, w, 0.62, 0.2, fab);
    for (const s of [-1, 1]) it.box(s * (w / 2 - 0.08), 0.45, 0, 0.16, 0.5, d, fab);
    it.box(-w / 2 + 0.38, 0.62, -d / 2 + 0.26, 0.38, 0.34, 0.12, M.fabricTeal);
    it.box(w / 2 - 0.38, 0.62, -d / 2 + 0.26, 0.38, 0.34, 0.12, M.fabricMustard);
    it.block(w, d);
  },
  armchair(fb, o, M) { F.sofa(fb, { ...o, w: 0.85, fabric: M.fabricTeal }, M); },
  coffee(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot || 0), w = o.w, d = o.d;
    it.box(0, 0.4, 0, w, 0.04, d, M.lightWood); it.box(0, 0.12, 0, w - 0.08, 0.02, d - 0.08, M.lightWood);
    for (const a of [-1, 1]) for (const b of [-1, 1]) it.box(a * (w / 2 - 0.05), 0.2, b * (d / 2 - 0.05), 0.03, 0.4, 0.03, M.black);
    it.cyl(0.05, 0.47, -0.1, 0.07, 0.05, 0.1, M.porcelain); it.sphere(0.05, 0.56, -0.1, 0.08, M.leaf, 1, 0.8, 1);
    it.block(w, d);
  },
  rug(fb, o, M) {
    const [x1, z1, x2, z2] = o.r, it = new Item(fb, 0, 0);
    it.box((x1 + x2) / 2, 0.018, (z1 + z2) / 2, x2 - x1, 0.012, z2 - z1, fb.rugMat(o.c));
    it.box((x1 + x2) / 2, 0.019, (z1 + z2) / 2, x2 - x1 - 0.2, 0.012, z2 - z1 - 0.2, fb.rugMat('#ece3d3'));
    it.box((x1 + x2) / 2, 0.02, (z1 + z2) / 2, x2 - x1 - 0.3, 0.012, z2 - z1 - 0.3, fb.rugMat(o.c));
  },
  tvunit(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot), w = o.w || 1.6;
    it.box(0, 1.35, -0.19, w + 0.5, 2.5, 0.04, M.woodClad);
    it.box(0, 0.32, -0.02, w, 0.36, 0.4, M.laminateDark); it.box(0, 0.13, -0.02, w - 0.1, 0.02, 0.36, M.black);
    it.box(0, 1.28, -0.15, 1.25, 0.73, 0.04, M.black); it.box(0, 1.28, -0.128, 1.2, 0.68, 0.005, M.screen);
    it.box(-w / 2 + 0.2, 0.62, -0.02, 0.1, 0.22, 0.1, M.porcelain);
    it.block(w, 0.45);
  },
  counter(fb, o, M) {
    const [x1, z1, x2, z2] = o.r, it = new Item(fb, 0, 0), t = 0.04;
    it.box((x1 + x2) / 2, 0.05, (z1 + z2) / 2, x2 - x1 - 0.06, 0.1, z2 - z1 - 0.06, M.black);
    it.box((x1 + x2) / 2, 0.47, (z1 + z2) / 2, x2 - x1, 0.74, z2 - z1, M.kitchenBlue);
    it.box((x1 + x2) / 2, 0.86 + t / 2, (z1 + z2) / 2, x2 - x1 + 0.02, t, z2 - z1 + 0.02, M.granite);
    // backsplash on the wall side
    const bs = { '+z': [x1, z2 - 0.01, x2, z2], '-z': [x1, z1, x2, z1 + 0.01], '-x': [x1, z1, x1 + 0.01, z2], '+x': [x2 - 0.01, z1, x2, z2] }[o.wall];
    if (bs) it.box((bs[0] + bs[2]) / 2, 0.98, (bs[1] + bs[3]) / 2, bs[2] - bs[0], 0.2, bs[3] - bs[1], M.granite);
    if (o.hob) { const [hx, hz] = o.hob; it.box(hx, 0.905, hz, 0.7, 0.012, 0.48, M.black); for (const a of [-1, 1]) for (const b of [-1, 1]) it.cyl(hx + a * 0.17, 0.915, hz + b * 0.11, 0.07, 0.07, 0.01, M.steel); }
    if (o.sink) { const [sx, sz] = o.sink; it.box(sx, 0.9, sz, 0.62, 0.012, 0.44, M.steel); it.box(sx, 0.86, sz, 0.52, 0.03, 0.36, M.black); it.cyl(sx, 1.02, sz + (o.wall === '+z' ? 0.2 : -0.2), 0.015, 0.015, 0.26, M.chrome); }
    fb.obstacles.push([x1, z1, x2, z2]);
  },
  fridge(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.92, 0, 0.7, 1.82, 0.68, M.steel); it.box(0, 1.25, 0.342, 0.7, 0.006, 0.006, M.black);
    for (const y of [0.85, 1.5]) it.box(0.28, y, 0.36, 0.025, 0.4, 0.03, M.chrome);
    it.block(0.7, 0.68);
  },
  washer(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.43, 0, 0.6, 0.85, 0.6, M.white); it.torusX(0, 0.4, 0.3, 0.18, 0.025, M.chrome);
    it.cylZ(0, 0.4, 0.29, 0.17, 0.02, M.glass);
    it.block(0.6, 0.6);
  },
  wc(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.6, -0.27, 0.42, 0.5, 0.16, M.porcelain);
    it.cyl(0, 0.2, 0.02, 0.19, 0.16, 0.4, M.porcelain);
    it.cyl(0, 0.41, 0.04, 0.2, 0.2, 0.03, M.white);
    it.box(0, 0.86, -0.27, 0.08, 0.02, 0.06, M.chrome);
    it.block(0.45, 0.65, 0, -0.05);
  },
  basin(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot), w = o.small ? 0.45 : 0.6;
    it.box(0, 0.68, 0, w, 0.32, 0.42, M.lightWood);
    it.box(0, 0.86, 0.01, w - 0.02, 0.06, 0.4, M.porcelain); it.box(0, 0.885, 0.03, w - 0.18, 0.02, 0.26, M.water);
    it.cyl(0, 0.98, -0.16, 0.014, 0.014, 0.18, M.chrome); it.box(0, 1.06, -0.12, 0.02, 0.02, 0.1, M.chrome);
    it.box(0, 1.55, -0.205, w, 0.75, 0.01, M.chrome);
    it.block(w, 0.42);
  },
  shower(fb, o, M) {
    const it = new Item(fb, o.x, o.z);
    it.cyl(0, 2.05, 0, 0.11, 0.11, 0.02, M.chrome); it.cyl(0, 1.5, 0, 0.012, 0.012, 1.1, M.chrome);
    it.box(0, 1.1, 0, 0.12, 0.06, 0.04, M.chrome);
  },
  car(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.5, 0, 1.76, 0.5, 4.3, M.carPaint);
    it.box(0, 0.68, 1.55, 1.7, 0.18, 1.1, M.carPaint);
    it.box(0, 0.98, -0.25, 1.58, 0.5, 2.25, M.carPaint);
    it.box(0, 0.98, 0.88, 1.5, 0.44, 0.02, M.glass); it.box(0, 0.98, -1.38, 1.5, 0.42, 0.02, M.glass);
    for (const s of [-1, 1]) {
      it.box(s * 0.792, 0.99, -0.25, 0.01, 0.4, 2.1, M.screen);
      for (const zz of [1.35, -1.3]) { it.cylX(s * 0.78, 0.33, zz, 0.33, 0.22, M.tyre, 22); it.cylX(s * 0.895, 0.33, zz, 0.2, 0.01, M.rim, 18); }
      it.box(s * 0.62, 0.62, 2.15, 0.36, 0.12, 0.02, M.lamp); it.box(s * 0.65, 0.66, -2.15, 0.34, 0.1, 0.02, M.redLight);
    }
    it.box(0, 0.32, 2.16, 1.6, 0.14, 0.04, M.black); it.box(0, 0.32, -2.16, 1.6, 0.14, 0.04, M.black);
    it.block(1.8, 4.35);
  },
  bike(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    for (const zz of [0.68, -0.68]) { const g = new THREE.TorusGeometry(0.3, 0.07, 8, 20); g.rotateY(Math.PI / 2); g.translate(0, 0.32, zz); it.put(g, M.tyre); }
    it.box(0, 0.6, 0.05, 0.3, 0.32, 0.8, M.bikePaint); it.box(0, 0.82, -0.25, 0.28, 0.1, 0.62, M.black);
    it.rod([0, 0.35, 0.68], [0, 0.95, 0.5], 0.03, M.chrome); it.rod([-0.36, 1.0, 0.48], [0.36, 1.0, 0.48], 0.016, M.black);
    it.block(0.75, 2.0);
  },
  plant(fb, o, M) {
    const it = new Item(fb, o.x, o.z), s = o.s || 1;
    it.cyl(0, 0.22 * s, 0, 0.2 * s, 0.15 * s, 0.44 * s, M.pot);
    for (let i = 0; i < 6; i++) { const a = i * 1.2; it.sphere(Math.sin(a) * 0.12 * s, (0.62 + (i % 3) * 0.18) * s, Math.cos(a) * 0.12 * s, 0.2 * s, i % 2 ? M.leaf : M.leafDark, 0.9, 1.4, 0.9); }
    it.block(0.45 * s, 0.45 * s);
  },
  shoes(fb, o, M) { const it = new Item(fb, o.x, o.z, o.rot); it.box(0, 0.45, 0, 1.0, 0.9, 0.35, M.lightWood); it.box(0, 0.905, 0, 1.0, 0.01, 0.35, M.darkWood); it.block(1.0, 0.36); },
  pooja(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.4, 0, 1.2, 0.8, 0.45, M.lightWood);
    it.box(0, 1.35, -0.12, 1.2, 1.1, 0.2, M.lightWood);
    it.box(0, 1.3, -0.019, 0.9, 0.85, 0.02, M.brass);
    it.box(0, 1.93, -0.1, 1.3, 0.08, 0.28, M.darkWood);
    it.cyl(0, 1.0, -0.08, 0.06, 0.08, 0.2, M.brass); it.sphere(0, 1.15, -0.08, 0.07, M.brass);
    for (const s of [-0.3, 0.3]) { it.cyl(s, 0.84, 0.1, 0.05, 0.03, 0.04, M.brass); it.sphere(s, 0.88, 0.1, 0.02, M.diya); }
    for (let i = -4; i <= 4; i++) it.sphere(i * 0.13, 1.82 - Math.abs(i) * 0.02, 0.02, 0.035, i % 2 ? M.marigold : M.fabricMustard);
    it.block(1.2, 0.5);
  },
  balconyChair(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.cyl(0, 0.42, 0, 0.32, 0.26, 0.12, M.darkWood, 16); it.box(0, 0.75, -0.25, 0.58, 0.55, 0.08, M.darkWood);
    it.box(0, 0.5, 0, 0.5, 0.06, 0.5, M.fabricMustard);
    for (const a of [-1, 1]) for (const b of [-1, 1]) it.rod([a * 0.2, 0, b * 0.2], [a * 0.18, 0.4, b * 0.18], 0.015, M.black);
    it.block(0.62, 0.62);
  },
  swing(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    for (const s of [-1, 1]) { it.rod([s * 1.0, 0, -0.6], [s * 0.9, 2.2, 0], 0.035, M.frame); it.rod([s * 1.0, 0, 0.6], [s * 0.9, 2.2, 0], 0.035, M.frame); }
    it.rod([-0.92, 2.2, 0], [0.92, 2.2, 0], 0.04, M.frame);
    it.box(0, 0.5, 0, 1.4, 0.06, 0.55, M.darkWood); it.box(0, 0.78, -0.26, 1.4, 0.5, 0.05, M.darkWood);
    it.box(0, 0.55, 0, 1.3, 0.06, 0.48, M.fabricTeal);
    for (const s of [-0.65, 0.65]) it.rod([s, 0.52, 0], [s, 2.18, 0], 0.008, M.steel);
    it.block(2.1, 1.3);
  },
  outdoorSet(fb, o, M) {
    const it = new Item(fb, o.x, o.z);
    it.cyl(0, 0.72, 0, 0.45, 0.45, 0.04, M.lightWood, 24); it.cyl(0, 0.36, 0, 0.04, 0.04, 0.72, M.frame);
    it.cyl(0, 2.35, 0, 0.02, 1.25, 0.35, M.umbrella, 8); it.cyl(0, 1.3, 0, 0.02, 0.02, 2.0, M.frame);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, c = new Item(fb, o.x + Math.sin(a) * 0.8, o.z + Math.cos(a) * 0.8, a + Math.PI); c.box(0, 0.45, 0, 0.45, 0.05, 0.45, M.darkWood); c.box(0, 0.75, -0.21, 0.45, 0.5, 0.04, M.darkWood); for (const p of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) c.box(p[0], 0.22, p[1], 0.03, 0.44, 0.03, M.frame); }
    it.block(1.9, 1.9);
  },
  lounger(fb, o, M) {
    const it = new Item(fb, o.x, o.z, o.rot);
    it.box(0, 0.3, 0.25, 0.62, 0.08, 1.3, M.darkWood); it.box(0, 0.36, 0.3, 0.56, 0.06, 1.2, M.linen);
    const g = new THREE.BoxGeometry(0.62, 0.08, 0.7); g.rotateX(-0.75); g.translate(0, 0.55, -0.62); it.put(g, M.darkWood);
    for (const a of [-1, 1]) for (const b of [-0.3, 0.8]) it.box(a * 0.27, 0.13, b, 0.04, 0.26, 0.04, M.frame);
    it.block(0.7, 1.9, 0, 0.0);
  },
  planter(fb, o, M) {
    const [x1, z1, x2, z2] = o.r, it = new Item(fb, 0, 0);
    it.box((x1 + x2) / 2, 0.22, (z1 + z2) / 2, x2 - x1, 0.44, z2 - z1, M.potGrey);
    it.box((x1 + x2) / 2, 0.445, (z1 + z2) / 2, x2 - x1 - 0.06, 0.01, z2 - z1 - 0.06, M.soil);
    const len = Math.max(x2 - x1, z2 - z1), n = Math.floor(len / 0.32);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x2 - x1 > z2 - z1 ? x1 + t * (x2 - x1) : (x1 + x2) / 2, z = x2 - x1 > z2 - z1 ? (z1 + z2) / 2 : z1 + t * (z2 - z1); it.sphere(x, 0.6 + (i % 2) * 0.08, z, 0.18, i % 3 ? M.leaf : M.leafDark, 1, 1.2, 1); }
    fb.obstacles.push([x1, z1, x2, z2]);
  },
  skylight(fb, o, M) {
    const [x1, z1, x2, z2] = o.r, it = new Item(fb, 0, 0), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    for (const [a, b, c, d] of [[x1, z1, x2, z1 + 0.1], [x1, z2 - 0.1, x2, z2], [x1, z1, x1 + 0.1, z2], [x2 - 0.1, z1, x2, z2]]) it.box((a + c) / 2, 0.2, (b + d) / 2, c - a, 0.4, d - b, M.coping);
    const roofG = new THREE.ConeGeometry(Math.hypot(x2 - x1, z2 - z1) / 2, 0.45, 4, 1, true); roofG.rotateY(Math.PI / 4); roofG.scale((x2 - x1) / Math.hypot(x2 - x1, z2 - z1) * 1.414, 1, (z2 - z1) / Math.hypot(x2 - x1, z2 - z1) * 1.414); roofG.translate(cx, 0.62, cz);
    it.put(roofG, M.glass);
    it.rod([x1, 0.4, z1], [cx, 0.85, cz], 0.012, M.frame); it.rod([x2, 0.4, z1], [cx, 0.85, cz], 0.012, M.frame); it.rod([x1, 0.4, z2], [cx, 0.85, cz], 0.012, M.frame); it.rod([x2, 0.4, z2], [cx, 0.85, cz], 0.012, M.frame);
    fb.obstacles.push([x1, z1, x2, z2]);
  },
  ladder(fb, o, M) {
    const it = new Item(fb, o.x, o.z), h = ROOF_Y - LEVEL_Y[3] + 1.0;
    for (const s of [-0.22, 0.22]) it.box(0.05, h / 2, s, 0.04, h, 0.04, M.steel);
    for (let y = 0.3; y < h; y += 0.3) it.cylZ(0.05, y, 0, 0.012, 0.44, M.steel);
    for (const s of [-0.22, 0.22]) it.rod([0.05, h, s], [-0.1, h + 0.25, s], 0.02, M.steel);
    fb.obstacles.push([o.x - 0.05, o.z - 0.3, o.x + 0.2, o.z + 0.3]);
  },
  dining(fb, o, M) {
    const it = new Item(fb, o.x, o.z), w = o.w, d = o.d;
    it.box(0, 0.74, 0, w, 0.05, d, M.lightWood);
    for (const a of [-1, 1]) for (const b of [-1, 1]) it.box(a * (w / 2 - 0.08), 0.36, b * (d / 2 - 0.08), 0.06, 0.72, 0.06, M.darkWood);
    for (const b of [-1, 1]) for (let i = -1; i <= 1; i++) {
      const c = new Item(fb, o.x + i * (w / 3.2), o.z + b * (d / 2 + 0.25), b > 0 ? Math.PI : 0);
      c.box(0, 0.46, 0, 0.44, 0.06, 0.44, M.fabricBeige); c.box(0, 0.78, -0.21, 0.42, 0.52, 0.04, M.darkWood);
      for (const p of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) c.box(p[0], 0.22, p[1], 0.035, 0.44, 0.035, M.darkWood);
    }
    it.cyl(0, 0.83, 0, 0.12, 0.08, 0.14, M.porcelain); it.sphere(0, 0.95, 0, 0.12, M.leaf, 1, 0.7, 1);
    it.block(w + 0.1, d + 1.0);
  },
};

// ── One storey ─────────────────────────────────────────────────────────────
export class FloorBuilder {
  constructor(M, index, extra) {
    this.M = M; this.i = index; this.plan = FLOORS[index];
    this.group = new THREE.Group(); this.group.position.y = this.plan.y; this.group.name = 'floor-' + index;
    this.batch = new Batch(); this.glassBatch = new Batch(); this.capBatch = new Batch();
    this.obstacles = []; this.walls = []; this.doors = []; this.fans = []; this.pickables = [];
    Object.assign(this, extra);
  }
  box(x1, y1, z1, x2, y2, z2, mat, batch = this.batch) {
    if (x2 - x1 < 1e-4 || y2 - y1 < 1e-4 || z2 - z1 < 1e-4) return;
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1); g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    batch.add(g, mat);
  }

  wall(w) {
    const M = this.M, [x1, z1, x2, z2] = w.r, alongX = x2 - x1 >= z2 - z1, H = w.h || CEIL;
    const a0 = alongX ? x1 : z1, a1 = alongX ? x2 : z2;
    const seg = (a, b, y0, y1, mat = M.plaster, batch = this.batch) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      if (alongX) this.box(a, y0, z1, b, y1, z2, mat, batch); else this.box(x1, y0, a, x2, y1, b, mat, batch);
      if (w.ext) {
        const s = 0.012, em = w.accent ? M.accent : w.wood ? M.woodClad : M.exterior;
        if (w.ext === '-z') this.box(a, y0, z1 - s, b, y1, z1, em); else if (w.ext === '+z') this.box(a, y0, z2, b, y1, z2 + s, em);
        else if (w.ext === '-x') this.box(x1 - s, y0, a, x1, y1, b, em); else this.box(x2, y0, a, x2 + s, y1, b, em);
      }
    };
    const ops = [...w.o].sort((p, q) => p.a - q.a);
    let at = a0; const solid = [], capGaps = [];
    for (const op of ops) {
      seg(at, op.a, 0, H); solid.push([at, op.a]);
      const head = op.t === 'win' ? op.head : op.t === 'open' ? op.head : 2.1;
      const sill = op.t === 'win' ? op.sill : 0;
      seg(op.a, op.b, 0, sill); seg(op.a, op.b, Math.min(head, H), H);
      if (op.t === 'win') { this.window(w, op, alongX); if (sill > CUT || head < CUT) solid.push([op.a, op.b]); }
      else if (op.t === 'door' || op.t === 'double') this.hingedDoor(w, op, alongX);
      else if (op.t === 'slide') this.slidingDoor(w, op, alongX);
      at = op.b;
    }
    seg(at, a1, 0, H); solid.push([at, a1]);
    if (H > CUT) for (const [a, b] of solid) {
      if (b - a < 1e-3) continue;
      if (alongX) this.box(a, CUT - 0.03, z1 - 0.012, b, CUT - 0.005, z2 + 0.012, M.cap, this.capBatch);
      else this.box(x1 - 0.012, CUT - 0.03, a, x2 + 0.012, CUT - 0.005, b, M.cap, this.capBatch);
    }
    // Walkable gaps are only doors, sliding doors and open passages.
    let from = a0; const passable = ops.filter((o) => o.t !== 'win');
    for (const op of passable) { if (op.a > from) this.walls.push(alongX ? [from, z1, op.a, z2] : [x1, from, x2, op.a]); from = op.b; }
    if (a1 > from) this.walls.push(alongX ? [from, z1, a1, z2] : [x1, from, x2, a1]);
  }

  // Helper to place geometry in a wall-aligned frame: u along the wall, t across it.
  wallFrame(w, alongX) {
    const [x1, z1, x2, z2] = w.r;
    const tMid = alongX ? (z1 + z2) / 2 : (x1 + x2) / 2, th = alongX ? z2 - z1 : x2 - x1;
    const box = (u1, y1, u2, y2, t1, t2, mat, batch = this.batch) => {
      if (alongX) this.box(u1, y1, tMid + t1, u2, y2, tMid + t2, mat, batch); else this.box(tMid + t1, y1, u1, tMid + t2, y2, u2, mat, batch);
    };
    const outSign = w.ext ? (w.ext[0] === '+' ? 1 : -1) : 1;
    return { box, th, tMid, outSign };
  }

  window(w, op, alongX) {
    const M = this.M, { box, th, outSign } = this.wallFrame(w, alongX), f = 0.05, { a, b, sill, head } = op;
    box(a, sill, a + f, head, -0.04, 0.04, M.frame); box(b - f, sill, b, head, -0.04, 0.04, M.frame);
    box(a, sill, b, sill + f, -0.04, 0.04, M.frame); box(a, head - f, b, head, -0.04, 0.04, M.frame);
    if (b - a > 1.1 && !op.vent) box((a + b) / 2 - 0.02, sill, (a + b) / 2 + 0.02, head, -0.035, 0.035, M.frame);
    if (op.vent) for (let y = sill + 0.08; y < head - 0.04; y += 0.08) box(a + f, y, b - f, y + 0.012, -0.03, 0.03, M.frame);
    box(a + f, sill + f, b - f, head - f, -0.006, 0.006, op.vent ? M.frosted : M.glass, this.glassBatch);
    if (w.ext && sill > 0.05) { const s = outSign; box(a - 0.05, sill - 0.04, b + 0.05, sill, s > 0 ? th / 2 : -th / 2 - 0.06, s > 0 ? th / 2 + 0.06 : -th / 2, M.granite); }
    if (w.ext && sill > 0.05) { const s = outSign; box(a - 0.03, sill - 0.03, b + 0.03, sill, s > 0 ? -th / 2 - 0.04 : th / 2, s > 0 ? -th / 2 : th / 2 + 0.04, M.white); }
  }

  hingedDoor(w, op, alongX) {
    const M = this.M, { box, th, tMid } = this.wallFrame(w, alongX), { a, b } = op, fr = 0.045, head = 2.1, main = op.t === 'double';
    box(a, 0, a + fr, head, -th / 2 - 0.01, th / 2 + 0.01, M.darkWood); box(b - fr, 0, b, head, -th / 2 - 0.01, th / 2 + 0.01, M.darkWood);
    box(a, head - fr, b, head, -th / 2 - 0.01, th / 2 + 0.01, M.darkWood);
    const leaves = main ? [['a', (b - a) / 2 - fr], ['b', (b - a) / 2 - fr]] : [[op.hinge, b - a - 2 * fr]];
    const door = { level: this.i, name: op.name, cx: alongX ? (a + b) / 2 : tMid, cz: alongX ? tMid : (a + b) / 2, leaves: [], t: 0, target: 0 };
    for (const [hinge, width] of leaves) {
      const pivot = new THREE.Group(), u = hinge === 'a' ? a + fr : b - fr, dir = hinge === 'a' ? 1 : -1;
      if (alongX) pivot.position.set(u, 0, tMid); else pivot.position.set(tMid, 0, u);
      const leaf = new THREE.Group(); pivot.add(leaf);
      const mat = main ? M.darkWood : M.doorWood;
      const add = (x, y, z, ww, hh, dd, m) => { const g = new THREE.BoxGeometry(ww, hh, dd); worldUV(g, m.userData.metres || 1); const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.receiveShadow = true; leaf.add(mesh); return mesh; };
      // leaf geometry along +x of the pivot, flipped for hinge b
      add(dir * width / 2, 1.025, 0, width, 2.04, 0.04, mat);
      if (main) for (const yy of [0.5, 1.05, 1.6]) add(dir * width / 2, yy, 0.022, width - 0.16, 0.012, 0.006, M.brass);
      else add(dir * width / 2, 1.05, 0.021, width - 0.18, 1.8, 0.004, M.lightWood);
      for (const s of [-1, 1]) add(dir * (width - 0.08), 1.02, s * 0.04, 0.03, main ? 0.45 : 0.14, 0.03, main ? M.brass : M.chrome);
      if (!alongX) pivot.rotation.y = -Math.PI / 2;
      this.group.add(pivot);
      const sign = op.swing * (hinge === 'a' ? -1 : 1) * (alongX ? 1 : -1);
      door.leaves.push({ pivot, base: pivot.rotation.y, open: sign * Math.PI / 2 * 0.94 });
    }
    this.doors.push(door);
  }

  slidingDoor(w, op, alongX) {
    const M = this.M, { box, tMid } = this.wallFrame(w, alongX), { a, b } = op, head = 2.1, half = (b - a) / 2;
    box(a, 0, b, 0.03, -0.06, 0.06, M.frame); box(a, head - 0.05, b, head, -0.06, 0.06, M.frame);
    const panel = (u1, t, batchMesh) => {
      const g = new THREE.Group(), mk = (x, y, ww, hh, m) => { const geo = new THREE.BoxGeometry(alongX ? ww : 0.03, hh, alongX ? 0.03 : ww); const me = new THREE.Mesh(geo, m); if (alongX) me.position.set(x, y, 0); else me.position.set(0, y, x); g.add(me); };
      mk(half / 2, 1.05, half - 0.08, 2.0, M.glass);
      for (const x of [0.02, half - 0.02]) mk(x, 1.04, 0.045, 2.04, M.frame);
      for (const y of [0.05, 2.04]) mk(half / 2, y, half, 0.05, M.frame);
      mk(half - 0.07, 1.05, 0.02, 0.35, M.black);
      if (alongX) g.position.set(u1, 0, tMid + t); else g.position.set(tMid + t, 0, u1);
      this.group.add(g); return g;
    };
    panel(b - half, -0.025);
    const moving = panel(a, 0.025);
    const door = { level: this.i, name: op.name, cx: alongX ? (a + b) / 2 : tMid, cz: alongX ? tMid : (a + b) / 2, leaves: [], slide: { obj: moving, base: moving.position.clone(), dx: alongX ? half - 0.05 : 0, dz: alongX ? 0 : half - 0.05 }, t: 0, target: 0 };
    this.doors.push(door);
  }

  railing(x1, z1, x2, z2, y = 0, glass = true) {
    const M = this.M, alongX = Math.abs(x2 - x1) >= Math.abs(z2 - z1), h = 1.0;
    if (alongX) { this.box(Math.min(x1, x2), y + h - 0.02, z1 - 0.03, Math.max(x1, x2), y + h + 0.03, z1 + 0.03, M.steel); if (glass) this.box(Math.min(x1, x2), y + 0.06, z1 - 0.008, Math.max(x1, x2), y + h - 0.04, z1 + 0.008, M.glass, this.glassBatch); }
    else { this.box(x1 - 0.03, y + h - 0.02, Math.min(z1, z2), x1 + 0.03, y + h + 0.03, Math.max(z1, z2), M.steel); if (glass) this.box(x1 - 0.008, y + 0.06, Math.min(z1, z2), x1 + 0.008, y + h - 0.04, Math.max(z1, z2), M.glass, this.glassBatch); }
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 1.0));
    for (let i = 0; i <= n; i++) { const t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; this.box(x - 0.02, y, z - 0.02, x + 0.02, y + h, z + 0.02, M.steel); }
    this.walls.push([Math.min(x1, x2) - 0.04, Math.min(z1, z2) - 0.04, Math.max(x1, x2) + 0.04, Math.max(z1, z2) + 0.04]);
  }

  parapet(p) {
    const M = this.M, [x1, z1, x2, z2] = p.r;
    if (p.glass) {
      this.box(x1, 0, z1, x2, 0.1, z2, M.exterior);
      const alongX = x2 - x1 >= z2 - z1, mid = alongX ? (z1 + z2) / 2 : (x1 + x2) / 2;
      if (alongX) this.railing(x1, mid, x2, mid, 0.1); else this.railing(mid, z1, mid, z2, 0.1);
    } else {
      this.box(x1, 0, z1, x2, 1.0, z2, M.exterior);
      this.box(x1 - 0.03, 1.0, z1 - 0.03, x2 + 0.03, 1.06, z2 + 0.03, M.coping);
      this.walls.push([x1, z1, x2, z2]);
    }
  }

  // Slab of this floor (its top is y = 0 of the group) plus default finish.
  slab(outline, holes, finishMat, { body = this.M.ceiling, depth = SLAB, finish = true } = {}) {
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)));
    for (const [x1, z1, x2, z2] of holes) shape.holes.push(new THREE.Path([new THREE.Vector2(x1, z1), new THREE.Vector2(x1, z2), new THREE.Vector2(x2, z2), new THREE.Vector2(x2, z1)]));
    const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 0.01, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, -0.01, 0);
    this.batch.add(g, body);
    if (finish) { const t = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false }); t.rotateX(Math.PI / 2); t.translate(0, 0, 0); t.translate(0, 0.0, 0); this.batch.add(t, finishMat); }
    // exterior floor band
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
      const nx = Math.sign(bz - az), nz = -Math.sign(bx - ax); // outward for clockwise-in-screen outline
      if (ax === bx) this.box(ax + Math.min(0, nx * 0.04), -depth - 0.06, Math.min(az, bz) - 0.04, ax + Math.max(0, nx * 0.04), 0.0, Math.max(az, bz) + 0.04, this.M.fascia);
      else this.box(Math.min(ax, bx) - 0.04, -depth - 0.06, az + Math.min(0, nz * 0.04), Math.max(ax, bx) + 0.04, 0.0, az + Math.max(0, nz * 0.04), this.M.fascia);
    }
  }

  roomFloor(room) {
    const M = this.M, [x1, z1, x2, z2] = room.r, y = room.y || 0;
    const mat = { wood: M.wood, bath: M.bath, tile: M.tile, granite: M.lobby, pavers: M.pavers, deck: M.deck, terrace: M.terrace, marble: M.marble }[room.f];
    if (mat) this.box(x1, y + 0.002, z1, x2, y + 0.016, z2, mat);
    // invisible picking plane for room selection
    const pick = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1).rotateX(-Math.PI / 2), this.pickMat);
    pick.position.set((x1 + x2) / 2, y + 0.03, (z1 + z2) / 2); pick.userData.room = room; pick.userData.level = this.i;
    this.group.add(pick); this.pickables.push(pick);
    // ceiling fixtures
    if (room.stair || room.noLights || room.f === 'terrace' || room.f === 'deck' || room.f === 'pavers') return;
    const ceil = CEIL - 0.004, area = (x2 - x1) * (z2 - z1);
    const spots = area > 9 ? [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]] : [[0.5, 0.5]];
    for (const [u, v] of spots) { const g = new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16); g.translate(x1 + (x2 - x1) * u, ceil, z1 + (z2 - z1) * v); this.batch.add(g, M.lamp); }
    if (room.fan) this.fan((x1 + x2) / 2, (z1 + z2) / 2);
  }

  fan(x, z) {
    const M = this.M, g = new THREE.Group(); g.position.set(x, CEIL - 0.42, z);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), M.white); rod.position.y = 0.2; g.add(rod);
    const rotor = new THREE.Group(); g.add(rotor);
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.1, 18), M.white));
    for (let i = 0; i < 3; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.12), M.white); blade.position.set(Math.cos(i * 2.094) * 0.42, -0.02, Math.sin(i * 2.094) * 0.42); blade.rotation.y = -i * 2.094; rotor.add(blade); }
    this.group.add(g); this.fans.push(rotor);
  }

  stairs(s) {
    const M = this.M, h = (k) => k * RISE;
    const tread = (x1, z1, x2, z2, k) => {
      const top = h(k), bottom = top < 1.3 ? 0 : top - RISE - 0.2;
      this.box(x1, bottom, z1, x2, top - 0.03, z2, M.plaster);
      this.box(x1 - 0.015, top - 0.03, z1 - 0.015, x2 + 0.015, top, z2 + 0.015, M.granite);
    };
    const rail = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const it = new Item(this, 0, 0); const [a, b] = [pts[i], pts[i + 1]];
        it.rod([a[0], a[1] + 0.95, a[2]], [b[0], b[1] + 0.95, b[2]], 0.025, M.steel);
      }
      for (const p of pts) { const it = new Item(this, 0, 0); it.rod([p[0], p[1] + 0.02, p[2]], [p[0], p[1] + 0.95, p[2]], 0.018, M.steel); }
    };
    for (const f of s.flights) {
      if (f.rect) { tread(...f.rect, f.k); continue; }
      const step = (f.s1 - f.s0) / f.n;
      for (let i = 0; i < f.n; i++) {
        const u1 = f.s0 + step * i, u2 = u1 + step, lo = Math.min(u1, u2), hi = Math.max(u1, u2);
        if (f.axis === 'z') tread(f.x1, lo, f.x2, hi, f.k0 + i); else tread(lo, f.z1, hi, f.z2, f.k0 + i);
      }
      // handrail on the inner (well) side of the flight
      const inner = s.id === 'lobby' ? 9.75 : null;
      const pts = [];
      for (let i = 0; i <= f.n; i++) {
        const u = f.s0 + step * i, y = h(f.k0 + i - 1) + 0.0;
        if (f.axis === 'z') pts.push([inner ?? (f.x1 === 3.6 ? 4.53 : 6.77), y, u]); else pts.push([u, y, 1.13]);
      }
      if (pts.length > 1) rail(pts);
    }
    // stringer walls below the flights where they are free-standing
  }

  build(M) {
    const p = this.plan, i = this.i;
    this.pickMat = new THREE.MeshBasicMaterial({ visible: false });
    if (i === 0) this.plinth(); else this.slab([[0, 0], [W, 0], [W, D], [0, D]], p.slabHoles, M.tile);
    for (const w of p.walls) this.wall(w);
    for (const pp of p.parapets || []) this.parapet(pp);
    for (const r of p.railings || []) this.railing(...r);
    for (const room of p.rooms) this.roomFloor(room);
    for (const o of p.furniture) F[o.k](this, o, M);
    for (const s of STAIRS) if (s.from === i) this.stairs(s);
    this.batch.build(this.group); this.glassBatch.build(this.group, { shadows: false });
    this.caps = new THREE.Group(); this.capBatch.build(this.caps, { shadows: false }); this.caps.visible = false; this.group.add(this.caps);
    return this;
  }

  plinth() {
    const M = this.M, top = 0, low = PARKING_Y - LEVEL_Y[0];
    const pieces = [[-0.37, 3.6, 0, D], [0, 0, 4.95, D], [8.45, 0, W, D]];
    for (const [x1, z1, x2, z2] of pieces) { this.box(x1, -LEVEL_Y[0], z1, x2, top, z2, M.concrete); }
    this.box(4.95, -LEVEL_Y[0], 0, 8.45, low, D, M.concrete);
    // stone-clad plinth faces
    this.box(-0.38, -LEVEL_Y[0], D, 4.95, 0, D + 0.02, M.stone); this.box(8.45, -LEVEL_Y[0], D, W, 0, D + 0.02, M.stone);
    this.box(-0.39, -LEVEL_Y[0], 3.6, -0.37, 0, D, M.stone); this.box(-0.02, -LEVEL_Y[0], 0, 0, 0, 3.6, M.stone);
    this.box(W, -LEVEL_Y[0], 0, W + 0.02, 0, D, M.stone); this.box(0, -LEVEL_Y[0], -0.02, W, 0, 0, M.stone);
    this.box(4.95, low, 7.08, 8.45, low + 0.02, D, M.granite);
    this.box(4.93, low, 0.23, 4.95, 0, 7.11, M.granite);
  }
}

// ── Roof, site and context ─────────────────────────────────────────────────
export function buildRoof(M) {
  const fb = new FloorBuilder(M, 3, {}); fb.group = new THREE.Group(); fb.group.position.y = ROOF_Y; fb.group.name = 'roof';
  fb.slab(ROOF.outline, [], M.concrete, { body: M.ceiling });
  const o = ROOF.outline;
  for (let i = 0; i < o.length; i++) {
    const [ax, az] = o[i], [bx, bz] = o[(i + 1) % o.length], t = 0.12;
    const x1 = Math.min(ax, bx), x2 = Math.max(ax, bx), z1 = Math.min(az, bz), z2 = Math.max(az, bz);
    const inX = ax === bx ? (i === 1 || i === 3 ? -1 : 1) : 0, inZ = az === bz ? (i === 0 ? 1 : -1) : 0;
    const r = ax === bx ? [x1 + Math.min(0, inX * t), z1, x1 + Math.max(0, inX * t), z2] : [x1, z1 + Math.min(0, inZ * t), x2, z1 + Math.max(0, inZ * t)];
    fb.box(r[0], 0, r[1], r[2], 0.3, r[3], M.exterior); fb.box(r[0] - 0.02, 0.3, r[1] - 0.02, r[2] + 0.02, 0.34, r[3] + 0.02, M.coping);
  }
  const it = new Item(fb, ...ROOF.tank);
  it.box(0, 0.25, 0, 1.4, 0.5, 1.4, M.concrete);
  it.cyl(0, 1.15, 0, 0.62, 0.62, 1.3, M.tank, 28); it.cyl(0, 1.88, 0, 0.25, 0.62, 0.18, M.tank, 28); it.cyl(0, 2.0, 0, 0.18, 0.18, 0.08, M.tank, 20);
  it.rod([0.62, 1.3, 0], [3.0, 0.1, 0.5], 0.02, M.white);
  fb.batch.build(fb.group);
  return fb.group;
}

export function buildSite(M) {
  const g = new THREE.Group(), b = new Batch(), fb = { batch: b, obstacles: [] };
  const box = (x1, y1, z1, x2, y2, z2, mat) => { const geo = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1); geo.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); b.add(geo, mat); };
  const PX1 = -0.51, PX2 = W + 0.51, PZ1 = -0.51, PZ2 = D + 0.36; // plot after 1′8″ / 1′2″ setbacks
  box(-60, -0.2, -60, 60, -0.02, PZ2 + 0.0, M.grass);
  box(-60, -0.2, PZ2 + 14.6, 60, -0.02, 60, M.grass);
  box(PX1, -0.02, PZ1, PX2, 0.5, PZ2, M.soil);
  // 40′ road with kerbs and markings
  box(-60, -0.2, PZ2 + 1.2, 60, 0.0, PZ2 + 13.4, M.asphalt);
  box(-60, -0.2, PZ2, 60, 0.12, PZ2 + 1.2, M.kerb); box(-60, -0.2, PZ2 + 13.4, 60, 0.12, PZ2 + 14.6, M.kerb);
  for (let x = -58; x < 60; x += 4) box(x, 0.0, PZ2 + 7.25, x + 2.2, 0.012, PZ2 + 7.37, M.roadPaint);
  // driveway ramp from the parking (+2′0″) down to the road
  const ramp = new THREE.BoxGeometry(3.5, 0.1, Math.hypot(PZ2 + 1.2 - D, PARKING_Y));
  ramp.rotateX(Math.atan2(PARKING_Y, PZ2 + 1.2 - D)); ramp.translate(6.7, PARKING_Y / 2 - 0.05, (D + PZ2 + 1.2) / 2); b.add(ramp, M.pavers);
  // compound wall with gate pillars
  const cw = (x1, z1, x2, z2, h = 1.5) => { box(x1, 0, z1, x2, h, z2, M.exterior); box(x1 - 0.02, h, z1 - 0.02, x2 + 0.02, h + 0.05, z2 + 0.02, M.coping); };
  cw(PX1 - 0.15, PZ1 - 0.15, PX2 + 0.15, PZ1); cw(PX1 - 0.15, PZ1, PX1, PZ2); cw(PX2, PZ1, PX2 + 0.15, PZ2);
  cw(PX1 - 0.15, PZ2 - 0.15, 4.75, PZ2, 1.2); cw(8.65, PZ2 - 0.15, PX2 + 0.15, PZ2, 1.2);
  for (const x of [4.45, 8.65]) { box(x, 0, PZ2 - 0.3, x + 0.3, 1.7, PZ2, M.accent); box(x - 0.03, 1.7, PZ2 - 0.33, x + 0.33, 1.78, PZ2 + 0.03, M.coping); box(x + 0.08, 1.45, PZ2 + 0.001, x + 0.22, 1.55, PZ2 + 0.01, M.lamp); }
  // house name plate
  // trees and street lights for scale
  const tree = (x, z, s) => { const it = new Item(fb, x, z); it.cyl(0, 1.4 * s, 0, 0.12 * s, 0.18 * s, 2.8 * s, M.trunk, 10); for (let i = 0; i < 7; i++) { const a = i * 0.9; it.sphere(Math.sin(a) * 1.0 * s, (3.1 + (i % 3) * 0.5) * s, Math.cos(a) * 1.0 * s, 1.15 * s, i % 2 ? M.leaf : M.leafDark, 1, 0.85, 1); } };
  tree(-4.5, 2.5, 1.2); tree(16.5, 1.0, 1.0); tree(-3, PZ2 + 15.6, 1.1); tree(5, PZ2 + 16.2, 0.9); tree(14, PZ2 + 15.8, 1.2); tree(-14, PZ2 + 16, 1.0); tree(24, 3, 1.3);
  const lamp = (x, z, dir) => { const it = new Item(fb, x, z); it.cyl(0, 3.5, 0, 0.05, 0.08, 7, M.frame, 10); it.rod([0, 7, 0], [0, 7.2, dir * 1.4], 0.04, M.frame); it.box(0, 7.1, dir * 1.5, 0.25, 0.08, 0.5, M.frame); it.box(0, 7.05, dir * 1.5, 0.2, 0.02, 0.42, M.lamp); };
  lamp(1.5, PZ2 + 0.6, 1); lamp(15, PZ2 + 0.6, 1); lamp(-12, PZ2 + 0.6, 1); lamp(8, PZ2 + 14.0, -1);
  // neighbouring plots: low compound walls only, so the house stays visible
  cw(-13, PZ1 - 0.15, PX1 - 0.15, PZ1, 1.5); cw(PX2 + 0.15, PZ1 - 0.15, 24, PZ1, 1.5);
  b.build(g);
  return g;
}

export { Item, F };
