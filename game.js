// บริษัทจิ๋ว — game logic (no DOM). Works in browser (window.Game) and Node (require).
(function (root) {
'use strict';

const SAVE_VERSION = 2;

const TRAITS = {
  'ขยัน':     'ทำงานเก่ง บางวันทำโอที',
  'ขี้เกียจ':  'ชอบอู้งาน (ตำหนิแล้วจะขยันไปสักพัก)',
  'ขี้โมโห':  'อารมณ์ต่ำแล้วชอบมีเรื่อง',
  'ปากเสีย':  'ชอบนินทา ทำให้คนผิดใจกัน',
  'ใจดี':     'ปลอบใจเพื่อน เข้ากับคนง่าย',
  'ขี้เหนียว': 'ดีใจกับโบนัสมาก แต่ไม่สนปาร์ตี้',
  'ขี้กลัว':   'เครียดเรื่องเดดไลน์ ถูกตำหนิแล้วเสียกำลังใจมาก',
  'รักกาแฟ':  'ชงกาแฟให้ทีม ทุกคนอารมณ์ดีขึ้น',
  'ช่างเรียนรู้': 'ได้ประสบการณ์ (XP) เป็นสองเท่า',
  'เก็บตัว':   'ไม่ค่อยสนิทกับใคร แต่ไม่มีเรื่องกับใคร',
};
const CONFLICT = [['ขยัน', 'ขี้เกียจ'], ['ใจดี', 'ขี้โมโห'], ['ใจดี', 'ปากเสีย'], ['เก็บตัว', 'ปากเสีย']];

const NAMES = ['สมชาย','มะลิ','ต้น','ฝน','บอส','แพร','โอ๊ต','นุ่น','เจ','พิม','ก้อง','อ้อม','เบียร์','มิ้นท์','ปอนด์','แนน','ตูน','ฟ้า','กอล์ฟ','ปุ๊ก','เอก','จอย','บีม','ใบเตย','ภูมิ','น้ำ','ตาล','อาร์ม','แก้ม','เต้','ขิม','ป่าน','โบ๊ท','หมิว'];

// Client categories drive the combo system (job × category).
const CATS = { food: 'ร้านอาหาร', retail: 'ร้านค้า', service: 'บริการ', public: 'ภาครัฐ', fun: 'บันเทิง', tech: 'เทค' };
const CLIENTS = [
  ['ร้านกาแฟป้าแดง', 'food'], ['ฟาร์มเห็ดลุงชัย', 'food'], ['ร้านหมูกระทะพี่โจ้', 'food'],
  ['ร้านทองเยาวราช', 'retail'], ['ตลาดนัดออนไลน์', 'retail'], ['ห้างเซ็นทรัลบ้านนา', 'retail'],
  ['โรงแรมริมโขง', 'service'], ['คลินิกฟันยิ้มสวย', 'service'], ['ขนส่งด่วนจี๋', 'service'], ['อู่ซ่อมรถเฮียตี๋', 'service'],
  ['อบต.หนองบัว', 'public'], ['โรงเรียนอนุบาลดาวน้อย', 'public'],
  ['ค่ายมวยศิษย์เสือ', 'fun'], ['วงดนตรีลูกทุ่งสายฟ้า', 'fun'],
  ['สตาร์ทอัพ FinFin', 'tech'], ['บริษัทเกมดาวตก', 'tech'],
];

const DEPTS = {
  dev:       { name: 'ฝ่ายพัฒนาซอฟต์แวร์', icon: '💻', cost: 0,    rep: 0,  jobs: ['เว็บไซต์','แอปมือถือ','ระบบหลังบ้าน','ระบบจองคิว','ร้านค้าออนไลน์'],
               classes: ['โปรแกรมเมอร์ฝึกหัด','โปรแกรมเมอร์','ซีเนียร์โปรแกรมเมอร์','หัวหน้าทีมเทค','เทพแห่งโค้ด'] },
  design:    { name: 'ฝ่ายออกแบบ',        icon: '🎨', cost: 3000, rep: 12, jobs: ['โลโก้','แบรนด์ใหม่','โปสเตอร์','หน้าตาแอป','แพ็กเกจจิ้ง'],
               classes: ['ดีไซเนอร์ฝึกหัด','ดีไซเนอร์','ซีเนียร์ดีไซเนอร์','อาร์ตไดเรกเตอร์','ศิลปินระดับตำนาน'] },
  marketing: { name: 'ฝ่ายการตลาด',       icon: '📣', cost: 5000, rep: 25, jobs: ['แคมเปญโซเชียล','คลิปโฆษณา','งานเปิดตัว','ไลฟ์ขายของ'],
               classes: ['นักการตลาดฝึกหัด','นักการตลาด','ซีเนียร์มาร์เก็ตเตอร์','ผู้อำนวยการการตลาด','ราชาไวรัล'] },
  data:      { name: 'ฝ่ายข้อมูล',         icon: '📊', cost: 8000, rep: 45, jobs: ['รายงานยอดขาย','แดชบอร์ด','วิเคราะห์ลูกค้า','ระบบแนะนำสินค้า'],
               classes: ['นักวิเคราะห์ฝึกหัด','นักวิเคราะห์ข้อมูล','ดาต้าไซแอนทิสต์','หัวหน้าฝ่ายข้อมูล','ผู้หยั่งรู้ข้อมูล'] },
};
// Premium jobs unlocked by research (pay more).
const PREMIUM_JOBS = { dev: 'เกมมือถือ', design: 'มาสคอต', marketing: 'คอนเสิร์ต', data: 'AI แชทบอท' };
// job → best client category (perfect) and good ones.
const COMBOS = {
  'เว็บไซต์': ['service', 'food', 'public'], 'แอปมือถือ': ['tech', 'retail', 'fun'], 'ระบบหลังบ้าน': ['public', 'service', 'tech'],
  'ระบบจองคิว': ['food', 'service', 'public'], 'ร้านค้าออนไลน์': ['retail', 'food', 'fun'], 'เกมมือถือ': ['fun', 'tech'],
  'โลโก้': ['food', 'retail', 'service'], 'แบรนด์ใหม่': ['tech', 'retail'], 'โปสเตอร์': ['fun', 'public', 'food'],
  'หน้าตาแอป': ['tech', 'service'], 'แพ็กเกจจิ้ง': ['retail', 'food'], 'มาสคอต': ['public', 'fun', 'food'],
  'แคมเปญโซเชียล': ['food', 'fun', 'retail'], 'คลิปโฆษณา': ['retail', 'tech', 'service'], 'งานเปิดตัว': ['tech', 'retail'],
  'ไลฟ์ขายของ': ['food', 'retail'], 'คอนเสิร์ต': ['fun', 'public'],
  'รายงานยอดขาย': ['retail', 'food'], 'แดชบอร์ด': ['public', 'service', 'tech'], 'วิเคราะห์ลูกค้า': ['service', 'retail', 'tech'],
  'ระบบแนะนำสินค้า': ['retail', 'tech', 'fun'], 'AI แชทบอท': ['tech', 'service', 'public'],
};
const GRADE = { 3: { name: 'สุดยอดคอมโบ!', icon: '🌟', pay: 1.5, rep: 2 }, 2: { name: 'คอมโบดี', icon: '👍', pay: 1.2, rep: 1.3 }, 1: { name: 'ธรรมดา', icon: '·', pay: 1, rep: 1 } };
function comboGrade(title, cat) {
  const c = COMBOS[title]; if (!c) return 1;
  return c[0] === cat ? 3 : c.slice(1).includes(cat) ? 2 : 1;
}

// Research: spend 💡 RP (+ money) to unlock perks, premium jobs and subsidiaries.
const RESEARCH = [
  { id: 'coffee',  icon: '☕', name: 'เครื่องชงกาแฟพรีเมียม', rp: 60,  money: 500,   desc: 'พนักงานอารมณ์ดีขึ้นทุกวัน' },
  { id: 'job_dev', icon: '🕹️', name: 'รับงาน "เกมมือถือ"',     rp: 110,  money: 0,     desc: 'งานพรีเมียมของฝ่ายพัฒนา จ่ายแพงกว่า', dept: 'dev' },
  { id: 'plants',  icon: '🪴', name: 'สวนในออฟฟิศ',           rp: 90,  money: 800,   desc: 'ทุกคนสนิทกันง่ายขึ้น อารมณ์ดีขึ้นเล็กน้อย' },
  { id: 'monitor', icon: '🖥️', name: 'จอคู่ทุกโต๊ะ',            rp: 140,  money: 1500,  desc: 'ผลงาน +10%' },
  { id: 'library', icon: '📚', name: 'มุมหนังสือ',              rp: 150, money: 1200,  desc: 'XP +30%' },
  { id: 'holding', icon: '🏢', name: 'ใบอนุญาตบริษัทโฮลดิ้ง',    rp: 180, money: 3000,  desc: 'เปิดบริษัทลูกในเมืองได้' },
  { id: 'crm',     icon: '📇', name: 'ระบบ CRM',               rp: 210, money: 2500,  desc: 'ค่าจ้างงาน +12%' },
  { id: 'job_design', icon: '🧸', name: 'รับงาน "มาสคอต"',     rp: 170, money: 0,     desc: 'งานพรีเมียมของฝ่ายออกแบบ', dept: 'design' },
  { id: 'game',    icon: '🎮', name: 'มุมเกม',                  rp: 240, money: 3000,  desc: 'พักผ่อนได้อารมณ์ดีขึ้นอีก' },
  { id: 'agile',   icon: '🗂️', name: 'ทำงานแบบ Agile',          rp: 330, money: 4000,  desc: 'เดดไลน์งานใหม่ยาวขึ้น 20%' },
  { id: 'job_marketing', icon: '🎤', name: 'รับงาน "คอนเสิร์ต"', rp: 270, money: 0,     desc: 'งานพรีเมียมของฝ่ายการตลาด', dept: 'marketing' },
  { id: 'pr',      icon: '📰', name: 'ทีมประชาสัมพันธ์',         rp: 390, money: 5000,  desc: 'ชื่อเสียงจากงาน +30%' },
  { id: 'headhunt', icon: '🎯', name: 'เฮดฮันเตอร์',             rp: 450, money: 6000,  desc: 'ผู้สมัครเก่งขึ้นและมีมากขึ้น' },
  { id: 'job_data', icon: '🧠', name: 'รับงาน "AI แชทบอท"',     rp: 390, money: 0,     desc: 'งานพรีเมียมของฝ่ายข้อมูล', dept: 'data' },
  { id: 'robot',   icon: '🤖', name: 'ผู้ช่วย AI ประจำแผนก',     rp: 680, money: 10000, desc: 'ผลงาน +15%' },
];
const R = (s, id) => !!s.research[id];

// Subsidiaries (บริษัทลูก) on the town map.
const SUBS = {
  cafe:    { name: 'คาเฟ่',         icon: '☕', cost: 10000, rep: 20, base: 300 },
  bakery:  { name: 'เบเกอรี่',       icon: '🥐', cost: 14000, rep: 28, base: 380 },
  arcade:  { name: 'ร้านเกม',       icon: '🕹️', cost: 20000, rep: 36, base: 520 },
  gym:     { name: 'ฟิตเนส',        icon: '🏋️', cost: 28000, rep: 45, base: 700 },
  hostel:  { name: 'โฮสเทล',        icon: '🏨', cost: 40000, rep: 55, base: 950 },
  studio:  { name: 'สตูดิโอยูทูบ',   icon: '🎬', cost: 55000, rep: 65, base: 1250 },
  fintech: { name: 'ฟินเทค',        icon: '💳', cost: 80000, rep: 80, base: 1700 },
};
const SUB_COMBOS = [
  ['cafe', 'bakery', 'คู่หูขนมกับกาแฟ', 0.3], ['arcade', 'studio', 'สตรีมเมอร์สายเกม', 0.3],
  ['gym', 'cafe', 'สมูทตี้หลังออกกำลัง', 0.2], ['hostel', 'cafe', 'อาหารเช้าสำหรับแขก', 0.25],
  ['fintech', 'arcade', 'จ่ายเงินในเกม', 0.25], ['studio', 'gym', 'คลิปออกกำลังกาย', 0.2],
  ['hostel', 'arcade', 'ห้องเกมสำหรับแขก', 0.2], ['bakery', 'studio', 'รายการทำขนม', 0.2],
];
const MAX_SUBS = 6, SUB_MAX_LEVEL = 5;
const subUpgradeCost = sub => Math.round(SUBS[sub.type].cost * sub.level);

// Staff progression: tier = job class. Skill can't pass the tier cap → promote to keep growing.
const TIER_CAP = [3, 5, 7, 8.5, 10];
const TIER_COST = [0, 1000, 3000, 8000, 20000]; // cost to promote INTO tier i
const xpNeed = lvl => 30 + lvl * 15;
const tierFor = skill => TIER_CAP.findIndex(c => skill <= c);

// Calendar & rivals.
const DAYS_PER_MONTH = 10, YEAR_DAYS = 120;
const dateOf = day => ({ y: Math.floor((day - 1) / YEAR_DAYS) + 1, m: Math.floor(((day - 1) % YEAR_DAYS) / DAYS_PER_MONTH) + 1, d: (day - 1) % DAYS_PER_MONTH + 1 });
const RIVALS = [['บจก.ไวไว ดิจิทัล', 0.3], ['เมกะซอฟต์ไทย', 0.5], ['ครีเอทีฟลิง', 0.75], ['ดาต้าเทพ จำกัด', 1.0]];

const PAY_RATE = { dev: 18, design: 19, marketing: 21, data: 24 };
const fairSalary = skill => Math.round(25 + skill * 12 + skill * skill * 1.5);
// Fixed per-pair chemistry in [-1.6, 1.6], derived from ids so nothing extra is saved.
function chem(a, b) {
  const x = Math.min(a.id, b.id), y = Math.max(a.id, b.id);
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return ((h - Math.floor(h)) * 2 - 1) * 1.6;
}

const MAX_LEVEL = 3;
const DEPOSIT = 0.3; // share of a contract's pay received upfront on accept
const capacity = d => 2 + d.level * 2;
const rentOf = d => 20 + d.level * d.level * 35;
const upgradeCost = d => 2000 * d.level;
const maxContracts = d => 1 + d.level;
const signCost = e => e.salary * 5;
const severance = e => e.salary * 5;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = (e, t) => e.traits.includes(t);

// ---------- state helpers ----------
// Names in log text are always separated by spaces/punctuation, so exact token match finds who is involved.
function whoIn(s, text) {
  const toks = new Set(text.split(/[\s,()"'—:!?.]+/));
  return s.staff.filter(e => toks.has(e.name)).map(e => e.id);
}
function log(s, type, text, extra) {
  s.logSeq = (s.logSeq || 0) + 1;
  s.log.push(Object.assign({ d: s.day, t: type, x: text, n: s.logSeq, who: whoIn(s, text) }, extra));
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}
const staffOf = (s, deptId) => s.staff.filter(e => e.dept === deptId);
const office = s => s.staff.filter(e => e.dept != null);
const deptById = (s, id) => s.depts.find(d => d.id === id);
const deptOfType = (s, type) => s.depts.find(d => d.type === type);
const emp = (s, id) => s.staff.find(e => e.id === id);
const subById = (s, id) => s.subs.find(x => x.id === id);
function mood(e, d) { e.mood = clamp(e.mood + d, 0, 100); }
function classOf(s, e) {
  const d = e.dept != null ? deptById(s, e.dept) : null;
  if (e.ceo != null) return 'CEO';
  return DEPTS[d ? d.type : 'dev'].classes[e.tier];
}
const canPromote = e => e.tier < 4 && e.skill >= TIER_CAP[e.tier] - 1e-9;

function rel(a, b) { return a.rel[b.id] || 0; }
function addRel(s, a, b, d) {
  if (!a || !b || a === b) return;
  if (has(a, 'เก็บตัว') || has(b, 'เก็บตัว')) d *= 0.5;
  const before = rel(a, b);
  const after = clamp(before + d, -100, 100);
  a.rel[b.id] = after; b.rel[a.id] = after;
  if (before < 50 && after >= 50) log(s, 'story', `💞 ${a.name} กับ ${b.name} กลายเป็นเพื่อนสนิทกัน`);
  else if (before > -50 && after <= -50) log(s, 'story', `⚔️ ${a.name} กับ ${b.name} กลายเป็นคู่กัด`);
  else if (before >= 50 && after < 50) log(s, 'm', `${a.name} กับ ${b.name} ไม่สนิทกันเหมือนเมื่อก่อน`);
  else if (before <= -50 && after > -50) log(s, 'g', `🕊️ ${a.name} กับ ${b.name} เลิกเป็นคู่กัดแล้ว`);
}
const friends = (s, e) => s.staff.filter(o => o !== e && rel(e, o) >= 50);
const rivals = (s, e) => s.staff.filter(o => o !== e && rel(e, o) <= -50);
const sameDept = (s, e) => e.dept == null ? [] : s.staff.filter(o => o !== e && o.dept === e.dept);

// ---------- generation ----------
function genTraits() {
  const keys = Object.keys(TRAITS);
  for (;;) {
    const a = pick(keys), b = pick(keys);
    if (a === b) continue;
    if (CONFLICT.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
    return [a, b];
  }
}
function genPerson(s, minSk, maxSk) {
  const used = new Set(s.staff.map(e => e.name).concat(s.candidates.map(c => c.name)));
  const free = NAMES.filter(n => !used.has(n));
  const skill = clamp(randi(minSk, maxSk), 1, 10);
  return {
    id: s.nextId++, name: pick(free.length ? free : NAMES), traits: genTraits(),
    skill, salary: fairSalary(skill), mood: randi(55, 75), rel: {},
    dept: null, focus: 'work', talked: false, days: 0, disciplined: 0, mult: 1,
    lvl: 1, xp: 0, tier: tierFor(skill), yearXp: 0, lastOut: 0, ceo: null,
  };
}
function refreshCandidates(s) {
  const bonus = R(s, 'headhunt') ? 2 : 0;
  const top = Math.min(9, 3 + Math.floor(s.rep / 12) + bonus);
  s.candidates = [];
  for (let i = 0; i < (bonus ? 4 : 3); i++) s.candidates.push(genPerson(s, 1 + bonus, top));
}
function deptRate(s, d) {
  const team = staffOf(s, d.id);
  if (!team.length) return 5;
  return team.reduce((a, e) => a + baseOutput(s, e), 0);
}
function jobsFor(s, type) {
  const jobs = DEPTS[type].jobs.slice();
  if (R(s, 'job_' + type)) jobs.push(PREMIUM_JOBS[type], PREMIUM_JOBS[type]); // premium shows up more often
  return jobs;
}
function genOffer(s, d) {
  const rate = Math.max(5, deptRate(s, d));
  const [client, cat] = pick(CLIENTS);
  const title = pick(jobsFor(s, d.type));
  const premium = title === PREMIUM_JOBS[d.type] ? 1.3 : 1;
  const work = Math.round(rand(25, 45) + s.rep * 0.8 + rand(0, 40) + rate * rand(1, 3));
  const days = Math.max(4, Math.round(work / (rate * 0.7) * rand(1.3, 1.8) * (R(s, 'agile') ? 1.2 : 1)));
  const pay = Math.round(work * PAY_RATE[d.type] * premium * rand(0.9, 1.15) * (1 + s.rep / 400) * (R(s, 'crm') ? 1.12 : 1) / 10) * 10;
  return {
    id: s.nextId++, type: d.type, client, cat, title,
    work, days, pay, rep: 1 + Math.round(work / 45), expires: s.day + randi(4, 7),
  };
}
function addDept(s, type) {
  const d = { id: s.nextId++, type, level: 1 };
  s.depts.push(d);
  return d;
}

function newGame(company) {
  const s = {
    v: SAVE_VERSION, company: (company || 'บริษัทจิ๋ว จำกัด').slice(0, 30), day: 1, money: 2500, rep: 5, nextId: 1,
    depts: [], staff: [], offers: [], contracts: [], candidates: [], log: [],
    pending: [], negDays: 0, over: false, lastNet: 0, milestones: {},
    stats: { done: 0, failed: 0, quit: 0, hired: 3, peakMoney: 2500 },
    rp: 0, research: {}, book: {}, subBook: {}, subs: [],
    rivals: RIVALS.map(([name, str]) => ({ name, str, rev: 0 })), yearRev: 0, trophies: [], yearCombos: 0,
  };
  const dev = addDept(s, 'dev');
  for (let i = 0; i < 3; i++) { const e = genPerson(s, 2, 4); e.dept = dev.id; s.staff.push(e); }
  refreshCandidates(s);
  s.offers.push(genOffer(s, dev), genOffer(s, dev));
  log(s, 'sys', `เปิดบริษัทวันแรก ทุน 2,500 ฿ พนักงาน ${s.staff.map(e => e.name).join(', ')} — ไปที่แท็บ "งาน" เพื่อรับงานแรก`);
  return s;
}

// Upgrade a v1 save so existing players keep their company.
function migrate(s) {
  if (s.v === 1) {
    Object.assign(s, {
      rp: 0, research: {}, book: {}, subBook: {}, subs: [],
      rivals: RIVALS.map(([name, str]) => ({ name, str, rev: 0 })), yearRev: 0, trophies: [], yearCombos: 0,
    });
    for (const e of s.staff) Object.assign(e, { lvl: 1, xp: 0, tier: tierFor(Math.min(10, e.skill)), yearXp: 0, lastOut: 0, ceo: null });
    for (const c of s.candidates) Object.assign(c, { lvl: 1, xp: 0, tier: tierFor(c.skill), yearXp: 0, lastOut: 0, ceo: null });
    const catOf = n => (CLIENTS.find(c => c[0] === n) || [n, 'service'])[1];
    for (const o of s.offers.concat(s.contracts)) o.cat = catOf(o.client);
    s.v = 2;
    log(s, 'sys', '✨ อัปเดตใหม่! มีระบบวิจัย คอมโบ เลเวลพนักงาน บริษัทลูก และรางวัลประจำปี');
  }
  return s;
}

// ---------- daily simulation ----------
function baseOutput(s, e) {
  let o = (3 + e.skill) * (0.5 + e.mood / 100);
  if (has(e, 'ขยัน')) o *= 1.2;
  if (has(e, 'ขี้เกียจ')) o *= 0.85;
  if (R(s, 'monitor')) o *= 1.1;
  if (R(s, 'robot')) o *= 1.15;
  return o;
}

function traitEvents(s, e) {
  const mates = sameDept(s, e);
  if (has(e, 'ขี้โมโห') && e.mood < 40 && mates.length && chance(0.4)) {
    const riv = mates.filter(o => rel(e, o) < 0);
    const o = riv.length ? pick(riv) : pick(mates);
    mood(e, -5); mood(o, -10); addRel(s, e, o, -15);
    log(s, 'b', `💢 ${e.name} ที่อารมณ์เสียอยู่ ระเบิดใส่ ${o.name} กลางออฟฟิศ`);
  }
  if (has(e, 'ปากเสีย') && chance(0.15)) {
    const others = office(s).filter(o => o !== e);
    if (others.length >= 2) {
      const target = pick(others), listener = pick(others.filter(o => o !== target));
      addRel(s, listener, target, -8); addRel(s, e, listener, 3);
      if (chance(0.3)) {
        addRel(s, e, target, -20); mood(target, -8);
        log(s, 'b', `🗣️ ${target.name} รู้ว่า ${e.name} แอบนินทาตัวเองให้ ${listener.name} ฟัง`);
      } else log(s, 'm', `🗣️ ${e.name} นินทา ${target.name} ให้ ${listener.name} ฟัง`);
    }
  }
  if (has(e, 'ใจดี') && mates.length && chance(0.3)) {
    const low = mates.slice().sort((a, b) => a.mood - b.mood)[0];
    if (low.mood < 55) { mood(low, 10); addRel(s, e, low, 10); log(s, 'g', `🤝 ${e.name} ชวน ${low.name} ไปกินข้าวปลอบใจ`); }
  }
  if (has(e, 'รักกาแฟ') && chance(0.25)) {
    mates.forEach(o => { mood(o, 3); addRel(s, e, o, 2); }); mood(e, 2);
    if (mates.length) log(s, 'g', `☕ ${e.name} ชงกาแฟให้ทั้งแผนก`);
  }
  if (e.focus !== 'work') return;
  if (has(e, 'ขยัน') && chance(0.15)) { e.mult *= 1.5; mood(e, -4); log(s, 'm', `💼 ${e.name} ทำโอทีจนดึก`); }
  if (has(e, 'ขี้เกียจ') && e.disciplined <= 0 && chance(0.2)) {
    e.mult = 0;
    const annoyed = mates.find(o => has(o, 'ขยัน'));
    if (annoyed) { addRel(s, annoyed, e, -6); log(s, 'b', `😴 ${e.name} อู้งานทั้งวัน ${annoyed.name} เริ่มไม่พอใจ`); }
    else log(s, 'm', `😴 ${e.name} แอบอู้งานทั้งวัน`);
  }
  if (has(e, 'ขี้กลัว')) {
    const tight = s.contracts.some(c => c.dept === e.dept && c.deadline - s.day <= 2 && c.progress / c.work < 0.7);
    if (tight && chance(0.5)) { mood(e, -6); log(s, 'b', `😰 ${e.name} เครียดเรื่องเดดไลน์จนนอนไม่หลับ`); }
  }
}

function pairDrift(s) {
  const st = office(s);
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b = st[j];
    if (a.dept !== b.dept) continue;
    let d = rand(-1, 1) + chem(a, b) - rel(a, b) * 0.012 + (R(s, 'plants') ? 0.25 : 0);
    for (const x of [a, b]) {
      if (has(x, 'ใจดี')) d += 0.4;
      if (has(x, 'รักกาแฟ')) d += 0.15;
      if (has(x, 'ปากเสีย')) d -= 0.6;
      if (has(x, 'ขี้โมโห')) d -= x.mood < 40 ? 1.2 : 0.3;
    }
    if (a.traits.some(t => b.traits.includes(t))) d += 0.3;
    addRel(s, a, b, d);
    const r = rel(a, b);
    if (r >= 50 && a.focus === 'work' && b.focus === 'work') {
      mood(a, 1); mood(b, 1);
      if (chance(0.08)) { a.mult *= 1.2; b.mult *= 1.2; log(s, 'g', `✨ ${a.name} กับ ${b.name} ทำงานเข้าขากันสุดๆ`); }
    }
    if (r <= -50) {
      mood(a, -1); mood(b, -1);
      if (chance(0.08)) { a.mult *= 0.8; b.mult *= 0.8; log(s, 'b', `🥶 ${a.name} กับ ${b.name} ไม่ยอมคุยกัน งานสะดุด`); }
    }
  }
}

function gainXp(s, e, xp) {
  xp *= (has(e, 'ช่างเรียนรู้') ? 2 : 1) * (R(s, 'library') ? 1.3 : 1);
  e.xp += xp; e.yearXp += xp;
  while (e.xp >= xpNeed(e.lvl)) {
    e.xp -= xpNeed(e.lvl); e.lvl++;
    const was = canPromote(e);
    e.skill = Math.min(TIER_CAP[e.tier], +(e.skill + 0.3).toFixed(2));
    log(s, 'g', `⬆️ ${e.name} เลเวลอัป! Lv.${e.lvl}`);
    if (!was && canPromote(e)) log(s, 'sys', `🎓 ${e.name} ฝีมือเต็มขั้นแล้ว — เลื่อนตำแหน่งเป็น "${DEPTS[deptById(s, e.dept)?.type || 'dev'].classes[e.tier + 1]}" ได้ (${TIER_COST[e.tier + 1].toLocaleString()} ฿)`);
  }
}

function produce(s) {
  let idleIncome = 0, total = 0;
  for (const e of s.staff) e.lastOut = 0;
  for (const d of s.depts) {
    const team = staffOf(s, d.id).filter(e => e.focus === 'work');
    let pts = 0;
    for (const e of team) { e.lastOut = Math.round(baseOutput(s, e) * e.mult); pts += baseOutput(s, e) * e.mult; }
    total += pts;
    const cs = s.contracts.filter(c => c.dept === d.id).sort((a, b) => a.deadline - b.deadline);
    const busy = cs.length > 0;
    for (const c of cs) {
      if (pts <= 0) break;
      const use = Math.min(pts, c.work - c.progress);
      c.progress += use; pts -= use;
    }
    idleIncome += pts * 4; // leftover capacity does small odd jobs
    for (const e of team) gainXp(s, e, e.lastOut * (busy ? 1 : 0.5));
  }
  s.rp += 0.5 + total * 0.05;
  return Math.round(idleIncome);
}

function settleContracts(s) {
  let income = 0;
  for (const c of s.contracts.slice()) {
    const d = deptById(s, c.dept);
    if (!d) { s.contracts.splice(s.contracts.indexOf(c), 1); continue; }
    if (c.progress >= c.work - 1e-6) {
      const g = comboGrade(c.title, c.cat), G = GRADE[g];
      const key = c.title + '|' + c.cat, isNew = !s.book[key];
      s.book[key] = g;
      const bonus = Math.round(c.pay * (G.pay - 1) / 10) * 10;
      const rest = c.pay - c.deposit + bonus;
      const repGain = c.rep * G.rep * (R(s, 'pr') ? 1.3 : 1);
      income += rest; s.rep += repGain * Math.max(0.15, 1 - s.rep / 110); s.stats.done++;
      staffOf(s, d.id).forEach(e => mood(e, g === 3 ? 12 : 6));
      if (g > 1) { s.yearCombos++; log(s, 'story', `${G.icon} ${G.name} ${c.title} × ${CATS[c.cat]}${isNew ? ' (บันทึกลงสมุดคอมโบ!)' : ''} โบนัส +${bonus.toLocaleString()} ฿`, { dept: d.id }); }
      else if (isNew) log(s, 'm', `📕 บันทึกลงสมุด: ${c.title} × ${CATS[c.cat]} — ไม่ใช่คอมโบ`);
      log(s, 'g', `✅ ส่งงาน "${c.title}" ให้ ${c.client} สำเร็จ รับส่วนที่เหลือ +${rest.toLocaleString()} ฿ ชื่อเสียง +${Math.round(repGain)}`, { dept: d.id, amt: rest, grade: g });
      s.contracts.splice(s.contracts.indexOf(c), 1);
    } else if (s.day >= c.deadline) {
      const lost = c.rep * 2; s.rep = Math.max(0, s.rep - lost); s.stats.failed++;
      staffOf(s, d.id).forEach(e => mood(e, -6));
      log(s, 'b', `❌ ส่งงาน "${c.title}" ให้ ${c.client} ไม่ทัน ได้แค่มัดจำ ${c.deposit.toLocaleString()} ฿ ชื่อเสียง -${lost}`, { dept: d.id });
      s.contracts.splice(s.contracts.indexOf(c), 1);
    }
  }
  return income;
}

// Synergy bonus for a subsidiary from owned partner types.
function subSynergy(s, sub) {
  const owned = new Set(s.subs.map(x => x.type));
  return SUB_COMBOS.filter(([a, b]) => (a === sub.type && owned.has(b)) || (b === sub.type && owned.has(a))).reduce((t, c) => t + c[3], 0);
}
function subProfit(s, sub) {
  const ceo = sub.ceo != null ? emp(s, sub.ceo) : null;
  const ceoF = ceo ? 0.7 + ceo.skill * 0.06 + (ceo.mood - 50) / 500 : 0.5;
  return SUBS[sub.type].base * (1 + 0.45 * (sub.level - 1)) * ceoF * (1 + subSynergy(s, sub));
}
function runSubs(s) {
  let income = 0;
  for (const sub of s.subs) {
    let p = subProfit(s, sub) * rand(0.85, 1.15);
    if (chance(0.02)) { p *= 3; log(s, 'g', `📈 ${SUBS[sub.type].icon} ${SUBS[sub.type].name} ขายดีถล่มทลายเพราะรีวิวไวรัล!`, { sub: sub.id }); }
    sub.lastProfit = Math.round(p); sub.total = (sub.total || 0) + sub.lastProfit;
    income += sub.lastProfit;
    s.rp += p * 0.004;
    const ceo = sub.ceo != null ? emp(s, sub.ceo) : null;
    if (ceo) { mood(ceo, (62 - ceo.mood) * 0.08); gainXp(s, ceo, 4); }
  }
  return income;
}

function removeStaff(s, e) {
  s.staff.splice(s.staff.indexOf(e), 1);
  for (const o of s.staff) delete o.rel[e.id];
  for (const sub of s.subs) if (sub.ceo === e.id) { sub.ceo = null; log(s, 'b', `⚠️ ${SUBS[sub.type].icon} ${SUBS[sub.type].name} ไม่มี CEO แล้ว กำไรลดลงครึ่งหนึ่ง`, { sub: sub.id }); }
}

function quits(s) {
  for (const e of s.staff.slice()) {
    if (e.mood >= 12 || !chance(0.3)) continue;
    const fr = friends(s, e), rv = rivals(s, e);
    removeStaff(s, e); s.rep = Math.max(0, s.rep - 2); s.stats.quit++;
    log(s, 'b', `📤 ${e.name} ยื่นใบลาออก บอกว่าไม่ไหวแล้ว (ชื่อเสียง -2)`);
    fr.forEach(f => { mood(f, -12); log(s, 'story', `💔 ${f.name} เสียใจที่ ${e.name} เพื่อนสนิทลาออก`); });
    rv.forEach(r => { mood(r, 6); log(s, 'm', `😏 ${r.name} แอบยิ้มที่ ${e.name} ออกไป`); });
    for (const f of fr) {
      if (s.staff.includes(f) && f.mood < 30 && chance(0.3)) {
        removeStaff(s, f); s.stats.quit++;
        log(s, 'story', `🚶 ${f.name} ลาออกตาม ${e.name} ไปด้วย`);
      }
    }
  }
}

function outsideEvents(s) {
  const { m, d } = dateOf(s.day);
  if (d === 1 && m === 4) { s.staff.forEach(e => mood(e, 12)); log(s, 'g', `💦 สงกรานต์! ทุกคนสาดน้ำกันสนุกสนาน อารมณ์ดีขึ้น`); return; }
  if (d === 1 && m === 11) { s.staff.forEach(e => mood(e, 8)); log(s, 'g', `🏮 ลอยกระทง! พนักงานไปลอยกระทงด้วยกัน`); return; }
  const r = Math.random();
  if (r < 0.05) {
    const c = randi(150, 400); s.money -= c; log(s, 'b', `🔧 คอมพิวเตอร์พัง ค่าซ่อม ${c} ฿`);
  } else if (r < 0.09) {
    s.staff.forEach(e => mood(e, -5)); log(s, 'b', `🌧️ ฝนตกหนัก รถติด ทุกคนมาสาย`);
  } else if (r < 0.12) {
    s.staff.forEach(e => mood(e, 5)); log(s, 'g', `🎂 วันเกิดใครสักคนในออฟฟิศ มีเค้กกินกันทั้งบริษัท`);
  } else if (r < 0.14 && s.rep >= 10) {
    s.rep += 2; log(s, 'g', `📰 บล็อกดังเขียนรีวิวถึงบริษัท ชื่อเสียง +2`);
  }
}

function maybeDecision(s) {
  if (s.pending.length || !chance(0.12) || s.day < 4) return;
  const opts = [];
  const asker = office(s).find(e => e.skill >= 4 && e.days > 20 && e.mood < 60 && !e.askedRaise);
  if (asker) opts.push(() => {
    asker.askedRaise = true;
    return { kind: 'raise', a: asker.id, title: `${asker.name} ขอขึ้นเงินเดือน`,
      text: `${asker.name} (ฝีมือ ${asker.skill.toFixed(1)}) บอกว่าทำงานหนักมานาน ขอขึ้นเงินเดือนจาก ${asker.salary} เป็น ${Math.round(asker.salary * 1.25)} ฿/วัน`,
      options: ['อนุมัติ', 'ปฏิเสธ'] };
  });
  for (const a of office(s)) for (const b of sameDept(s, a)) if (a.id < b.id && rel(a, b) <= -50) {
    opts.push(() => ({ kind: 'feud', a: a.id, b: b.id, title: `${a.name} กับ ${b.name} ทะเลาะกันหนัก`,
      text: `ทั้งแผนกเริ่มเลือกข้าง งานเดินช้าลง จะจัดการยังไง?`,
      options: ['ย้าย ' + b.name + ' ไปแผนกอื่น', 'จับเข่าคุยกัน', 'ปล่อยไป'] }));
    break;
  }
  const star = s.staff.find(e => e.skill >= 6);
  if (star) {
    const rv = pick(s.rivals).name;
    opts.push(() => ({ kind: 'poach', a: star.id, title: `${rv} มาชวน ${star.name}`,
      text: `${rv} ยื่นข้อเสนอเงินเดือนสูงกว่าให้ ${star.name} จะสู้ราคาไหม? (เงินเดือนใหม่ ${Math.round(star.salary * 1.3)} ฿/วัน)`,
      options: ['สู้ราคา', 'ปล่อยไป'], rival: rv }));
  }
  const c = s.contracts.find(c => c.deadline - s.day >= 4);
  if (c) opts.push(() => ({ kind: 'rush', c: c.id, title: `${c.client} ขอเร่งงาน`,
    text: `ขอให้ส่ง "${c.title}" เร็วขึ้น 2 วัน แลกกับเงินเพิ่ม 40% (${Math.round(c.pay * 0.4)} ฿)`,
    options: ['รับ', 'ปฏิเสธ'] }));
  if (office(s).length >= 4) opts.push(() => ({ kind: 'party', title: 'พนักงานขอจัดปาร์ตี้บริษัท',
    text: `ค่าใช้จ่าย 800 ฿ ทุกคนจะได้พักผ่อนและสนิทกันมากขึ้น`, options: ['จัดเลย (800 ฿)', 'ไม่จัด'] }));
  if (!opts.length) return;
  const dec = pick(opts)();
  dec.id = s.nextId++;
  s.pending.push(dec);
}

function resolveDecision(s, idx) {
  const dec = s.pending.shift();
  if (!dec) return;
  const a = emp(s, dec.a), b = emp(s, dec.b);
  switch (dec.kind) {
    case 'raise':
      if (!a) break;
      if (idx === 0) { a.salary = Math.round(a.salary * 1.25); mood(a, 15); log(s, 'g', `💵 ขึ้นเงินเดือนให้ ${a.name} เป็น ${a.salary} ฿/วัน`); }
      else { mood(a, has(a, 'ขี้โมโห') ? -30 : -20); log(s, 'b', `🙅 ปฏิเสธการขอขึ้นเงินเดือนของ ${a.name}`); }
      break;
    case 'feud': {
      if (!a || !b) break;
      if (idx === 0) {
        const to = s.depts.find(d => d.id !== b.dept && staffOf(s, d.id).length < capacity(d));
        if (to) { b.dept = to.id; mood(b, -5); log(s, 'm', `🔀 ย้าย ${b.name} ไป${DEPTS[to.type].name} ให้ห่างจาก ${a.name}`); }
        else { log(s, 'b', `ไม่มีแผนกไหนว่างพอจะย้าย ${b.name} ไป ทั้งคู่ยังต้องทำงานด้วยกัน`); addRel(s, a, b, -5); }
      } else if (idx === 1) {
        if (chance(0.5)) { addRel(s, a, b, 45); mood(a, 5); mood(b, 5); log(s, 'story', `🫂 ${a.name} กับ ${b.name} เคลียร์ใจกันได้ จับมือคืนดี`); }
        else { addRel(s, a, b, -10); mood(a, -10); mood(b, -10); log(s, 'story', `💥 คุยกันไม่รู้เรื่อง ${a.name} กับ ${b.name} เกลียดกันกว่าเดิม`); }
      } else { addRel(s, a, b, -5); log(s, 'm', `ปล่อยให้ ${a.name} กับ ${b.name} จัดการกันเอง`); }
      break;
    }
    case 'poach':
      if (!a) break;
      if (idx === 0) { a.salary = Math.round(a.salary * 1.3); mood(a, 10); log(s, 'g', `🤝 สู้ราคาจนรั้ง ${a.name} ไว้ได้ เงินเดือนใหม่ ${a.salary} ฿/วัน`); }
      else {
        const fr = friends(s, a); removeStaff(s, a); s.stats.quit++;
        log(s, 'b', `👋 ${a.name} ย้ายไปอยู่ ${dec.rival || 'บริษัทคู่แข่ง'}`);
        fr.forEach(f => { mood(f, -10); log(s, 'story', `💔 ${f.name} ใจหายที่ ${a.name} ย้ายไป`); });
      }
      break;
    case 'rush': {
      const c = s.contracts.find(c => c.id === dec.c);
      if (!c) break;
      if (idx === 0) { c.deadline -= 2; c.pay = Math.round(c.pay * 1.4); staffOf(s, c.dept).forEach(e => mood(e, -4)); log(s, 'm', `⏩ รับเร่งงาน "${c.title}" ทีมเริ่มกดดัน`); }
      else { s.rep = Math.max(0, s.rep - 1); log(s, 'm', `${c.client} ไม่ค่อยพอใจที่ไม่ยอมเร่งงาน (ชื่อเสียง -1)`); }
      break;
    }
    case 'party':
      if (idx === 0) {
        s.money -= 800;
        s.staff.forEach(e => mood(e, has(e, 'ขี้เหนียว') ? 3 : 12));
        const st = office(s);
        for (const x of st) for (const y of st) if (x.id < y.id) addRel(s, x, y, 5);
        log(s, 'g', `🎉 ปาร์ตี้บริษัทสุดมันส์ ทุกคนสนิทกันมากขึ้น`);
      } else { s.staff.forEach(e => mood(e, -4)); log(s, 'm', `ไม่จัดปาร์ตี้ พนักงานผิดหวังนิดหน่อย`); }
      break;
    case 'report': break; // year-end report: just acknowledge
  }
}

// Rivals earn every day; ranking is by revenue this year.
function runRivals(s) {
  const { y } = dateOf(s.day);
  const base = y === 1 ? 5400 : y === 2 ? 27000 : 42000 * Math.pow(1.08, y - 3);
  for (const r of s.rivals) r.rev += base * r.str * rand(0.7, 1.3);
}
function ranking(s) {
  const all = s.rivals.map(r => ({ name: r.name, rev: r.rev, me: false })).concat([{ name: s.company, rev: s.yearRev, me: true }]);
  return all.sort((a, b) => b.rev - a.rev);
}
const myRank = s => ranking(s).findIndex(r => r.me) + 1;

function yearEnd(s) {
  const { y } = dateOf(s.day);
  const table = ranking(s), rank = table.findIndex(r => r.me) + 1;
  const prizes = { 1: [10000, 10, '🏆 บริษัทแห่งปี'], 2: [4000, 5, '🥈 รองอันดับหนึ่ง'], 3: [1500, 2, '🥉 อันดับสาม'] };
  const lines = table.map((r, i) => `${i + 1}. ${r.me ? '⭐ ' : ''}${r.name} — ${Math.round(r.rev).toLocaleString()} ฿`);
  let award = '';
  if (prizes[rank]) {
    const [money, rep, title] = prizes[rank];
    const cash = money * y;
    s.money += cash; s.rep += rep; s.trophies.push({ y, title, rank });
    award = `${title}! รับเงินรางวัล ${cash.toLocaleString()} ฿ ชื่อเสียง +${rep}`;
    log(s, 'sys', `🏆 งานประกาศรางวัลปี ${y}: ${award}`);
  } else log(s, 'm', `🏆 งานประกาศรางวัลปี ${y}: ปีนี้ได้อันดับ ${rank} ยังไม่ได้รางวัล`);
  const star = s.staff.slice().sort((a, b) => b.yearXp - a.yearXp)[0];
  let starLine = '';
  if (star && star.yearXp > 0) {
    mood(star, 30); s.money += 1000 * y;
    starLine = `⭐ พนักงานดีเด่น: ${star.name} (${classOf(s, star)}) รับโบนัส ${(1000 * y).toLocaleString()} ฿`;
    log(s, 'story', `⭐ ${star.name} ได้รางวัลพนักงานดีเด่นประจำปี ${y}!`);
  }
  const comboLine = s.yearCombos ? `🔥 คอมโบปีนี้: ${s.yearCombos} ครั้ง` : '';
  s.pending.push({
    id: s.nextId++, kind: 'report', title: `🎊 สรุปผลประจำปี ${y}`,
    text: [`รายได้ปีนี้: ${Math.round(s.yearRev).toLocaleString()} ฿ (อันดับ ${rank} จาก ${table.length})`, award, starLine, comboLine, '', ...lines].filter(x => x !== undefined).join('\n'),
    options: ['ลุยปีต่อไป!'],
  });
  s.yearRev = 0; s.yearCombos = 0;
  for (const r of s.rivals) { r.rev = 0; r.str *= rand(1.0, 1.12); }
  for (const e of s.staff) e.yearXp = 0;
}

function milestones(s) {
  const m = s.milestones;
  const hit = (k, cond, text) => { if (!m[k] && cond) { m[k] = s.day; log(s, 'sys', `🏆 ${text}`); } };
  hit('m10k', s.money >= 10000, 'เงินในบริษัทแตะ 10,000 ฿');
  hit('m50k', s.money >= 50000, 'เงินในบริษัทแตะ 50,000 ฿');
  hit('m200k', s.money >= 200000, 'เงินในบริษัทแตะ 200,000 ฿ — บริษัทใหญ่แล้ว!');
  hit('m1m', s.money >= 1000000, 'เงินในบริษัทแตะ 1 ล้านบาท — เศรษฐีแล้ว!');
  hit('r30', s.rep >= 30, 'ชื่อเสียงถึง 30 — ลูกค้าเริ่มรู้จัก');
  hit('r80', s.rep >= 80, 'ชื่อเสียงถึง 80 — บริษัทดังทั่วเมือง');
  hit('d4', s.depts.length >= 4, 'เปิดครบทุกแผนกแล้ว');
  hit('s10', s.staff.length >= 10, 'พนักงานครบ 10 คน');
  hit('sub1', s.subs.length >= 1, 'เปิดบริษัทลูกแห่งแรก!');
  hit('sub6', s.subs.length >= MAX_SUBS, 'อาณาจักรครบ 6 บริษัทลูก!');
  hit('book10', Object.keys(s.book).length >= 10, 'สมุดคอมโบครบ 10 หน้า');
}

function tick(s) {
  if (s.over || s.pending.length) return false;
  for (const e of s.staff) {
    e.talked = false; e.days++; e.mult = 1; if (e.disciplined > 0) e.disciplined--;
    if (e.days % 30 === 0 && fairSalary(e.skill) > e.salary + 5) {
      e.salary = fairSalary(e.skill); mood(e, 5);
      log(s, 'm', `📈 ปรับเงินเดือน ${e.name} ตามฝีมือเป็น ${e.salary} ฿/วัน`);
    }
  }

  for (const e of office(s)) {
    if (e.focus === 'rest') mood(e, 9 + (R(s, 'game') ? 4 : 0)); else mood(e, -1.5);
    mood(e, (55 - e.mood) * 0.05 + (R(s, 'coffee') ? 0.6 : 0) + (R(s, 'plants') ? 0.3 : 0));
  }
  for (const e of office(s)) if (s.staff.includes(e)) traitEvents(s, e);
  pairDrift(s);

  const idle = produce(s);
  const paid = settleContracts(s);
  const subIncome = runSubs(s);
  const wages = s.staff.reduce((a, e) => a + e.salary, 0);
  const rent = s.depts.reduce((a, d) => a + rentOf(d), 0);
  const net = idle + paid + subIncome - wages - rent;
  s.money += net; s.lastNet = net;
  s.yearRev += idle + paid + subIncome;
  s.lastBreakdown = { idle, paid, subs: subIncome, wages, rent };
  runRivals(s);

  outsideEvents(s);
  quits(s);
  maybeDecision(s);

  // offers & candidates
  s.offers = s.offers.filter(o => o.expires > s.day && deptOfType(s, o.type));
  for (const d of s.depts) {
    const n = s.offers.filter(o => o.type === d.type).length;
    if (n < 3 && chance(0.55)) s.offers.push(genOffer(s, d));
  }
  if (s.day % 7 === 0) { refreshCandidates(s); log(s, 'm', `📨 มีผู้สมัครงานชุดใหม่`); }

  if (s.day % YEAR_DAYS === 0) yearEnd(s);
  s.rep = clamp(Math.round(s.rep), 0, 100);
  s.stats.peakMoney = Math.max(s.stats.peakMoney, s.money);
  milestones(s);

  if (s.money < 0) {
    s.negDays++;
    if (s.negDays === 1 || s.negDays === 4) log(s, 'b', `⚠️ เงินติดลบ! ถ้าติดลบครบ 7 วัน บริษัทจะล้มละลาย (ตอนนี้ ${s.negDays} วัน)`);
  } else s.negDays = 0;
  // Instant bankruptcy only if debt exceeds ~3 days of costs (so big companies still get the 7-day warning).
  if (s.negDays >= 7 || s.money < -Math.max(5000, 3 * (wages + rent))) {
    s.over = true;
    log(s, 'b', `💸 บริษัทล้มละลายในวันที่ ${s.day}`);
  }
  s.day++;
  return true;
}

// ---------- player actions (return error string or null) ----------
const A = {
  setFocus(s, id, f) { const e = emp(s, id); if (e) e.focus = f; return null; },
  bonus(s, id) {
    const e = emp(s, id); if (!e) return 'ไม่พบพนักงาน';
    if (s.money < 200) return 'เงินไม่พอ';
    s.money -= 200; const g = has(e, 'ขี้เหนียว') ? 30 : 18; mood(e, g);
    log(s, 'g', `💰 ให้โบนัส ${e.name}${has(e, 'ขี้เหนียว') ? ' — ดีใจมาก นับเงินสามรอบ' : ''}`);
    return null;
  },
  talk(s, id) {
    const e = emp(s, id); if (!e || e.talked) return 'คุยไปแล้ววันนี้';
    e.talked = true; mood(e, has(e, 'ขี้กลัว') ? 12 : 7);
    log(s, 'g', `💬 คุยให้กำลังใจ ${e.name}`);
    return null;
  },
  scold(s, id) {
    const e = emp(s, id); if (!e) return 'ไม่พบพนักงาน';
    const l = has(e, 'ขี้กลัว') ? -25 : has(e, 'ขี้โมโห') ? -18 : -10; mood(e, l);
    sameDept(s, e).forEach(o => mood(o, -3));
    if (has(e, 'ขี้เกียจ')) { e.disciplined = 7; log(s, 'm', `😠 ตำหนิ ${e.name} — ดูเหมือนจะตั้งใจทำงานขึ้นสักพัก`); }
    else log(s, 'b', `😠 ตำหนิ ${e.name} คนในแผนกอึดอัดไปด้วย`);
    return null;
  },
  fire(s, id) {
    const e = emp(s, id); if (!e) return 'ไม่พบพนักงาน';
    const fr = friends(s, e), rv = rivals(s, e), cost = severance(e);
    s.money -= cost; removeStaff(s, e);
    s.staff.forEach(o => mood(o, -6));
    fr.forEach(f => mood(f, -10));
    rv.forEach(r => mood(r, 10));
    log(s, 'b', `🚪 ไล่ ${e.name} ออก จ่ายชดเชย ${cost} ฿${fr.length ? ` — ${fr.map(f => f.name).join(', ')} ไม่พอใจมาก` : ''}`);
    return null;
  },
  move(s, id, deptId) {
    const e = emp(s, id), d = deptById(s, deptId);
    if (!e || !d || e.dept === d.id) return null;
    if (staffOf(s, d.id).length >= capacity(d)) return 'แผนกนั้นเต็มแล้ว';
    e.dept = d.id; mood(e, -3);
    log(s, 'm', `🔀 ย้าย ${e.name} ไป${DEPTS[d.type].name}`);
    return null;
  },
  promote(s, id) {
    const e = emp(s, id); if (!e) return 'ไม่พบพนักงาน';
    if (!canPromote(e)) return 'ฝีมือยังไม่เต็มขั้น';
    const cost = TIER_COST[e.tier + 1]; if (s.money < cost) return 'เงินไม่พอ';
    s.money -= cost; e.tier++; mood(e, 20);
    log(s, 'story', `🎖️ เลื่อนตำแหน่ง ${e.name} เป็น "${classOf(s, e)}"!`);
    return null;
  },
  hire(s, candId, deptId) {
    const c = s.candidates.find(c => c.id === candId), d = deptById(s, deptId);
    if (!c || !d) return 'ข้อมูลไม่ถูกต้อง';
    if (staffOf(s, d.id).length >= capacity(d)) return 'แผนกเต็ม ขยายออฟฟิศก่อน';
    const cost = signCost(c); if (s.money < cost) return 'เงินไม่พอ';
    s.money -= cost; s.candidates.splice(s.candidates.indexOf(c), 1);
    c.dept = d.id; s.staff.push(c); s.stats.hired++;
    log(s, 'g', `🆕 จ้าง ${c.name} (${c.traits.join(', ')}) เข้า${DEPTS[d.type].name}`);
    return null;
  },
  accept(s, offerId) {
    const o = s.offers.find(o => o.id === offerId); if (!o) return 'ไม่พบงาน';
    const d = deptOfType(s, o.type);
    if (s.contracts.filter(c => c.dept === d.id).length >= maxContracts(d)) return 'แผนกรับงานเต็มแล้ว';
    s.offers.splice(s.offers.indexOf(o), 1);
    const deposit = Math.round(o.pay * DEPOSIT / 10) * 10;
    s.money += deposit; s.yearRev += deposit;
    s.contracts.push({ ...o, dept: d.id, progress: 0, deadline: s.day + o.days, deposit });
    log(s, 'm', `📝 รับงาน "${o.title}" จาก ${o.client} ส่งภายใน ${o.days} วัน ได้มัดจำ ${deposit.toLocaleString()} ฿`, { dept: d.id, amt: deposit });
    return null;
  },
  decline(s, offerId) { s.offers = s.offers.filter(o => o.id !== offerId); return null; },
  openDept(s, type) {
    const def = DEPTS[type]; if (!def || deptOfType(s, type)) return 'เปิดไปแล้ว';
    if (s.rep < def.rep) return `ต้องมีชื่อเสียง ${def.rep}`;
    if (s.money < def.cost) return 'เงินไม่พอ';
    s.money -= def.cost; const d = addDept(s, type);
    s.offers.push(genOffer(s, d));
    log(s, 'sys', `${def.icon} เปิด${def.name}แล้ว! จ้างคนหรือย้ายพนักงานเข้าไปได้เลย`);
    return null;
  },
  upgrade(s, deptId) {
    const d = deptById(s, deptId); if (!d) return 'ไม่พบแผนก';
    if (d.level >= MAX_LEVEL) return 'ขยายสุดแล้ว';
    const cost = upgradeCost(d); if (s.money < cost) return 'เงินไม่พอ';
    s.money -= cost; d.level++;
    log(s, 'sys', `🏗️ ขยายออฟฟิศ${DEPTS[d.type].name}เป็นระดับ ${d.level} (รับคนได้ ${capacity(d)} คน รับงานพร้อมกัน ${maxContracts(d)} งาน)`);
    return null;
  },
  research(s, id) {
    const r = RESEARCH.find(x => x.id === id); if (!r) return 'ไม่พบงานวิจัย';
    if (R(s, id)) return 'วิจัยแล้ว';
    if (r.dept && !deptOfType(s, r.dept)) return `ต้องเปิด${DEPTS[r.dept].name}ก่อน`;
    if (s.rp < r.rp) return '💡 ไม่พอ';
    if (s.money < r.money) return 'เงินไม่พอ';
    s.rp -= r.rp; s.money -= r.money; s.research[id] = s.day;
    log(s, 'sys', `🔬 วิจัยสำเร็จ: ${r.icon} ${r.name} — ${r.desc}`);
    return null;
  },
  buySub(s, type) {
    const def = SUBS[type]; if (!def) return 'ไม่พบธุรกิจ';
    if (!R(s, 'holding')) return 'ต้องวิจัยใบอนุญาตบริษัทโฮลดิ้งก่อน';
    if (s.subs.length >= MAX_SUBS) return 'ที่ดินในเมืองเต็มแล้ว';
    if (s.subs.some(x => x.type === type)) return 'มีธุรกิจนี้แล้ว';
    if (s.rep < def.rep) return `ต้องมีชื่อเสียง ${def.rep}`;
    if (s.money < def.cost) return 'เงินไม่พอ';
    s.money -= def.cost;
    const sub = { id: s.nextId++, type, level: 1, ceo: null, lastProfit: 0, total: 0, plot: [0, 1, 2, 3, 4, 5].find(p => !s.subs.some(x => x.plot === p)) };
    s.subs.push(sub);
    log(s, 'sys', `🏙️ เปิดบริษัทลูก ${def.icon} ${def.name}! อย่าลืมแต่งตั้ง CEO`, { sub: sub.id });
    for (const [a, b, name, bonus] of SUB_COMBOS) {
      const key = a + '|' + b;
      if (!s.subBook[key] && s.subs.some(x => x.type === a) && s.subs.some(x => x.type === b)) {
        s.subBook[key] = s.day;
        log(s, 'story', `🌟 คอมโบธุรกิจ! "${name}" — ${SUBS[a].name} + ${SUBS[b].name} กำไร +${Math.round(bonus * 100)}%`, { sub: sub.id });
      }
    }
    return null;
  },
  upgradeSub(s, id) {
    const sub = subById(s, id); if (!sub) return 'ไม่พบบริษัทลูก';
    if (sub.level >= SUB_MAX_LEVEL) return 'ระดับสูงสุดแล้ว';
    const cost = subUpgradeCost(sub); if (s.money < cost) return 'เงินไม่พอ';
    s.money -= cost; sub.level++;
    log(s, 'sys', `🏗️ ขยาย ${SUBS[sub.type].icon} ${SUBS[sub.type].name} เป็นระดับ ${sub.level}!`, { sub: sub.id });
    return null;
  },
  appointCEO(s, subId, empId) {
    const sub = subById(s, subId), e = emp(s, empId);
    if (!sub || !e) return 'ข้อมูลไม่ถูกต้อง';
    if (e.ceo != null) return 'คนนี้เป็น CEO อยู่แล้ว';
    if (sub.ceo != null) { // swap: the old CEO takes the new CEO's desk
      const old = emp(s, sub.ceo);
      if (old) { old.ceo = null; old.dept = e.dept; old.focus = 'work'; log(s, 'm', `${old.name} กลับมาทำงานที่ออฟฟิศ`); }
    }
    e.dept = null; e.ceo = sub.id; e.focus = 'work'; sub.ceo = e.id; mood(e, 20);
    log(s, 'story', `👔 แต่งตั้ง ${e.name} เป็น CEO ของ ${SUBS[sub.type].icon} ${SUBS[sub.type].name}!`, { sub: sub.id });
    return null;
  },
  decide(s, idx) { resolveDecision(s, idx); return null; },
};

function load(json) {
  try {
    let s = JSON.parse(json);
    if (!s || !Array.isArray(s.staff)) return null;
    s = migrate(s);
    if (s.v !== SAVE_VERSION) return null;
    return s;
  } catch (_) { return null; }
}

const Game = {
  TRAITS, DEPTS, CATS, RESEARCH, SUBS, SUB_COMBOS, COMBOS, GRADE, PREMIUM_JOBS, TIER_CAP, TIER_COST, MAX_SUBS, SUB_MAX_LEVEL, YEAR_DAYS,
  MAX_LEVEL, newGame, tick, load, actions: A,
  capacity, rentOf, upgradeCost, maxContracts, signCost, severance, subUpgradeCost, subProfit, subSynergy,
  staffOf, office, deptById, deptOfType, rel, friends, rivals, baseOutput: (e, s) => baseOutput(s || root.GameUI?.state || { research: {} }, e),
  dateOf, ranking, myRank, classOf, canPromote, xpNeed, comboGrade, hasResearch: R,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Game;
else root.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
