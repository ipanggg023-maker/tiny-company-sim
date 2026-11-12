// 2.5D office view: isometric Three.js scene driven by game state (window.GameUI.state).
// See docs/3D_METHOD.md for the approach.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeCharacter, setMood, animate, TOP_Y } from './characters.js';

const host = document.getElementById('office3d');
const G = window.Game;
const DEPT_COLORS = {
  dev: [0xcfd8e3, 0xc3cdd9, 0x4f86c6], design: [0xead7e3, 0xe0cad8, 0xd95c8a],
  marketing: [0xf0e2c6, 0xe7d6b5, 0xe0a030], data: [0xd3e6d6, 0xc5dcc9, 0x46a37a],
};
const SPEED = 2.6, DAY_LENGTH = 150; // seconds per visual day/night cycle
const state = () => window.GameUI?.state;
const has = (S, id) => !!(S && S.research && S.research[id]);

// ---------- renderer / camera / post ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = 'o3d-labels';
host.appendChild(labels.domElement);
const clockEl = document.createElement('div'); clockEl.className = 'o3d-clock'; host.appendChild(clockEl);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbcd9ea);
const cam = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 300);
cam.position.set(20, 20, 20);
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true; controls.minZoom = 0.5; controls.maxZoom = 4;
controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.15; // keep the 2.5D tilt
controls.screenSpacePanning = true;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8577, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
scene.add(hemi, sun, sun.target);

let fitSize = 16;
function fit() { // zoom so the whole office (width + depth, seen diagonally) fits
  const a = host.clientWidth / Math.max(1, host.clientHeight);
  cam.zoom = Math.max(controls.minZoom, Math.min(2.2, (12 * a) / (0.72 * fitSize + 2)));
  cam.updateProjectionMatrix();
}
function resize() {
  const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
  const a = w / h, v = 6;
  cam.left = -v * a; cam.right = v * a; cam.top = v; cam.bottom = -v; cam.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h); labels.setSize(w, h); fit();
}
new ResizeObserver(resize).observe(host); resize();

