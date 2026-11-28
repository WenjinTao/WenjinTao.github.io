// Sound. Foley (cut, board, swipe, fly buzz): recorded-style samples made with ElevenLabs text-to-sound
// (prep_sounds.py -> sounds/, a few takes each, picked by their envelope; sounds.json lists them and where each hit
// is). Each play picks a random take with a slight pitch / level variation, and is started early or partway in so
// its hit lands on the moment it belongs to. UI cues (round start, ticks, end, score) stay synthesized.
// Background music: one loop from the ElevenLabs music API (prep_music.py -> sounds/bgm.mp3), quiet under the
// foley, faded in on the first touch / click; its own switch (the speaker switch mutes it too).
// The context is made at load (to decode the samples) and starts on the first touch / click (browsers allow audio
// only after a gesture). Both switches are remembered per browser.
const AC = window.AudioContext || window.webkitAudioContext;
const ctx = AC ? new AC() : null;
let master = null, on = true;
try { on = localStorage.getItem("bananaSound") !== "off"; } catch (err) { /* storage blocked */ }
if (ctx) {
  master = ctx.createGain();
  master.gain.value = on ? 0.8 : 0;
  master.connect(ctx.destination);
}
const MUSIC_LEVEL = 0.32;
let music = true, musicG = null;
try { music = localStorage.getItem("bananaMusic") !== "off"; } catch (err) { /* storage blocked */ }
if (ctx) {
  musicG = ctx.createGain();
  musicG.gain.value = 0;                                     // faded in when the context starts
  musicG.connect(master);
  fetch("sounds/bgm.mp3").then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => {
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.connect(musicG);
    src.start();
  }).catch(() => { /* no music file: silence */ });
}
// iPhone: Web Audio follows the ring / silent switch unless the page asks for the "playback" session (Safari 17+)
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (err) { /* not supported */ }
let started = false;
function fadeIn() {
  if (started || ctx.state !== "running") return;
  started = true;
  if (music) musicG.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 0.8);
}
function init() {
  if (!ctx) return;
  // not "running" = "suspended" (never started) or, on iOS, "interrupted" (a call, another app, the page hidden)
  if (ctx.state !== "running") ctx.resume().then(fadeIn, () => { /* not a gesture the browser accepts: the next one */ });
  else fadeIn();
}
// A finger going down does not count as a user gesture on phones (only its lift does: pointerup / touchend / click),
// so the context could never start there. A mouse press does count, which is why desktop worked.
for (const ev of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) addEventListener(ev, init, { capture: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden && started) init(); });

// samples: name -> [{ buf, peak }]
const S = {};
if (ctx) {
  fetch("sounds/sounds.json").then((r) => r.json()).then((list) => Promise.all(Object.entries(list).flatMap(([name, e]) =>
    e.takes.filter((t) => t.use).map((t) => fetch(`sounds/${t.file}`).then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { (S[name] = S[name] || []).push({ buf, peak: t.peak_s }); })))))
    .catch(() => { /* no sounds: silent foley */ });
}

const ready = () => ctx && ctx.state === "running" && on;
const rnd = (a, b) => a + Math.random() * (b - a);
// play a random take of `name` so its hit lands `delay` s from now (started later, or partway in if it's too late)
function play(name, delay = 0, gain = 1, rate = 1) {
  const takes = S[name];
  if (!ready() || !takes) return;
  const tk = takes[Math.floor(Math.random() * takes.length)];
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = tk.buf;
  src.playbackRate.value = rate * rnd(0.94, 1.06);
  g.gain.value = gain * rnd(0.85, 1);
  src.connect(g).connect(master);
  const lead = tk.peak / src.playbackRate.value;              // s from the start of the take to its hit
  src.start(ctx.currentTime + Math.max(0, delay - lead), Math.max(0, lead - delay) * src.playbackRate.value);
}

// synthesized UI cues
const env = (g, t, a, peak, dec) => {                       // attack a, then exponential decay to silence
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
};
function tone(t, f, dur, peak, type = "sine", a = 0.004) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  env(g, t, a, peak, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + a + dur + 0.05);
}

export const sfx = {
  squish(delay = 0) { play("slice", delay, 0.9); },        // the blade through the banana, its hit at `delay` s
  tap(delay = 0) { play("board", delay, 0.45); },          // the blade on the board
  whoosh(strength = 1) { play("whoosh", 0, Math.min(1, 0.3 * strength), strength > 1 ? 0.85 : 1); },
  shoo() { play("whoosh", 0, 0.25, 1.35); },               // a fly shooed: a quick, higher whiff
  go() {                                                    // a round starts
    if (!ready()) return;
    const t = ctx.currentTime;
    tone(t, 523, 0.09, 0.18, "triangle"); tone(t + 0.1, 784, 0.18, 0.2, "triangle");
  },
  tick(last) {                                              // the last seconds
    if (!ready()) return;
    tone(ctx.currentTime, last ? 1320 : 990, 0.05, 0.15, "square", 0.002);
  },
  end() {                                                   // time's up
    if (!ready()) return;
    const t = ctx.currentTime;
    tone(t, 660, 0.12, 0.2, "triangle"); tone(t + 0.13, 440, 0.35, 0.22, "triangle");
  },
  combo(k) {                                                // a multi-slice combo: k notes climbing
    if (!ready()) return;
    const t = ctx.currentTime, scale = [659, 784, 988, 1175, 1319, 1568, 1976];
    for (let i = 0; i < Math.min(k, scale.length); i++) tone(t + 0.06 * i, scale[i], 0.22, 0.12, "triangle", 0.004);
  },
  chime() {                                                 // the score comes up
    if (!ready()) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(t + 0.09 * i, f, 0.4, 0.12, "sine", 0.01));
  },
};

// a looping sample (the fly buzz): its gain node, to turn up and down; null until the samples are loaded
export function loop(name) {
  const takes = S[name];
  if (!ctx || !takes) return null;
  const src = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
  src.buffer = takes[Math.floor(Math.random() * takes.length)].buf;
  src.loop = true;
  hp.type = "highpass"; hp.frequency.value = 380;              // a tiny fly: no low drone
  g.gain.value = 0;
  src.connect(hp).connect(g).connect(master);
  src.start();
  return g;
}
export const audio = () => (ready() ? { ctx, out: master } : null);
export const soundOn = () => on;
export const musicOn = () => music;
export function toggleMusic() {
  init();
  music = !music;
  try { localStorage.setItem("bananaMusic", music ? "on" : "off"); } catch (err) { /* storage blocked */ }
  if (musicG) musicG.gain.setTargetAtTime(music ? MUSIC_LEVEL : 0, ctx.currentTime, 0.15);
  return music;
}
export function toggleSound() {
  init();
  on = !on;
  try { localStorage.setItem("bananaSound", on ? "on" : "off"); } catch (err) { /* storage blocked */ }
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
  return on;
}
