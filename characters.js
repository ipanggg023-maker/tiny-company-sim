// Procedural chibi low-poly characters (Three.js) — Kairosoft-style proportions: big head, short body.
// Structure: root(Group, at floor) → body → hips → legs (pivot at hip) / torso → arms (pivot at shoulder) / head(Group).
import * as THREE from 'three';

const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68b59, 0x9c6b43, 0xf6d7bd];
const HAIR = [0x1d1a17, 0x3b2a1e, 0x6b4428, 0xb07a3c, 0x2b2b3a, 0x8a3b2a, 0xd9c7a0, 0x4a5fc1, 0xd96aa7];
const SHIRT = [0x4f86c6, 0xd9694c, 0x5aa36b, 0xe0b443, 0x8d6cc4, 0x46a3a3, 0xd95c8a, 0x6c7a89];
const PANTS = [0x2d3142, 0x3d405b, 0x4a4e69, 0x5c4b3b, 0x22333b];
const HAIR_STYLES = ['short', 'spiky', 'long', 'bun', 'bob', 'bald'];

// Body proportions (chibi): legs + torso ≈ head height.
const LEG = 0.3, TORSO = 0.4, HEAD = 0.62, ARM = 0.32;
export const HIP_STAND = LEG + 0.04, HIP_SIT = 0.5, HIP_SOFA = 0.42;
export const TOP_Y = HIP_STAND + TORSO + HEAD; // ≈ head top, for labels/gem

// Deterministic 0..1 random from a seed (so a person always looks the same after reload).
function seeded(seed) {
  let x = (seed * 2654435761) >>> 0;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
}

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return matCache.get(color);
}
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function lookFor(emp) {
  const r = seeded(emp.id * 7 + 13);
  const p = a => a[Math.floor(r() * a.length)];
  const traits = emp.traits || [];
  return {
    skin: p(SKIN), hair: p(HAIR), shirt: p(SHIRT), pants: p(PANTS), style: p(HAIR_STYLES),
    glasses: traits.includes('ช่างเรียนรู้') || r() < 0.15,
    mug: traits.includes('รักกาแฟ'),
    hoodie: traits.includes('เก็บตัว'),
    tie: traits.includes('ขยัน') || emp.ceo != null,
    blush: r() < 0.6,
    height: 0.96 + r() * 0.08,
  };
}

// Hair and face are modelled in the "old" 0.42 head space and scaled up to the chibi head.
function addHair(g, L) {
  const c = L.hair;
  switch (L.style) {
    case 'short': g.add(box(0.46, 0.12, 0.46, c, 0, 0.25, 0), box(0.46, 0.2, 0.1, c, 0, 0.12, -0.19)); break;
    case 'spiky':
      g.add(box(0.46, 0.08, 0.46, c, 0, 0.23, 0));
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat(c));
        s.position.set(-0.16 + i * 0.08, 0.33, (i % 2) * 0.08 - 0.04); s.rotation.z = (i - 2) * 0.2; g.add(s);
      }
      break;
    case 'long': g.add(box(0.47, 0.12, 0.47, c, 0, 0.25, 0), box(0.47, 0.5, 0.12, c, 0, 0.02, -0.2), box(0.08, 0.38, 0.4, c, -0.22, 0.05, -0.02), box(0.08, 0.38, 0.4, c, 0.22, 0.05, -0.02)); break;
    case 'bun': {
      g.add(box(0.46, 0.12, 0.46, c, 0, 0.25, 0));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(c)); b.position.set(0, 0.36, -0.12); g.add(b);
      break;
    }
    case 'bob': g.add(box(0.48, 0.14, 0.48, c, 0, 0.25, 0), box(0.48, 0.3, 0.14, c, 0, 0.08, -0.19), box(0.07, 0.28, 0.38, c, -0.23, 0.1, 0), box(0.07, 0.28, 0.38, c, 0.23, 0.1, 0)); break;
    default: break; // bald
  }
}