// ---------- materials & props ----------
const matCache = new Map();
const M = c => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return matCache.get(c); };
const glowMats = []; // MeshBasic materials that brighten at night: {mat, base, day, night}
function glow(color, day, night) {
  const mat = new THREE.MeshBasicMaterial({ color });
  glowMats.push({ mat, base: new THREE.Color(color), day, night });
  return mat;
}
function box(w, h, d, c, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? M(c) : c);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow; parent.add(m); return m;
}
function checkerTex(a, b, rx, ry) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#' + a.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#' + b.toString(16).padStart(6, '0'); g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}
function makeDesk(dual) {
  const g = new THREE.Group();
  box(1.4, 0.06, 0.7, 0xb08457, 0, 0.75, 0, g);
  for (const [x, z] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) box(0.06, 0.75, 0.06, 0x6e5238, x, 0.375, z, g);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x1c2733 });
  for (const sx of dual ? [-0.3, 0.3] : [0]) { // research "จอคู่" adds a second monitor
    box(0.6, 0.38, 0.05, 0x222428, sx, 1.05, -0.18, g);
    box(0.54, 0.32, 0.01, screenMat, sx, 1.05, -0.152, g, false);
  }
  box(0.08, 0.14, 0.08, 0x222428, 0, 0.83, -0.2, g);
  box(0.4, 0.02, 0.14, 0x3a3d42, 0, 0.79, 0.08, g);
  box(0.12, 0.12, 0.12, [0xe0574c, 0x4f86c6, 0xe0b443, 0x5aa36b][Math.floor(Math.random() * 4)], 0.5, 0.84, -0.1, g); // mug/toy
  box(0.5, 0.06, 0.5, 0x3d4b5c, 0, 0.45, 0.75, g); // chair
  box(0.5, 0.5, 0.06, 0x3d4b5c, 0, 0.73, 1.0, g);
  box(0.06, 0.42, 0.06, 0x555555, 0, 0.22, 0.75, g);
  g.userData.screenMat = screenMat;
  return g;
}
function makeSofa(len, c) {
  const g = new THREE.Group();
  box(0.8, 0.35, len, c, 0, 0.2, 0, g);
  box(0.25, 0.45, len, c - 0x101010, 0.3, 0.55, 0, g);
  box(0.8, 0.5, 0.2, c - 0x101010, 0, 0.3, -len / 2, g); box(0.8, 0.5, 0.2, c - 0x101010, 0, 0.3, len / 2, g);
  box(0.15, 0.25, 0.3, 0xf2d06b, 0.1, 0.48, -0.6, g); // cushion
  return g;
}
function makePlant(big) {
  const g = new THREE.Group(), s = big ? 1.4 : 1;
  box(0.35 * s, 0.35 * s, 0.35 * s, 0xb5651d, 0, 0.18 * s, 0, g);
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 * s, 0), M(0x4f9a4f)); leaf.position.y = 0.75 * s; leaf.castShadow = true; g.add(leaf);
  const leaf2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * s, 0), M(0x5fb35f)); leaf2.position.set(0.12, 1.05 * s, 0.05); leaf2.castShadow = true; g.add(leaf2);
  return g;
}
function makeCoffee() {
  const g = new THREE.Group();
  box(0.7, 0.8, 0.5, 0x8b8f96, 0, 0.4, 0, g);
  box(0.45, 0.5, 0.4, 0x2f3236, 0, 1.05, 0, g);
  box(0.12, 0.08, 0.05, glow(0xff5050, 1, 2.5), 0.1, 1.2, 0.21, g, false);
  return g;
}
function makeShelf() {
  const g = new THREE.Group();
  box(1.2, 1.6, 0.35, 0x8a6a48, 0, 0.8, 0, g);
  const cols = [0xd9694c, 0x4f86c6, 0xe0b443, 0x5aa36b, 0x8d6cc4, 0xf4f1ea];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) box(0.12, 0.3 + (i % 3) * 0.04, 0.25, cols[(i + r * 2) % 6], -0.45 + i * 0.17, 0.35 + r * 0.5, 0.04, g);
  return g;
}
function makeLamp() {
  const g = new THREE.Group();
  box(0.02, 0.6, 0.02, 0x333333, 0, 2.95, 0, g, false);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.25, 8, 1, true), M(0x2f3236)); shade.position.y = 2.55; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), glow(0xfff1c9, 0.8, 3)); bulb.position.y = 2.45; g.add(bulb);
  return g;
}
function makeTree(s) {
  const g = new THREE.Group();
  box(0.25 * s, 1 * s, 0.25 * s, 0x7a5636, 0, 0.5 * s, 0, g);
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 1.6 * s, 6), M(0x3f8a4a)); c1.position.y = 1.6 * s; c1.castShadow = true; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.65 * s, 1.2 * s, 6), M(0x4f9e58)); c2.position.y = 2.3 * s; c2.castShadow = true; g.add(c2);
  return g;
}
function makeArcade() {
  const g = new THREE.Group();
  box(0.7, 1.5, 0.6, 0x6c4cc4, 0, 0.75, 0, g);
  box(0.5, 0.4, 0.05, glow(0x4cf0c9, 1.2, 3), 0, 1.15, 0.31, g, false);
  box(0.6, 0.12, 0.3, 0x2b2b3a, 0, 0.8, 0.4, g);
  box(0.06, 0.12, 0.06, 0xff5e5e, -0.12, 0.92, 0.42, g);
  return g;
}
function makeRobot() {
  const g = new THREE.Group();
  box(0.36, 0.4, 0.3, 0xcfd8e3, 0, 0.35, 0, g);
  box(0.3, 0.26, 0.26, 0xe6ecf2, 0, 0.7, 0, g);
  box(0.2, 0.06, 0.02, glow(0x4cc9f0, 1.4, 3), 0, 0.72, 0.14, g, false);
  box(0.03, 0.18, 0.03, 0x555555, 0, 0.92, 0, g);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), glow(0xff5e5e, 1.5, 3.5)); tip.position.y = 1.03; g.add(tip);
  box(0.14, 0.12, 0.14, 0x8a93a0, -0.1, 0.08, 0, g); box(0.14, 0.12, 0.14, 0x8a93a0, 0.1, 0.08, 0, g);
  g.userData.bob = true;
  return g;
}
function makeTrophies(n) {
  const g = new THREE.Group();
  box(1.4, 0.06, 0.25, 0x8a6a48, 0, 1.0, 0, g);
  for (let i = 0; i < Math.min(n, 5); i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.16, 8), glow(0xf2c14e, 1.1, 1.6));
    cup.position.set(-0.5 + i * 0.25, 1.13, 0); g.add(cup);
    box(0.1, 0.04, 0.1, 0x6e5238, -0.5 + i * 0.25, 1.05, 0, g);
  }
  return g;
}
// Subsidiary buildings: colour, roof colour, and a little roof prop per business type.
const SUB_LOOK = {
  cafe: [0xc98b5a, 0x8a4b2a], bakery: [0xf2d1a0, 0xd9694c], arcade: [0x6c4cc4, 0x2b2b3a], gym: [0x5c6b7a, 0xe0b443],
  hostel: [0x7fb3a8, 0x3d6b62], studio: [0x3a3d42, 0xd95c8a], fintech: [0x4f86c6, 0x1f3b5c],
};
function roofProp(type, g, y) {
  const P = (geo, c, x, yy, z) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? M(c) : c); m.position.set(x, yy, z); m.castShadow = true; g.add(m); return m; };
  switch (type) {
    case 'cafe': P(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 10), 0xf4f1ea, 0, y + 0.35, 0); P(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10), 0x5a3a22, 0, y + 0.71, 0); break;
    case 'bakery': { const m = P(new THREE.TorusGeometry(0.4, 0.17, 6, 10, Math.PI * 1.3), 0xe0a050, 0, y + 0.3, 0); m.rotation.x = -Math.PI / 2; break; }
    case 'arcade': P(new THREE.BoxGeometry(0.9, 0.2, 0.6), 0x2b2b3a, 0, y + 0.1, 0); P(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), 0x222222, -0.2, y + 0.45, 0); P(new THREE.SphereGeometry(0.12, 8, 6), glow(0xff5e5e, 1.3, 3), -0.2, y + 0.72, 0); P(new THREE.SphereGeometry(0.08, 8, 6), glow(0x4cc9f0, 1.3, 3), 0.25, y + 0.25, 0); break;
    case 'gym': { const bar = P(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), 0x888888, 0, y + 0.3, 0); bar.rotation.z = Math.PI / 2; for (const x of [-0.6, 0.6]) { const w = P(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10), 0x222222, x, y + 0.3, 0); w.rotation.z = Math.PI / 2; } break; }
    case 'hostel': P(new THREE.BoxGeometry(0.9, 0.5, 0.1), glow(0xffe6a8, 1, 2.5), 0, y + 0.3, 0); break;
    case 'studio': P(new THREE.BoxGeometry(0.7, 0.45, 0.45), 0x222222, 0, y + 0.25, 0); { const l = P(new THREE.CylinderGeometry(0.15, 0.18, 0.3, 10), 0x111111, 0, y + 0.25, 0.35); l.rotation.x = Math.PI / 2; } P(new THREE.SphereGeometry(0.06, 6, 4), glow(0xff3b3b, 1.5, 3.5), 0.25, y + 0.52, 0); break;
    case 'fintech': { const c = P(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), glow(0xf2c14e, 1.1, 1.8), 0, y + 0.6, 0); c.rotation.x = Math.PI / 2; c.userData.spin = true; break; }
  }
}
function makeBuilding(type, level) {
  const g = new THREE.Group(), [wall, roof] = SUB_LOOK[type] || [0xcccccc, 0x888888];
  const W = 4.2, D = 3.4, FH = 1.15;
  for (let f = 0; f < level; f++) {
    box(W, FH, D, wall, 0, f * FH + FH / 2, 0, g);
    for (const wx of [-1.2, 0, 1.2]) if (f > 0 || wx !== 0) box(0.7, 0.5, 0.05, glow(0xbfe3f5, 0.9, 2.6), wx, f * FH + 0.62, D / 2 + 0.02, g, false);
    box(0.05, 0.5, 0.7, glow(0xbfe3f5, 0.9, 2.6), W / 2 + 0.02, f * FH + 0.62, 0, g, false);
    box(W + 0.1, 0.06, D + 0.1, roof, 0, (f + 1) * FH, 0, g); // floor trim
  }
  const top = level * FH;
  box(W + 0.3, 0.18, D + 0.3, roof, 0, top + 0.09, 0, g);
  box(0.9, 0.85, 0.06, 0x3a2a1e, 0, 0.43, D / 2 + 0.02, g, false); // door
  for (let i = 0; i < 6; i++) box(0.7, 0.06, 0.6, i % 2 ? 0xffffff : roof, -1.75 + i * 0.7, 1.0, D / 2 + 0.3, g, false); // awning stripes
  roofProp(type, g, top + 0.18);
  return { g, top };
}
function makeForSale() {
  const g = new THREE.Group();
  box(0.08, 1.0, 0.08, 0x6e5238, 0, 0.5, 0, g);
  box(0.9, 0.5, 0.05, 0xfafafa, 0, 1.0, 0.02, g);
  box(0.7, 0.08, 0.06, 0xd9694c, 0, 1.08, 0.03, g);
  return g;
}
function makeStreetLamp() {
  const g = new THREE.Group();
  box(0.1, 2.6, 0.1, 0x3a3d42, 0, 1.3, 0, g);
  box(0.5, 0.08, 0.1, 0x3a3d42, -0.2, 2.6, 0, g);
  box(0.25, 0.12, 0.2, glow(0xffe6a8, 0.4, 3.5), -0.4, 2.52, 0, g, false);
  return g;
}
// Remove an object and the HTML of any CSS2D labels inside it (three.js only cleans up the label itself, not nested ones).
function drop(obj) {
  obj.traverse(o => { if (o.isCSS2DObject) o.element.remove(); });
  obj.parent?.remove(obj);
}
function label(text, cls) {
  const el = document.createElement('div'); el.className = cls; el.textContent = text;
  return new CSS2DObject(el);
}

