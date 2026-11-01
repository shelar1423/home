import * as THREE from 'three';

// All surface textures are painted on canvases at start-up, so the page needs
// no image downloads. Each texture covers `metres` of real surface; geometry
// gets world-space UVs (see worldUV in builder.js) so patterns keep true scale.

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rand() * a.length)];

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function noise(ctx, size, n, alpha, colors = ['#000', '#fff'], scale = 1.4) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * rand();
    ctx.fillStyle = pick(colors);
    const s = rand() * scale + 0.4;
    ctx.fillRect(rand() * size, rand() * size, s, s);
  }
  ctx.globalAlpha = 1;
}
function tex(c, metres, anisotropy) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.userData.metres = metres;
  return t;
}

const painters = {
  plaster: (ctx, s) => { ctx.fillStyle = '#f3efe7'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 9000, 0.05, ['#cfc6b6', '#ffffff'], 2); },
  exterior: (ctx, s) => { ctx.fillStyle = '#ebe6dc'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 22000, 0.09, ['#b9b1a2', '#ffffff', '#d8d0c2'], 2.2); },
  accent: (ctx, s) => {
    ctx.fillStyle = '#5b5f62'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 20000, 0.12, ['#3b3e40', '#7c8083'], 2);
    ctx.strokeStyle = 'rgba(30,32,34,.55)'; ctx.lineWidth = 2;
    for (let y = 0; y <= s; y += s / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
    for (let row = 0; row < 4; row++) for (let x = (row % 2) * s / 4; x <= s; x += s / 2) { ctx.beginPath(); ctx.moveTo(x, row * s / 4); ctx.lineTo(x, (row + 1) * s / 4); ctx.stroke(); }
  },
  woodClad: (ctx, s) => {
    const n = 16, w = s / n;
    for (let i = 0; i < n; i++) {
      const l = 34 + rand() * 10; ctx.fillStyle = `hsl(26, 42%, ${l}%)`; ctx.fillRect(i * w, 0, w, s);
      for (let g = 0; g < 14; g++) { ctx.strokeStyle = `rgba(60,30,10,${0.08 + rand() * 0.12})`; ctx.lineWidth = 0.6 + rand(); const x = i * w + rand() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 3, s * 0.3, x - 3, s * 0.7, x + 1, s); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,10,5,.75)'; ctx.fillRect(i * w, 0, 2, s);
    }
  },
  wood: (ctx, s) => {
    const rows = 11, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * s * 0.6;
      while (x < s) {
        const len = s * (0.35 + rand() * 0.4), l = 46 + rand() * 12, hue = 28 + rand() * 6;
        ctx.fillStyle = `hsl(${hue}, 38%, ${l}%)`; ctx.fillRect(x, r * h, len, h);
        for (let g = 0; g < 9; g++) { ctx.strokeStyle = `rgba(70,40,15,${0.06 + rand() * 0.1})`; ctx.lineWidth = 0.5 + rand() * 1.2; const y = r * h + rand() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + len * 0.3, y + rand() * 4 - 2, x + len * 0.6, y + rand() * 4 - 2, x + len, y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(40,22,8,.5)'; ctx.fillRect(x, r * h, 1.5, h);
        x += len;
      }
      ctx.fillStyle = 'rgba(40,22,8,.45)'; ctx.fillRect(0, r * h, s, 1.5);
    }
  },
  tile: (ctx, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 90 + rand() * 3; ctx.fillStyle = `hsl(38, 22%, ${l}%)`; ctx.fillRect(i * w, j * w, w, w);
      for (let v = 0; v < 3; v++) { ctx.strokeStyle = `rgba(150,135,115,${0.07 + rand() * 0.08})`; ctx.lineWidth = 0.7 + rand() * 1.5; ctx.beginPath(); let x = i * w + rand() * w, y = j * w; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rand() - 0.5) * w * 0.5; y += w / 6; ctx.lineTo(x, y); } ctx.stroke(); }
    }
    ctx.strokeStyle = '#c9bfae'; ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, s); ctx.moveTo(0, i * w); ctx.lineTo(s, i * w); ctx.stroke(); }
  },
  marble: (ctx, s) => {
    ctx.fillStyle = '#f4f1ec'; ctx.fillRect(0, 0, s, s);
    for (let v = 0; v < 18; v++) { ctx.strokeStyle = `rgba(120,115,110,${0.06 + rand() * 0.14})`; ctx.lineWidth = 0.6 + rand() * 2.4; ctx.beginPath(); let x = rand() * s, y = 0; ctx.moveTo(x, y); while (y < s) { x += (rand() - 0.5) * 50; y += 20 + rand() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
  },
  bath: (ctx, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = `hsl(200, 6%, ${70 + rand() * 5}%)`; ctx.fillRect(i * w, j * w, w, w); }
    noise(ctx, s, 6000, 0.08, ['#555', '#fff']);
    ctx.strokeStyle = '#eef0f0'; ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, s); ctx.moveTo(0, i * w); ctx.lineTo(s, i * w); ctx.stroke(); }
  },
  bathWall: (ctx, s) => {
    const nx = 4, ny = 8, w = s / nx, h = s / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { ctx.fillStyle = `hsl(195, 10%, ${86 + rand() * 4}%)`; ctx.fillRect(i * w, j * h, w, h); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    for (let i = 0; i <= nx; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, s); ctx.stroke(); }
    for (let j = 0; j <= ny; j++) { ctx.beginPath(); ctx.moveTo(0, j * h); ctx.lineTo(s, j * h); ctx.stroke(); }
  },
  terrace: (ctx, s) => {
    ctx.fillStyle = '#6f6257'; ctx.fillRect(0, 0, s, s);
    const u = s / 16;   // basket-weave pavers, 2:1 bricks
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) for (let k = 0; k < 2; k++) {
      const hz = (i + j) % 2 === 0, x = i * 2 * u + (hz ? 0 : k * u), y = j * 2 * u + (hz ? k * u : 0), w = hz ? 2 * u : u, h = hz ? u : 2 * u;
      ctx.fillStyle = `hsl(${18 + rand() * 8}, ${22 + rand() * 8}%, ${56 + rand() * 7}%)`;
      ctx.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
    }
    noise(ctx, s, 9000, 0.08);
  },
  veneer: (ctx, s) => {
    ctx.fillStyle = '#c9a27a'; ctx.fillRect(0, 0, s, s);
    for (let g = 0; g < 140; g++) { ctx.strokeStyle = `rgba(${rand() < 0.5 ? '90,55,25' : '235,205,170'},${0.05 + rand() * 0.08})`; ctx.lineWidth = 0.5 + rand() * 2; const x = rand() * s; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + rand() * 10 - 5, s * 0.33, x + rand() * 10 - 5, s * 0.66, x + rand() * 6 - 3, s); ctx.stroke(); }
  },
  pavers: (ctx, s) => {
    ctx.fillStyle = '#7f7f7a'; ctx.fillRect(0, 0, s, s);
    const u = s / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) {
      ctx.fillStyle = `hsl(40, 4%, ${55 + rand() * 9}%)`;
      ctx.fillRect(i * u + (j % 2) * u / 2 + 2, j * u / 2 + 2, u - 4, u / 2 - 4);
    }
    noise(ctx, s, 12000, 0.12);
  },
  granite: (ctx, s) => { ctx.fillStyle = '#2a2826'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 26000, 0.5, ['#6d665e', '#151414', '#8b8378', '#3d3a36'], 2.6); },
  lobby: (ctx, s) => {
    const n = 2, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = `hsl(30, 8%, ${62 + rand() * 6}%)`; ctx.fillRect(i * w, j * w, w, w); }
    noise(ctx, s, 22000, 0.35, ['#3a3530', '#d8d2c8', '#8c8379'], 2.2);
    ctx.strokeStyle = '#4a4540'; ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, s); ctx.moveTo(0, i * w); ctx.lineTo(s, i * w); ctx.stroke(); }
  },
  deck: (ctx, s) => {
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) { ctx.fillStyle = `hsl(24, 30%, ${40 + rand() * 8}%)`; ctx.fillRect(0, i * w, s, w - 3); ctx.fillStyle = '#2b2018'; ctx.fillRect(0, i * w + w - 3, s, 3); }
    noise(ctx, s, 8000, 0.1, ['#000', '#d9b48c']);
  },
  stone: (ctx, s) => {
    ctx.fillStyle = '#6e6a63'; ctx.fillRect(0, 0, s, s);
    let y = 0; while (y < s) { const h = 30 + rand() * 40; let x = -rand() * 60; while (x < s) { const w = 50 + rand() * 90; ctx.fillStyle = `hsl(${30 + rand() * 15}, ${8 + rand() * 10}%, ${45 + rand() * 18}%)`; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); x += w; } y += h; }
    noise(ctx, s, 9000, 0.15);
  },
  concrete: (ctx, s) => { ctx.fillStyle = '#b9b6ae'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 26000, 0.12, ['#8d8a83', '#d6d3cc'], 2.5); },
  grass: (ctx, s) => {
    ctx.fillStyle = '#6f8a4b'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26000; i++) { ctx.fillStyle = `hsla(${80 + rand() * 30}, ${30 + rand() * 25}%, ${28 + rand() * 25}%, .55)`; ctx.fillRect(rand() * s, rand() * s, 1.2, 2 + rand() * 3); }
  },
  soil: (ctx, s) => { ctx.fillStyle = '#9b8466'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 26000, 0.35, ['#6d5a43', '#b9a07c', '#857055'], 2.8); },
  asphalt: (ctx, s) => { ctx.fillStyle = '#4c4d4f'; ctx.fillRect(0, 0, s, s); noise(ctx, s, 40000, 0.35, ['#2d2e30', '#6d6e70', '#5a5b5d'], 1.8); },
  fabric: (ctx, s) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) { ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.04})`; ctx.fillRect(0, y, s, 1); }
    for (let x = 0; x < s; x += 3) { ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.03})`; ctx.fillRect(x, 0, 1, s); }
  },
};

