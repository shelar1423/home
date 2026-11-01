import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, paintSky } from './materials.js';
import { FloorBuilder, buildRoof, buildSite, CUT } from './builder.js';
import { FLOORS, LEVEL_Y, W, D, TOUR, ARRIVAL, STAIRS } from './plan.js';
import { buildNav, groundY, stairRide, sampleRide, stairTrigger, planRoute, inRect } from './nav.js';

const $ = (s) => document.querySelector(s);
const EYE = 1.58, WALK = 1.35, RIDE = 1.05;
const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const OFFSET = new THREE.Vector3(-W / 2, 0, -D / 2);
const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).add(OFFSET);
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const ease = (t) => t * t * (3 - 2 * t);
const tryStore = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

// ── Renderer and scene ─────────────────────────────────────────────────────
const stage = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#loader').innerHTML = '<p>This viewer needs WebGL. Please open it in an up-to-date Chrome, Safari or Edge.</p>'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const hemi = new THREE.HemisphereLight('#e6eef6', '#a59a84', 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 2048 : 4096, coarse ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 80 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
// Soft fill that travels with the walker, standing in for light bouncing indoors.
const fill = new THREE.PointLight('#fff4e4', 6, 9, 1.4); fill.visible = false; scene.add(fill);

const world = new THREE.Group(); world.position.copy(OFFSET); scene.add(world);
const { M } = createMaterials(renderer, coarse);
M.cap = new THREE.MeshStandardMaterial({ color: '#3a3d40', roughness: 0.9 });
M.redLight = new THREE.MeshStandardMaterial({ color: '#b3151b', emissive: '#7a0a0e', roughness: 0.3 });
M.marigold = new THREE.MeshStandardMaterial({ color: '#f29b1d', roughness: 0.8 });
M.umbrella = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9, side: THREE.DoubleSide });
for (const k of ['cap', 'redLight', 'marigold', 'umbrella']) M[k].userData.metres = 1;
const rugCache = new Map();
const extras = { redLight: M.redLight, marigold: M.marigold, umbrella: M.umbrella, rugMat: (c) => { if (!rugCache.has(c)) { const m = M.rug(c); m.userData.metres = 0.4; rugCache.set(c, m); } return rugCache.get(c); } };

let floors, roof, site, grids, doors, fans;
function buildHouse() {
  floors = FLOORS.map((_, i) => new FloorBuilder(M, i, extras).build(M));
  for (const f of floors) world.add(f.group);
  roof = buildRoof(M); world.add(roof);
  site = buildSite(M); world.add(site);
  grids = buildNav(floors);
  doors = floors.flatMap((f) => f.doors);
  fans = floors.flatMap((f) => f.fans.map((r) => ({ r, level: f.i })));
}

// ── Time of day ────────────────────────────────────────────────────────────
const TIMES = {
  morning: { sun: [14, 9, 16], color: '#ffd9ae', i: 2.3, hemi: 0.6, env: 0.5, sky: ['#8fb3d9', '#f3dcc2', '#b8b29f'], fog: '#e9dccb', exp: 1.0, lamps: 0.4 },
  noon: { sun: [-6, 24, 12], color: '#fff6e8', i: 2.8, hemi: 0.75, env: 0.6, sky: ['#6f9fd6', '#dfe9f2', '#b7b4a4'], fog: '#dfe7ee', exp: 1.0, lamps: 0.35 },
  evening: { sun: [-16, 6, -8], color: '#ff9d5c', i: 1.6, hemi: 0.35, env: 0.35, sky: ['#2f3d63', '#f0a36f', '#6c6458'], fog: '#c99b80', exp: 1.1, lamps: 2.2 },
};
function setTime(name) {
  const t = TIMES[name];
  sun.position.set(...t.sun).normalize().multiplyScalar(40); sun.color.set(t.color); sun.intensity = t.i;
  hemi.intensity = t.hemi; scene.environmentIntensity = t.env; renderer.toneMappingExposure = t.exp;
  scene.background = paintSky(...t.sky); scene.fog = new THREE.Fog(t.fog, 60, 180);
  M.lamp.emissiveIntensity = t.lamps;
  document.querySelectorAll('[data-time]').forEach((b) => b.classList.toggle('on', b.dataset.time === name));
  renderer.shadowMap.needsUpdate = true;
}