// ---------- rooms ----------
let rooms = new Map();
let roomSig = '', corridorZ = 8, total = 8;
const world = new THREE.Group(); scene.add(world);
const roomLights = [], windows = [];
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(0x8fb37a));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.21; ground.receiveShadow = true; scene.add(ground);

function seededRand(seed) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

function buildRooms(S, first) {
  for (const ch of [...world.children]) drop(ch); rooms = new Map(); roomLights.length = 0; glowMats.length = 0; windows.length = 0; bobbers.length = 0; spinners.length = 0;
  let x = 0;
  for (const d of S.depts) {
    const cap = G.capacity(d), rows = Math.ceil(cap / 2);
    const W = 8, D = Math.max(6, rows * 2.2 + 2.2);
    const [fa, fb, accent] = DEPT_COLORS[d.type] || [0xdddddd, 0xcccccc, 0x888888];
    const g = new THREE.Group(); g.position.x = x; world.add(g);
    const floor = new THREE.MeshLambertMaterial({ map: checkerTex(fa, fb, W, D) });
    box(W, 0.2, D, floor, W / 2, -0.1, D / 2, g);
    box(W, 2.6, 0.2, 0xf2efe8, W / 2, 1.3, -0.1, g); // back wall
    box(0.2, 2.6, D, 0xebe7de, -0.1, 1.3, D / 2, g); // side wall
    box(W, 0.18, 0.04, accent, W / 2, 0.09, 0.02, g); // baseboard stripe
    box(0.04, 0.18, D, accent, 0.02, 0.09, D / 2, g);
    windows.push(box(2.2, 1.0, 0.05, new THREE.MeshBasicMaterial({ color: 0xbfe3f5 }), W / 2, 1.5, 0.03, g, false)); // colour set by daylight
    box(0.06, 1.0, 0.07, 0xffffff, W / 2, 1.5, 0.05, g, false);
    // whiteboard with scribbles
    box(1.5, 0.9, 0.05, 0xfafafa, 1.3, 1.5, 0.04, g);
    [[0xd9694c, 0.3], [0x4f86c6, 0.15], [0x5aa36b, 0.0]].forEach(([c, y], i) => box(0.9 - i * 0.2, 0.04, 0.02, c, 1.2, 1.55 + y - 0.1, 0.08, g, false));
    // posters on the side wall
    box(0.04, 0.7, 0.5, accent, 0.04, 1.6, 2.2, g); box(0.04, 0.5, 0.4, 0xf2d06b, 0.04, 1.5, 3.4, g);
    const shelf = makeShelf(); shelf.position.set(W - 1.2, 0, 0.3); g.add(shelf);
    const sign = label(`${G.DEPTS[d.type].icon} ${G.DEPTS[d.type].name} · Lv.${d.level}`, 'o3d-room');
    sign.position.set(W / 2, 3.1, 0); g.add(sign);
    const desks = [];
    for (let i = 0; i < cap; i++) {
      const desk = makeDesk(has(S, 'monitor'));
      desk.position.set(1.4 + (i % 2) * 2.3, 0, 1.4 + Math.floor(i / 2) * 2.2);
      g.add(desk);
      desks.push({ desk, seat: new THREE.Vector3(x + desk.position.x, 0, desk.position.z + 0.75) });
    }
    for (let r = 0; r < rows; r += 2) { const l = makeLamp(); l.position.set(2.55, 0, 1.6 + r * 2.2); g.add(l); }
    const rug = box(1.6, 0.02, 3, accent, W - 0.9, 0.01, 3.2, g, false); rug.receiveShadow = true;
    const sofa = makeSofa(2.4, 0x7a5c8f); sofa.position.set(W - 0.7, 0, 3.2); g.add(sofa);
    const sofaSeats = [-0.8, 0, 0.8, -0.4, 0.4].map(dz => new THREE.Vector3(x + W - 0.75, 0, 3.2 + dz));
    const coffee = makeCoffee(); coffee.position.set(W - 0.5, 0, 1.4); coffee.rotation.y = -Math.PI / 2; g.add(coffee);
    const plant = makePlant(true); plant.position.set(W - 0.6, 0, D - 0.6); g.add(plant);
    const plant2 = makePlant(false); plant2.position.set(0.4, 0, D - 0.5); g.add(plant2);
    const light = new THREE.PointLight(0xffd9a0, 0, 10, 1.2); light.position.set(W / 2, 2.4, D / 2); g.add(light); roomLights.push(light);
    // research unlocks show up as furniture
    if (has(S, 'coffee')) box(0.5, 0.1, 0.42, glow(0xf2c14e, 1.1, 1.8), W - 0.5, 1.36, 1.4, g, false); // gold top = premium machine
    if (has(S, 'plants')) for (const z of [1.2, D - 1.8]) { const pl = makePlant(false); pl.position.set(0.4, 0, z); g.add(pl); }
    if (has(S, 'library')) { const sh = makeShelf(); sh.position.set(W - 2.5, 0, 0.3); g.add(sh); }
    if (has(S, 'game')) { const ar = makeArcade(); ar.position.set(W - 0.55, 0, D - 1.7); ar.rotation.y = -Math.PI / 2; g.add(ar); }
    if (has(S, 'robot')) { const rb = makeRobot(); rb.position.set(0.55, 0, 0.6); rb.rotation.y = Math.PI / 4; g.add(rb); bobbers.push(rb); }
    if (d === S.depts[0] && S.trophies && S.trophies.length) { const tr = makeTrophies(S.trophies.length); tr.position.set(W / 2 + 2.1, 0, 0.15); g.add(tr); }
    // aisleX: walkway between the two desk columns (desks span x 0.7–2.1 and 3.0–4.4).
    rooms.set(d.id, {
      id: d.id, desks, sofaSeats, aisleX: x + 2.55, exit: new THREE.Vector3(x + 2.55, 0, D + 2.5),
      coffeeSpot: new THREE.Vector3(x + W - 1.35, 0, 1.4), center: new THREE.Vector3(x + W / 2, 0, D / 2), x, W, D,
    });
    x += W + 1.2;
  }
  corridorZ = Math.max(...[...rooms.values()].map(r => r.D)) + 0.8;
  total = Math.max(8, x - 1.2);
  buildTown(S);
  const end = townX0 + G.MAX_SUBS * PLOT_W;
  // street, lamps, trees outside (the street runs past the offices and the town)
  box(end + 6, 0.06, 2.4, 0xc9c2b2, end / 2, -0.18, corridorZ + 0.6, world);
  box(end + 6, 0.04, 3.2, 0x55585e, end / 2, -0.19, corridorZ + 3.4, world);
  for (let i = 0; i < end / 3; i++) box(1.2, 0.02, 0.15, 0xf2efe8, i * 3, -0.16, corridorZ + 3.4, world, false); // lane marks
  for (let lx = -1; lx <= end + 1; lx += 6) { const l = makeStreetLamp(); l.position.set(lx, 0, corridorZ + 1.7); world.add(l); }
  const rnd = seededRand(42);
  for (let i = 0; i < Math.ceil(end / 2.5) + 6; i++) {
    const t = makeTree(0.8 + rnd() * 0.6);
    const side = rnd();
    if (side < 0.7) t.position.set(-3 + rnd() * (end + 6), 0, -2 - rnd() * 4);
    else t.position.set(-2 - rnd() * 3, 0, rnd() * corridorZ);
    world.add(t);
  }
  const sc = sun.shadow.camera, ext = Math.max(20, end * 0.7);
  Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext, far: 160 }); sc.updateProjectionMatrix();
  setView(view, !!first);
}