const sizes = { veneer: 512, plaster: 256, exterior: 512, accent: 512, granite: 512, concrete: 512, fabric: 128, grass: 512, asphalt: 512, soil: 512 };
const metres = { plaster: 2, exterior: 2.5, accent: 2.4, woodClad: 1.6, wood: 1.9, tile: 2.4, marble: 1.6, bath: 1.2, bathWall: 1.2, terrace: 1.8, veneer: 1.2, pavers: 1.6, granite: 0.8, lobby: 1.6, deck: 1.2, stone: 2, concrete: 3, grass: 3, soil: 3, asphalt: 4, fabric: 0.4 };

export function createMaterials(renderer, mobile) {
  const aniso = Math.min(mobile ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  const T = {};
  for (const [k, fn] of Object.entries(painters)) T[k] = tex(canvas(mobile ? Math.min(512, sizes[k] || 1024) : (sizes[k] || 1024), fn), metres[k], aniso);

  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const M = {
    plaster: std({ map: T.plaster, color: '#ffffff', roughness: 0.92 }),
    exterior: std({ map: T.exterior, roughness: 0.95 }),
    accent: std({ map: T.accent, roughness: 0.85 }),
    woodClad: std({ map: T.woodClad, roughness: 0.6 }),
    bathWall: std({ map: T.bathWall, roughness: 0.25 }),
    tile: std({ map: T.tile, roughness: 0.22 }),
    marble: std({ map: T.marble, roughness: 0.15 }),
    wood: std({ map: T.wood, roughness: 0.5 }),
    bath: std({ map: T.bath, roughness: 0.4 }),
    terrace: std({ map: T.terrace, roughness: 0.9 }),
    pavers: std({ map: T.pavers, roughness: 0.92 }),
    granite: std({ map: T.granite, roughness: 0.18 }),
    lobby: std({ map: T.lobby, roughness: 0.2 }),
    deck: std({ map: T.deck, roughness: 0.75 }),
    stone: std({ map: T.stone, roughness: 0.9 }),
    concrete: std({ map: T.concrete, roughness: 0.95 }),
    ceiling: std({ color: '#fbfaf6', emissive: '#fbf7ef', emissiveIntensity: 0.32, roughness: 0.95 }),
    grass: std({ map: T.grass, roughness: 1 }),
    soil: std({ map: T.soil, roughness: 1 }),
    asphalt: std({ map: T.asphalt, roughness: 0.95 }),
    kerb: std({ color: '#c9c6bd', map: T.concrete, roughness: 0.9 }),
    roadPaint: std({ color: '#f2efe4', roughness: 0.8 }),
    fascia: std({ color: '#4c4f52', map: T.concrete, roughness: 0.7 }),
    coping: std({ color: '#d7d3ca', map: T.concrete, roughness: 0.6 }),
    frame: std({ color: '#2a2c2f', roughness: 0.4, metalness: 0.6 }),
    steel: std({ color: '#c6c9cc', roughness: 0.25, metalness: 0.9 }),
    chrome: std({ color: '#e8ecef', roughness: 0.08, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#d9ecef', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide }),
    frosted: std({ color: '#e7eef0', roughness: 0.3, transparent: true, opacity: 0.75 }),
    doorWood: std({ map: T.veneer, color: '#e0c4a2', roughness: 0.5 }),
    darkWood: std({ map: T.veneer, color: '#7d5a42', roughness: 0.5 }),
    lightWood: std({ map: T.veneer, color: '#f3e3cc', roughness: 0.5 }),
    laminate: std({ color: '#e9e3d8', roughness: 0.45 }),
    laminateDark: std({ color: '#5d5148', roughness: 0.45 }),
    kitchenBlue: std({ color: '#5f7480', roughness: 0.4 }),
    white: std({ color: '#f6f5f1', roughness: 0.35 }),
    porcelain: std({ color: '#fbfbf9', roughness: 0.12 }),
    black: std({ color: '#1d1e20', roughness: 0.35 }),
    screen: std({ color: '#0d1013', roughness: 0.08, metalness: 0.2 }),
    fabricBeige: std({ map: T.fabric, color: '#c9b79c', roughness: 0.95 }),
    fabricGrey: std({ map: T.fabric, color: '#8a8f93', roughness: 0.95 }),
    fabricTeal: std({ map: T.fabric, color: '#4f7a7c', roughness: 0.95 }),
    fabricMustard: std({ map: T.fabric, color: '#c99a3b', roughness: 0.95 }),
    linen: std({ map: T.fabric, color: '#f1eee6', roughness: 0.95 }),
    duvet: std({ map: T.fabric, color: '#a9b8c2', roughness: 0.95 }),
    leather: std({ color: '#6b4a35', roughness: 0.55 }),
    leaf: std({ color: '#4f7a3a', roughness: 0.8 }),
    leafDark: std({ color: '#36592b', roughness: 0.8 }),
    trunk: std({ color: '#6a5140', roughness: 0.9 }),
    pot: std({ color: '#b5643c', roughness: 0.8 }),
    potGrey: std({ color: '#7c7d7a', roughness: 0.7 }),
    carPaint: new THREE.MeshPhysicalMaterial({ color: '#7d1d22', roughness: 0.25, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08 }),
    tyre: std({ color: '#1a1a1a', roughness: 0.9 }),
    rim: std({ color: '#b8bcc0', roughness: 0.3, metalness: 0.8 }),
    bikePaint: std({ color: '#25303a', roughness: 0.35, metalness: 0.4 }),
    brass: std({ color: '#c49a3c', roughness: 0.3, metalness: 0.9 }),
    tank: std({ color: '#25292c', roughness: 0.6 }),
    water: std({ color: '#6f9aa3', roughness: 0.05, metalness: 0.1 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff7e6', emissive: '#ffe9c2', emissiveIntensity: 0.6, roughness: 0.4 }),
    diya: new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 2, roughness: 0.4 }),
    rug: (c) => std({ map: T.fabric, color: c, roughness: 1 }),
    sign: null,
  };
  for (const m of Object.values(M)) if (m && m.isMaterial) m.userData.metres = m.map?.userData.metres || 1;
  return { M, T };
}

export function paintSky(top, horizon, ground) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top); grad.addColorStop(0.5, horizon); grad.addColorStop(0.52, horizon); grad.addColorStop(1, ground);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}