// ── State ─────────────────────────────────────────────────────────────────
const state = { mode: 'overview', level: 'all', fly: null, route: null, ride: null, tour: null, turn: null, selected: null, bob: 0 };
const player = { level: 0, x: ARRIVAL[0].x, z: ARRIVAL[0].z, y: 0, yaw: ARRIVAL[0].yaw, pitch: 0.05 };
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 4, maxDistance: 70, maxPolarAngle: Math.PI * 0.47, screenSpacePanning: true });
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);

// ── Overview (dollhouse) ───────────────────────────────────────────────────
function overviewPose(level) {
  const all = level === 'all', aspect = camera.aspect, fit = aspect < 1 ? 1.75 / Math.max(aspect, 0.45) * 0.55 : 1;
  const target = all ? new THREE.Vector3(0, 6.5, 0) : new THREE.Vector3(0, LEVEL_Y[level] + 0.6, 0.2);
  const dir = all ? new THREE.Vector3(0.62, 0.42, 1).normalize() : new THREE.Vector3(0.35, 1.25, 1).normalize();
  const dist = (all ? 30 : 17.5) * fit;
  return { target, pos: target.clone().addScaledVector(dir, dist) };
}
function applyVisibility() {
  const walk = state.mode === 'walk', L = state.level, all = walk || L === 'all';
  floors.forEach((f, i) => { f.group.visible = all || i <= L; f.caps.visible = !all && i === L; });
  roof.visible = all;
  fill.visible = walk;
  renderer.clippingPlanes = all ? [] : [clipPlane];
  if (!all) clipPlane.constant = LEVEL_Y[L] + CUT;
  renderer.shadowMap.needsUpdate = true;
}
function setOverview(level, animate = true) {
  state.mode = 'overview'; state.level = level; state.route = null; state.ride = null; stopTour();
  applyVisibility(); controls.enabled = true;
  const { target, pos } = overviewPose(level);
  if (animate) flyTo(pos, target, null, 1.1, () => controls.target.copy(target)); else { camera.position.copy(pos); controls.target.copy(target); camera.lookAt(target); }
  controls.target.copy(target);
  updateUI();
}

// ── Walk mode ─────────────────────────────────────────────────────────────
function eyeQuat(yaw, pitch) { return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw + Math.PI, 0, 'YXZ')); }
function eyePos() { return toWorld(player.x, player.y + EYE + Math.sin(state.bob) * 0.012, player.z); }
function enterWalk(level, x, z, yaw, pitch = 0.02) {
  Object.assign(player, { level, x, z, yaw, pitch, y: groundY(level, x, z) });
  const was = state.mode; state.mode = 'walk'; state.selected = null; controls.enabled = false;
  applyVisibility(); updateUI();
  if (was === 'overview') flyTo(eyePos(), null, eyeQuat(yaw, pitch), 1.3);
}
function teleport(level, x, z, yaw, then) {
  fade(() => { Object.assign(player, { level, x, z, yaw, pitch: 0.02, y: groundY(level, x, z) }); state.route = null; state.ride = null; updateUI(); then?.(); });
}
function fade(mid) {
  const el = $('#fade'); el.classList.add('on');
  setTimeout(() => { mid(); setTimeout(() => el.classList.remove('on'), 120); }, 280);
}

// Camera fly animation between two poses (position + orientation).
function flyTo(pos, lookAt, quat, dur, done) {
  const q = quat || new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, lookAt, new THREE.Vector3(0, 1, 0)));
  state.fly = { p0: camera.position.clone(), q0: camera.quaternion.clone(), p1: pos.clone(), q1: q, t: 0, dur, done };
  controls.enabled = false;
}

