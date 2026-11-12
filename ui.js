// บริษัทจิ๋ว — UI layer
(function () {
'use strict';
const G = window.Game, A = G.actions;
const SAVE_KEY = 'company-sim-save-v1';
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('th-TH');

let S = null, timer = null, tab = 'depts', logFilter = 'all';

// ---------- save / load ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) {} }
function loadSaved() { try { return G.load(localStorage.getItem(SAVE_KEY)); } catch (_) { return null; } }

// ---------- helpers ----------
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.style.display = 'none'; }, 1800);
}
function act(fn, ...args) {
  const err = fn(S, ...args);
  if (err) toast(err);
  save(); render();
}
const moodColor = m => m > 60 ? 'var(--good)' : m > 30 ? 'var(--warn)' : 'var(--bad)';
const moodWord = m => m > 80 ? '😄' : m > 60 ? '🙂' : m > 40 ? '😐' : m > 20 ? '😟' : '😫';
const nameOf = id => (S.staff.find(e => e.id === id) || {}).name;

// ---------- views ----------
function empCard(e) {
  const fr = G.friends(S, e).map(o => o.name), rv = G.rivals(S, e).map(o => o.name);
  const deptOpts = S.depts.map(d => `<option value="${d.id}"${d.id === e.dept ? ' selected' : ''}>${G.DEPTS[d.type].icon} ${G.DEPTS[d.type].name}</option>`).join('');
  return `<div class="emp${e.focus === 'rest' ? ' rest' : ''}" id="emp-${e.id}">
    <h3><span>${e.name}</span><span class="small">${moodWord(e.mood)} ${Math.round(e.mood)}</span></h3>
    <div class="tags">${e.traits.map(t => `<span title="${G.TRAITS[t]}">${t}</span>`).join('')}</div>
    <div class="meter"><i style="width:${e.mood}%;background:${moodColor(e.mood)}"></i></div>
    <div class="cls">${G.classOf(S, e)} <b>Lv.${e.lvl}</b></div>
    <div class="meter xp" title="XP ${Math.floor(e.xp)}/${G.xpNeed(e.lvl)}"><i style="width:${Math.min(100, e.xp / G.xpNeed(e.lvl) * 100)}%"></i></div>
    <div class="small">ฝีมือ ${e.skill.toFixed(1)}/${G.TIER_CAP[e.tier]} · ${e.salary} ฿/วัน · ทำงานมา ${e.days} วัน${e.disciplined > 0 ? ' · 🫡 ตั้งใจ' : ''}</div>
    ${G.canPromote(e) ? `<button class="promo" data-a="promote" data-id="${e.id}" ${S.money < G.TIER_COST[e.tier + 1] ? 'disabled' : ''}>🎖️ เลื่อนเป็น ${G.DEPTS[G.deptById(S, e.dept)?.type || 'dev'].classes[e.tier + 1]} (${fmt(G.TIER_COST[e.tier + 1])} ฿)</button>` : ''}
    ${fr.length || rv.length ? `<div class="rels">${fr.length ? `💞 ${fr.join(', ')} ` : ''}${rv.length ? `⚔️ ${rv.join(', ')}` : ''}</div>` : ''}
    <div class="row">
      <button data-a="focus" data-id="${e.id}">${e.focus === 'work' ? '🛠️ ทำงาน' : '🛌 พัก'}</button>
      <button data-a="talk" data-id="${e.id}" ${e.talked ? 'disabled' : ''} title="ฟรี วันละครั้ง">💬 คุย</button>
      <button data-a="bonus" data-id="${e.id}" ${S.money < 200 ? 'disabled' : ''}>💰 โบนัส 200</button>
      <button data-a="scold" data-id="${e.id}">😠 ตำหนิ</button>
      <button data-a="fire" data-id="${e.id}" title="ชดเชย ${G.severance(e)} ฿">🚪</button>
      ${S.depts.length > 1 ? `<select data-a="move" data-id="${e.id}" title="ย้ายแผนก">${deptOpts}</select>` : ''}
    </div>
  </div>`;
}