// ---------- town: subsidiary plots to the right of the offices, facing the street ----------
const PLOT_W = 6.5;
let townX0 = 12, plots = [];
function buildTown(S) {
  townX0 = total + 3; plots = [];
  const z0 = 0.4, Dp = 5.6, front = z0 + Dp;
  for (let i = 0; i < G.MAX_SUBS; i++) {
    const cx = townX0 + i * PLOT_W + PLOT_W / 2;
    const g = new THREE.Group(); g.position.set(cx, 0, z0 + Dp / 2); world.add(g);
    box(PLOT_W - 0.4, 0.08, Dp, 0xd8d2c4, 0, -0.14, 0, g);
    const sub = (S.subs || []).find(x => x.plot === i);
    const plot = { id: 'plot' + i, i, cx, aisleX: cx, door: new THREE.Vector3(cx, 0, front + 0.5), center: new THREE.Vector3(cx, 0, z0 + Dp / 2), top: 2, sub, desks: null };
    if (sub) {
      const { g: b, top } = makeBuilding(sub.type, sub.level);
      b.position.z = -0.6; g.add(b); plot.top = top + 1;
      if (sub.type === 'fintech') b.traverse(o => { if (o.userData.spin) spinners.push(o); });
      const def = G.SUBS[sub.type];
      const ceo = sub.ceo != null ? (S.staff.find(e => e.id === sub.ceo) || {}).name : null;
      const sign = label(`${def.icon} ${def.name} · Lv.${sub.level}${ceo ? ' · CEO ' + ceo : ' · ไม่มี CEO'}`, 'o3d-room');
      sign.position.set(0, top + 1.3, 0); g.add(sign);
      for (const [px, pz] of [[-2.6, 2.3], [2.6, 2.3]]) { const pl = makePlant(false); pl.position.set(px, 0, pz); g.add(pl); }
    } else if (i <= (S.subs || []).length) {
      const fs = makeForSale(); fs.position.set(0, 0, 1.5); g.add(fs);
      const lab = label(G.hasResearch(S, 'holding') ? '🏷️ ที่ดินว่าง' : '🔒 วิจัย "ใบอนุญาตโฮลดิ้ง" ก่อน', 'o3d-name');
      lab.position.set(0, 1.6, 1.5); g.add(lab);
    }
    plots.push(plot); rooms.set(plot.id, plot);
  }
}

