// Homepage hero (or, with data-card, the SimReady Leaves card on /one): real scanned leaves (the SimReady Leaves lab's data, LeafSnap30 scans, CC BY 4.0) falling behind
// the headline. Procedural flutter (swing + tilt with the swing, slow spin, speed dips at the turns), recycled at
// the bottom. The pointer is a light breeze: leaves near it drift with its movement. Loaded after first paint;
// runs only while the hero is on screen; one still frame with "reduce motion".
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const KEYS = ["acer_palmatum__wb1127-01-1", "acer_rubrum__pi2388-01-1", "liriodendron_tulipifera__pi0068-01-1",
  "quercus_montana__pi0036-01-1", "cercis_canadensis__pi0001-01-1", "ptelea_trifoliata__pi0003-01-1",
  "ulmus_americana__pi0020-01-1", "styrax_japonica__ny1001-01-1"];
const DATA = "/labs/simready-leaves/viewer_data/";

const canvas = document.getElementById("field");
const card = !!canvas && canvas.hasAttribute("data-card");   // inside a lab card (/one) instead of the hero
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => innerWidth < 760;

const dec = (b64, T) => { const s = atob(b64), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new T(u.buffer); };

async function main() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07090d, 6, 11.5);            // far leaves sink into the dark
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0, 6);
  const key = new THREE.DirectionalLight(0xffe7c8, 3.0);     // warm, from the upper right: the spotlight of the design
  key.position.set(3, 4, 4);
  const rim = new THREE.DirectionalLight(0x9fdcf0, 0.8);     // a cool rim in the accent colour
  rim.position.set(-4, 1, -3);
  const hemi = new THREE.HemisphereLight(0xcfd8e0, 0x1a1410, 0.35);
  scene.add(key, rim, hemi);
  // follow the page theme: far leaves fade into the page colour (paper or night)
  function applyTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    if (card) scene.fog.color.set(getComputedStyle(document.documentElement).getPropertyValue("--bg-2").trim() || "#fffdf8");
    else scene.fog.color.set(dark ? 0x07090d : 0xf5f2ea);
    renderer.toneMappingExposure = dark ? 1.25 : 1.0;
    key.intensity = dark ? 3.0 : 2.3;
    hemi.intensity = dark ? 0.35 : 0.9;
  }
  applyTheme();
  addEventListener("themechange", () => { applyTheme(); if (reduceMotion) renderer.render(scene, camera); });

  // the leaves: one geometry + two scan textures each (top and underside), shared by every falling copy
  const tl = new THREE.TextureLoader();
  const tex = (uri) => { const t = tl.load(uri); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const kinds = (await Promise.all(KEYS.map((k) => fetch(DATA + k + ".json").then((r) => (r.ok ? r.json() : null)).catch(() => null))))
    .filter(Boolean).map((D) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(dec(D.p, Float32Array), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(dec(D.uv, Float32Array), 2));
      g.setIndex(new THREE.BufferAttribute(dec(D.i, Uint16Array), 1));
      g.computeVertexNormals(); g.computeBoundingBox(); g.center();
      const s = new THREE.Vector3(); g.boundingBox.getSize(s);
      const mat = (map, side) => new THREE.MeshStandardMaterial({ map, side, alphaTest: 0.5, roughness: 0.72 });
      return { g, size: Math.max(s.x, s.z), under: mat(tex(D.back), THREE.FrontSide), top: mat(tex(D.front), THREE.BackSide) };
    });
  if (!kinds.length) return;

  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 1, H = 1;                                          // half width / height of the view at z = 0
  const leaves = [];
  function spawn(L, anywhere) {
    // desktop: mostly the right side (the headline is on the left); phones: across, fewer
    const right = !card && !narrow() && Math.random() < 0.86;
    L.z = card ? rnd(-2.4, 1.4) : right || narrow() ? rnd(-3.6, 1.6) : rnd(-4.2, -2.6);   // the few behind the headline stay far back, dim
    const k = (6 - L.z) / 6;                                 // view grows with depth
    L.x0 = right ? rnd(-0.05, 1.05) * W * k : rnd(-1.05, 1.05) * W * k;
    L.y = anywhere ? rnd(-1.1, 1.1) * H * k : H * k * rnd(1.08, 1.4);
    L.w = rnd(1.1, 1.9); L.ph = rnd(0, 6.3); L.A = rnd(0.25, 0.55); L.vy = rnd(0.32, 0.55);
    L.spin = rnd(-0.6, 0.6); L.yaw = rnd(0, 6.3); L.base = rnd(-1.35, -0.95); L.vx = 0; L.t = 0;
  }
  const COUNT = () => (card ? 16 : narrow() ? 11 : 26);
  function populate() {
    while (leaves.length < COUNT()) {
      const kd = kinds[leaves.length % kinds.length];
      const obj = new THREE.Group();
      obj.add(new THREE.Mesh(kd.g, kd.under), new THREE.Mesh(kd.g, kd.top));
      obj.scale.setScalar((card ? rnd(0.85, 1.2) : rnd(0.5, 0.72)) / kd.size);            // ~0.5-0.7 m across: magnified, like a still life
      const L = { obj }; spawn(L, true); leaves.push(L); scene.add(obj);
    }
    while (leaves.length > COUNT()) scene.remove(leaves.pop().obj);
  }
  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    H = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; W = H * camera.aspect;
    populate();
  }
  layout();
  addEventListener("resize", layout);

  // the pointer as a breeze
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, t: 0, on: false };
  addEventListener("pointermove", (e) => {
    const now = performance.now(), dt = Math.max(16, now - ptr.t) / 1000;
    if (ptr.on) { ptr.vx = (e.clientX - ptr.x) / dt; ptr.vy = (e.clientY - ptr.y) / dt; }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; ptr.on = true;
  }, { passive: true });
  const v = new THREE.Vector3();

  function step(dt) {
    const gust = performance.now() - ptr.t < 120;
    for (const L of leaves) {
      L.t += dt;
      const s = Math.sin(L.w * L.t + L.ph), c = Math.cos(L.w * L.t + L.ph);
      L.y -= L.vy * (0.45 + 0.55 * Math.abs(c)) * dt;        // slower at the ends of each swing
      if (gust) {                                            // pushed along by a passing pointer
        v.set(L.x0 + L.A * s, L.y, L.z).project(camera);
        const r = canvas.getBoundingClientRect();
        const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
        if (Math.hypot(sx - ptr.x, sy - ptr.y) < 150) L.vx += ptr.vx * 0.00035 * Math.min(1, dt * 30);
      }
      L.vx *= Math.exp(-dt * 1.4); L.x0 += L.vx * dt;
      L.yaw += L.spin * dt;
      L.obj.position.set(L.x0 + L.A * s, L.y, L.z);
      L.obj.rotation.set(L.base + 0.28 * Math.sin(0.5 * L.w * L.t + L.ph), L.yaw, 0.65 * c, "YXZ");
      const k = (6 - L.z) / 6;
      if (L.y < -H * k * 1.25 || Math.abs(L.x0) > W * k * 1.6) spawn(L, false);
    }
  }

  if (card) canvas.parentElement.classList.add("live");     // the leaves replace the card's still image
  if (reduceMotion) { renderer.render(scene, camera); return; }
  let raf = null, last = performance.now(), heroOn = true;
  const frame = (now) => {
    step(Math.min(0.05, (now - last) / 1000)); last = now;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const run = !document.hidden && heroOn;
    if (!run && raf) { cancelAnimationFrame(raf); raf = null; }
    else if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  document.addEventListener("visibilitychange", sync);
  const hero = card ? canvas : document.querySelector(".frame");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => { heroOn = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
  }
  const fade = () => { canvas.style.opacity = String(Math.max(0, 1 - scrollY / (innerHeight * 0.9))); };
  if (!card) { addEventListener("scroll", fade, { passive: true }); fade(); }
  sync();
}

if (canvas) main().catch(() => { /* no WebGL or no leaf data: the hero is still the text */ });