// ── Movement ───────────────────────────────────────────────────────────────
const keys = new Set(), joy = { x: 0, y: 0, active: false };
function manualInput() {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - joy.y;
  const turn = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - joy.x;
  const strafe = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  return { f: Math.max(-1, Math.min(1, f)), turn: Math.max(-1, Math.min(1, turn)), strafe, fast: keys.has('ShiftLeft') || keys.has('ShiftRight') };
}
function stepTo(nx, nz) {
  const dx = nx - player.x, dz = nz - player.z;
  const trig = stairTrigger(player.level, nx, nz, dx, dz);
  if (trig) { startRide(trig.stair, trig.up); return true; }
  const g = grids[player.level];
  if (g.ok(nx, nz)) { player.x = nx; player.z = nz; return true; }
  if (g.ok(nx, player.z)) { player.x = nx; return true; }
  if (g.ok(player.x, nz)) { player.z = nz; return true; }
  return false;
}
function startRide(stair, up) {
  state.ride = stairRide(stair, up);
  toast(up ? `Going up to the ${FLOORS[stair.to].name.toLowerCase()}` : `Going down to the ${FLOORS[stair.from].name.toLowerCase()}`);
}
function updateRide(dt) {
  const r = state.ride; r.s = Math.min(r.total, r.s + RIDE * dt);
  const p = sampleRide(r, r.s);
  player.x = p.x; player.z = p.z; player.y = p.y;
  const h = Math.hypot(p.dx, p.dz);
  if (h > 0.01) player.yaw += angleTo(player.yaw, Math.atan2(p.dx, p.dz)) * Math.min(1, dt * 4);
  player.pitch += ((h > 0.01 ? Math.atan2(p.dy, h) * 0.45 : 0) - player.pitch) * Math.min(1, dt * 3);
  state.bob += dt * 7;
  const level = r.up ? r.stair.to : r.stair.from;
  if (r.s >= r.total) {
    state.ride = null; player.level = level; player.y = groundY(level, player.x, player.z); updateUI();
    if (state.route) nextLeg();
  } else {
    const nowLevel = p.y > LEVEL_Y[r.stair.from] + 1.7 ? r.stair.to : r.stair.from;
    if (nowLevel !== player.level) { player.level = nowLevel; updateUI(); }
  }
}
function walkTo(level, x, z, onDone) {
  const legs = planRoute(grids, { level: player.level, x: player.x, z: player.z }, { level, x, z });
  if (!legs) { toast('That spot can’t be reached from here'); return false; }
  state.route = { legs, li: -1, onDone }; state.turn = null; nextLeg();
  showMarker(level, legs[legs.length - 1].path.at(-1));
  return true;
}
function nextLeg() {
  const r = state.route; r.li++;
  if (r.li >= r.legs.length) { state.route = null; hideMarker(); r.onDone?.(); return; }
  const leg = r.legs[r.li];
  if (leg.type === 'stair') startRide(leg.stair, leg.up); else leg.pi = 1;
}
function updateRoute(dt) {
  const leg = state.route.legs[state.route.li];
  if (!leg || leg.type !== 'walk') return;
  let budget = WALK * dt;
  while (budget > 0 && leg.pi < leg.path.length) {
    const [tx, tz] = leg.path[leg.pi], dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
    if (d < 0.02) { leg.pi++; continue; }
    const want = Math.atan2(dx, dz), diff = angleTo(player.yaw, want);
    player.yaw += diff * Math.min(1, dt * 5);
    if (Math.abs(diff) > 1.2) break;               // turn on the spot first
    const s = Math.min(d, budget); player.x += (dx / d) * s; player.z += (dz / d) * s; budget -= s;
    state.bob += dt * 8;
  }
  player.pitch += (0 - player.pitch) * Math.min(1, dt * 2);
  if (leg.pi >= leg.path.length) nextLeg();
}
function updateWalk(dt) {
  if (state.ride) updateRide(dt);
  else if (state.route) updateRoute(dt);
  const inp = manualInput();
  if (inp.f || inp.turn || inp.strafe) {
    if (state.route || state.tour?.playing) { state.route = null; hideMarker(); pauseTour(); }
    if (!state.ride) {
      player.yaw += inp.turn * 1.7 * dt;
      const speed = (inp.fast ? 2.4 : WALK) * dt, fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      const mx = (fx * inp.f - fz * inp.strafe) * speed, mz = (fz * inp.f + fx * inp.strafe) * speed;
      const n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.05));
      for (let i = 0; i < n && !state.ride; i++) stepTo(player.x + mx / n, player.z + mz / n);
      if (inp.f) state.bob += dt * 8;
    }
  }
  if (state.turn) {
    const t = state.turn; t.t = Math.min(1, t.t + dt / t.dur);
    player.yaw = t.y0 + angleTo(t.y0, t.y1) * ease(t.t); player.pitch = t.p0 + (t.p1 - t.p0) * ease(t.t);
    if (t.t >= 1) { state.turn = null; t.done?.(); }
  }
  if (!state.ride) { const gy = groundY(player.level, player.x, player.z); player.y += (gy - player.y) * Math.min(1, dt * 10); }
  camera.position.copy(eyePos());
  camera.quaternion.copy(eyeQuat(player.yaw, player.pitch));
  fill.position.copy(camera.position).y += 0.6;
  updateStairPrompt();
}
function lookAtPoint(x, y, z, dur = 0.9, done) {
  const ey = player.y + EYE, yaw = Math.atan2(x - player.x, z - player.z), pitch = Math.atan2(y - ey, Math.hypot(x - player.x, z - player.z));
  state.turn = { y0: player.yaw, y1: yaw, p0: player.pitch, p1: Math.max(-0.5, Math.min(0.5, pitch)), t: 0, dur, done };
}