function viewDepts() {
  return S.depts.map(d => {
    const def = G.DEPTS[d.type], team = G.staffOf(S, d.id);
    const cs = S.contracts.filter(c => c.dept === d.id);
    const rate = team.filter(e => e.focus === 'work').reduce((a, e) => a + G.baseOutput(e, S), 0);
    return `<div class="card">
      <div class="dept-h"><h2>${def.icon} ${def.name}</h2>
        <span class="small">ระดับ ${d.level} · คน ${team.length}/${G.capacity(d)} · งาน ${cs.length}/${G.maxContracts(d)} · กำลังผลิต ~${rate.toFixed(0)} แต้ม/วัน · ค่าเช่า ${G.rentOf(d)} ฿/วัน</span></div>
      ${cs.length ? cs.map(contractRow).join('') : '<div class="empty">ไม่มีงานในมือ — พนักงานจะรับงานจิปาถะได้เงินนิดหน่อย</div>'}
      <div class="emps">${team.map(empCard).join('') || '<div class="empty">ยังไม่มีพนักงาน — ไปที่แท็บจ้างงาน</div>'}</div>
    </div>`;
  }).join('');
}

function contractRow(c) {
  const left = c.deadline - S.day, pct = Math.min(100, c.progress / c.work * 100);
  const danger = left <= 2 && pct < 80;
  return `<div class="offer" style="margin-bottom:8px">
    <span>📌 <b>${c.title}</b> · ${c.client}</span>
    <span class="small ${danger ? 'warn' : ''}">เหลือ ${left} วัน · ${Math.floor(c.progress)}/${c.work} แต้ม · ${fmt(c.pay)} ฿ (มัดจำแล้ว ${fmt(c.deposit)})</span>
    <div class="meter prog"><i style="width:${pct}%;background:${danger ? 'var(--bad)' : 'var(--acc)'}"></i></div>
  </div>`;
}

function viewJobs() {
  let h = '<div class="card"><b>งานที่เข้ามาเสนอ</b><div class="small">รับงานแล้วได้มัดจำ 30% ทันที ที่เหลือจ่ายเมื่อส่งงานทัน ถ้าไม่ทันเสียชื่อเสียง</div></div>';
  for (const d of S.depts) {
    const def = G.DEPTS[d.type], offers = S.offers.filter(o => o.type === d.type);
    const full = S.contracts.filter(c => c.dept === d.id).length >= G.maxContracts(d);
    const rate = G.staffOf(S, d.id).filter(e => e.focus === 'work').reduce((a, e) => a + G.baseOutput(e, S), 0);
    const busy = S.contracts.filter(c => c.dept === d.id).reduce((a, c) => a + c.work - c.progress, 0);
    h += `<div class="card"><div class="dept-h"><h2>${def.icon} ${def.name}</h2><span class="small">กำลังผลิต ~${rate.toFixed(0)} แต้ม/วัน · งานค้าง ${Math.ceil(busy)} แต้ม</span></div>`;
    h += offers.length ? offers.map(o => {
      const est = rate > 0 ? Math.ceil((busy + o.work) / rate) : Infinity;
      const risky = est > o.days;
      // Combo hint: only known once this pair is in the combo book (Kairosoft-style discovery).
      const known = S.book[o.title + '|' + o.cat];
      const hint = known ? `<span class="combo g${known}">${G.GRADE[known].icon} ${G.GRADE[known].name}</span>` : '<span class="combo">❓ คอมโบ?</span>';
      const premium = o.title === G.PREMIUM_JOBS[o.type] ? ' <span class="combo g3">✨ พรีเมียม</span>' : '';
      return `<div class="offer" style="padding:6px 0;border-top:1px dashed var(--line)">
        <span><b>${o.title}</b> × ${G.CATS[o.cat]} · ${o.client} ${hint}${premium}<br><span class="small">${o.work} แต้ม · ${o.days} วัน · ${fmt(o.pay)} ฿ · ชื่อเสียง +${o.rep} · หมดอายุใน ${o.expires - S.day} วัน</span><br>
        <span class="small ${risky ? 'warn' : ''}">คาดว่าเสร็จใน ${isFinite(est) ? est + ' วัน' : '— (ไม่มีคนทำ)'}${risky ? ' ⚠️ เสี่ยงไม่ทัน' : ''}</span></span>
        <span class="row" style="margin:0"><button class="p" data-a="accept" data-id="${o.id}" ${full ? 'disabled title="รับงานเต็มแล้ว"' : ''}>รับงาน</button><button data-a="decline" data-id="${o.id}">ปฏิเสธ</button></span>
      </div>`;
    }).join('') : '<div class="empty">ยังไม่มีงานใหม่ รอสักพัก</div>';
    h += '</div>';
  }
  return h;
}

