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

## Chibi (Kairosoft) proportions
- LEG 0.3, TORSO 0.4, HEAD 0.62 (head ≈ legs + torso). Export `TOP_Y` and hip heights from `characters.js` and place labels, bubbles and the gem relative to `TOP_Y`, never with hard-coded heights.
- Reuse the old face/hair modelling by putting it in a `face` group scaled by `HEAD / 0.42`. Big eyes with a white highlight, plus blush.
- Bouncy walk (hip bob and head tilt). Seated hip = chair top (0.5); short legs dangling is fine and looks cute.
- Kairosoft feel = constant little numbers: on each new game day, pop "+N" over every worker and "+฿" over every building.

## Town / multi-area scenes
- Put extra areas in the same world along the street, not behind the camera-facing walls (the camera looks from +x/+z, so fronts must face +z).
- Register every area (rooms, plots) in one `rooms` map with an `aisleX`, so the same waypoint router can send people between them via the street corridor.
- View toggle: lerp `controls.target` and the camera by the same delta, and lerp zoom only while a view change is animating, so user zoom isn't fought.
- Rebuild signature = everything that changes layout or props (dept levels, research keys, subs, trophies). Snap people into place only on the first build.

## Movement
- No navmesh: waypoint routing through known aisles/corridor (`own aisle → corridor → target aisle → seat`). Speed ~2.6 u/s.
- New entity spawns at the entrance and walks in; removed entity walks out, then is deleted.
- On layout rebuild (room added/upgraded): snap everyone to their new spot.

## Events → animation
- Map emoji in log text to pose + duration (💢 angry and face each other, 😴 sleep, ✅/🎉 everyone cheers).
- Bubble = CSS2DObject emoji floating up and fading; time it with simulated time.

## Atmosphere & juice
- Post: `EffectComposer` → `RenderPass` → `UnrealBloomPass(strength, 0.5, threshold 0.82)` → `OutputPass`. Only things brighter than the threshold glow: make glowing parts `MeshBasicMaterial` with color × 2–3.5 at night.
- Day/night: one phase value drives background color, hemi/sun intensity and color, sun position, PointLight per room (on at night), glow multipliers, window color, bloom strength.
- Confetti: one `InstancedMesh` pool (240 planes) with velocity, gravity, drag and spin. Hide a dead particle by setting its scale to 0.
- Money/feedback popups = CSS2D labels floating up. Screen shake = CSS keyframes on the container (also moves the labels).
- Sounds: Web Audio oscillators and envelopes, no files. Rate-limit each sound (~70 ms).
- "Life director": every ~1–2 s pick one idle person and give them a short task (dest, wait, pose, faceTo, bubble). Afterwards they return home automatically.

## Gotcha: CSS2D label cleanup
- `CSS2DObject` removes its own HTML only when it's removed directly. Removing a parent group (`world.clear()`, `scene.remove(root)`) leaves nested label divs on screen.
- Always remove through `drop(obj)`, which first does `obj.traverse(o => o.isCSS2DObject && o.element.remove())`.

## Deploy
- Static files only, so use GitHub Pages from `main` root: `gh repo create <name> --public --source . --push`, then `gh api -X POST repos/<owner>/<name>/pages -f "source[branch]=main" -f "source[path]=/"`. Poll `pages/builds/latest` until it reports `built`.
- Commit with `<user>@users.noreply.github.com` so the private email stays private.

## Testing (headless-friendly)
- `advance()` must also call `labels.render()`: CSS2D elements only attach to the DOM during a render.
- Hidden panes also freeze CSS transitions, so screenshots can look stale. Check DOM state rather than trusting the pixels.
- Split `update(dt)` from `render()`. Expose `Office3D.advance(secs)` and `Office3D.debug()` (positions/targets).
- Hidden browser panes pause `requestAnimationFrame`, so test movement with `advance()`, not by waiting.
- Verify: no console errors, everyone reaches target, room change routes correctly, screenshot for the look.

## Known limits / next
- Paths can clip chairs when crossing rows to the sofa; fine at this scale.
- If it needs more polish: add simple furniture variety, day/night tint, a click-to-select outline.
