// Procedural low-poly characters (Three.js). No external models.
// Structure: root(Group, at floor) → hips(Group) → legs (pivot at hip) / torso → arms (pivot at shoulder) / head(Group).
import * as THREE from 'three';

const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68b59, 0x9c6b43, 0xf6d7bd];
const HAIR = [0x1d1a17, 0x3b2a1e, 0x6b4428, 0xb07a3c, 0x2b2b3a, 0x8a3b2a, 0xd9c7a0];
const SHIRT = [0x4f86c6, 0xd9694c, 0x5aa36b, 0xe0b443, 0x8d6cc4, 0x46a3a3, 0xd95c8a, 0x6c7a89];
const PANTS = [0x2d3142, 0x3d405b, 0x4a4e69, 0x5c4b3b, 0x22333b];
const HAIR_STYLES = ['short', 'spiky', 'long', 'bun', 'bob', 'bald'];

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
  return {
    skin: p(SKIN), hair: p(HAIR), shirt: p(SHIRT), pants: p(PANTS), style: p(HAIR_STYLES),
    glasses: emp.traits.includes('ช่างเรียนรู้') || r() < 0.15,
    mug: emp.traits.includes('รักกาแฟ'),
    hoodie: emp.traits.includes('เก็บตัว'),
    tie: emp.traits.includes('ขยัน'),
    height: 0.95 + r() * 0.12,
  };
}

function addHair(head, L) {
  const c = L.hair;
  switch (L.style) {
    case 'short': head.add(box(0.46, 0.12, 0.46, c, 0, 0.25, 0), box(0.46, 0.2, 0.1, c, 0, 0.12, -0.19)); break;
    case 'spiky':
      head.add(box(0.46, 0.08, 0.46, c, 0, 0.23, 0));
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat(c));
        s.position.set(-0.16 + i * 0.08, 0.33, (i % 2) * 0.08 - 0.04); s.rotation.z = (i - 2) * 0.2; head.add(s);
      }
      break;
    case 'long': head.add(box(0.47, 0.12, 0.47, c, 0, 0.25, 0), box(0.47, 0.5, 0.12, c, 0, 0.02, -0.2), box(0.08, 0.38, 0.4, c, -0.22, 0.05, -0.02), box(0.08, 0.38, 0.4, c, 0.22, 0.05, -0.02)); break;
    case 'bun': {
      head.add(box(0.46, 0.12, 0.46, c, 0, 0.25, 0));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(c)); b.position.set(0, 0.36, -0.12); head.add(b);
      break;
    }
    case 'bob': head.add(box(0.48, 0.14, 0.48, c, 0, 0.25, 0), box(0.48, 0.3, 0.14, c, 0, 0.08, -0.19), box(0.07, 0.28, 0.38, c, -0.23, 0.1, 0), box(0.07, 0.28, 0.38, c, 0.23, 0.1, 0)); break;
    default: break; // bald
  }
}

export function makeCharacter(emp) {
  const L = lookFor(emp);
  const root = new THREE.Group();
  const body = new THREE.Group(); // everything that bobs/leans
  body.scale.setScalar(L.height);
  root.add(body);

  const hips = new THREE.Group(); hips.position.y = 0.5; body.add(hips);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.11, 0, 0); legR.position.set(0.11, 0, 0);
  legL.add(box(0.18, 0.5, 0.2, L.pants, 0, -0.25, 0), box(0.19, 0.08, 0.26, 0x222222, 0, -0.47, 0.04));
  legR.add(box(0.18, 0.5, 0.2, L.pants, 0, -0.25, 0), box(0.19, 0.08, 0.26, 0x222222, 0, -0.47, 0.04));
  hips.add(legL, legR);

  const torso = new THREE.Group(); hips.add(torso);
  const top = L.hoodie ? 0x5b5f66 : L.shirt;
  torso.add(box(0.5, 0.56, 0.3, top, 0, 0.28, 0));
  if (L.tie) torso.add(box(0.07, 0.3, 0.02, 0xa52a2a, 0, 0.36, 0.16));
  if (L.hoodie) torso.add(box(0.42, 0.18, 0.12, top, 0, 0.58, -0.14));

  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.32, 0.52, 0); armR.position.set(0.32, 0.52, 0);
  armL.add(box(0.14, 0.48, 0.16, top, 0, -0.22, 0), box(0.13, 0.1, 0.14, L.skin, 0, -0.5, 0));
  armR.add(box(0.14, 0.48, 0.16, top, 0, -0.22, 0), box(0.13, 0.1, 0.14, L.skin, 0, -0.5, 0));
  if (L.mug) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), mat(0xf4f1ea));
    mug.position.set(0, -0.58, 0.06); armR.add(mug);
  }
  torso.add(armL, armR);

  const head = new THREE.Group(); head.position.y = 0.58; torso.add(head);
  head.add(box(0.42, 0.42, 0.42, L.skin, 0, 0.1, 0));
  head.add(box(0.06, 0.07, 0.02, 0x1a1a1a, -0.09, 0.13, 0.215), box(0.06, 0.07, 0.02, 0x1a1a1a, 0.09, 0.13, 0.215));
  const mouth = box(0.12, 0.03, 0.02, 0x7a3b3b, 0, 0.0, 0.215); head.add(mouth);
  if (L.glasses) head.add(box(0.34, 0.03, 0.02, 0x111111, 0, 0.15, 0.23), box(0.1, 0.09, 0.01, 0x9fc7e0, -0.09, 0.13, 0.225), box(0.1, 0.09, 0.01, 0x9fc7e0, 0.09, 0.13, 0.225));
  addHair(head, L);

  // Mood gem (Sims-style), colour updated from mood.
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x55cc66 }));
  gem.position.y = 1.85; root.add(gem);

  root.traverse(o => { if (o.isMesh) o.userData.empId = emp.id; });
  return { root, body, hips, legL, legR, torso, armL, armR, head, mouth, gem, look: L, phase: Math.random() * 6 };
}