// ── Stair prompt ──────────────────────────────────────────────────────────
let promptStair = null;
function updateStairPrompt() {
  let found = null;
  if (!state.ride && !state.route) for (const s of STAIRS) {
    if (s.from === player.level && Math.hypot(player.x - s.bottom.x, player.z - s.bottom.z) < 1.5) found = { s, up: true };
    if (s.to === player.level && Math.hypot(player.x - s.top.x, player.z - s.top.z) < 1.5) found = { s, up: false };
  }
  const key = found ? found.s.id + found.up : null;
  if (key === promptStair) return; promptStair = key;
  const b = $('#stairBtn');
  b.hidden = !found;
  if (found) { b.innerHTML = found.up ? `<span>↑</span> Up to ${FLOORS[found.s.to].name}` : `<span>↓</span> Down to ${FLOORS[found.s.from].name}`; b.onclick = () => { const e = found.up ? found.s.bottom : found.s.top; walkTo(player.level, e.x, e.z, () => startRide(found.s, found.up)); }; }
}

// ── Doors, fans, markers ───────────────────────────────────────────────────
function updateDoors(dt) {
  for (const d of doors) {
    d.target = state.mode === 'overview' ? 1 : d.level === player.level && Math.hypot(player.x - d.cx, player.z - d.cz) < 2.0 ? 1 : 0;
    if (Math.abs(d.t - d.target) < 0.001) continue;
    d.t += Math.sign(d.target - d.t) * Math.min(Math.abs(d.target - d.t), dt * 1.6);
    const e = ease(d.t);
    for (const l of d.leaves) l.pivot.rotation.y = l.base + l.open * e;
    if (d.slide) d.slide.obj.position.set(d.slide.base.x + d.slide.dx * e, d.slide.base.y, d.slide.base.z + d.slide.dz * e);
  }
  for (const f of fans) f.r.rotation.y += dt * 4.5;
}
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }));
marker.visible = false; marker.renderOrder = 5; world.add(marker);
function showMarker(level, p) { if (!p) return; marker.position.set(p[0], groundY(level, p[0], p[1]) + 0.03, p[1]); marker.visible = true; }
function hideMarker() { marker.visible = false; }

