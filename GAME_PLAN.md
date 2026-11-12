# บริษัทจิ๋ว — Company Tycoon Sim (Kairosoft-style)

## Decisions
- Tycoon: small company grows into departments, then subsidiaries (บริษัทลูก) in a town. Target feel: **Kairosoft** (Game Dev Story, Mega Mall Story).
- Browser, plain HTML/JS, no build step. Solo hobby project. UI/text in Thai.
- Hook: emergent stories from employee personalities and relationships, plus Kairosoft loops (combos, research, levels, yearly awards).
- 2.5D isometric Three.js view with chibi low-poly characters. Endless; bankruptcy = game over.

## Files
- `game.js`: pure logic (no DOM, runs in Node). `ui.js`: panels and tabs, autosave. `index.html`: layout and CSS. `sfx.js`: synth sounds.
- `office3d.js` + `characters.js`: 3D office, town and chibi people. Method: `docs/3D_METHOD.md`.
- `tools/balance-sim.js`: bot playtest, `node tools/balance-sim.js 300 365 smart|idle`.
- Run locally: `py -m http.server 8123 --directory D:\simulator` → http://localhost:8123

## Live
- Repo github.com/ipanggg023-maker/tiny-company-sim (public). Play: https://ipanggg023-maker.github.io/tiny-company-sim/
- GitHub Pages from `main` root. Deploy = commit + push (ask the user first).

## Systems
- **Employees**: 2 traits, mood, skill. **Level/XP** from work (xpNeed = 30+15·lvl, +0.3 skill per level). Skill is capped by **job tier** (caps 3/5/7/8.5/10); at the cap, pay to **promote** (1k/3k/8k/20k) to the next class (5 class names per department). Salary review every 30 days.
- **Relationships**: per-pair chemistry + traits → friends (≥50) and rivals (≤−50); quits cascade.
- **Contracts**: 30% deposit; client category × job title = **combo** (🌟 ×1.5 pay, 👍 ×1.2), discovered into the **combo book** on delivery.
- **Research** (💡 = 0.5 + 0.05·daily output, + 0.4% of subsidiary profit): 15 items. Perks, premium jobs per department, and `holding`, which unlocks subsidiaries. Unlocks appear as furniture in 3D.
- **Subsidiaries**: 7 types (café → fintech), max 6 plots, levels 1–5 (upgrade = cost × level). Profit = base × (1+0.45·(lvl−1)) × CEO factor (0.5 with no CEO, 0.7+0.06·skill with one) × (1+synergy). 8 business **pair combos**. The CEO is a promoted employee who leaves the office.
- **Calendar**: 10-day months, 120-day years. Songkran and Loy Krathong events. **Rivals** (4) earn by fixed daily curves. **Year-end awards**: prize by rank, Employee of the Year, report popup.
- Bankruptcy: money <0 for 7 days, or debt > max(5000, 3 days of costs).
- Save key `company-sim-save-v1` with `SAVE_VERSION` 2; `migrate()` upgrades v1 saves.

## Balance (bot, 300 runs × 365 days, 2026-11-12)
- Smart bot: 4% bankrupt. Year-1 rank median 2 (#1 in 29% of runs), year 2 #1 in 71%, year 3 #1 in 89%. All research by ~day 240, 6 subsidiaries by day 240.
- Idle bot: 34% bankrupt, always rank 5.
- Rival curve (revenue/day per strength 1.0): yr1 5,400 · yr2 27,000 · yr3+ 42,000×1.08^(y−3). Strengths 0.3/0.5/0.75/1.0, growing 0–12% per year.
- Known: late money still snowballs (millions by year 3). Possible sinks: more sub levels, town expansions, a hall of fame.

## Next ideas
- Human playtest of the new loops (is the combo book fun? promotions too frequent?).
- More Kairosoft flavour: a visiting mascot event, staff "special moves", a 20-year ending / hall of fame score.