// ---------- camera views: office ↔ town ----------
let view = 'office';
const camGoal = new THREE.Vector3(), camOffset = new THREE.Vector3(20, 20, 20);
let zoomGoal = 1;
function setView(v, instant) {
  view = v;
  const owned = Math.max(3, plots.filter(p => p.sub).length + 1);
  const cx = v === 'town' ? townX0 + owned * PLOT_W / 2 : total / 2;
  fitSize = (v === 'town' ? owned * PLOT_W : total) + corridorZ;
  camGoal.set(cx, 0, corridorZ / 2);
  const a = host.clientWidth / Math.max(1, host.clientHeight);
  zoomGoal = Math.max(controls.minZoom, Math.min(2.2, (12 * a) / (0.72 * fitSize + 2)));
  if (instant) {
    controls.target.copy(camGoal); cam.position.copy(camGoal).add(camOffset); cam.zoom = zoomGoal; cam.updateProjectionMatrix(); controls.update();
  }
  if (!instant) camMoving = 1.5;
  viewBtns.forEach(b => b.classList.toggle("on", b.dataset.view === v));
}
const viewBar = document.createElement('div'); viewBar.className = 'o3d-views';
viewBar.innerHTML = '<button data-view="office" class="on">🏢 ออฟฟิศ</button><button data-view="town">🏙️ เมือง</button>';
host.appendChild(viewBar);
const viewBtns = [...viewBar.querySelectorAll('button')];
viewBar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { window.SFX?.play('click'); setView(b.dataset.view); } });
let camMoving = 0;
function updateCamera(dt) {
  const d = camGoal.clone().sub(controls.target);
  if (d.lengthSq() > 1e-4) { const step = d.multiplyScalar(Math.min(1, dt * 4)); controls.target.add(step); cam.position.add(step); }
  if (Math.abs(cam.zoom - zoomGoal) > 1e-3 && camMoving > 0) { cam.zoom += (zoomGoal - cam.zoom) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); }
  camMoving = Math.max(0, camMoving - dt);
}
const bobbers = [], spinners = [];

// Route: step into own aisle → along aisle (via the front corridor if changing rooms) → into the target spot.
function route(p, dest, toRoom) {
  const from = rooms.get(p.roomId) || toRoom, pos = p.c.root.position;
  const path = [];
  if (from) path.push(new THREE.Vector3(from.aisleX, 0, pos.z));
  if (from && from !== toRoom) path.push(new THREE.Vector3(from.aisleX, 0, corridorZ), new THREE.Vector3(toRoom.aisleX, 0, corridorZ));
  path.push(new THREE.Vector3(toRoom.aisleX, 0, dest.z), dest.clone());
  p.path = path; p.goal.copy(dest); p.roomId = toRoom.id;
}

// ---------- people ----------
// p.home = where the game says they belong; p.task = a short errand (coffee, visit a friend…), then they go home.
const people = new Map();
function spawn(e, at) {
  const c = makeCharacter(e);
  const name = label(e.name, 'o3d-name'); name.position.y = TOP_Y + 0.55; c.root.add(name);
  c.root.position.copy(at); scene.add(c.root);
  const p = { c, id: e.id, goal: at.clone(), path: [], roomId: null, home: null, task: null, emote: null, leaving: false };
  people.set(e.id, p);
  return p;
}
const bubbles = [];
const BUBBLE_Y = TOP_Y + 0.85;
function bubble(p, emoji, secs = 2.6, cls = 'o3d-bubble') {
  const b = label(emoji, cls); b.position.y = BUBBLE_Y; p.c.root.add(b);
  bubbles.push({ b, until: simT + secs, born: simT, y0: BUBBLE_Y });
}
// Small number that pops off a person (work points, LV UP).
function floatOver(p, text, cls, secs = 1.3) {
  const b = label(text, cls); b.position.set((Math.random() - 0.5) * 0.4, TOP_Y + 0.4, 0); p.c.root.add(b);
  bubbles.push({ b, until: simT + secs, born: simT, y0: TOP_Y + 0.4, rise: 0.9 });
}
function floatAt(pos, text, cls, secs = 1.8, y = 2.8) {
  const b = label(text, cls); b.position.copy(pos); b.position.y = y; scene.add(b);
  bubbles.push({ b, until: simT + secs, born: simT, y0: y });
}
function setEmote(p, pose, secs, faceTo = null) { p.emote = { pose, until: simT + secs, faceTo }; }

