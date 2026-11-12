# 2.5D Procedural Low-Poly Method (proven working 2026-11-12)

Reusable recipe for adding an isometric 3D view with code-built characters to a browser game. No model files, no build step.

## Stack
- Three.js **0.170.0** via import map (jsDelivr):
  `"three": ".../three@0.170.0/build/three.module.js"`, `"three/addons/": ".../three@0.170.0/examples/jsm/"`.
- Addons: `OrbitControls`, `CSS2DRenderer`/`CSS2DObject` (HTML labels: names, emoji bubbles; Thai text renders fine).
- Must be served over http (`py -m http.server`); `file://` blocks modules.

## Architecture rule
- Game logic stays DOM-free (`game.js`). The 3D layer only **reads** state: `Office3D.sync(state)` + `Office3D.onLog(entry)`.
- Classic scripts load first; the 3D module loads last and exposes `window.Office3D`. The UI calls it with `window.Office3D?.…` so the game still works if WebGL or the CDN fails.
- Log entries carry `who: [ids]` (exact-token name match) so the 3D view knows who to animate. Never substring-match names (e.g. "ฝน" in "ฝนตก").

## Camera (the 2.5D look)
- `OrthographicCamera`, positioned at (+d, +d, +d) looking at the center.
- OrbitControls with `minPolarAngle 0.5 / maxPolarAngle 1.15` keeps the tilt; `screenSpacePanning`.
- Auto-fit zoom: `zoom = 12*aspect / (0.72*(width+depth) + 2)`; recompute on resize/layout change (ResizeObserver).
- Lights: Hemisphere + one Directional with shadows (PCFSoft, 2048 map, shadow camera ±30).

## Character recipe (`characters.js`)
- Hierarchy: `root (floor) → body (scale=height) → hips (y=0.5) → legL/legR (pivot at hip) + torso → armL/armR (pivot at shoulder) + head`.
- All parts = `BoxGeometry` with `MeshLambertMaterial({flatShading:true})`; cache materials per color.
- Look is **seeded by entity id** (xorshift) → same person looks the same after reload. Palettes: skin, hair, shirt, pants; 6 hair styles from boxes/cones/spheres.
- Traits → visible accessories (glasses, mug, tie, hoodie). Mood → Sims-style octahedron gem color above head.
- Front faces +Z. Facing a direction: `rotation.y = atan2(dx, dz)`. Sitting: legs `rotation.x = -π/2`.
- Poses are just target joint angles, lerped each frame (`k = min(1, dt*10)`): walk (sin swing), type, slack, sleep, sofa, angry (shake), cheer.

## Movement
- No navmesh: waypoint routing through known aisles/corridor (`own aisle → corridor → target aisle → seat`). Speed ~2.6 u/s.
- New entity spawns at the entrance and walks in; removed entity walks out, then is deleted.
- On layout rebuild (room added/upgraded): snap everyone to their new spot.

## Events → animation
- Map emoji in log text to pose + duration (💢 angry and face each other, 😴 sleep, ✅/🎉 everyone cheers).
- Bubble = CSS2DObject emoji floating up and fading; time it with simulated time.

## Testing (headless-friendly)
- Split `update(dt)` from `render()`. Expose `Office3D.advance(secs)` and `Office3D.debug()` (positions/targets).
- Hidden browser panes pause `requestAnimationFrame`, so test movement with `advance()`, not by waiting.
- Verify: no console errors, everyone reaches target, room change routes correctly, screenshot for the look.

## Known limits / next
- Paths can clip chairs when crossing rows to the sofa; fine at this scale.
- If it needs more polish: add simple furniture variety, day/night tint, a click-to-select outline.