function viewHire() {
  const opts = S.depts.map(d => `<option value="${d.id}">${G.DEPTS[d.type].icon} ${G.DEPTS[d.type].name} (${G.staffOf(S, d.id).length}/${G.capacity(d)})</option>`).join('');
  const next = 7 - ((S.day - 1) % 7);
  return `<div class="card"><b>ผู้สมัครงาน</b> <span class="small">ชุดใหม่มาในอีก ${next} วัน · ชื่อเสียงสูงขึ้น ผู้สมัครเก่งขึ้น</span></div>` +
    (S.candidates.length ? `<div class="emps">${S.candidates.map(c => `<div class="emp card" style="margin:0">
      <h3>${c.name}<span class="small">ฝีมือ ${c.skill}</span></h3>
      <div class="cls">ขั้นตำแหน่ง ${c.tier + 1}/5 · ฝีมือสูงสุดตอนนี้ ${G.TIER_CAP[c.tier]}</div>
      <div class="tags">${c.traits.map(t => `<span title="${G.TRAITS[t]}">${t}</span>`).join('')}</div>
      <div class="small">${c.traits.map(t => `${t}: ${G.TRAITS[t]}`).join('<br>')}</div>
      <div class="small">เงินเดือน ${c.salary} ฿/วัน · ค่าเซ็นสัญญา ${fmt(G.signCost(c))} ฿</div>
      <div class="row"><select id="hd-${c.id}">${opts}</select><button class="p" data-a="hire" data-id="${c.id}" ${S.money < G.signCost(c) ? 'disabled' : ''}>จ้าง</button></div>
    </div>`).join('')}</div>` : '<div class="card empty">ไม่มีผู้สมัครเหลือแล้ว รอชุดใหม่</div>');
}

function viewGrow() {
  let h = '<div class="card"><b>แผนกปัจจุบัน</b>';
  for (const d of S.depts) {
    const def = G.DEPTS[d.type];
    h += `<div class="offer" style="padding:6px 0;border-top:1px dashed var(--line)"><span>${def.icon} ${def.name} · ระดับ ${d.level}/${G.MAX_LEVEL}<br><span class="small">รับคน ${G.capacity(d)} · รับงานพร้อมกัน ${G.maxContracts(d)} · ค่าเช่า ${G.rentOf(d)} ฿/วัน</span></span>
      ${d.level < G.MAX_LEVEL ? `<button data-a="upgrade" data-id="${d.id}" ${S.money < G.upgradeCost(d) ? 'disabled' : ''}>ขยายออฟฟิศ (${fmt(G.upgradeCost(d))} ฿)</button>` : '<span class="small">ขยายสุดแล้ว</span>'}</div>`;
  }
  h += '</div><div class="card"><b>เปิดแผนกใหม่</b><div class="small">แต่ละแผนกรับงานคนละสาย งานสายหลังๆ จ่ายดีกว่า</div>';
  for (const [type, def] of Object.entries(G.DEPTS)) {
    if (G.deptOfType(S, type)) continue;
    const ok = S.rep >= def.rep && S.money >= def.cost;
    h += `<div class="offer" style="padding:6px 0;border-top:1px dashed var(--line)"><span>${def.icon} ${def.name}<br><span class="small">ต้องมีชื่อเสียง ${def.rep} · ${fmt(def.cost)} ฿</span></span>
      <button class="p" data-a="open" data-id="${type}" ${ok ? '' : 'disabled'}>เปิดแผนก</button></div>`;
  }
  return h + '</div>';
}