// ── Rooms, labels, picking ────────────────────────────────────────────────
const labels = [];
function makeLabels() {
  floors.forEach((f, i) => FLOORS[i].rooms.forEach((room) => {
    if (room.noLabel) return;
    const el = document.createElement('button'); el.className = 'label' + (room.stair ? ' stair' : '');
    el.innerHTML = `<b>${room.n}</b><small>${room.d}</small>`;
    el.onclick = (e) => { e.stopPropagation(); selectRoom(i, room); };
    $('#labels').appendChild(el);
    const [x1, z1, x2, z2] = room.r;
    labels.push({ el, level: i, p: toWorld((x1 + x2) / 2, LEVEL_Y[i] + (room.y || 0) + 0.25, (z1 + z2) / 2) });
  }));
}
const v3 = new THREE.Vector3();
function updateLabels() {
  const show = state.mode === 'overview' && state.level !== 'all' && !state.fly && $('#labels').dataset.on !== 'off';
  const w = stage.clientWidth, h = stage.clientHeight;
  for (const l of labels) {
    const vis = show && l.level === state.level;
    if (!vis) { if (l.el.style.display !== 'none') l.el.style.display = 'none'; continue; }
    v3.copy(l.p).project(camera);
    if (v3.z > 1) { l.el.style.display = 'none'; continue; }
    l.el.style.display = 'flex'; l.el.style.transform = `translate(${(v3.x + 1) * w / 2}px, ${(1 - v3.y) * h / 2}px) translate(-50%, -50%)`;
  }
}
function roomViewpoint(level, room) {
  const [x1, z1, x2, z2] = room.r, g = grids[level], cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, inset = 0.5;
  const cands = [[x1 + inset, z1 + inset], [x2 - inset, z1 + inset], [x1 + inset, z2 - inset], [x2 - inset, z2 - inset], [cx, z2 - inset], [cx, z1 + inset], [x1 + inset, cz], [x2 - inset, cz], [cx, cz]];
  let best = null, bd = -1;
  for (const [x, z] of cands) { if (!g.ok(x, z)) continue; const d = Math.hypot(x - cx, z - cz); if (d > bd) { bd = d; best = [x, z]; } }
  if (!best) best = g.nearest(cx, cz, 2.5) || [cx, cz];
  return { x: best[0], z: best[1], look: [cx, LEVEL_Y[level] + 1.0, cz] };
}
function goToRoom(level, room) {
  const vp = roomViewpoint(level, room);
  const finish = () => lookAtPoint(...vp.look);
  stopTour();
  if (state.mode !== 'walk') { const yaw = Math.atan2(vp.look[0] - vp.x, vp.look[2] - vp.z); enterWalk(level, vp.x, vp.z, yaw); return; }
  if (level === player.level) { if (!walkTo(level, vp.x, vp.z, finish)) teleport(level, vp.x, vp.z, player.yaw, finish); }
  else teleport(level, vp.x, vp.z, Math.atan2(vp.look[0] - vp.x, vp.look[2] - vp.z));
}
function selectRoom(level, room) {
  state.selected = { level, room };
  const card = $('#roomCard'); card.hidden = false;
  card.querySelector('h3').textContent = room.n;
  card.querySelector('p').textContent = `${room.d} · ${FLOORS[level].name}`;
  card.querySelector('.walkin').onclick = () => { card.hidden = true; goToRoom(level, room); };
}
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayFrom(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); }
function onTap(e) {
  rayFrom(e);
  if (state.mode === 'overview') {
    if (state.level === 'all') { const hits = raycaster.intersectObjects(floors.map((f) => f.group), true); if (hits.length) { const y = hits[0].point.y; const lv = LEVEL_Y.reduce((a, v, i) => (y > v - 0.3 ? i : a), 0); setOverview(lv); } return; }
    const picks = floors[state.level].pickables, hit = raycaster.intersectObjects(picks, false)[0];
    if (hit) selectRoom(state.level, hit.object.userData.room); else $('#roomCard').hidden = true;
    return;
  }
  // walk: tap the floor (or a wall) to walk there
  const targets = [floors[player.level].group]; if (player.level === 0) targets.push(site);
  const hit = raycaster.intersectObjects(targets, true).find((h) => h.object.visible && h.object.material.visible !== false && !h.object.material.transparent);
  if (!hit) return;
  const p = hit.point.clone().sub(OFFSET);
  if (hit.face && hit.face.normal.y < 0.6) { const back = camera.position.clone().sub(OFFSET).sub(p).setY(0).normalize().multiplyScalar(0.35); p.add(back); }
  // tapping a staircase goes up or down it
  for (const s of STAIRS) {
    const box = s.flights.reduce((b, f) => { const r = f.rect || (f.axis === 'z' ? [f.x1, Math.min(f.s0, f.s1), f.x2, Math.max(f.s0, f.s1)] : [Math.min(f.s0, f.s1), f.z1, Math.max(f.s0, f.s1), f.z2]); return [Math.min(b[0], r[0]), Math.min(b[1], r[1]), Math.max(b[2], r[2]), Math.max(b[3], r[3])]; }, [99, 99, -99, -99]);
    if (inRect(box, p.x, p.z) && (s.from === player.level || s.to === player.level)) {
      const up = s.from === player.level, e2 = up ? s.bottom : s.top; stopTour();
      walkTo(player.level, e2.x, e2.z, () => startRide(s, up)); return;
    }
  }
  stopTour(); walkTo(player.level, p.x, p.z);
}