export function makeCharacter(emp) {
  const L = lookFor(emp);
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(L.height); root.add(body);

  const hips = new THREE.Group(); hips.position.y = HIP_STAND; body.add(hips);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.11, 0, 0); legR.position.set(0.11, 0, 0);
  for (const leg of [legL, legR]) leg.add(box(0.18, LEG, 0.2, L.pants, 0, -LEG / 2, 0), box(0.2, 0.08, 0.26, 0x222222, 0, -LEG + 0.02, 0.04));
  hips.add(legL, legR);

  const torso = new THREE.Group(); hips.add(torso);
  const top = L.hoodie ? 0x5b5f66 : L.shirt;
  torso.add(box(0.46, TORSO, 0.3, top, 0, TORSO / 2, 0));
  if (L.tie) torso.add(box(0.07, 0.24, 0.02, 0xa52a2a, 0, TORSO * 0.55, 0.16));

  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.3, TORSO - 0.06, 0); armR.position.set(0.3, TORSO - 0.06, 0);
  for (const arm of [armL, armR]) arm.add(box(0.13, ARM, 0.15, top, 0, -ARM / 2 + 0.02, 0), box(0.13, 0.1, 0.14, L.skin, 0, -ARM - 0.02, 0));
  if (L.mug) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), mat(0xf4f1ea));
    mug.position.set(0, -ARM - 0.08, 0.06); armR.add(mug);
  }
  torso.add(armL, armR);

  const head = new THREE.Group(); head.position.y = TORSO; torso.add(head);
  head.add(box(HEAD, HEAD * 0.92, HEAD, L.skin, 0, HEAD * 0.46, 0));
  const k = HEAD / 0.42, face = new THREE.Group(); // old head space → chibi head
  face.scale.setScalar(k); face.position.y = HEAD * 0.46 - 0.1 * k; head.add(face);
  // big shiny eyes
  for (const x of [-0.095, 0.095]) {
    face.add(box(0.075, 0.1, 0.02, 0x1a1a1a, x, 0.11, 0.215));
    face.add(box(0.025, 0.03, 0.01, 0xffffff, x + 0.018, 0.14, 0.226));
  }
  if (L.blush) face.add(box(0.06, 0.03, 0.01, 0xf29a9a, -0.15, 0.04, 0.216), box(0.06, 0.03, 0.01, 0xf29a9a, 0.15, 0.04, 0.216));
  const mouth = box(0.08, 0.025, 0.02, 0x7a3b3b, 0, 0.0, 0.215); face.add(mouth);
  if (L.glasses) face.add(box(0.36, 0.025, 0.02, 0x111111, 0, 0.15, 0.235), box(0.12, 0.11, 0.01, 0x9fc7e0, -0.095, 0.11, 0.232), box(0.12, 0.11, 0.01, 0x9fc7e0, 0.095, 0.11, 0.232));
  addHair(face, L);

  // Mood gem (Sims-style), colour updated from mood.
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x55cc66 }));
  gem.position.y = TOP_Y + 0.3; root.add(gem);

  root.traverse(o => { if (o.isMesh) o.userData.empId = emp.id; });
  return { root, body, hips, legL, legR, torso, armL, armR, head, mouth, gem, look: L, phase: Math.random() * 6 };
}

export function setMood(c, mood) {
  const col = mood > 60 ? 0x55cc66 : mood > 30 ? 0xe0b04f : 0xe0574c;
  c.gem.material.color.setHex(col);
  c.mood = mood;
}

