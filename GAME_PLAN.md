# บริษัทจิ๋ว — Company Tycoon Sim

## Decisions
- Tycoon: small company grows into multiple departments (สาย) under one parent company.
- Browser, plain HTML/JS, no build step. Solo hobby project. UI/text in Thai.
- Hook: emergent stories from employee personalities + relationships.
- Text + UI only. Endless; bankruptcy = game over.

## Files
- `index.html` (layout/CSS) · `ui.js` (rendering, input, localStorage autosave) · `game.js` (pure logic, no DOM, works in Node).
- `tools/balance-sim.js` — headless bot playtest: `node tools/balance-sim.js 300 365 smart|idle`.
- Run: `py -m http.server 8123 --directory D:\simulator` → http://localhost:8123 (file:// may not open in the app's browser pane).
- `office3d.js` + `characters.js` — 2.5D isometric office (Three.js 0.170 via CDN). Method: `docs/3D_METHOD.md`.
- `prototype.html` = old v0, can be deleted.

## 2.5D view (added 2026-11-12)
- One room per department (desks = capacity, sofa, coffee machine, plant). Employees are procedural low-poly people, look seeded by id, accessories from traits, mood gem above head.
- Working → typing at desk; rest → sofa; low mood → slumped; log events → emoji bubbles + poses (fight, sleep, cheer). Hire walks in, quit walks out.
- Click a character → jumps to their card. 🧊 3D button hides the view (remembered).

## Systems (v1, built 2026-11-12)
- Employees: 2 traits (10 kinds, conflicting pairs excluded), mood 0-100, skill 1-10 (grows while working), salary = 25+12·skill+1.5·skill² with auto review every 30 days.
- Relationships: pair value −100..100, daily drift = noise + fixed per-pair chemistry (from ids) + trait mods, pulled toward 0. ≥50 friends (mood+, synergy), ≤−50 rivals (mood−, slowdowns). Friend quits → others sad, may follow.
- Contracts: offers per dept (≤3), 30% deposit on accept, rest on delivery; miss deadline → lose rep ×2. Leftover capacity earns odd-job income.
- Departments: dev (start), design (rep 12, 3k), marketing (rep 25, 5k), data (rep 45, 8k). Levels 1-3: capacity 2+2L, contracts 1+L, rent 20+35L².
- Decision popups (pause game): raise request, rival feud, poaching, rush job, party.
- Rep capped 0-100, diminishing gains. Bankrupt: money <0 for 7 days or < −5000.
- Save key `company-sim-save-v1`; bump `SAVE_VERSION` in game.js when state shape changes.

## Balance (bot, 300 runs × 365 days)
- Smart bot: ~11% bankrupt; rep ~94 by day 90; 4 depts and 32 staff by day 180.
- Idle bot (accepts jobs only): ~76% bankrupt.
- Known issue: late-game money balloons (~300k by day 180, ~900k by day 365) and there is nothing to spend it on.

## Next
1. Human playtest: are stories memorable? Are decisions meaningful?
2. Late-game money sink + goal: subsidiaries (บริษัทลูก) spun off from departments, each with a manager employee.
3. Ideas: training, employee aging/life events, rival companies competing for clients, more decision events.