// ── Guided tour ───────────────────────────────────────────────────────────
function startTour(i = 0) {
  state.tour = { i, playing: true, timer: null };
  $('#tourCard').hidden = false; $('#roomCard').hidden = true;
  goStop(i);
}
function goStop(i) {
  const t = state.tour; if (!t) return; clearTimeout(t.timer); t.i = (i + TOUR.length) % TOUR.length;
  const s = TOUR[t.i];
  $('#tourTitle').textContent = s.t; $('#tourText').textContent = s.s; $('#tourStep').textContent = `${t.i + 1} / ${TOUR.length}`;
  $('#tourPlay').textContent = t.playing ? 'Pause' : 'Play';
  const arrive = () => lookAtPoint(s.look[0], LEVEL_Y[s.l] + s.look[1], s.look[2], 1.0, () => { if (state.tour?.playing) t.timer = setTimeout(() => goStop(t.i + 1), 5200); });
  if (state.mode !== 'walk') { enterWalk(s.l, s.x, s.z, Math.atan2(s.look[0] - s.x, s.look[2] - s.z)); setTimeout(arrive, 1400); return; }
  if (!walkTo(s.l, s.x, s.z, arrive)) teleport(s.l, s.x, s.z, player.yaw, arrive);
}
function pauseTour() { if (!state.tour) return; state.tour.playing = false; clearTimeout(state.tour.timer); $('#tourPlay').textContent = 'Play'; }
function stopTour() { if (!state.tour) return; clearTimeout(state.tour.timer); state.tour = null; $('#tourCard').hidden = true; }

// ── Minimap ───────────────────────────────────────────────────────────────
const mini = $('#minimap'), mctx = mini.getContext('2d');
const finishColor = { wood: '#d9c3a3', bath: '#c7d3d8', tile: '#ece7de', granite: '#bdb5aa', pavers: '#c9c9c4', deck: '#c7a785', terrace: '#d7b9a0', marble: '#f2eee8' };
function drawMinimap() {
  const dpr = Math.min(devicePixelRatio, 2), cw = mini.clientWidth, ch = mini.clientHeight;
  if (mini.width !== cw * dpr) { mini.width = cw * dpr; mini.height = ch * dpr; }
  const pad = 8, sx = (cw - pad * 2) / (W + 0.4), s = Math.min(sx, (ch - pad * 2) / (D + 0.2)), ox = pad + 0.37 * s, oz = (ch - D * s) / 2;
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0); mctx.clearRect(0, 0, cw, ch);
  const L = player.level, X = (x) => ox + x * s, Z = (z) => oz + z * s;
  mctx.fillStyle = '#f7f4ee'; mctx.fillRect(X(L === 0 ? -0.37 : 0), Z(0), (W + (L === 0 ? 0.37 : 0)) * s, D * s);
  for (const r of FLOORS[L].rooms) { mctx.fillStyle = r.stair ? '#d9d4ca' : finishColor[r.f] || '#ece7de'; mctx.fillRect(X(r.r[0]), Z(r.r[1]), (r.r[2] - r.r[0]) * s, (r.r[3] - r.r[1]) * s); }
  mctx.fillStyle = '#4a4744'; for (const r of floors[L].walls) mctx.fillRect(X(r[0]), Z(r[1]), Math.max(1, (r[2] - r[0]) * s), Math.max(1, (r[3] - r[1]) * s));
  mctx.save(); mctx.translate(X(player.x), Z(player.z)); mctx.rotate(-player.yaw);
  mctx.fillStyle = 'rgba(214,106,46,.22)'; mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, 26, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55); mctx.fill();
  mctx.fillStyle = '#d66a2e'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(0, 0, 5.5, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  mctx.restore();
  mini._map = { X0: ox, Z0: oz, s };
}
mini.addEventListener('click', (e) => {
  const r = mini.getBoundingClientRect(), m = mini._map; if (!m) return;
  const x = (e.clientX - r.left - m.X0) / m.s, z = (e.clientY - r.top - m.Z0) / m.s;
  stopTour(); walkTo(player.level, x, z);
});