// pose: walk | type | slack | sleep | sofa | stand | angry | cheer | chat | drink | stretch | sad
export function animate(c, pose, t, dt) {
  const k = Math.min(1, dt * 10); // smoothing
  const lerp = (o, key, v) => { o[key] += (v - o[key]) * k; };
  const ph = t + c.phase;
  const sad = (c.mood ?? 60) < 30;
  let hipY = HIP_STAND, legX = 0, armLX = 0, armRX = 0, headX = sad ? 0.22 : 0, headY = 0, headZ = 0, bodyZ = 0, torsoX = 0, legSwing = 0;
  const SIT = -Math.PI / 2;

  switch (pose) {
    case 'walk': // bouncy chibi walk
      legSwing = Math.sin(t * 12) * 0.7; armLX = -legSwing; armRX = legSwing; hipY = HIP_STAND + Math.abs(Math.sin(t * 12)) * 0.05; headZ = Math.sin(t * 6) * 0.06; break;
    case 'type':
      hipY = HIP_SIT; legX = SIT; armLX = -1.25 + Math.sin(ph * 14) * 0.1; armRX = -1.25 + Math.cos(ph * 15) * 0.1; headX += 0.08 + Math.sin(ph * 3) * 0.03; break;
    case 'slack':
      hipY = HIP_SIT; legX = SIT; armLX = -0.3; armRX = -2.6; headY = Math.sin(ph * 0.8) * 0.5; torsoX = -0.15; break;
    case 'sleep':
      hipY = HIP_SIT; legX = SIT; armLX = -1.5; armRX = -1.5; torsoX = 0.55; headX = 0.35; headZ = 0.2; break;
    case 'sofa':
      hipY = HIP_SOFA; legX = SIT; armLX = -0.2; armRX = c.look.mug ? -1.3 + Math.sin(ph) * 0.2 : -0.2; torsoX = -0.25; headY = Math.sin(ph * 0.5) * 0.3; break;
    case 'angry':
      armLX = -0.5 + Math.sin(t * 20) * 0.5; armRX = -0.5 - Math.sin(t * 20) * 0.5; bodyZ = Math.sin(t * 25) * 0.08; headX = -0.1; hipY = HIP_STAND + Math.abs(Math.sin(t * 14)) * 0.06; break;
    case 'cheer':
      armLX = -2.9 + Math.sin(t * 12) * 0.2; armRX = -2.9 - Math.sin(t * 12) * 0.2; hipY = HIP_STAND + Math.abs(Math.sin(t * 9)) * 0.18; break;
    case 'chat':
      armLX = -0.6 + Math.sin(t * 6) * 0.4; armRX = -0.3 + Math.cos(t * 5) * 0.35; headY = Math.sin(t * 2) * 0.15; headZ = Math.sin(t * 3) * 0.08; break;
    case 'drink':
      armRX = -2.4 + Math.sin(t * 2) * 0.1; armLX = 0.05; headX = -0.2; break;
    case 'stretch':
      armLX = -3.0; armRX = -3.0; torsoX = -0.2; hipY = HIP_SIT; legX = SIT; break;
    case 'sad':
      armLX = 0.1; armRX = 0.1; headX = 0.45; torsoX = 0.12; break;
    default: // stand, gentle idle sway
      armLX = Math.sin(ph * 2) * 0.05; armRX = -armLX; headZ = Math.sin(ph) * 0.04; break;
  }
  lerp(c.hips.position, 'y', hipY);
  if (pose === 'walk') { c.legL.rotation.x = legSwing; c.legR.rotation.x = -legSwing; }
  else { lerp(c.legL.rotation, 'x', legX); lerp(c.legR.rotation, 'x', legX); }
  lerp(c.armL.rotation, 'x', armLX); lerp(c.armR.rotation, 'x', armRX);
  lerp(c.head.rotation, 'x', headX); lerp(c.head.rotation, 'y', headY); lerp(c.head.rotation, 'z', headZ);
  lerp(c.torso.rotation, 'x', torsoX); lerp(c.body.rotation, 'z', bodyZ);
  c.gem.rotation.y = t * 2; c.gem.position.y = TOP_Y + 0.3 + Math.sin(t * 3 + c.phase) * 0.04;
}