// ---------- Kairosoft-style tabs: subsidiaries, research, combo book, ranking ----------
function viewSubs() {
  if (!G.hasResearch(S, 'holding')) {
    const r = G.RESEARCH.find(x => x.id === 'holding');
    return `<div class="card"><b>🏙️ บริษัทลูก</b><p class="small">ต้องวิจัย ${r.icon} ${r.name} ก่อน (💡 ${r.rp} + ${fmt(r.money)} ฿) ที่แท็บ 🔬 วิจัย — แล้วจะเปิดธุรกิจในเมืองได้ ให้พนักงานเก่งๆ ไปเป็น CEO</p></div>`;
  }
  const income = S.subs.reduce((a, x) => a + (x.lastProfit || 0), 0);
  let h = `<div class="card"><b>🏙️ บริษัทลูก ${S.subs.length}/${G.MAX_SUBS}</b> <span class="small">กำไรเมื่อวาน +${fmt(income)} ฿ · CEO เก่ง+อารมณ์ดี = กำไรมาก · จับคู่ธุรกิจให้ถูกได้คอมโบ</span></div>`;
  const pool = S.staff.filter(e => e.dept != null);
  for (const sub of S.subs) {
    const def = G.SUBS[sub.type], ceo = sub.ceo != null ? S.staff.find(e => e.id === sub.ceo) : null;
    const syn = G.subSynergy(S, sub);
    const opts = pool.slice().sort((a, b) => b.skill - a.skill).map(e => `<option value="${e.id}">${e.name} · ฝีมือ ${e.skill.toFixed(1)} · ${G.classOf(S, e)}</option>`).join('');
    h += `<div class="card sub"><div class="dept-h"><h2>${def.icon} ${def.name} <span class="small">Lv.${sub.level}/${G.SUB_MAX_LEVEL}</span></h2>
      <span class="small">กำไร ~${fmt(G.subProfit(S, sub))} ฿/วัน${syn ? ` · 🌟 คอมโบ +${Math.round(syn * 100)}%` : ''} · รวมทั้งหมด ${fmt(sub.total || 0)} ฿</span></div>
      <div class="small">${ceo ? `👔 CEO: <b>${ceo.name}</b> (ฝีมือ ${ceo.skill.toFixed(1)} · อารมณ์ ${Math.round(ceo.mood)} · Lv.${ceo.lvl})` : '⚠️ ยังไม่มี CEO — กำไรแค่ครึ่งเดียว'}</div>
      <div class="row">
        ${pool.length ? `<select id="ceo-${sub.id}">${opts}</select><button data-a="ceo" data-id="${sub.id}">${ceo ? '🔁 เปลี่ยน CEO' : '👔 แต่งตั้ง CEO'}</button>` : '<span class="small">ไม่มีพนักงานในออฟฟิศให้แต่งตั้ง</span>'}
        ${sub.level < G.SUB_MAX_LEVEL ? `<button class="p" data-a="upsub" data-id="${sub.id}" ${S.money < G.subUpgradeCost(sub) ? 'disabled' : ''}>🏗️ ขยาย (${fmt(G.subUpgradeCost(sub))} ฿)</button>` : '<span class="small">ระดับสูงสุด</span>'}
      </div></div>`;
  }
  if (S.subs.length < G.MAX_SUBS) {
    h += '<div class="card"><b>เปิดธุรกิจใหม่</b>';
    for (const [type, def] of Object.entries(G.SUBS)) {
      if (S.subs.some(x => x.type === type)) continue;
      const ok = S.rep >= def.rep && S.money >= def.cost;
      const pairs = G.SUB_COMBOS.filter(c => c[0] === type || c[1] === type).map(c => G.SUBS[c[0] === type ? c[1] : c[0]].icon).join('');
      h += `<div class="offer" style="padding:6px 0;border-top:1px dashed var(--line)"><span>${def.icon} ${def.name}<br><span class="small">กำไรพื้นฐาน ~${fmt(def.base)} ฿/วัน · ต้องมีชื่อเสียง ${def.rep} · เข้าคู่กับ ${pairs || '—'}</span></span>
        <button class="p" data-a="buysub" data-id="${type}" ${ok ? '' : 'disabled'}>เปิด (${fmt(def.cost)} ฿)</button></div>`;
    }
    h += '</div>';
  }
  return h;
}

