import * as THREE from 'three';

// A jointed person (about 1.74 m tall) for the Person view. Every limb hangs
// from a joint group, so walking is just joint rotations driven by a gait phase.
// The figure faces +Z; its feet are at the group origin.

const mat = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness });

function capsule(r, len, m) { const g = new THREE.CapsuleGeometry(r, len, 6, 14); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; return mesh; }
function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

export function createCharacter() {
  const skin = mat('#b97a56', 0.6), shirt = mat('#3e6d8e', 0.85), trousers = mat('#cdbfa6', 0.9), shoe = mat('#3a2a20', 0.5), hair = mat('#17120f', 0.9), dark = mat('#141414', 0.4), belt = mat('#4b3627', 0.6);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {};

  // hips and torso
  const hips = joint(body, 0, 0.95, 0); parts.hips = hips;
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), trousers); pelvis.scale.set(1.12, 0.72, 0.82); pelvis.castShadow = true; hips.add(pelvis);
  const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.04, 20), belt); beltMesh.scale.z = 0.8; beltMesh.position.y = 0.07; hips.add(beltMesh);
  const spine = joint(hips, 0, 0.04, 0); parts.spine = spine;
  const torso = capsule(0.15, 0.26, shirt); torso.scale.set(1.18, 1, 0.74); torso.position.y = 0.25; spine.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 8, 18), shirt); collar.rotation.x = Math.PI / 2; collar.position.y = 0.515; spine.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skin); neck.position.y = 0.545; spine.add(neck);

  // head
  const head = joint(spine, 0, 0.58, 0); parts.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); skull.scale.set(0.9, 1.12, 1.0); skull.position.y = 0.09; skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), skin); jaw.scale.set(1.0, 0.8, 1.0); jaw.position.set(0, 0.025, 0.02); head.add(jaw);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.106, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hairCap.scale.set(0.93, 1.1, 1.06); hairCap.position.set(0, 0.105, -0.008); hairCap.rotation.x = -0.25; head.add(hairCap);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 8), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.085, 0.1); head.add(nose);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), dark); eye.position.set(s * 0.034, 0.115, 0.088); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.007, 0.01), hair); brow.position.set(s * 0.036, 0.137, 0.09); head.add(brow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.09, 0.09, 0); head.add(ear);
  }

  // arms: shoulder → elbow → hand
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const shoulder = joint(spine, s * 0.205, 0.45, 0); parts['shoulder' + side] = shoulder;
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), shirt); deltoid.castShadow = true; shoulder.add(deltoid);
    const upper = capsule(0.047, 0.2, shirt); upper.position.y = -0.14; shoulder.add(upper);
    const elbow = joint(shoulder, 0, -0.29, 0); parts['elbow' + side] = elbow;
    const fore = capsule(0.038, 0.19, skin); fore.position.y = -0.12; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin); hand.scale.set(0.75, 1.15, 0.5); hand.position.y = -0.27; hand.castShadow = true; elbow.add(hand);
  }

  // legs: hip → knee → ankle
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const hip = joint(hips, s * 0.088, -0.02, 0); parts['hip' + side] = hip;
    const thigh = capsule(0.072, 0.32, trousers); thigh.position.y = -0.22; hip.add(thigh);
    const knee = joint(hip, 0, -0.44, 0); parts['knee' + side] = knee;
    const shin = capsule(0.058, 0.33, trousers); shin.position.y = -0.21; knee.add(shin);
    const ankle = joint(knee, 0, -0.45, 0); parts['ankle' + side] = ankle;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), shoe); foot.position.set(0, -0.005, 0.055); foot.castShadow = true; ankle.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), shoe); toe.scale.set(1, 0.7, 1); toe.position.set(0, -0.01, 0.17); ankle.add(toe);
  }

  // soft contact shadow, since the sun's shadow map is only refreshed for static changes
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32); grad.addColorStop(0, 'rgba(0,0,0,.42)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  blob.position.y = 0.012; blob.renderOrder = 2; root.add(blob);

  let phase = 0, amount = 0, t = 0;
  // speed: metres per second along the ground (or stairs); dt in seconds
  function animate(speed, dt) {
    t += dt;
    amount += (Math.min(1, speed / 1.3) - amount) * Math.min(1, dt * 8);
    phase += dt * speed * (Math.PI * 2 / 1.35);
    const a = amount, sn = Math.sin(phase), cs = Math.cos(phase);
    for (const [side, ph] of [['L', 0], ['R', Math.PI]]) {
      const s = Math.sin(phase + ph), c2 = Math.cos(phase + ph);
      const thigh = -s * 0.46 * a, kneeBend = a * (0.07 + 0.78 * Math.max(0, c2));
      parts['hip' + side].rotation.x = thigh;
      parts['knee' + side].rotation.x = kneeBend;
      parts['ankle' + side].rotation.x = -(thigh + kneeBend) * 0.55 + a * 0.12 * Math.max(0, -c2);
      const sign = side === 'L' ? 1 : -1;
      parts['shoulder' + side].rotation.x = s * 0.42 * a + (1 - a) * 0.03;
      parts['shoulder' + side].rotation.z = sign * (0.07 + (1 - a) * 0.02 * Math.sin(t * 1.2));
      parts['elbow' + side].rotation.x = -(0.2 + 0.25 * a) - Math.max(0, -s) * 0.25 * a;
    }
    hips.position.y = 0.95 - a * 0.012 + a * 0.022 * Math.cos(phase * 2) + (1 - a) * 0.004 * Math.sin(t * 1.6);
    hips.rotation.y = -sn * 0.07 * a; hips.rotation.z = cs * 0.035 * a;
    spine.rotation.y = sn * 0.11 * a; spine.rotation.x = 0.04 * a + (1 - a) * 0.012 * Math.sin(t * 1.6);
    head.rotation.y = -sn * 0.05 * a; head.rotation.x = -0.04 * a;
  }
  animate(0, 0);
  return { root, animate };
}