// ── UI ────────────────────────────────────────────────────────────────────
function currentRoomName() {
  if (state.ride) return 'Staircase';
  if (player.level === 0 && player.z > D) return player.z > D + 1.5 ? 'On the road' : 'Driveway';
  const rooms = FLOORS[player.level].rooms.filter((r) => inRect(r.r, player.x, player.z) && !r.stair);
  rooms.sort((a, b) => (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]) - (b.r[2] - b.r[0]) * (b.r[3] - b.r[1]));
  return rooms[0]?.n || 'Passage';
}
let lastWhere = '';
function updateWhere() {
  const text = state.mode === 'walk' ? `${FLOORS[player.level].name} · ${currentRoomName()}` : state.level === 'all' ? 'Whole house' : FLOORS[state.level].name;
  if (text !== lastWhere) { lastWhere = text; $('#where').textContent = text; }
}
function updateUI() {
  const walk = state.mode === 'walk';
  document.body.classList.toggle('walking', walk);
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === state.mode));
  const active = walk ? String(player.level) : String(state.level);
  document.querySelectorAll('[data-level]').forEach((b) => b.classList.toggle('on', b.dataset.level === active));
  const L = walk ? player.level : state.level, chips = $('#rooms');
  const sig = walk + ':' + L;
  if (chips.dataset.sig !== sig) {
    chips.dataset.sig = sig; chips.innerHTML = '';
    if (L === 'all') { chips.innerHTML = `<p class="hint">${coarse ? 'Tap' : 'Click'} a floor to look inside, or press <b>Walk inside</b>.</p>`; }
    else {
      const seen = new Set();
      FLOORS[L].rooms.forEach((room) => {
        if (room.stair || room.noLabel || seen.has(room.n + room.r[0])) return; seen.add(room.n + room.r[0]);
        const b = document.createElement('button'); b.className = 'chip'; b.textContent = room.n;
        b.onclick = () => (walk ? goToRoom(L, room) : selectRoom(L, room)); chips.appendChild(b);
      });
    }
    const blurb = $('#blurb'); blurb.textContent = L === 'all' ? 'Four floors · 36′ × 23′ footprint on a 40′ road · Plot 194, Oorjitha’s Golden Leaf' : FLOORS[L].blurb;
  }
  promptStair = 'reset';
}
document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
  $('#roomCard').hidden = true;
  if (b.dataset.mode === 'walk') {
    if (state.mode === 'walk') return;
    const L = state.level === 'all' ? 0 : state.level, a = ARRIVAL[L];
    enterWalk(L, a.x, a.z, a.yaw);
  } else setOverview(state.mode === 'walk' ? player.level : state.level);
}));
document.querySelectorAll('[data-level]').forEach((b) => (b.onclick = () => {
  $('#roomCard').hidden = true; stopTour();
  const v = b.dataset.level;
  if (state.mode === 'walk') { if (v === 'all') { setOverview('all'); return; } const L = +v, a = ARRIVAL[L]; if (L !== player.level) teleport(L, a.x, a.z, a.yaw); return; }
  setOverview(v === 'all' ? 'all' : +v);
}));
$('#roomCard .close').onclick = () => { $('#roomCard').hidden = true; };
$('#tourBtn').onclick = () => (state.tour ? stopTour() : startTour(0));
$('#tourPrev').onclick = () => { if (state.tour) { state.tour.playing = false; state.route = null; goStop(state.tour.i - 1); } };
$('#tourNext').onclick = () => { if (state.tour) { state.route = null; goStop(state.tour.i + 1); } };
$('#tourPlay').onclick = () => { const t = state.tour; if (!t) return; t.playing = !t.playing; $('#tourPlay').textContent = t.playing ? 'Pause' : 'Play'; if (t.playing) goStop(t.i + 1); else clearTimeout(t.timer); };
$('#tourClose').onclick = stopTour;
$('#helpBtn').onclick = () => $('#help').showModal();
$('#help .ok').onclick = () => { $('#help').close(); tryStore('shelar-help', '1'); };
$('#planBtn').onclick = () => {
  const L = state.mode === 'walk' ? player.level : state.level, page = L === 'all' ? 1 : L + 2;
  showSheet(page); $('#planDlg').showModal();
};
function showSheet(p) {
  $('#sheet').src = (window.PLAN_SHEETS || {})[p] || `plans/sheet-${p}.jpg`;
  document.querySelectorAll('[data-sheet]').forEach((b) => b.classList.toggle('on', +b.dataset.sheet === p));
}
document.querySelectorAll('[data-sheet]').forEach((b) => (b.onclick = () => showSheet(+b.dataset.sheet)));
$('#planDlg .close').onclick = () => $('#planDlg').close();
$('#sunBtn').onclick = (e) => { e.stopPropagation(); $('#sunMenu').hidden = !$('#sunMenu').hidden; };
document.querySelectorAll('[data-time]').forEach((b) => (b.onclick = () => { setTime(b.dataset.time); $('#sunMenu').hidden = true; }));
$('#fsBtn').onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => {}); };
if (!document.documentElement.requestFullscreen) $('#fsBtn').hidden = true;
let toastTimer;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200); }