function viewResearch() {
  let h = `<div class="card"><b>🔬 วิจัย</b> <span class="small">💡 ${Math.floor(S.rp)} — ได้จากการทำงานทุกวันและบริษัทลูก</span></div><div class="research">`;
  for (const r of G.RESEARCH) {
    const done = G.hasResearch(S, r.id);
    const needDept = r.dept && !G.deptOfType(S, r.dept);
    const ok = !done && !needDept && S.rp >= r.rp && S.money >= r.money;
    h += `<div class="rs${done ? ' done' : ''}">
      <div class="ri">${r.icon}</div><div><b>${r.name}</b><div class="small">${r.desc}</div>
      <div class="small">${done ? '✅ วิจัยแล้ว' : needDept ? `🔒 ต้องเปิด${G.DEPTS[r.dept].name}` : `💡 ${r.rp}${r.money ? ` + ${fmt(r.money)} ฿` : ''}`}</div></div>
      ${done ? '' : `<button class="p" data-a="research" data-id="${r.id}" ${ok ? '' : 'disabled'}>วิจัย</button>`}
    </div>`;
  }
  return h + '</div>';
}

function viewBook() {
  const cats = Object.keys(G.CATS);
  const found = Object.keys(S.book).length, combos = Object.values(S.book).filter(g => g > 1).length;
  let h = `<div class="card"><b>📕 สมุดคอมโบ</b> <span class="small">บันทึกแล้ว ${found} หน้า · เจอคอมโบ ${combos} อัน — ส่งงานคู่ใหม่ๆ เพื่อค้นพบ 🌟 = สุดยอด (x1.5) · 👍 = ดี (x1.2)</span></div>`;
  for (const [type, def] of Object.entries(G.DEPTS)) {
    const jobs = def.jobs.concat(G.hasResearch(S, 'job_' + type) ? [G.PREMIUM_JOBS[type]] : []);
    h += `<div class="card"><b>${def.icon} ${def.name}</b><div class="book"><table><tr><th></th>${cats.map(c => `<th>${G.CATS[c]}</th>`).join('')}</tr>`;
    for (const j of jobs) h += `<tr><td>${j}</td>${cats.map(c => { const g = S.book[j + '|' + c]; return `<td class="g${g || 0}">${g ? G.GRADE[g].icon : '?'}</td>`; }).join('')}</tr>`;
    h += '</table></div></div>';
  }
  const subKnown = Object.keys(S.subBook || {}).length;
  h += `<div class="card"><b>🏙️ คอมโบธุรกิจ</b> <span class="small">${subKnown}/${G.SUB_COMBOS.length}</span>${G.SUB_COMBOS.map(([a, b, name, bonus]) => {
    const k = S.subBook && S.subBook[a + '|' + b];
    return `<div class="small" style="padding:3px 0">${k ? `🌟 ${G.SUBS[a].icon} + ${G.SUBS[b].icon} "${name}" +${Math.round(bonus * 100)}%` : '❓ ??? + ???'}</div>`;
  }).join('')}</div>`;
  return h;
}

function viewRank() {
  const { y, m, d } = G.dateOf(S.day);
  const table = G.ranking(S);
  let h = `<div class="card"><b>🏆 อันดับบริษัทปี ${y}</b> <span class="small">เดือน ${m}/12 วันที่ ${d} · ประกาศรางวัลสิ้นปี (อีก ${G.YEAR_DAYS - ((S.day - 1) % G.YEAR_DAYS)} วัน) — ที่ 1 รับเงินรางวัลก้อนใหญ่</span>`;
  const top = Math.max(1, table[0].rev);
  h += table.map((r, i) => `<div class="rank${r.me ? ' me' : ''}"><span class="rn">${['🥇', '🥈', '🥉'][i] || (i + 1)}</span><span class="rname">${r.me ? '⭐ ' : ''}${r.name}</span><span class="rbar"><i style="width:${Math.max(2, r.rev / top * 100)}%"></i></span><span class="rv">${fmt(r.rev)} ฿</span></div>`).join('');
  h += '</div>';
  if (S.trophies.length) h += `<div class="card"><b>🏅 ถ้วยรางวัล</b>${S.trophies.map(t => `<div class="small">ปี ${t.y}: ${t.title}</div>`).join('')}</div>`;
  return h;
}

