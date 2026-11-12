// Headless balance check: node tools/balance-sim.js [runs] [days] [policy]
// policy: "smart" (reasonable player) or "idle" (accepts work, does nothing else)
const G = require('../game.js');
const RUNS = +process.argv[2] || 200, DAYS = +process.argv[3] || 365, POLICY = process.argv[4] || 'smart';

function play(s) {
  const A = G.actions;
  while (s.pending.length) A.decide(s, POLICY === 'smart' && s.pending[0].kind !== 'rush' ? 0 : 1);
  for (const o of s.offers.slice().sort((a, b) => b.pay / b.days - a.pay / a.days)) {
    if (POLICY === 'smart') {
      const d = G.deptOfType(s, o.type);
      const rate = G.staffOf(s, d.id).reduce((a, e) => a + G.baseOutput(e), 0);
      const left = s.contracts.filter(c => c.dept === d.id).reduce((a, c) => a + c.work - c.progress, 0);
      if ((left + o.work) / Math.max(1, rate) > o.days * 0.9) continue;
    }
    A.accept(s, o.id);
  }
  if (POLICY !== 'smart') return;
  for (const e of s.staff) {
    if (e.mood < 30) A.setFocus(s, e.id, 'rest');
    else if (e.mood > 60) A.setFocus(s, e.id, 'work');
    if (e.mood < 25 && s.money > 2000) A.bonus(s, e.id);
  }
  for (const t of Object.keys(G.DEPTS)) {
    const d = G.DEPTS[t];
    if (!G.deptOfType(s, t) && s.rep >= d.rep && s.money > d.cost + 4000) A.openDept(s, t);
  }
  for (const d of s.depts) {
    const team = G.staffOf(s, d.id);
    if (team.length >= G.capacity(d) && d.level < G.MAX_LEVEL && s.money > G.upgradeCost(d) + 5000) A.upgrade(s, d.id);
    const c = s.candidates.slice().sort((a, b) => b.skill - a.skill)[0];
    if (c && team.length < G.capacity(d) && s.money > G.signCost(c) + 2500 + s.staff.length * 300) A.hire(s, c.id, d.id);
  }
}

const res = [];
for (let r = 0; r < RUNS; r++) {
  const s = G.newGame();
  const snap = {};
  for (let i = 0; i < DAYS && !s.over; i++) {
    play(s); G.tick(s);
    if ([30, 90, 180, 365].includes(s.day - 1)) snap[s.day - 1] = { money: s.money, rep: s.rep, staff: s.staff.length, depts: s.depts.length };
  }
  res.push({ over: s.over, day: s.day, snap, stats: s.stats, stories: s.log.filter(l => l.t === 'story').length });
}
const pct = (n) => (100 * n / RUNS).toFixed(0) + '%';
const med = (arr) => { const a = arr.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : '-'; };
console.log(`policy=${POLICY} runs=${RUNS} days=${DAYS}`);
console.log('bankrupt:', pct(res.filter(r => r.over).length), ' median bankrupt day:', med(res.filter(r => r.over).map(r => r.day)));
for (const d of [30, 90, 180, 365]) {
  const xs = res.map(r => r.snap[d]).filter(Boolean);
  if (!xs.length) continue;
  console.log(`day ${d}: alive ${xs.length}  money ${med(xs.map(x => x.money))}  rep ${med(xs.map(x => x.rep))}  staff ${med(xs.map(x => x.staff))}  depts ${med(xs.map(x => x.depts))}`);
}
console.log('median done/failed/quit:', med(res.map(r => r.stats.done)), med(res.map(r => r.stats.failed)), med(res.map(r => r.stats.quit)), ' story events:', med(res.map(r => r.stories)));