export function setMood(c, mood) {
  const col = mood > 60 ? 0x55cc66 : mood > 30 ? 0xe0b04f : 0xe0574c;
  c.gem.material.color.setHex(col);
  c.mood = mood;
}

// pose: 'walk' | 'type' | 'slack' | 'sofa' | 'stand' | 'angry' | 'sleep' | 'cheer'
export function animate(c, pose, t, dt) {
  const k = Math.min(1, dt * 10); // smoothing
  const lerp = (o, key, v) => { o[key] += (v - o[key]) * k; };
  const ph = t * 1 + c.phase;
  const sad = (c.mood ?? 60) < 30;
  let hipY = 0.5, legX = 0, armLX = 0, armRX = 0, headX = sad ? 0.25 : 0, headY = 0, bodyZ = 0, torsoX = 0, legSwing = 0;

  switch (pose) {
    case 'walk':
      legSwing = Math.sin(t * 10) * 0.6; armLX = -legSwing * 0.8; armRX = legSwing * 0.8; hipY = 0.5 + Math.abs(Math.sin(t * 10)) * 0.03; break;
    case 'type':
      hipY = 0.47; legX = -Math.PI / 2; armLX = -1.1 + Math.sin(ph * 14) * 0.08; armRX = -1.1 + Math.cos(ph * 15) * 0.08; torsoX = 0.08; headX += 0.1; break;
    case 'slack':
      hipY = 0.47; legX = -Math.PI / 2; armLX = -0.3; armRX = -2.6; headY = Math.sin(ph * 0.8) * 0.5; torsoX = -0.15; break;
    case 'sleep':
      hipY = 0.47; legX = -Math.PI / 2; armLX = -1.4; armRX = -1.4; torsoX = 0.7; headX = 0.4; break;
    case 'sofa':
      hipY = 0.4; legX = -Math.PI / 2; armLX = -0.2; armRX = c.look.mug ? -1.2 + Math.sin(ph) * 0.2 : -0.2; torsoX = -0.25; headY = Math.sin(ph * 0.5) * 0.3; break;
    case 'angry':
      armLX = -0.5 + Math.sin(t * 20) * 0.4; armRX = -0.5 - Math.sin(t * 20) * 0.4; bodyZ = Math.sin(t * 25) * 0.06; headX = -0.1; break;
    case 'chat': // standing, hands gesturing
      armLX = -0.6 + Math.sin(t * 6) * 0.35; armRX = -0.3 + Math.cos(t * 5) * 0.3; headY = Math.sin(t * 2) * 0.15; break;
    case 'drink': // standing, mug to mouth
      armRX = -2.3 + Math.sin(t * 2) * 0.1; armLX = 0.05; headX = -0.15; break;
    case 'stretch':
      armLX = -3.0; armRX = -3.0; torsoX = -0.2; hipY = 0.47; legX = -Math.PI / 2; break;
    case 'sad':
      armLX = 0.1; armRX = 0.1; headX = 0.5; torsoX = 0.15; break;
    case 'cheer':
      armLX = -2.8 + Math.sin(t * 12) * 0.2; armRX = -2.8 - Math.sin(t * 12) * 0.2; hipY = 0.5 + Math.abs(Math.sin(t * 8)) * 0.12; break;
    default: // stand
      armLX = Math.sin(ph * 2) * 0.04; armRX = -armLX; break;
  }
  lerp(c.hips.position, 'y', hipY);
  if (pose === 'walk') { c.legL.rotation.x = legSwing; c.legR.rotation.x = -legSwing; }
  else { lerp(c.legL.rotation, 'x', legX); lerp(c.legR.rotation, 'x', legX); }
  lerp(c.armL.rotation, 'x', armLX); lerp(c.armR.rotation, 'x', armRX);
  lerp(c.head.rotation, 'x', headX); lerp(c.head.rotation, 'y', headY);
  lerp(c.torso.rotation, 'x', torsoX); lerp(c.body.rotation, 'z', bodyZ);
  c.gem.rotation.y = t * 2; c.gem.position.y = 1.85 + Math.sin(t * 3 + c.phase) * 0.04;
}