let lastDay = null;
function sync(S) {
  if (!S) return;
  // Rebuild the world when anything that changes the layout or props changes.
  const sig = [
    S.depts.map(d => d.id + ':' + d.level).join(','),
    Object.keys(S.research || {}).sort().join(','),
    (S.subs || []).map(x => `${x.id}:${x.type}:${x.level}:${x.ceo}:${x.plot}`).join(','),
    (S.trophies || []).length,
  ].join('|');
  let snap = false;
  if (sig !== roomSig) { const first = !roomSig; roomSig = sig; buildRooms(S, first); snap = first; }
  // Kairosoft-style: every new day, little numbers pop off everyone who worked and every subsidiary.
  if (lastDay !== null && S.day === lastDay + 1) {
    let n = 0;
    for (const e of S.staff) {
      const p = people.get(e.id);
      if (p && e.lastOut > 0 && e.dept != null && n++ < 24) floatOver(p, `+${e.lastOut}`, 'o3d-pt');
    }
    for (const sub of S.subs || []) {
      const pl = plots[sub.plot];
      if (pl && sub.lastProfit) floatAt(pl.center, `+฿${sub.lastProfit.toLocaleString()}`, 'o3d-coin', 1.6, pl.top);
    }
  }
  lastDay = S.day;
  const alive = new Set();
  for (const d of S.depts) {
    const room = rooms.get(d.id); if (!room) continue;
    const team = G.staffOf(S, d.id);
    const busy = S.contracts.some(c => c.dept === d.id);
    room.desks.forEach((k, i) => {
      const on = i < team.length && team[i].focus === 'work';
      k.desk.userData.screenMat.color.setHex(on ? (busy ? 0x5fb3e8 : 0x8aa0b0) : 0x1c2733);
      k.desk.userData.on = on;
    });
    let sofaI = 0;
    team.forEach((e, i) => {
      alive.add(e.id);
      let p = people.get(e.id);
      if (!p) { p = spawn(e, room.exit); p.roomId = room.id; }
      p.leaving = false;
      setMood(p.c, e.mood);
      const rest = e.focus === 'rest';
      p.home = {
        dest: (rest ? room.sofaSeats[sofaI++ % room.sofaSeats.length] : room.desks[i].seat).clone(),
        face: rest ? -Math.PI / 2 : Math.PI, pose: rest ? 'sofa' : 'type', roomId: room.id,
      };
      if (snap) { p.task = null; p.path = []; p.c.root.position.copy(p.home.dest); p.goal.copy(p.home.dest); p.roomId = room.id; }
    });
  }
  // CEOs stand at the door of their subsidiary.
  for (const sub of S.subs || []) {
    if (sub.ceo == null) continue;
    const e = S.staff.find(x => x.id === sub.ceo), pl = plots[sub.plot];
    if (!e || !pl) continue;
    alive.add(e.id);
    let p = people.get(e.id);
    if (!p) { p = spawn(e, pl.door); p.roomId = pl.id; }
    p.leaving = false; setMood(p.c, e.mood);
    p.home = { dest: pl.door.clone(), face: 0, pose: 'stand', roomId: pl.id, ceo: true };
    if (snap) { p.task = null; p.path = []; p.c.root.position.copy(p.home.dest); p.goal.copy(p.home.dest); p.roomId = pl.id; }
  }
  for (const [id, p] of people) {
    if (alive.has(id) || p.leaving) continue;
    p.leaving = true; p.emote = null;
    const r = rooms.get(p.roomId) || [...rooms.values()][0];
    p.task = { dest: new THREE.Vector3(r ? r.aisleX : 0, 0, corridorZ + 4), roomId: r && r.id, wait: 0, pose: 'stand', leave: true };
    p.goal.set(NaN, 0, 0); // force re-route
    bubble(p, '👋');
  }
}

// ---------- effects: confetti, coins, shake ----------
const CONF_N = 240;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF_N);
confetti.frustumCulled = false; scene.add(confetti);
const parts = Array.from({ length: CONF_N }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), life: 0 }));
const CONF_COLORS = [0xff5e5e, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xb388ff, 0xff8fab].map(c => new THREE.Color(c));
let confI = 0;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
for (let i = 0; i < CONF_N; i++) { confetti.setMatrixAt(i, m4.compose(zero, q, zero)); confetti.setColorAt(i, CONF_COLORS[i % 6]); }
function burst(at, n = 60) {
  for (let k = 0; k < n; k++) {
    const pt = parts[confI]; confI = (confI + 1) % CONF_N;
    pt.pos.set(at.x, 2.2, at.z);
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
    pt.vel.set(Math.cos(a) * s, 4 + Math.random() * 4, Math.sin(a) * s);
    pt.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    pt.life = 2.2 + Math.random();
  }
}
function updateConfetti(dt) {
  for (let i = 0; i < CONF_N; i++) {
    const pt = parts[i];
    if (pt.life <= 0) continue;
    pt.life -= dt;
    pt.vel.y -= 9 * dt; pt.vel.multiplyScalar(1 - 1.6 * dt);
    pt.pos.addScaledVector(pt.vel, dt);
    if (pt.pos.y < 0.02) { pt.pos.y = 0.02; pt.vel.set(0, 0, 0); pt.spin.set(0, 0, 0); }
    pt.rot.x += pt.spin.x * dt; pt.rot.y += pt.spin.y * dt; pt.rot.z += pt.spin.z * dt;
    q.setFromEuler(pt.rot);
    confetti.setMatrixAt(i, m4.compose(pt.pos, q, pt.life > 0 ? one : zero));
  }
  confetti.instanceMatrix.needsUpdate = true;
}
function shake(strong) {
  host.classList.remove('shake', 'shake-big'); void host.offsetWidth;
  host.classList.add(strong ? 'shake-big' : 'shake');
}