// ---------- render ----------
function renderLog() {
  const keep = l => logFilter === 'all' || (logFilter === 'story' ? (l.t === 'story' || /💢|🤝|✨|🥶|🗣️|💔|🫂|💥/.test(l.x)) : /฿/.test(l.x));
  const items = S.log.filter(keep).slice(-150).reverse();
  // Entries newer than lastSeq haven't been shown yet → slide them in.
  $('log').innerHTML = items.map(l => `<p class="${l.t}${(l.n || 0) > lastSeq ? ' new' : ''}"><span class="d">ว.${l.d}</span>${l.x}</p>`).join('') || '<div class="empty">ยังไม่มีบันทึก</div>';
}
function renderModal() {
  const dec = S.pending[0], m = $('modal');
  if (S.over) {
    m.style.display = 'flex';
    $('modal-body').innerHTML = `<h2>💸 บริษัทล้มละลาย</h2><p>อยู่รอดมา ${S.day - 1} วัน · ส่งงานสำเร็จ ${S.stats.done} งาน · เงินสูงสุด ${fmt(S.stats.peakMoney)} ฿ · มีคนลาออก ${S.stats.quit} คน</p><button class="p" data-a="reset">เริ่มบริษัทใหม่</button>`;
    return;
  }
  if (!dec) { m.style.display = 'none'; return; }
  stop();
  m.style.display = 'flex';
  $('modal-body').innerHTML = `<h2>${dec.title}</h2><p class="dtext">${dec.text.split('\n').join('<br>')}</p><div class="row">${dec.options.map((o, i) => `<button class="${i === 0 ? 'p' : ''}" data-a="decide" data-id="${i}">${o}</button>`).join('')}</div>`;
}
function render() {
  { const dt = G.dateOf(S.day); $('day').textContent = `ปี ${dt.y} · ด.${dt.m} · ว.${dt.d}`; }
  $('rp').textContent = Math.floor(S.rp);
  $('rank').textContent = '#' + G.myRank(S);
  $('money').textContent = fmt(S.money);
  $('money').style.color = S.money < 0 ? 'var(--bad)' : '';
  $('net').textContent = (S.lastNet >= 0 ? '+' : '') + fmt(S.lastNet);
  $('net').style.color = S.lastNet < 0 ? 'var(--bad)' : 'var(--good)';
  bump($('money'), S.money);
  $('company').textContent = '🏢 ' + (S.company || 'บริษัทจิ๋ว');
  $('rep').textContent = S.rep;
  $('cnt').textContent = S.staff.length;
  $('neg').textContent = S.negDays > 0 && !S.over ? `⚠️ เงินติดลบ ${S.negDays}/7 วัน` : '';
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  // Don't rebuild the view while the player has a dropdown open.
  if (document.activeElement?.tagName !== 'SELECT' || !$('view').contains(document.activeElement)) {
    $('view').innerHTML = { depts: viewDepts, jobs: viewJobs, hire: viewHire, grow: viewGrow, subs: viewSubs, research: viewResearch, book: viewBook, rank: viewRank }[tab]();
  }
  renderLog();
  renderModal();
  feed3d();
}

// Money pulses green/red when it changes.
let lastMoney = null;
function bump(el, v) {
  if (lastMoney !== null && v !== lastMoney) {
    el.classList.remove('bump-up', 'bump-down'); void el.offsetWidth;
    el.classList.add(v > lastMoney ? 'bump-up' : 'bump-down');
    clearTimeout(bump.h); bump.h = setTimeout(() => el.classList.remove('bump-up', 'bump-down'), 350);
  }
  lastMoney = v;
}

// ---------- new log entries → sounds + 3D office (office3d.js loads as a module after this file) ----------
let lastSeq = 0;
function feed3d() {
  const O = window.Office3D;
  if (O) O.sync(S);
  for (const l of S.log) if ((l.n || 0) > lastSeq) { window.SFX?.forLog(l); if (O) O.onLog(l); }
  lastSeq = S.logSeq || 0;
}
window.GameUI = {
  get state() { return S; },
  focusEmp(id) {
    tab = 'depts'; render();
    const el = $('emp-' + id); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500);
  },
};
try { if (localStorage.getItem('company-sim-3d') === 'off') $('office3d').classList.add('hidden'); } catch (_) {}
$('toggle3d').onclick = () => {
  const off = $('office3d').classList.toggle('hidden');
  try { localStorage.setItem('company-sim-3d', off ? 'off' : 'on'); } catch (_) {}
};

