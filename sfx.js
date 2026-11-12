// Tiny synth sound effects (Web Audio). No audio files. window.SFX.play(name)
(function () {
'use strict';
const KEY = 'company-sim-mute';
let ctx = null, master = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch (_) {}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// One note: oscillator with a quick attack/decay envelope.
function tone(freq, start, dur, type = 'square', vol = 0.3, slideTo) {
  const a = ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(start, dur, vol = 0.2) {
  const a = ctx, n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const g = a.createGain(), t = a.currentTime + start; g.gain.value = vol; n.buffer = b; n.connect(g); g.connect(master); n.start(t);
}

const SOUNDS = {
  click: () => tone(900, 0, 0.04, 'square', 0.08),
  coin: () => { tone(988, 0, 0.08, 'square', 0.18); tone(1319, 0.07, 0.25, 'square', 0.18); },
  cash: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.18, 'square', 0.14)); noise(0, 0.12, 0.06); },
  cheer: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.25)); },
  angry: () => { tone(110, 0, 0.35, 'sawtooth', 0.22, 80); tone(116, 0.02, 0.35, 'sawtooth', 0.15, 70); },
  fail: () => { [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.25, 'triangle', 0.25)); },
  hire: () => { tone(784, 0, 0.12, 'sine', 0.3); tone(1175, 0.1, 0.35, 'sine', 0.3); },
  quit: () => { tone(440, 0, 0.2, 'sine', 0.25, 330); tone(330, 0.2, 0.35, 'sine', 0.22, 220); },
  pop: () => tone(600, 0, 0.08, 'sine', 0.12, 900),
  sad: () => tone(330, 0, 0.5, 'sine', 0.15, 247),
  alarm: () => { tone(880, 0, 0.12, 'square', 0.12); tone(660, 0.15, 0.12, 'square', 0.12); },
  levelup: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.07, 0.25, 'square', 0.12)); },
  bankrupt: () => { [392, 370, 349, 330].forEach((f, i) => tone(f, i * 0.3, 0.4, 'sawtooth', 0.15)); },
};
let lastAt = {};
function play(name) {
  if (muted || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (lastAt[name] || 0) < 70) return; // avoid stacking the same sound
  lastAt[name] = now;
  if (!ac()) return;
  try { SOUNDS[name](); } catch (_) {}
}
// Map a game log entry to a sound.
function forLog(l) {
  const x = l.x;
  if (/^✅/.test(x)) return play('cash');
  if (/^📝/.test(x)) return play('coin');
  if (/^(🏆|🎉)/.test(x)) return play('levelup');
  if (/^(❌)/.test(x)) return play('fail');
  if (/^(💢|💥)/.test(x)) return play('angry');
  if (/^(📤|🚶|👋|🚪)/.test(x)) return play('quit');
  if (/^🆕/.test(x)) return play('hire');
  if (/^(💔|😰)/.test(x)) return play('sad');
  if (/^⚠️/.test(x)) return play('alarm');
  if (/^💸/.test(x)) return play('bankrupt');
  if (/^(💞|🫂|✨|🤝|☕|🎂|💬|💰|💵)/.test(x)) return play('pop');
}
window.SFX = {
  play, forLog,
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (_) {} if (!muted) play('click'); return muted; },
};
})();