// ---------- game events → visuals ----------
const EMOTES = [
  [/💢|💥/, 'angry', 3], [/😴/, 'sleep', 4], [/🎉|🏆|🎂/, 'cheer', 2.5],
  [/💬|💰|💵|🤝|🫂|💞|✨/, 'cheer', 1.6], [/😰|💔|🥶/, 'sad', 3],
];
function onLog(entry) {
  const x = entry.x;
  const emoji = (x.match(/\p{Extended_Pictographic}/u) || [''])[0];
  const who = (entry.who || []).map(id => people.get(id)).filter(Boolean);
  const room = entry.dept != null ? rooms.get(entry.dept) : null;
  const S = state();
  const plot = entry.sub != null && S ? plots[(S.subs.find(v => v.id === entry.sub) || {}).plot] : null;
  if (/^⬆️/.test(x)) { for (const p of who) { floatOver(p, 'LV UP!', 'o3d-lvl', 1.6); setEmote(p, 'cheer', 1); } return; }
  if (/^🎓/.test(x)) { for (const p of who) bubble(p, '🎓', 3); return; }
  if (/^🎖️/.test(x)) { for (const p of who) { burst(p.c.root.position, 50); bubble(p, '🎖️', 3); setEmote(p, 'cheer', 2.5); } return; }
  if (/^(🌟|👍) /.test(x) && room) { floatAt(room.center, x.startsWith('🌟') ? '🌟 COMBO!!' : '👍 COMBO!', 'o3d-combo', 2.6, 3.4); if (x.startsWith('🌟')) burst(room.center, 80); return; }
  if (plot) {
    burst(plot.center, /^(🏙️|🌟)/.test(x) ? 90 : 50);
    if (/^🌟/.test(x)) floatAt(plot.center, '🌟 คอมโบธุรกิจ!', 'o3d-combo', 2.8, plot.top + 0.6);
    for (const p of who) { bubble(p, '👔', 2.5); setEmote(p, 'cheer', 2); }
    if (/^(🏙️|👔|🏗️)/.test(x)) setView('town');
    return;
  }
  if (/^🔬/.test(x)) { for (const r of rooms.values()) if (r.desks) burst(r.center, 40); for (const p of people.values()) if (!p.leaving && !p.home?.ceo) bubble(p, '💡', 2); return; }
  if (/งานประกาศรางวัล/.test(x)) { for (const r of rooms.values()) burst(r.center, 60); for (const p of people.values()) if (!p.leaving) { bubble(p, '🏆', 3); setEmote(p, 'cheer', 3); } return; }
  if (/^✅/.test(x)) {
    if (room) { burst(room.center, 70); floatAt(room.center, `+฿${(entry.amt || 0).toLocaleString()}`, 'o3d-coin big', 2.4); }
    for (const p of people.values()) if (!p.leaving && (!room || p.roomId === room.id)) { bubble(p, '🎉', 2); setEmote(p, 'cheer', 1.8); }
    return;
  }
  if (/^📝/.test(x) && room) { floatAt(room.center, `+฿${(entry.amt || 0).toLocaleString()}`, 'o3d-coin', 1.8); return; }
  if (/^❌/.test(x) && room) { shake(false); floatAt(room.center, '❌ ไม่ทันเดดไลน์', 'o3d-coin bad', 2.2); for (const p of people.values()) if (p.roomId === room.id) { bubble(p, '😩'); setEmote(p, 'sad', 2.5); } return; }
  if (/^(🏆|🎉|🎂)/.test(x)) {
    for (const r of rooms.values()) burst(r.center, 40);
    for (const p of people.values()) if (!p.leaving) { bubble(p, emoji, 2); setEmote(p, 'cheer', 2); }
    return;
  }
  if (/^🌧️/.test(x)) { for (const p of people.values()) bubble(p, '🌧️', 2); return; }
  if (/^(🏗️|🎨|📣|📊|💻)/.test(x) && /เปิด|ขยาย/.test(x)) { for (const r of rooms.values()) burst(r.center, 30); return; }
  if (/^(💢|💥)/.test(x)) shake(true);
  for (const p of who) {
    bubble(p, emoji || '💭');
    const hit = EMOTES.find(([re]) => re.test(x));
    if (hit) setEmote(p, hit[1], hit[2]);
  }
  if (/^(💢|💥)/.test(x) && who.length >= 2) { const [a, b] = who; a.emote.faceTo = b; b.emote.faceTo = a; }
}

// ---------- life director: small errands so the office feels alive ----------
let nextLife = 0;
function idle(p) { return !p.leaving && !p.task && !p.emote && p.home && p.path.length === 0 && p.c.root.position.distanceTo(p.home.dest) < 0.06; }
function lifeTick() {
  const S = state(); if (!S) return;
  const list = [...people.values()].filter(idle);
  if (!list.length) return;
  const p = list[Math.floor(Math.random() * list.length)];
  const e = S.staff.find(x => x.id === p.id); if (!e) return;
  const room = rooms.get(p.home.roomId); if (!room || !room.desks) return; // CEOs (town) have no errands
  const mates = list.filter(o => o !== p && o.home.roomId === room.id);
  const friend = G.friends(S, e).map(f => people.get(f.id)).find(o => o && mates.includes(o));
  const rival = G.rivals(S, e).map(f => people.get(f.id)).find(o => o && o.home.roomId === room.id && !o.leaving);
  const r = Math.random();
  if (rival && r < 0.3) { // glare
    setEmote(p, null, 2.5, rival); setEmote(rival, null, 2.5, p); bubble(p, '😒'); bubble(rival, '😤'); return;
  }
  if (friend && r < 0.55) { // walk over and chat
    const fd = friend.home.dest, side = friend.home.pose === 'sofa' ? -0.9 : 0.65;
    p.task = { dest: new THREE.Vector3(fd.x + side, 0, fd.z + (friend.home.pose === 'sofa' ? 0 : 0.1)), roomId: room.id, wait: 3.2, pose: 'chat', faceTo: friend, bubble: '💬' };
    setEmote(friend, null, 4.5, p);
    return;
  }
  if (e.mood < 25 && p.home.pose === 'type') { setEmote(p, 'sleep', 3.5); bubble(p, '💤', 3); return; }
  if (r < 0.75) { // coffee run
    p.task = { dest: room.coffeeSpot.clone(), roomId: room.id, wait: 2.4, pose: 'drink', face: Math.PI / 2, bubble: '☕' };
    return;
  }
  if (p.home.pose === 'type' && e.mood > 45) { setEmote(p, 'stretch', 1.6); bubble(p, '🙆', 1.6); }
}