// ---------- time ----------
function step() { if (G.tick(S)) { save(); } render(); }
function stop() { clearInterval(timer); timer = null; $('play').textContent = '▶ เริ่ม'; }
function start() {
  if (S.over || S.pending.length) return;
  timer = setInterval(step, +$('speed').value); $('play').textContent = '⏸ หยุด';
}

// ---------- events ----------
document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.id !== 'mute') window.SFX?.play('click');
  if (b.dataset.tab) {
    tab = b.dataset.tab; render();
    const v = $('view'); v.classList.add('swap'); void v.offsetWidth; v.classList.remove('swap'); // replay fade-in
    return;
  }
  if (b.dataset.f) { logFilter = b.dataset.f; document.querySelectorAll('#filters button').forEach(x => x.classList.toggle('on', x === b)); renderLog(); return; }
  const a = b.dataset.a, id = b.dataset.id; if (!a) return;
  const num = Number(id);
  switch (a) {
    case 'focus': { const e = S.staff.find(e => e.id === num); act(A.setFocus, num, e.focus === 'work' ? 'rest' : 'work'); break; }
    case 'talk': act(A.talk, num); break;
    case 'bonus': act(A.bonus, num); break;
    case 'scold': act(A.scold, num); break;
    case 'fire': if (confirm(`ไล่ ${nameOf(num)} ออก? (จ่ายชดเชย)`)) act(A.fire, num); break;
    case 'accept': act(A.accept, num); break;
    case 'decline': act(A.decline, num); break;
    case 'hire': act(A.hire, num, Number($('hd-' + id).value)); break;
    case 'upgrade': act(A.upgrade, num); break;
    case 'open': act(A.openDept, id); break;
    case 'decide': act(A.decide, num); break;
    case 'promote': act(A.promote, num); break;
    case 'research': act(A.research, id); break;
    case 'buysub': act(A.buySub, id); break;
    case 'upsub': act(A.upgradeSub, num); break;
    case 'ceo': act(A.appointCEO, num, Number($('ceo-' + id).value)); break;
    case 'reset': showTitle(); break;
  }
});
document.addEventListener('change', ev => {
  const s = ev.target; if (s.dataset.a === 'move') { s.blur(); act(A.move, Number(s.dataset.id), Number(s.value)); }
});
$('play').onclick = () => timer ? stop() : start();
$('step').onclick = () => { stop(); step(); };
$('speed').onchange = () => { if (timer) { stop(); start(); } };
$('reset').onclick = () => showTitle();
$('mute').onclick = () => { $('mute').textContent = window.SFX?.toggle() ? '🔇' : '🔊'; };
if (window.SFX?.muted) $('mute').textContent = '🔇';
document.addEventListener('keydown', ev => {
  if (/SELECT|INPUT/.test(ev.target.tagName) || S.pending.length || !$('title').classList.contains('out')) return;
  if (ev.code === 'Space') { ev.preventDefault(); timer ? stop() : start(); }
});

// ---------- title screen ----------
function showTitle() {
  stop();
  const saved = S && !S.over;
  $('continue').style.display = saved ? '' : 'none';
  $('cname').value = '';
  $('cname').placeholder = 'ตั้งชื่อบริษัทของคุณ';
  $('newgame').textContent = saved ? '✨ เปิดบริษัทใหม่ (เซฟเดิมจะหายไป)' : '✨ เปิดบริษัทใหม่';
  $('title').classList.remove('out');
}
function hideTitle() { $('title').classList.add('out'); }
$('continue').onclick = () => { hideTitle(); render(); };
$('newgame').onclick = () => { newGame($('cname').value.trim()); hideTitle(); window.SFX?.play('levelup'); };
$('cname').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('newgame').click(); });

function newGame(name) { stop(); window.Office3D?.reset(); S = G.newGame(name); lastSeq = S.logSeq || 0; lastMoney = null; tab = 'depts'; save(); render(); }

S = loadSaved();
if (S) { S.log.push({ d: S.day, t: 'sys', x: '💾 โหลดเซฟเดิมแล้ว' }); lastSeq = S.logSeq || 0; render(); }
else { S = G.newGame(); lastSeq = S.logSeq || 0; render(); } // demo office behind the title screen
showTitle();
if (!loadSaved()) $('continue').style.display = 'none';
})();