// ── Pointer input on the 3D view ──────────────────────────────────────────
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, moved: false, id: e.pointerId };
  if (state.mode === 'walk') renderer.domElement.setPointerCapture(e.pointerId);
  $('#sunMenu').hidden = true;
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!down || e.pointerId !== down.id) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
  if (state.mode === 'walk' && down.moved && !state.ride) {
    const k = coarse ? 0.0055 : 0.0042;
    player.yaw += (e.clientX - down.lx) * k; player.pitch = Math.max(-0.75, Math.min(0.75, player.pitch + (e.clientY - down.ly) * k));
    state.turn = null;
  }
  down.lx = e.clientX; down.ly = e.clientY;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (down && !down.moved && performance.now() - down.t < 450) onTap(e);
  down = null;
});
renderer.domElement.addEventListener('wheel', (e) => { if (state.mode === 'walk') { e.preventDefault(); camera.fov = Math.max(40, Math.min(85, camera.fov + Math.sign(e.deltaY) * 4)); camera.updateProjectionMatrix(); } }, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea, dialog')) return;
  if (state.mode === 'walk' && /^(Key[WASDQE]|Arrow\w+|Shift\w+)$/.test(e.code)) { keys.add(e.code); e.preventDefault(); }
  if (e.code === 'Escape' && state.tour) stopTour();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Joystick: push up to walk forward, sideways to turn.
const pad = $('#joy'), knob = $('#knob');
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); joy.active = true; moveJoy(e); });
pad.addEventListener('pointermove', (e) => { if (joy.active) moveJoy(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, () => { joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; });
function moveJoy(e) {
  const r = pad.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - r.left - R, dy = e.clientY - r.top - R, d = Math.min(R * 0.62, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
  const kx = Math.cos(a) * d, ky = Math.sin(a) * d; knob.style.transform = `translate(${kx}px, ${ky}px)`;
  joy.x = kx / (R * 0.62); joy.y = ky / (R * 0.62);
  if (Math.abs(joy.x) < 0.18) joy.x = 0; if (Math.abs(joy.y) < 0.12) joy.y = 0;
  joy.x *= 0.75;
}

// ── Resize and frame loop ─────────────────────────────────────────────────
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = state.mode === 'walk' ? (w < h ? 70 : 62) : 45; camera.updateProjectionMatrix();
}
new ResizeObserver(() => { resize(); if (state.mode === 'overview' && !state.fly) { const { target, pos } = overviewPose(state.level); controls.target.copy(target); if (!controls._userMoved) camera.position.copy(pos); } }).observe(stage);
controls.addEventListener('start', () => { controls._userMoved = true; });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.fly) {
    const f = state.fly; f.t = Math.min(1, f.t + dt / f.dur); const k = ease(f.t);
    camera.position.lerpVectors(f.p0, f.p1, k); camera.quaternion.slerpQuaternions(f.q0, f.q1, k);
    if (f.t >= 1) { state.fly = null; if (state.mode === 'overview') { controls.enabled = true; controls._userMoved = false; } f.done?.(); }
  } else if (state.mode === 'walk') updateWalk(dt);
  else controls.update();
  const wantFov = state.mode === 'walk' ? (camera.aspect < 1 ? 70 : 62) : 45;
  if (!state.fly && Math.abs(camera.fov - wantFov) > 0.1 && state.mode === 'overview') { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  if (state.fly && state.mode === 'walk' && Math.abs(camera.fov - wantFov) > 0.1) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  sun.target.position.set(0, 4, 0);
  updateDoors(dt); updateLabels(); updateWhere();
  if (state.mode === 'walk') drawMinimap();
  renderer.render(scene, camera);
}

// ── Boot ──────────────────────────────────────────────────────────────────
requestAnimationFrame(() => setTimeout(() => {
  buildHouse(); makeLabels(); setTime('morning'); resize();
  setOverview('all', false); updateUI();
  renderer.setAnimationLoop(frame);
  $('#loader').classList.add('done'); setTimeout(() => $('#loader').remove(), 700);
  if (!tryStore('shelar-help')) setTimeout(() => $('#help').showModal(), 900);
  window.__home = { state, player, floors, grids, walkTo, enterWalk, setOverview, startTour, goToRoom, camera, renderer, scene, teleport, STAIRS };
}, 30));