// ---------- day / night ----------
const C = (h) => new THREE.Color(h);
const SKY_DAY = C(0xbcd9ea), SKY_NIGHT = C(0x0d1222), SKY_DUSK = C(0xf2a46b);
const tmpC = new THREE.Color(), WIN_DAY = C(0xd8f0fb), WIN_NIGHT = C(0x1d2b4f);
let daylight = 1;
function updateSky(t) {
  const phase = ((t / DAY_LENGTH) + 0.08) % 1; // 0 sunrise, .25 noon, .5 sunset, .75 midnight
  const s = Math.sin(phase * Math.PI * 2);
  daylight = THREE.MathUtils.clamp(s * 1.6 + 0.35, 0, 1);
  const dusk = Math.max(0, 1 - Math.abs(s) * 3) * (daylight > 0.05 ? 1 : 0.4);
  scene.background.copy(SKY_NIGHT).lerp(SKY_DAY, daylight).lerp(SKY_DUSK, dusk * 0.55);
  hemi.intensity = 0.45 + 1.1 * daylight;
  hemi.color.copy(C(0x6a7bb5)).lerp(C(0xffffff), daylight);
  sun.intensity = 0.15 + 1.5 * daylight;
  sun.color.copy(C(0x8899ff)).lerp(C(0xfff4e0), daylight).lerp(C(0xffa060), dusk * 0.6);
  const ang = phase * Math.PI * 2, cx = total / 2;
  sun.position.set(cx + Math.cos(ang) * 14, 6 + Math.max(0.2, s) * 12, 8 + Math.sin(ang) * 4);
  sun.target.position.set(cx, 0, corridorZ / 2);
  const night = 1 - daylight;
  for (const l of roomLights) l.intensity = night * 16;
  for (const g of glowMats) g.mat.color.copy(g.base).multiplyScalar(g.day + (g.night - g.day) * night);
  // windows: bright sky by day, deep blue at night
  tmpC.copy(WIN_NIGHT).lerp(WIN_DAY, daylight);
  for (const w of windows) w.material.color.copy(tmpC);
  bloom.strength = 0.25 + 0.85 * night;
  const hour = Math.floor(((phase + 0.25) % 1) * 24);
  clockEl.textContent = `${daylight > 0.5 ? '☀️' : daylight > 0.05 ? '🌇' : '🌙'} ${String(hour).padStart(2, '0')}:00`;
}

// ---------- click to select ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects([...people.values()].map(p => p.c.root), true).find(h => h.object.userData.empId);
  if (hit) { const p = people.get(hit.object.userData.empId); if (p) { bubble(p, '❗', 1.2); setEmote(p, 'cheer', 0.8); } window.GameUI?.focusEmp(hit.object.userData.empId); }
});

// ---------- loop ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let simT = 0;
function update(dt) {
  simT += dt; const t = simT;
  if (t > nextLife) { nextLife = t + 0.9 + Math.random() * 1.2; lifeTick(); }
  for (const [id, p] of people) {
    const pos = p.c.root.position;
    // choose where to go: errand first, otherwise home
    const want = p.task ? p.task : p.home ? { dest: p.home.dest, roomId: p.home.roomId } : null;
    if (want && !want.dest.equals(p.goal)) route(p, want.dest, rooms.get(want.roomId) || rooms.get(p.roomId) || [...rooms.values()][0]);
    while (p.path.length && pos.distanceTo(p.path[0]) < 0.05) p.path.shift();
    const next = p.path[0] || p.goal;
    tmp.subVectors(next, pos); tmp.y = 0;
    const dist = tmp.length();
    let pose = 'stand', face = p.home ? p.home.face : Math.PI;
    if (dist > 0.05 && Number.isFinite(next.x)) {
      pos.addScaledVector(tmp.normalize(), Math.min(dist, SPEED * dt));
      face = Math.atan2(tmp.x, tmp.z); pose = 'walk';
    } else if (p.task) {
      if (p.task.leave) { drop(p.c.root); people.delete(id); continue; }
      if (p.task.until == null) { p.task.until = t + p.task.wait; if (p.task.bubble) bubble(p, p.task.bubble, p.task.wait); }
      pose = p.task.pose; if (p.task.face != null) face = p.task.face;
      if (p.task.faceTo) { const o = p.task.faceTo.c.root.position; face = Math.atan2(o.x - pos.x, o.z - pos.z); }
      if (t >= p.task.until) p.task = null;
    } else if (p.home) {
      pose = p.home.pose;
      if (pose === 'type' && (p.c.mood ?? 60) < 25) pose = 'slack';
    }
    if (p.emote) {
      if (t >= p.emote.until) p.emote = null;
      else if (pose !== 'walk') {
        if (p.emote.pose) pose = p.emote.pose === 'sleep' && pose === 'sofa' ? 'sofa' : p.emote.pose;
        if (p.emote.faceTo && people.has(p.emote.faceTo.id)) { const o = p.emote.faceTo.c.root.position; face = Math.atan2(o.x - pos.x, o.z - pos.z); }
      }
    }
    let dy = face - p.c.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    p.c.root.rotation.y += dy * Math.min(1, dt * 8);
    animate(p.c, pose, t, dt);
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bb = bubbles[i], age = t - bb.born;
    bb.b.position.y = bb.y0 + age * (bb.rise || 0.4);
    bb.b.element.style.opacity = String(Math.max(0, Math.min(1, (bb.until - t) / 0.5, age / 0.15)));
    if (t >= bb.until) { bb.b.parent?.remove(bb.b); bb.b.element.remove(); bubbles.splice(i, 1); }
  }
  updateConfetti(dt);
  updateCamera(dt);
  for (const b of bobbers) b.position.y = Math.abs(Math.sin(t * 3 + b.position.x)) * 0.06;
  for (const s of spinners) s.rotation.y = t * 1.5;
  updateSky(t);
}
function frame() {
  update(Math.min(0.05, clock.getDelta()));
  controls.update();
  composer.render(); labels.render(scene, cam);
  requestAnimationFrame(frame);
}

function reset() {
  for (const p of people.values()) drop(p.c.root);
  people.clear(); roomSig = '';
  for (const bb of bubbles) { bb.b.parent?.remove(bb.b); bb.b.element.remove(); }
  bubbles.length = 0;
  for (const pt of parts) pt.life = 0;
}

window.Office3D = {
  sync, onLog, reset, burst: () => { for (const r of rooms.values()) burst(r.center, 60); },
  // Testing: run the simulation without rendering (hidden panes pause requestAnimationFrame).
  advance: (secs) => { for (let i = 0; i < secs * 30; i++) update(1 / 30); composer.render(); labels.render(scene, cam); },
  setTime: (secs) => { simT = secs; updateSky(simT); },
  debug: () => [...people.values()].map(p => ({ id: p.id, pos: p.c.root.position.toArray().map(v => +v.toFixed(2)), goal: p.goal.toArray().map(v => +v.toFixed(2)), home: p.home && p.home.pose, task: p.task && p.task.pose, emote: p.emote && p.emote.pose })),
};
host.classList.add('ready');
sync(state());
frame();
