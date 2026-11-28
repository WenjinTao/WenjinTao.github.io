// Banana − knife, in the browser. Every click subtracts the knife blade's swept slab (1.59 mm, the SimReady knife's
// measured blade thickness) from the current pieces with our own Boolean kernel (bk.wasm, in a Web Worker), and the
// kernel also computes the removed part (pieces ∩ slab), so the two volumes must add back up to the banana's.
// Frame: banana coordinates in meters, z up (as in the L7 film). Physics: our own kernel (phys.js), one rigid body per piece.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import PHYS from "./phys.js?v=95b05076a0";                    // our own physics kernel (phys-kernel -> bp.wasm), Rapier-like API
import { bananaAnatomy, NS, NA } from "./anatomy.js?v=95b05076a0";
import { createFlies } from "./flies.js?v=95b05076a0";
import { sfx, toggleSound, soundOn, toggleMusic, musicOn } from "./sound.js?v=95b05076a0";
await PHYS.init();

const $ = (id) => document.getElementById(id);
// models: int32 [nv, nt], float32 V, int32 T, float32 per-corner UV (prep_assets.py)
async function load(n) {
  const b = await fetch(`assets/${n}.bin`).then((r) => r.arrayBuffer());
  const [nv, nt] = new Int32Array(b, 0, 2);
  const V = new Float32Array(b, 8, 3 * nv), T = new Int32Array(b, 8 + 12 * nv, 3 * nt);
  const UV = new Float32Array(b, 8 + 12 * nv + 12 * nt, 6 * nt);
  return { V, T, UV };
}
// depth below the banana's skin on a 1 mm grid (prep_depth.py): int32 [nx, ny, nz], float32 [ox, oy, oz, h, d0, dr], uint8
async function loadDepth() {
  const b = await fetch("assets/banana_depth.bin").then((r) => r.arrayBuffer());
  return { n: new Int32Array(b, 0, 3), h: new Float32Array(b, 12, 6), q: new Uint8Array(b, 36) };
}
const [BAN, KNF, BRD, KINFO, DEPTH] = await Promise.all([load("banana"), load("knife"), load("board"),
  fetch("assets/knife_info.json").then((r) => r.json()), loadDepth()]);
KNF.info = KINFO.info;
const COARSE = matchMedia("(pointer: coarse)").matches;   // phones / tablets: lighter rendering

// ---- geometry helpers ------------------------------------------------------------------------------------------------
function volume(V, T) {
  let s = 0;
  for (let i = 0; i < T.length; i += 3) {
    const a = 3 * T[i], b = 3 * T[i + 1], c = 3 * T[i + 2];
    s += V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1]) - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c])
       + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c]);
  }
  return s / 6;
}

function faceNormals(V, T) {
  const N = new Float64Array(T.length);
  for (let f = 0; f < T.length / 3; f++) {
    const a = 3 * T[3 * f], b = 3 * T[3 * f + 1], c = 3 * T[3 * f + 2];
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2];
    const vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    N[3 * f] = uy * vz - uz * vy; N[3 * f + 1] = uz * vx - ux * vz; N[3 * f + 2] = ux * vy - uy * vx;  // 2 * area
  }
  return N;
}

// per-corner normals: average of the faces around the vertex that are within 35 deg of this face (keeps real edges)
function cornerNormals(V, T) {
  const FN = faceNormals(V, T), nf = T.length / 3, nv = V.length / 3;
  const inc = Array.from({ length: nv }, () => []);
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) inc[T[3 * f + k]].push(f);
  const unit = (f) => { const l = Math.hypot(FN[3 * f], FN[3 * f + 1], FN[3 * f + 2]) || 1;
                        return [FN[3 * f] / l, FN[3 * f + 1] / l, FN[3 * f + 2] / l]; };
  const out = new Float32Array(9 * nf), cos = Math.cos(35 * Math.PI / 180);
  for (let f = 0; f < nf; f++) {
    const nfu = unit(f);
    for (let k = 0; k < 3; k++) {
      let x = 0, y = 0, z = 0;
      for (const g of inc[T[3 * f + k]]) {
        const ng = unit(g);
        if (ng[0] * nfu[0] + ng[1] * nfu[1] + ng[2] * nfu[2] > cos) { x += FN[3 * g]; y += FN[3 * g + 1]; z += FN[3 * g + 2]; }
      }
      const l = Math.hypot(x, y, z) || 1;
      out.set([x / l, y / l, z / l], 9 * f + 3 * k);
    }
  }
  return out;
}

function geoFrom(V, T, UV, normals) {
  const g = new THREE.BufferGeometry(), n = T.length;
  const pos = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) pos.set([V[3 * T[i]], V[3 * T[i] + 1], V[3 * T[i] + 2]], 3 * i);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(normals || cornerNormals(V, T), 3));
  if (UV) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(UV), 2));
  return g;
}

// ---- scene -----------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08090c);

const BV = new Float64Array(BAN.V), BT = new Int32Array(BAN.T);
const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < BV.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], BV[i + k]); hi[k] = Math.max(hi[k], BV[i + k]); }
const CEN = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
const V0 = volume(BV, BT);

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.005, 5);
camera.up.set(0, 0, 1);
camera.position.copy(CEN).add(new THREE.Vector3(-0.2, -0.05, 0.17));
// framing: the distance is set so the banana's bounding box fills ~80 % of the screen in both directions; portrait
// screens look from higher up, so the banana's length uses the screen's height
function frameCamera() {
  const portrait = innerWidth < innerHeight;
  const dir = new THREE.Vector3(...(portrait ? [-0.06, -0.1, 0.3] : [-0.2, -0.05, 0.17])).normalize();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  let d = 0.27;
  for (let it = 0; it < 6; it++) {
    camera.position.copy(CEN).addScaledVector(dir, d); camera.lookAt(CEN); camera.updateMatrixWorld();
    let m = 0;
    for (let k = 0; k < 8; k++) {
      const p = new THREE.Vector3(k & 1 ? hi[0] : lo[0], k & 2 ? hi[1] : lo[1], k & 4 ? hi[2] : lo[2]).project(camera);
      m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
    }
    d *= m / 0.8;
  }
  camera.position.copy(CEN).addScaledVector(dir, Math.max(d, 0.12));
}
frameCamera();
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(CEN);
controls.enableDamping = true;
controls.minDistance = 0.08; controls.maxDistance = 0.8;
// wheel zoom by our own handler: OrbitControls (r160) steps a fixed 5% per wheel *event*, and smooth-scrolling mice
// and trackpads send many small events per notch, so one notch jumped a lot. Here the step follows the scrolled
// distance: ~9% per 100 px notch, the same on every device (pinch on a touch screen still goes to OrbitControls).
// Smooth: the wheel moves a target distance, the camera eases to it (exponential, ~90 ms, in log distance so in and
// out feel alike); more scrolling while it moves extends the target, so a long scroll is one continuous glide.
const ZOOM_PER_PX = 0.0009, ZOOM_TAU = 0.09;
let zoomTo = null;
renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault(); e.stopImmediatePropagation();
  const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1);
  const from = zoomTo ?? camera.position.distanceTo(controls.target);
  zoomTo = Math.min(controls.maxDistance, Math.max(controls.minDistance,
    from * Math.exp(Math.max(-200, Math.min(200, px)) * ZOOM_PER_PX)));
}, { capture: true, passive: false });
function zoomStep(dt) {
  if (zoomTo === null) return;
  const off = camera.position.clone().sub(controls.target), d = off.length();
  const k = 1 - Math.exp(-dt / ZOOM_TAU);
  const next = Math.exp(Math.log(d) + (Math.log(zoomTo) - Math.log(d)) * k);
  if (Math.abs(next / zoomTo - 1) < 1e-3) { camera.position.copy(controls.target).add(off.setLength(zoomTo)); zoomTo = null; }
  else camera.position.copy(controls.target).add(off.setLength(next));
}
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2018, 0.6));
const key = new THREE.DirectionalLight(0xfff2e6, 2.6);
key.position.copy(CEN).add(new THREE.Vector3(-0.15, -0.25, 0.35));
key.target.position.copy(CEN);
key.castShadow = true;
key.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -0.25, right: 0.25, top: 0.25, bottom: -0.25, near: 0.05, far: 1 });
key.shadow.bias = -0.0002;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0x8fb4ff, 0.7);
rim.position.copy(CEN).add(new THREE.Vector3(0.3, 0.2, 0.15));
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe2b8, 1.1);   // warm, from the far side: lights the cut faces facing away from the key
fill.position.copy(CEN).add(new THREE.Vector3(0.1, 0.3, 0.2));
scene.add(fill);

const tl = new THREE.TextureLoader();
function tex(name, srgb) {
  const t = tl.load(`assets/${name}.jpg`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function pbr(stem, extra = {}) {
  const orm = tex(`${stem}_orm`, false);
  return new THREE.MeshStandardMaterial(Object.assign({ map: tex(`${stem}_alb`, true), normalMap: tex(`${stem}_nor`, false),
    roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 }, extra));
}
const peelMat = pbr("banana");

// knife and board: modeled in their own frame; Rk maps them into the banana's (as in the film)
const Rk = (x, y, z) => [y, z, x];
function placed(D, map) {
  const V = new Float64Array(D.V.length);
  for (let i = 0; i < V.length; i += 3) V.set(map(D.V[i], D.V[i + 1], D.V[i + 2]), i);
  return V;
}
const BOARD_LO = [Infinity, Infinity, Infinity], BOARD_HI = [-Infinity, -Infinity, -Infinity];
let BOARD_GEO = null;                                      // the board's world-space mesh (scratch mask)
{
  let V = placed(BRD, Rk);
  const m = [0, 0, -Infinity];
  for (let i = 0; i < V.length; i += 3) { m[0] += V[i]; m[1] += V[i + 1]; m[2] = Math.max(m[2], V[i + 2]); }
  m[0] /= V.length / 3; m[1] /= V.length / 3;
  for (let i = 0; i < V.length; i += 3) { V[i] += CEN.x - m[0]; V[i + 1] += CEN.y - m[1]; V[i + 2] += lo[2] - m[2]; }
  for (let i = 0; i < V.length; i += 3) for (let k = 0; k < 3; k++) {
    BOARD_LO[k] = Math.min(BOARD_LO[k], V[i + k]); BOARD_HI[k] = Math.max(BOARD_HI[k], V[i + k]);
  }
  const board = new THREE.Mesh(geoFrom(V, BRD.T, BRD.UV), pbr("board"));
  board.receiveShadow = true;
  scene.add(board);
  BOARD_GEO = { V, T: BRD.T };
}

// ---- knife scratches on the board: each cut that reaches the board leaves one very faint mark along the blade,
// 5-8 cm, tapered: a fine pale line (fresh wood fibres) with a faint dark edge. Drawn into a 2048 px canvas
// (~0.2 mm per px) on a transparent layer just above the board top, lit like the board, masked to the board's top
// face (not over the handle hole or past the edge). They stay for the session, like on a real board.
const scratchBoard = (() => {
  const SX = BOARD_HI[0] - BOARD_LO[0], SY = BOARD_HI[1] - BOARD_LO[1];
  const W = 2048, H = Math.round(W * SY / SX);
  const px = (x, y) => [(x - BOARD_LO[0]) / SX * W, (BOARD_HI[1] - y) / SY * H];
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  // the top face: triangles at the top height that face up
  const mask = canvas(W, H), mc = mask.getContext("2d");
  mc.fillStyle = "#fff";
  const { V, T } = BOARD_GEO;
  for (let f = 0; f < T.length; f += 3) {
    const P = [0, 1, 2].map((k) => [V[3 * T[f + k]], V[3 * T[f + k] + 1], V[3 * T[f + k] + 2]]);
    if (P.some((q) => q[2] < BOARD_HI[2] - 0.0005)) continue;
    mc.beginPath();
    P.forEach((q, k) => { const [x, y] = px(q[0], q[1]); if (k) mc.lineTo(x, y); else mc.moveTo(x, y); });
    mc.closePath(); mc.fill();
  }
  const marks = canvas(W, H), kc = marks.getContext("2d");
  const out = canvas(W, H), oc = out.getContext("2d");
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const layer = new THREE.Mesh(new THREE.PlaneGeometry(SX, SY), new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.75,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  layer.position.set((BOARD_LO[0] + BOARD_HI[0]) / 2, (BOARD_LO[1] + BOARD_HI[1]) / 2, BOARD_HI[2] + 0.0001);
  layer.receiveShadow = true;
  scene.add(layer);
  // one mark: centred near (x, y), along unit (ux, uy)
  return (x, y, ux, uy) => {
    const len = 0.05 + Math.random() * 0.03, off = (Math.random() - 0.5) * 0.03;
    const a = Math.atan2(uy, ux) + (Math.random() - 0.5) * 0.02;            // the hand is not exact
    const dx = Math.cos(a), dy = Math.sin(a), N = 48, wob = Math.random() * 6;
    for (const [color, width, alpha, shift] of [["40,22,12", 2.2, 0.07, 0.8], ["232,200,158", 1.3, 0.16, 0]]) {
      kc.lineWidth = width; kc.lineCap = "round";
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
        const pt = (t) => {
          const s_ = off + (t - 0.5) * len, wv = 0.00004 * Math.sin(wob + t * 9);   // a slight waver
          return px(x + dx * s_ - dy * wv, y + dy * s_ + dx * wv);
        };
        const [x0, y0] = pt(t0), [x1, y1] = pt(t1);
        kc.strokeStyle = `rgba(${color},${(alpha * Math.pow(Math.sin(Math.PI * tm), 0.7)).toFixed(3)})`;
        kc.beginPath(); kc.moveTo(x0 + shift, y0 + shift); kc.lineTo(x1 + shift, y1 + shift); kc.stroke();
      }
    }
    oc.globalCompositeOperation = "copy"; oc.drawImage(marks, 0, 0);
    oc.globalCompositeOperation = "destination-in"; oc.drawImage(mask, 0, 0);
    oc.globalCompositeOperation = "source-over";
    tex.needsUpdate = true;
  };
})();
const KI = KNF.info;
const pivot = [KI.edge_x, (KI.blade_y[0] + KI.blade_y[1]) / 2, KI.blade_zmid];
const knife = new THREE.Group();
{
  const V = placed(KNF, (x, y, z) => Rk(x - pivot[0], y - pivot[1], z - pivot[2]));
  const m = new THREE.Mesh(geoFrom(V, KNF.T, KNF.UV), pbr("knife"));
  m.castShadow = true;
  knife.add(m);
  scene.add(knife);
}
const KNIFE_DX = 0.045;                                   // blade middle over the banana, handle beyond it
const TH = KI.thickness;                                    // the blade's thickness: the slab the Boolean removes
const Z_UP = hi[2] + 0.03, Z_DOWN = lo[2];

// ---- original surface lookup (UVs and normals of peel pieces) -------------------------------------------------------
const BUV = new Float32Array(BAN.UV), BN = cornerNormals(BV, BT), FNB = faceNormals(BV, BT);
// Fast: numeric grid keys, each triangle's frame precomputed (no allocations per test), and a point is looked up in
// its own cell first (a triangle is filed in every cell its box touches, so a point on it finds it there).
const CELL = 0.004, grid = new Map();
const cellKey = (i, j, k) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);
const NBT = BT.length / 3, TRI = new Float64Array(NBT * 16);   // a, v0, v1, d00, d01, d11, 1/den, unit normal
for (let f = 0; f < NBT; f++) {
  const a = 3 * BT[3 * f], b = 3 * BT[3 * f + 1], c = 3 * BT[3 * f + 2], o = 16 * f;
  const v0 = [BV[b] - BV[a], BV[b + 1] - BV[a + 1], BV[b + 2] - BV[a + 2]];
  const v1 = [BV[c] - BV[a], BV[c + 1] - BV[a + 1], BV[c + 2] - BV[a + 2]];
  const d00 = v0[0] * v0[0] + v0[1] * v0[1] + v0[2] * v0[2], d01 = v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
  const d11 = v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2];
  const n = [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]];
  const nl = Math.hypot(...n) || 1;
  TRI.set([BV[a], BV[a + 1], BV[a + 2], ...v0, ...v1, d00, d01, d11, 1 / ((d00 * d11 - d01 * d01) || 1e-30),
           n[0] / nl, n[1] / nl, n[2] / nl], o);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) {
    const v = BV[3 * BT[3 * f + k] + d]; mn[d] = Math.min(mn[d], v); mx[d] = Math.max(mx[d], v);
  }
  for (let i = Math.floor(mn[0] / CELL); i <= Math.floor(mx[0] / CELL); i++)
    for (let j = Math.floor(mn[1] / CELL); j <= Math.floor(mx[1] / CELL); j++)
      for (let k = Math.floor(mn[2] / CELL); k <= Math.floor(mx[2] / CELL); k++) {
        const key_ = cellKey(i, j, k);
        if (!grid.has(key_)) grid.set(key_, []);
        grid.get(key_).push(f);
      }
}
// barycentric coordinates of p on original triangle f, and its distance from f's plane
function bary(f, p) {
  const o = 16 * f, T_ = TRI;
  const x = p[0] - T_[o], y = p[1] - T_[o + 1], z = p[2] - T_[o + 2];
  const d20 = x * T_[o + 3] + y * T_[o + 4] + z * T_[o + 5], d21 = x * T_[o + 6] + y * T_[o + 7] + z * T_[o + 8];
  const v = (T_[o + 11] * d20 - T_[o + 10] * d21) * T_[o + 12], w = (T_[o + 9] * d21 - T_[o + 10] * d20) * T_[o + 12];
  return [1 - v - w, v, w, Math.abs(x * T_[o + 13] + y * T_[o + 14] + z * T_[o + 15])];
}
function bestIn(list, p, cur) {
  for (const f of list) {
    const [u, v, w, d] = bary(f, p);
    const sc = d + Math.max(0, -u, -v, -w) * 0.01;
    if (sc < cur[1]) { cur[0] = f; cur[1] = sc; }
  }
}
function sourceTri(p) {
  // the original triangle this point lies on: inside its barycentric range and closest to its plane
  const ci = Math.floor(p[0] / CELL), cj = Math.floor(p[1] / CELL), ck = Math.floor(p[2] / CELL);
  const cur = [-1, Infinity];
  bestIn(grid.get(cellKey(ci, cj, ck)) || [], p, cur);
  if (cur[1] < 1e-9) return cur[0];                         // on a triangle of its own cell: done
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++)
    if (di || dj || dk) bestIn(grid.get(cellKey(ci + di, cj + dj, ck + dk)) || [], p, cur);
  return cur[0];
}

// ---- cut-face shader: a solid texture, colored by where each point sits inside the banana ---------------------------
// Two 3D fields, both in the banana's own frame (pieces keep their geometry in it, so vLoc = position):
//  - depth below the skin, 1 mm grid (prep_depth.py): rind and pith at their true thickness, so a grazing cut shows
//    a wide band of peel and a cut across a thin ring, as in a real section;
//  - a centerline through the fruit with the surface radius around it (anatomy.js): distance to the axis, angle and
//    position along it place the three-part core, the seeds and the fibers. Across: rings and a star; lengthwise: a
//    core band with a row of seeds and fibers running along; slanted: stretched rings.
// browning: every cut face carries the time it was made ("born", s); the flesh oxidizes at OXI x real speed.
// Real banana flesh browns over ~10-30 min; at x30 that is ~20 s to a first tint, 1-2 min to clearly brown.
const OXI = 30;
const TIME = { value: 0 };
let TSHIFT = 0;                                             // testing: __dbg.age(s) jumps ahead
const ANAT = bananaAnatomy(BV, BT);
const radTex = new THREE.DataTexture(ANAT.R8, NA, NS, THREE.RedFormat, THREE.UnsignedByteType);
radTex.wrapS = THREE.RepeatWrapping; radTex.magFilter = radTex.minFilter = THREE.LinearFilter; radTex.needsUpdate = true;
const depTex = new THREE.Data3DTexture(DEPTH.q, DEPTH.n[0], DEPTH.n[1], DEPTH.n[2]);
depTex.format = THREE.RedFormat; depTex.type = THREE.UnsignedByteType; depTex.unpackAlignment = 1;
depTex.magFilter = depTex.minFilter = THREE.LinearFilter; depTex.needsUpdate = true;
const v3 = (a) => new THREE.Vector3(...a);
const ANAT_U = {
  uTime: TIME,
  uC: { value: ANAT.C.map(v3) }, uTn: { value: ANAT.Tn.map(v3) }, uNn: { value: ANAT.Nn.map(v3) },
  uR: { value: radTex }, uRmax: { value: ANAT.rmax }, uSeg: { value: ANAT.seg },
  uDepth: { value: depTex }, uDo: { value: new THREE.Vector3(DEPTH.h[0], DEPTH.h[1], DEPTH.h[2]) },
  uDn: { value: new THREE.Vector3(DEPTH.n[0], DEPTH.n[1], DEPTH.n[2]) },
  uDh: { value: DEPTH.h[3] }, uD0: { value: DEPTH.h[4] }, uDR: { value: DEPTH.h[5] },
};
const cutMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
cutMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, ANAT_U);
  sh.vertexShader = "attribute float born;\nvarying vec3 vLoc;\nvarying float vBorn;\n" +
    sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvLoc = position;\nvBorn = born;");
  sh.fragmentShader = `#define NS ${NS}
varying vec3 vLoc;
varying float vBorn;
uniform float uTime;
uniform vec3 uC[NS], uTn[NS], uNn[NS];
uniform sampler2D uR;
uniform float uRmax, uSeg;
uniform highp sampler3D uDepth;
uniform vec3 uDo, uDn;
uniform float uDh, uD0, uDR;
const float RIND = 0.0007, PITH = 0.0024;                  // m below the skin: yellow rind, then the pale inner peel
float h31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float hc(vec3 i, float P) { return h31(vec3(mod(i.x, P), i.y, i.z)); }
// value noise, periodic in x with period P (so an angle wraps around without a seam)
float vn3(vec3 p, float P) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hc(i, P), hc(i + vec3(1, 0, 0), P), f.x), mix(hc(i + vec3(0, 1, 0), P), hc(i + vec3(1, 1, 0), P), f.x), f.y),
             mix(mix(hc(i + vec3(0, 0, 1), P), hc(i + vec3(1, 0, 1), P), f.x), mix(hc(i + vec3(0, 1, 1), P), hc(i + vec3(1, 1, 1), P), f.x), f.y), f.z);
}
float skinDepth(vec3 p) { return uD0 + texture(uDepth, ((p - uDo) / uDh + 0.5) / uDn).r * uDR; }
// x = distance to the centerline, y = angle around it, z = position along it (m), w = surface radius there
vec4 anatomy(vec3 p) {
  float best = 1e9, bs = 0.0;
  for (int i = 0; i < NS - 1; i++) {
    vec3 e = uC[i + 1] - uC[i];
    float t = clamp(dot(p - uC[i], e) / dot(e, e), 0.0, 1.0);
    vec3 q = uC[i] + t * e - p;
    float d2 = dot(q, q);
    if (d2 < best) { best = d2; bs = float(i) + t; }
  }
  int i = int(min(floor(bs), float(NS - 2)));
  float t = bs - float(i);
  vec3 T = normalize(mix(uTn[i], uTn[i + 1], t)), N = mix(uNn[i], uNn[i + 1], t);
  N = normalize(N - dot(N, T) * T);
  vec3 d = p - mix(uC[i], uC[i + 1], t);
  float a = atan(dot(d, cross(T, N)), dot(d, N));
  float R = texture(uR, vec2(a / 6.2832, (bs + 0.5) / float(NS))).r * uRmax;
  return vec4(length(d), a, bs * uSeg, R);
}
// r: 0 on the axis, 1 at the inner peel
vec3 bananaCut(vec3 p, out float r, out float dep) {
  vec4 an = anatomy(p);
  dep = skinDepth(p);
  float a = an.y, z = an.z, u = a / 6.2832;
  float Rl = mix(an.x + dep, an.w, smoothstep(0.003, 0.0045, dep));      // the grid's depth is clamped at 5 mm
  r = clamp(an.x / max(Rl - PITH, 1e-4), 0.0, 1.0);
  vec3 flesh = mix(vec3(0.82, 0.68, 0.38), vec3(0.90, 0.80, 0.52), smoothstep(0.2, 0.85, r));
  flesh *= 0.9 + 0.14 * vn3(vec3(u * 44.0, r * 3.0, z * 120.0), 44.0)      // fibers: radial across, long lengthwise
            + 0.05 * vn3(vec3(u * 126.0, r * 12.0, z * 400.0), 126.0);
  float star = 0.3 * (0.7 + 0.3 * cos(3.0 * a + 0.6));                     // three-part core
  vec3 core = vec3(0.74, 0.58, 0.30) * (0.9 + 0.15 * vn3(p * 2500.0, 1e4));
  vec3 c = mix(core, flesh, smoothstep(star - 0.03, star + 0.03, r));
  c *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.05, abs(r - star)));          // core outline
  // seeds: small dark dots around the core, every ~3 mm along it
  vec3 g = vec3(u * 18.0, r * 18.0, z / 0.003), cid = floor(g), fp = fract(g) - 0.5;
  float seed = step(0.55, hc(cid, 18.0)) * smoothstep(0.22, 0.12, length(fp * vec3(1.0, 1.6, 1.1))) * step(r, 0.24) * step(0.06, r);
  c = mix(c, vec3(0.28, 0.2, 0.12), seed * 0.85);
  vec3 pith = vec3(0.96, 0.95, 0.82) * (0.94 + 0.08 * vn3(vec3(u * 90.0, dep * 2000.0, z * 300.0), 90.0));
  c = mix(c, pith, 1.0 - smoothstep(PITH - 0.0002, PITH + 0.0002, dep));
  c = mix(c, vec3(0.80, 0.66, 0.16), 1.0 - smoothstep(RIND - 0.00015, RIND + 0.00015, dep));
  return c;
}
vec3 oxidize(vec3 c, float r, float dep, vec3 p) {
  // age in real minutes; the outer flesh and the fibers go first, in patches; the rind itself stays yellow
  float mins = (uTime - vBorn) * ${OXI.toFixed(1)} / 60.0;
  float lead = 9.0 * (r - 0.5) + 10.0 * (vn3(p * 330.0, 1e4) - 0.5) + 4.0 * (vn3(p * 1400.0, 1e4) - 0.5);
  float k = smoothstep(4.0, 40.0, mins + lead) * smoothstep(RIND, RIND + 0.0004, dep);
  vec3 brown = vec3(0.47, 0.31, 0.14) * (0.8 + 0.35 * vn3(p * 1000.0, 1e4));
  return mix(c, brown, 0.88 * k);
}
` + sh.fragmentShader
    .replace("#include <color_fragment>",
      "#include <color_fragment>\nfloat rr, dd;\nvec3 cc = bananaCut(vLoc, rr, dd);\ndiffuseColor.rgb = oxidize(cc, rr, dd, vLoc);")
    .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.12;");  // flesh is translucent
};

// ---- physics (own kernel) --------------------------------------------------------------------------------------------
// Each piece is a rigid body: its geometry stays in the banana's original frame (local), M = local -> world.
// The physics world runs 10x larger (decimeters) so the solver's tolerances suit 2-5 cm pieces.
const PS = 10;
const world = new PHYS.World({ x: 0, y: 0, z: -9.81 * PS });
world.integrationParameters.numSolverIterations = 8;      // steadier resting contacts
const VMAX = 1.5 * PS;                                     // m/s cap: a safety net against a bad contact launching a piece
const WMAX = 25;                                           // rad/s cap: thin slices have tiny inertia and can spin up
{
  const fixed = world.createRigidBody(PHYS.RigidBodyDesc.fixed()
    .setTranslation((BOARD_LO[0] + BOARD_HI[0]) / 2 * PS, (BOARD_LO[1] + BOARD_HI[1]) / 2 * PS, (BOARD_LO[2] + BOARD_HI[2]) / 2 * PS));
  world.createCollider(PHYS.ColliderDesc.cuboid((BOARD_HI[0] - BOARD_LO[0]) / 2 * PS, (BOARD_HI[1] - BOARD_LO[1]) / 2 * PS,
    (BOARD_HI[2] - BOARD_LO[2]) / 2 * PS).setFriction(0.9), fixed);
  // no floor: a piece pushed off the board falls, fades out and is removed (see the animation loop)
}

function poseMatrix(body) {
  // the rotation is renormalized in double precision, so local <-> world stays a rigid motion (volumes stay exact)
  const t = body.translation(), r = body.rotation();
  const l = Math.hypot(r.x, r.y, r.z, r.w);
  return new THREE.Matrix4().compose(new THREE.Vector3(t.x / PS, t.y / PS, t.z / PS),
    new THREE.Quaternion(r.x / l, r.y / l, r.z / l, r.w / l), new THREE.Vector3(1, 1, 1));
}

function applyM(M, V) {
  const e = M.elements, W = new Float64Array(V.length);
  for (let i = 0; i < V.length; i += 3) {
    const x = V[i], y = V[i + 1], z = V[i + 2];
    W[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    W[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    W[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  return W;
}

// ---- pieces: geometry (local frame) -> meshes ---------------------------------------------------------------------------
const piecesGroup = new THREE.Group();
scene.add(piecesGroup);
let pieces = [];

// mesh mode (Mesh button / M): triangle edges over the shaded pieces; the surfaces are pushed back a little in depth
// so the lines don't flicker on them
let SHOW_MESH = false;
const wireCut = new THREE.LineBasicMaterial({ color: 0x78e1ff, transparent: true, opacity: 0.9 });
const wirePeel = new THREE.LineBasicMaterial({ color: 0x1a1d24, transparent: true, opacity: 0.45 });
for (const m of [peelMat, cutMat]) { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; }
function setMesh(on) {
  SHOW_MESH = on;
  $("mesh").classList.toggle("on", on);
  $("stats").hidden = !on;
  piecesGroup.traverse((o) => { if (o.userData.wire) o.visible = on; });
}

function pieceMeshes(V, T, tmesh, tface, planes) {
  const g = new THREE.Group();
  g.matrixAutoUpdate = false;
  const peel = { pos: [], uv: [], nrm: [] }, cuts = new Map();
  for (let f = 0; f < T.length / 3; f++) {
    const P = [0, 1, 2].map((k) => [V[3 * T[3 * f + k]], V[3 * T[3 * f + k] + 1], V[3 * T[3 * f + k] + 2]]);
    const cen = [0, 1, 2].map((d) => (P[0][d] + P[1][d] + P[2][d]) / 3);
    // peel = lies on the original banana surface (a piece of one of its triangles); everything else is a cut face
    // (the kernel's own A/B tag only knows the latest cut: earlier cut faces come back as part of A)
    const src = tmesh[f] === 1 ? -1 : sourceTri(cen);
    let onPeel = false;
    if (src >= 0) {
      const d = bary(src, cen)[3];
      const u = P[1].map((x, k) => x - P[0][k]), v = P[2].map((x, k) => x - P[0][k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const no = [FNB[3 * src], FNB[3 * src + 1], FNB[3 * src + 2]];
      const cs = (n[0] * no[0] + n[1] * no[1] + n[2] * no[2]) / ((Math.hypot(...n) * Math.hypot(...no)) || 1);
      onPeel = d < 1e-7 && cs > 0.99;
    }
    if (!onPeel) {
      if (!cuts.has(tface[f])) cuts.set(tface[f], []);
      cuts.get(tface[f]).push(f);
      continue;
    }
    for (const q of P) {
      const [u, v, w] = bary(src, q);
      peel.pos.push(...q);
      peel.uv.push(u * BUV[6 * src] + v * BUV[6 * src + 2] + w * BUV[6 * src + 4],
                   u * BUV[6 * src + 1] + v * BUV[6 * src + 3] + w * BUV[6 * src + 5]);
      const nx = u * BN[9 * src] + v * BN[9 * src + 3] + w * BN[9 * src + 6];
      const ny = u * BN[9 * src + 1] + v * BN[9 * src + 4] + w * BN[9 * src + 7];
      const nz = u * BN[9 * src + 2] + v * BN[9 * src + 5] + w * BN[9 * src + 8];
      const l = Math.hypot(nx, ny, nz) || 1;
      peel.nrm.push(nx / l, ny / l, nz / l);
    }
  }
  if (peel.pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(peel.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(peel.nrm, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(peel.uv, 2));
    const m = new THREE.Mesh(geo, peelMat); m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // cut faces: the kernel's own triangles (valid for any outline, e.g. a long curved lengthwise cut), flat-shaded;
  // the shader colors them from their position in the banana
  const pos = [], nrm = [], born = [], faces = [];          // faces: {rec, area} (the flies' smell)
  for (const tris of cuts.values()) {
    let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0, A = 0;
    for (const f of tris) {
      const P = [0, 1, 2].map((k) => [V[3 * T[3 * f + k]], V[3 * T[3 * f + k] + 1], V[3 * T[3 * f + k] + 2]]);
      const u = P[1].map((x, d) => x - P[0][d]), v = P[2].map((x, d) => x - P[0][d]);
      const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const ar = Math.hypot(...cr) / 2;
      nx += cr[0]; ny += cr[1]; nz += cr[2]; A += ar;
      cx += ar * (P[0][0] + P[1][0] + P[2][0]) / 3; cy += ar * (P[0][1] + P[1][1] + P[2][1]) / 3;
      cz += ar * (P[0][2] + P[1][2] + P[2][2]) / 3;
    }
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    cx /= A; cy /= A; cz /= A;
    // when this face was made: the piece's record of its cut planes (local frame), or now if it's new
    const dpl = nx * cx + ny * cy + nz * cz;
    let rec = planes.find((q) => q.n[0] * nx + q.n[1] * ny + q.n[2] * nz > 0.9999 && Math.abs(q.d - dpl) < 1e-6);
    if (!rec) { rec = { n: [nx, ny, nz], d: dpl, t0: TIME.value }; planes.push(rec); }
    faces.push({ rec, area: A });
    for (const f of tris) for (let k = 0; k < 3; k++) {
      const i = T[3 * f + k];
      pos.push(V[3 * i], V[3 * i + 1], V[3 * i + 2]); nrm.push(nx, ny, nz); born.push(rec.t0);
    }
  }
  if (pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute("born", new THREE.Float32BufferAttribute(born, 1));
    const m = new THREE.Mesh(geo, cutMat); m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // mesh mode: the kernel's triangle edges, cyan on the cut faces, dim on the peel
  const cutF = new Set();
  for (const tris of cuts.values()) for (const f of tris) cutF.add(f);
  const edge = new Map(), NV = V.length / 3;               // a * NV + b (a < b) -> touches a cut face
  for (let f = 0; f < T.length / 3; f++) for (let k = 0; k < 3; k++) {
    const a = T[3 * f + k], b = T[3 * f + (k + 1) % 3], key_ = a < b ? a * NV + b : b * NV + a;
    edge.set(key_, edge.get(key_) || cutF.has(f));
  }
  const lp = [[], []];
  for (const [key_, isCut] of edge) {
    const a = Math.floor(key_ / NV), b = key_ % NV;
    lp[isCut ? 1 : 0].push(V[3 * a], V[3 * a + 1], V[3 * a + 2], V[3 * b], V[3 * b + 1], V[3 * b + 2]);
  }
  lp.forEach((arr, i) => {
    if (!arr.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(geo, i ? wireCut : wirePeel);
    l.userData.wire = true; l.visible = SHOW_MESH;
    g.add(l);
  });
  g.userData.faces = faces;
  return g;
}

// collision shape: the piece cut into chunks along its long axis, one convex hull each. A single hull of a curved
// piece fills in the inside of the curve, so neighbors' hulls overlapped right after a cut and were shoved apart.
const CHUNK = 0.012;                                       // m along the axis
function convexParts(V, T) {
  const used = [...new Set(T)];
  const n = used.length;
  let mx = 0, my = 0, mz = 0;
  for (const v of used) { mx += V[3 * v]; my += V[3 * v + 1]; mz += V[3 * v + 2]; }
  mx /= n; my /= n; mz /= n;
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const v of used) {
    const d = [V[3 * v] - mx, V[3 * v + 1] - my, V[3 * v + 2] - mz];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[3 * a + b] += d[a] * d[b];
  }
  let ax = [1, 1, 1];                                      // power iteration: the long axis
  for (let it = 0; it < 30; it++) {
    const w = [0, 1, 2].map((a) => C[3 * a] * ax[0] + C[3 * a + 1] * ax[1] + C[3 * a + 2] * ax[2]);
    const l = Math.hypot(...w) || 1; ax = w.map((x) => x / l);
  }
  const t = used.map((v) => (V[3 * v] - mx) * ax[0] + (V[3 * v + 1] - my) * ax[1] + (V[3 * v + 2] - mz) * ax[2]);
  const t0 = Math.min(...t), t1 = Math.max(...t);
  // short pieces (slices) keep one hull: strips of a thin slice are near-flat and give it a jittery inertia
  const k = t1 - t0 < 2.5 * CHUNK ? 1 : Math.round((t1 - t0) / CHUNK);
  const parts = [];
  for (let j = 0; j < k; j++) {
    const a = t0 + (t1 - t0) * j / k - 0.0008, b = t0 + (t1 - t0) * (j + 1) / k + 0.0008;   // chunks overlap a little
    const P = [];
    used.forEach((v, i) => { if (t[i] >= a && t[i] <= b) P.push(V[3 * v] * PS, V[3 * v + 1] * PS, V[3 * v + 2] * PS); });
    if (P.length >= 12) parts.push(new Float32Array(P));
  }
  return parts;
}

function addPiece(V, T, tmesh, tface, M, linvel, angvel, planes = []) {
  const q = new THREE.Quaternion(), t = new THREE.Vector3(), s = new THREE.Vector3();
  M.decompose(t, q, s);
  const body = world.createRigidBody(PHYS.RigidBodyDesc.dynamic()
    .setTranslation(t.x * PS, t.y * PS, t.z * PS).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    .setLinvel(linvel[0], linvel[1], linvel[2]).setAngvel({ x: angvel[0], y: angvel[1], z: angvel[2] })
    .setCcdEnabled(true).setLinearDamping(0.6).setAngularDamping(2.5));
  for (const pts of convexParts(V, T)) {
    const cd = PHYS.ColliderDesc.convexHull(pts);
    if (cd) world.createCollider(cd.setDensity(1).setFriction(0.9).setRestitution(0.0), body);
  }
  const group = pieceMeshes(V, T, tmesh, tface, planes);
  group.matrix.copy(M);
  piecesGroup.add(group);
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < V.length; i += 3) { cx += V[i]; cy += V[i + 1]; cz += V[i + 2]; }
  const p = { V, T, tmesh, tface, body, group, planes, faces: group.userData.faces, vol: volume(V, T),
              c: [cx * 3 / V.length, cy * 3 / V.length, cz * 3 / V.length] };
  pieces.push(p);
  return p;
}

function removePiece(p) {
  if (p.preview) endPreview(p);
  world.removeRigidBody(p.body);
  piecesGroup.remove(p.group);
  p.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  pieces = pieces.filter((q) => q !== p);
}

function split(V, T, tmesh, tface) {
  // kernel result -> its shells, each re-indexed
  const nv = V.length / 3, par = new Int32Array(nv).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < T.length; i += 3) { const a = find(T[i]); par[find(T[i + 1])] = a; par[find(T[i + 2])] = a; }
  const out = new Map();
  for (let f = 0; f < T.length / 3; f++) {
    const r = find(T[3 * f]);
    if (!out.has(r)) out.set(r, { map: new Map(), V: [], T: [], tmesh: [], tface: [] });
    const s = out.get(r);
    for (let k = 0; k < 3; k++) {
      const v = T[3 * f + k];
      if (!s.map.has(v)) { s.map.set(v, s.V.length / 3); s.V.push(V[3 * v], V[3 * v + 1], V[3 * v + 2]); }
      s.T.push(s.map.get(v));
    }
    s.tmesh.push(tmesh[f]); s.tface.push(tface[f]);
  }
  return [...out.values()].map((s) => ({ V: new Float64Array(s.V), T: new Int32Array(s.T),
                                         tmesh: new Int32Array(s.tmesh), tface: new Int32Array(s.tface) }));
}

// ---- state, HUD ------------------------------------------------------------------------------------------------------
let removedSum = 0, droppedSum = 0, busy = false, lastEvent = 0;
const FREEZE_AFTER = 1200;                                  // ms after the last toss (a cut counts from 1 s after it starts): all stop
let lastInput = performance.now();                         // the flies' idle clock: last touch, click or key
addEventListener("pointerdown", () => { lastInput = performance.now(); }, { capture: true });
addEventListener("keydown", () => { lastInput = performance.now(); }, { capture: true });
// volume check: pieces on the board + what the blade removed + pieces that fell off = the banana
const volErr = () => Math.abs(pieces.reduce((a, p) => a + p.vol, 0) + removedSum + droppedSum - V0) / V0;
// ---- score card (top right): the points of this banana (free play too; a new banana or a round starts at 0),
// counted up with a little bump on every cut, and the best combo ever (kept in this browser)
let score = 0, shown = 0, bestCombo = 0;
try { bestCombo = +localStorage.getItem("bananaBestCombo") || 0; } catch (err) { /* storage blocked */ }
function showBest() { $("bestc").textContent = bestCombo > 1 ? `×${bestCombo}` : "–"; }
function addScore(pts, k) {
  score += pts;
  if (k > bestCombo) {
    bestCombo = k; showBest();
    try { localStorage.setItem("bananaBestCombo", String(k)); } catch (err) { /* storage blocked */ }
  }
  const card = $("scorecard");
  card.classList.remove("bump", "combo-bump"); void card.offsetWidth;       // restart the animation
  card.classList.add(k > 1 ? "combo-bump" : "bump");
}
function scoreFrame(dt) {                                   // count the number up toward the score
  if (shown === score) return;
  shown = score < shown ? score : Math.min(score, shown + Math.max(1, Math.ceil((score - shown) * Math.min(1, dt * 12))));
  $("pts").textContent = shown.toLocaleString();
}

function reset() {
  score = shown = 0; $("pts").textContent = "0";
  if (game.over) { game.over = false; $("hint").classList.add("gone"); }
  flies.dismiss();
  flies.setPov(false); $("povtag").hidden = true;
  for (const p of [...pieces]) removePiece(p);
  removedSum = droppedSum = 0;
  addPiece(BV.slice(), BT.slice(), new Int32Array(BT.length / 3), new Int32Array(BT.length / 3), new THREE.Matrix4(),
           [0, 0, 0], [0, 0, 0]);
  hud({ open: 0, fragments: "–" }, null, 0);
}
// the kernel's numbers (shown with the mesh)
function hud(rep, ms, err) {
  $("pieces").textContent = pieces.length;
  $("tris").textContent = pieces.reduce((a, p) => a + p.T.length / 3, 0).toLocaleString();
  $("open").textContent = rep.open;
  $("openrow").classList.toggle("bad", rep.open > 0);
  $("ms").textContent = ms == null ? "–" : `${ms.toFixed(0)} ms`;
  $("vol").textContent = err == null ? "–" : (err === 0 ? "exact" : err.toExponential(1));
}

// ---- aiming and cutting ------------------------------------------------------------------------------------------------
const TAP_ANGLE = 0;                                       // a tap chops across (the knife along x)
let aimX = CEN.x, aimY = CEN.y, aimA = 0, knifeZ = Z_UP, cutX = CEN.x, cutY = CEN.y, cutA = 0;
$("reset").onclick = () => { if (!busy && !game.on) reset(); };
$("mesh").onclick = () => setMesh(!SHOW_MESH);
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "m" || e.key === "M") setMesh(!SHOW_MESH);
  if ((e.key === "f" || e.key === "F") && !game.on) flies.summon();     // call a fly
  if ((e.key === "v" || e.key === "V") && !game.on) $("povtag").hidden = !flies.setPov(!flies.povOn());   // fly view
});

// ---- challenge + leaderboard (server.py). The buttons stay hidden when there is no API (e.g. a plain static host).
// A round: 10 s from a fresh banana. Score = points per cut with a multi-slice combo: points = new pieces x the
// number of pieces the blade went through in that cut (1 piece: +1; 2 at once: 2 x 2 = +4; 3: +9 ...), so lining
// pieces up pays. A cut already under way when time runs out still counts.
const game = { on: false, ending: false, over: false, token: null, t0: 0, round: 10, cuts: 0, score: 0, myId: null, period: "day" };
const api = (path, body) => fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify(body) } : { cache: "no-store" })
  .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j; });
api("api/top?n=1").then(() => document.querySelectorAll(".lb").forEach((b) => { b.hidden = false; })).catch(() => {});

async function startRound() {
  guide.end();
  if (busy || game.on) return;
  let g;
  try { g = await api("api/start", {}); } catch (err) { showPanel(`can't start a round: ${err.message}`, false); return; }
  $("panel").hidden = true;
  reset();
  Object.assign(game, { on: true, ending: false, over: false, token: g.token, round: g.round, t0: performance.now(), cuts: 0, score: 0, best: 0, myId: null });
  $("timer").hidden = false;
  $("reset").disabled = $("challenge").disabled = true;
  game.tick = 4;
  sfx.go();
}
async function endRound() {
  game.ending = true;
  while (busy) await new Promise((r) => setTimeout(r, 50));
  game.on = game.ending = false;
  game.over = true;                                        // time's up: no more cutting until Reset or a new round
  $("hint").textContent = "time's up · Reset or ▶ to play again";
  $("hint").classList.remove("gone");
  $("timer").hidden = true;
  $("reset").disabled = $("challenge").disabled = false;
  sfx.end();
  setTimeout(() => sfx.chime(), 650);
  showPanel(`<b>${game.score}</b> points · ${game.cuts} cuts · best combo ×${game.best || 1}`, game.score > 0);
}
function showPanel(html, canSubmit) {
  $("result").innerHTML = html;                              // only our own numbers / fixed text
  $("submit").hidden = !canSubmit || !game.token;
  try { $("name").value = localStorage.getItem("bananaName") || ""; } catch (err) { /* storage blocked */ }
  $("again").hidden = !document.querySelector(".lb:not([hidden])");
  $("panel").hidden = false;
  loadBoard(game.period);
}
async function loadBoard(period) {
  game.period = period;
  $("tday").classList.toggle("on", period === "day"); $("tall").classList.toggle("on", period === "all");
  const ol = $("board");
  let rows = [];
  try { rows = await api(`api/top?period=${period}&n=10`); } catch (err) { /* no API */ }
  ol.replaceChildren(...(rows.length ? rows.map((r) => {
    const li = document.createElement("li"), s = document.createElement("span");
    li.textContent = r.name; s.textContent = `${r.score}`; li.title = `${r.cuts} cuts`;
    li.appendChild(s);
    if (r.id === game.myId) li.className = "me";
    return li;
  }) : [Object.assign(document.createElement("li"), { className: "empty", textContent: "no scores yet" })]));
}
$("submit").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  if (!name || !game.token) return;
  try { localStorage.setItem("bananaName", name); } catch (err) { /* storage blocked */ }
  const tok = game.token; game.token = null;
  $("submit").hidden = true;
  try {
    const r = await api("api/score", { token: tok, name, score: game.score, cuts: game.cuts });
    game.myId = r.id;
    $("result").innerHTML = `<b>${game.score}</b> points · ${game.cuts} cuts · rank #${r.rank}`;
  } catch (err) { $("result").textContent = `not saved: ${err.message}`; }
  loadBoard(game.period);
};
$("challenge").onclick = startRound;
$("again").onclick = startRound;
$("scores").onclick = () => { if (!game.on) showPanel("Leaderboard", false); };
$("close").onclick = () => { $("panel").hidden = true; };
$("tday").onclick = () => loadBoard("day");
$("tall").onclick = () => loadBoard("all");
$("toss").onclick = () => {
  sfx.whoosh(1.6);
  lastEvent = performance.now();
  for (const p of pieces) {
    p.body.wakeUp();
    const m = p.body.mass();
    p.body.applyImpulse({ x: (Math.random() - 0.5) * 2 * m, y: (Math.random() - 0.5) * 2 * m, z: (6 + 3 * Math.random()) * m }, true);
    p.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.02 * m, y: (Math.random() - 0.5) * 0.02 * m, z: 0 }, true);
  }
};
// input: tap / click = chop across where you point (or shoo a fly); a swipe (left button, one finger) =
// slice along the stroke, any direction; right button / two fingers orbit
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -CEN.z), hit = new THREE.Vector3();
const ndc = (x, y) => new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
function onTable(x, y) {                                   // screen point -> point on the plane z = banana mid height
  ray.setFromCamera(ndc(x, y), camera);
  return ray.ray.intersectPlane(plane, new THREE.Vector3());
}
const ink = document.createElement("canvas");            // the swipe stroke, drawn over the scene
ink.className = "ink";
document.body.appendChild(ink);
const inkCtx = ink.getContext("2d");
function sizeInk() { ink.width = innerWidth * devicePixelRatio; ink.height = innerHeight * devicePixelRatio; }
sizeInk();
let down = null, stroke = null;
function drawInk(alpha) {
  inkCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  inkCtx.clearRect(0, 0, innerWidth, innerHeight);
  if (!stroke || stroke.pts.length < 2 || alpha <= 0) return;
  for (const [w, c] of [[9, `rgba(120,225,255,${0.25 * alpha})`], [3, `rgba(235,250,255,${0.95 * alpha})`]]) {
    inkCtx.lineWidth = w; inkCtx.lineCap = "round"; inkCtx.lineJoin = "round"; inkCtx.strokeStyle = c;
    inkCtx.beginPath();
    stroke.pts.forEach(([x, y], i) => (i ? inkCtx.lineTo(x, y) : inkCtx.moveTo(x, y)));
    inkCtx.stroke();
  }
}
// left button / one finger: slice or chop; right button / two fingers: orbit; wheel / pinch: zoom
controls.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
const touching = new Set();
renderer.domElement.addEventListener("pointerdown", (e) => {
  touching.add(e.pointerId);
  if (touching.size > 1) { stroke = null; drawInk(0); down = null; return; }   // a second finger: pinch / orbit
  if (e.button !== 0) return;
  down = [e.clientX, e.clientY];
  stroke = { pts: [[e.clientX, e.clientY]], id: e.pointerId };
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
}, { capture: true });
const lift_ = (e) => touching.delete(e.pointerId);
addEventListener("pointercancel", lift_);
renderer.domElement.addEventListener("pointermove", (e) => {
  if (stroke && e.pointerId === stroke.id) { stroke.pts.push([e.clientX, e.clientY]); drawInk(1); return; }
  const p = onTable(e.clientX, e.clientY);
  if (p && e.pointerType === "mouse") { aimX = p.x; aimY = Math.min(hi[1] + 0.03, Math.max(lo[1] - 0.03, p.y)); aimA = TAP_ANGLE; }
});
renderer.domElement.addEventListener("pointerup", (e) => {
  lift_(e);
  if (!down || !stroke || e.pointerId !== stroke.id) return;
  const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
  const a = stroke.pts[0], b = stroke.pts[stroke.pts.length - 1];
  const p0 = onTable(...a), p1 = onTable(...b);
  if (moved > 30 && p0 && p1 && p0.distanceTo(p1) > 0.005) swipeCut(p0, p1, stroke.pts);   // cut on release
  else if (moved < 6 && !flies.swat([[e.clientX, e.clientY]])) tapCut(e);
  stroke.done = performance.now();
  down = null;
});
function swipeCut(p0, p1, pts) {
  let ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;     // the knife runs along the stroke
  if (ang > 90) ang -= 180; else if (ang <= -90) ang += 180;
  aimX = (p0.x + p1.x) / 2; aimY = (p0.y + p1.y) / 2; aimA = ang;
  sfx.whoosh();
  flies.swat(pts);                                          // a swipe through a fly shoos it, and still cuts
  cut();
}
function tapCut(e) {
  const p = onTable(e.clientX, e.clientY);
  if (!p) return;
  aimX = p.x; aimY = p.y; aimA = TAP_ANGLE;
  cut();
}

function slab(x, y, angDeg) {
  // the blade's swept slab: a vertical plane through (x, y) along angle (deg from +x), the blade's thickness wide
  const t = angDeg * Math.PI / 180, u = [Math.cos(t), Math.sin(t), 0], n = [-Math.sin(t), Math.cos(t), 0];
  const L = 0.15, h = TH / 2, z0 = BOARD_HI[2] - 0.004, z1 = hi[2] + 0.06, c = [x, y];
  const V = [];
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const su = (2 * i - 1) * L, sn = (2 * j - 1) * h;
    V.push(c[0] + su * u[0] + sn * n[0], c[1] + su * u[1] + sn * n[1], k ? z1 : z0);
  }
  const T = [0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5, 0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3, 0, 2, 3, 0, 3, 1, 4, 5, 7, 4, 7, 6];
  return { V: new Float64Array(V), T: new Int32Array(T), n, c, u, h, L, z0, z1 };
}

const worker = new Worker("worker.js?v=95b05076a0");
let reqId = 0;
const pending = new Map();
worker.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); p(e.data); };
const kernel = (A, B) => new Promise((res) => { pending.set(++reqId, res); worker.postMessage({ id: reqId, A, B }); });

const SPLIT_V = 0.04;   // m/s: the two sides of a cut drift apart, as if the blade pushed them
// p in world coordinates if the blade's slab B crosses it, else null
function slabHits(p, B) {
  if (p.falling) return null;
  const W = applyM(poseMatrix(p.body), p.V);
  let mn = Infinity, mx = -Infinity, zmn = Infinity;
  for (let i = 0; i < W.length; i += 3) {
    const s = (W[i] - B.c[0]) * B.n[0] + (W[i + 1] - B.c[1]) * B.n[1];
    mn = Math.min(mn, s); mx = Math.max(mx, s); zmn = Math.min(zmn, W[i + 2]);
  }
  return mx < -B.h || mn > B.h || zmn > B.z1 ? null : W;
}
// ---- instant cut: until the kernel's exact pieces arrive, a crossed piece is drawn as its two halves, clipped at
// the blade's faces (the hollow inside shaded like flesh). One shared set of clipped materials (one cut at a time), so
// no new shader is compiled mid-game; warmed up at load.
renderer.localClippingEnabled = true;
const clipPlanes = [new THREE.Plane(), new THREE.Plane()];
const prevMats = clipPlanes.map((pl) => {
  const peel = peelMat.clone(); peel.clippingPlanes = [pl];
  const cutM = cutMat.clone(); cutM.clippingPlanes = [pl]; cutM.onBeforeCompile = cutMat.onBeforeCompile;
  const cap = new THREE.MeshStandardMaterial({ color: 0xe6d6a4, roughness: 0.6, side: THREE.BackSide, clippingPlanes: [pl] });
  return { peel, cut: cutM, cap };
});
function preview(p, B) {
  if (!p.held || !pieces.includes(p)) return;
  const n = new THREE.Vector3(B.n[0], B.n[1], 0), nc = B.n[0] * B.c[0] + B.n[1] * B.c[1];
  p.preview = [1, -1].map((sg, k) => {
    clipPlanes[k].set(n.clone().multiplyScalar(sg), -sg * nc - B.h);   // keeps sg * (n.x - n.c) >= h
    const g = new THREE.Group();
    g.matrixAutoUpdate = false; g.matrix.copy(p.group.matrix);
    for (const o of p.group.children) {
      if (!o.isMesh) continue;                                // the mesh-mode lines: not in the preview
      const m = prevMats[k], isCut = !!o.geometry.attributes.born;
      g.add(new THREE.Mesh(o.geometry, isCut ? m.cut : m.peel));
      g.add(new THREE.Mesh(o.geometry, m.cap));
    }
    scene.add(g);
    return g;
  });
  p.group.visible = false;
}
function endPreview(p) {
  if (p.preview) for (const g of p.preview) scene.remove(g);
  p.preview = null;
  p.group.visible = true;
}
// a crossed piece holds still while the kernel works on it (its pose is the one the kernel got); the rest keep moving
function hold(p, on) {
  p.held = on;
  p.body.setBodyType(on ? PHYS.RigidBodyType.KinematicPositionBased : PHYS.RigidBodyType.Dynamic, true);
}

// multi-slice combo: k = pieces the blade went through, gained = new pieces; points = gained x k. A pop-up at the
// cut ("+1", "DOUBLE ×2 +4", ...), bigger for bigger combos, and a chime that climbs one note per extra piece.
const COMBO_NAME = ["", "", "DOUBLE", "TRIPLE", "QUAD"];
function combo(k, gained, B) {
  const pts = Math.max(1, gained) * k;
  if (game.on) { game.score += pts; game.best = Math.max(game.best || 0, k); }
  addScore(pts, k);
  const s = new THREE.Vector3(B.c[0], B.c[1], hi[2] + 0.02).project(camera);
  const el = document.createElement("div");
  el.className = "combo" + (k > 1 ? " big" : "");
  el.style.left = `${(s.x + 1) / 2 * innerWidth}px`; el.style.top = `${(1 - s.y) / 2 * innerHeight}px`;
  el.style.setProperty("--sz", `${Math.min(64, 26 + 9 * (k - 1))}px`);
  el.textContent = k > 1 ? `${COMBO_NAME[k] || "COMBO"} ×${k}  +${pts}` : `+${pts}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
  if (k > 1) sfx.combo(k);
}

let queued = null;                                          // a swipe made while the kernel is busy runs next
// the knife's stroke: down in CHOP ms, reaching the banana at CONTACT ms. The banana parts at contact, not before:
// the kernel (often done in ~25 ms) waits for the blade; if it is slower, the clipped preview shows at contact.
const CHOP = 160, CONTACT = 100;
async function cut() {
  if (game.ending || game.over || flies.povOn()) return;
  if (busy) { queued = { x: aimX, y: aimY, a: aimA }; return; }
  busy = true; cutX = aimX; cutY = aimY; cutA = aimA; lastEvent = performance.now() + 1000;
  flies.startle(new THREE.Vector3(cutX, cutY, CEN.z));
  $("ms").classList.add("busy"); $("ms").textContent = "cutting";
  const B = slab(cutX, cutY, cutA);
  const hits = pieces.map((p) => [p, slabHits(p, B)]).filter(([, W]) => W);
  for (const [p] of hits) hold(p, true);
  const contact = new Promise((r) => setTimeout(r, CONTACT));
  if (hits.length) {
    sfx.squish(CONTACT / 1000);                               // the blade meets the banana partway down
    contact.then(() => { for (const [p] of hits) if (!p.ready) preview(p, B); });
  }
  sfx.tap((CHOP - 10) / 1000);                                // and the board at the bottom
  setTimeout(() => scratchBoard(B.c[0], B.c[1], B.u[0], B.u[1]), CHOP - 10);   // a faint mark where it lands
  const knifeDown = chop(CHOP);                               // the knife moves while the kernel works
  // only the pieces the blade crosses go to the kernel, one at a time, in world coordinates
  let ms = 0, frags = 0, open = 0, touched = 0, added = 0;
  for (const [p, W] of hits) {
    const M = poseMatrix(p.body);                             // held: the pose W was taken at
    const res = await kernel({ V: W, T: p.T }, { V: B.V, T: B.T });
    p.ready = true;
    await contact;                                            // not before the blade gets there
    if (res.error || res.cut.report.segments === 0) { endPreview(p); hold(p, false); p.ready = false; continue; }
    touched++;
    ms += res.cut.ms + res.removed.ms; frags += res.cut.report.fragments; open += res.cut.report.open;
    removedSum += res.removed.report.volume;
    const lv = p.body.linvel(), av = p.body.angvel();
    const Minv = M.clone().invert();
    endPreview(p);
    removePiece(p);
    const parts = split(res.cut.V, res.cut.T, res.cut.tmesh, res.cut.tface);
    added += parts.length;
    for (const sp of parts) {
      let cx = 0, cy = 0;
      for (let i = 0; i < sp.V.length; i += 3) { cx += sp.V[i]; cy += sp.V[i + 1]; }
      cx /= sp.V.length / 3; cy /= sp.V.length / 3;
      const side = Math.sign((cx - B.c[0]) * B.n[0] + (cy - B.c[1]) * B.n[1]) || 1;
      const local = applyM(Minv, sp.V);           // back to the banana's frame (exact rigid motion)
      addPiece(local, sp.T, sp.tmesh, sp.tface, M,
               [lv.x + side * SPLIT_V * PS * B.n[0], lv.y + side * SPLIT_V * PS * B.n[1], lv.z], [av.x, av.y, av.z],
               p.planes.map((q) => ({ ...q })));                 // old cut faces keep their age
    }
  }
  if (touched) combo(touched, added - touched, B);
  if (game.on && touched) game.cuts++;
  if (touched) guide.cut();
  $("ms").classList.remove("busy");
  hud({ open, fragments: touched ? frags : "–" }, touched ? ms : null, volErr());
  await knifeDown;
  busy = false;
  lift();
  if (queued) { const q = queued; queued = null; aimX = q.x; aimY = q.y; aimA = q.a; cut(); }
}

let anim = null;
function chop(ms) { return new Promise((res) => { anim = { from: knifeZ, to: Z_DOWN, t0: performance.now(), ms, done: res }; }); }
function lift() { anim = { from: knifeZ, to: Z_UP, t0: performance.now(), ms: 260, done: () => {} }; }

window.__dbg = { camera, controls, CEN, lo, hi, world, pieces: () => pieces,  // for testing
                 cutAt: async (y, t, x = CEN.x) => { aimX = x; aimY = y; aimA = t; await cut(); },
                 hit: (x, y) => { ray.setFromCamera(ndc(x, y), camera); return ray.intersectObjects(piecesGroup.children, true).length; },
                 table: (x, y) => onTable(x, y), age: (s) => { TSHIFT += s; } };
// is a world point inside a piece, padded by about a fly's half-width? A piece = the original banana (the depth grid,
// trilinear; it reads -1 mm anywhere farther out) on the inner side of each of its cut planes.
const FLY_PAD = 0.0006;
function skinDepthAt(x, y, z) {
  const [nx, ny, nz] = DEPTH.n, h = DEPTH.h;
  const gx = (x - h[0]) / h[3], gy = (y - h[1]) / h[3], gz = (z - h[2]) / h[3];
  const i = Math.floor(gx), j = Math.floor(gy), k = Math.floor(gz);
  if (i < 0 || j < 0 || k < 0 || i >= nx - 1 || j >= ny - 1 || k >= nz - 1) return -1;
  const fx = gx - i, fy = gy - j, fz = gz - k, q = DEPTH.q;
  const at = (a, b, c) => q[(i + a) + nx * ((j + b) + ny * (k + c))];
  const lx = (b, c) => at(0, b, c) * (1 - fx) + at(1, b, c) * fx;
  const ly = (c) => lx(0, c) * (1 - fy) + lx(1, c) * fy;
  return h[4] + (ly(0) * (1 - fz) + ly(1) * fz) / 255 * h[5];
}
const _inv = new THREE.Matrix4(), _l = new THREE.Vector3();
function insidePiece(w) {
  for (const p of pieces) {
    if (p.falling) continue;
    _l.copy(w).applyMatrix4(_inv.copy(p.group.matrix).invert());
    if (skinDepthAt(_l.x, _l.y, _l.z) <= -FLY_PAD) continue;
    if (p.planes.every((q) => q.n[0] * _l.x + q.n[1] * _l.y + q.n[2] * _l.z - q.d < FLY_PAD)) return true;
  }
  return false;
}
const flies = createFlies({ scene, camera, time: () => TIME.value, boardTop: BOARD_HI[2], getPieces: () => pieces,
                            enabled: () => !game.on, inside: insidePiece,
                            idle: () => (performance.now() - lastInput) / 1000 });
$("sound").classList.toggle("muted", !soundOn());
$("sound").onclick = () => { $("sound").classList.toggle("muted", !toggleSound()); };
$("music").classList.toggle("muted", !musicOn());
$("music").onclick = () => { $("music").classList.toggle("muted", !toggleMusic()); };
// ---- first-visit guide: a ghost cursor (a fingertip on touch screens) draws a dashed slice line across the middle of
// the banana every 2.4 s, with a caption. After the first cut a combo tip shows for 5 s, then the guide is done for
// good (remembered in this browser). A 10 s round ends it too.
const guide = (() => {
  let stage = 0;
  try { stage = localStorage.getItem("bananaGuide") === "done" ? 3 : 1; } catch (err) { stage = 1; }
  const svg = $("guide"), line = $("gline"), cur = COARSE ? $("gtouch") : $("gmouse"), cap = $("gcap");
  const finish = () => {
    stage = 3; svg.hidden = true; cap.classList.add("gone");
    try { localStorage.setItem("bananaGuide", "done"); } catch (err) { /* storage blocked */ }
  };
  if (stage === 3) { svg.hidden = true; cap.hidden = true; return { frame() {}, cut() {}, end() {} }; }
  cur.style.display = "";
  cap.innerHTML = (COARSE ? "<b>Swipe across the banana</b> to slice it<small>two fingers to turn · pinch to zoom</small>"
                          : "<b>Drag across the banana</b> to slice it<small>right-drag to turn · scroll to zoom</small>");
  const scr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
  const t0 = performance.now();
  return {
    frame(now) {
      if (stage !== 1) return;
      // across the banana's middle (the fruit runs along y), a little above it
      const [ax, ay] = scr(CEN.x - 0.09, CEN.y, hi[2] + 0.005), [bx, by] = scr(CEN.x + 0.05, CEN.y, hi[2] + 0.005);
      const t = ((now - t0) % 2400) / 1400, e = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
      const x = ax + (bx - ax) * e, y = ay + (by - ay) * e;
      line.setAttribute("x1", ax); line.setAttribute("y1", ay); line.setAttribute("x2", x); line.setAttribute("y2", y);
      const fade = t < 0.08 ? t / 0.08 : t > 1.15 ? Math.max(0, 1 - (t - 1.15) / 0.4) : 1;
      svg.style.opacity = fade.toFixed(3);
      cur.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    },
    cut() {                                                 // the first cut: the combo tip, then done
      if (stage !== 1) return;
      stage = 2; svg.hidden = true;
      cap.innerHTML = "Nice! <b>Line up pieces</b> and cut them in one stroke for a combo<small>×2, ×3 … the more at once, the bigger the bonus</small>";
      cap.classList.add("tip");
      setTimeout(finish, 5000);
    },
    end: () => { if (stage !== 3) finish(); },
  };
})();
window.__dbg.flies = flies; window.__dbg.inside = insidePiece;
showBest();
reset();
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  zoomTo = null; sizeInk(); frameCamera(); flies.resize();
});
{
  const warm = [cutMat, ...prevMats.flatMap((m) => [m.peel, m.cut, m.cap])].map((m) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), m);
    o.geometry.setAttribute("born", new THREE.Float32BufferAttribute(new Float32Array(24), 1));
    o.position.set(CEN.x, CEN.y, CEN.z); scene.add(o); return o;
  });
  renderer.compile(scene, camera);
  for (const o of warm) { scene.remove(o); o.geometry.dispose(); }
}
document.getElementById("loading").remove();
let last = performance.now(), lastFrame = last;
renderer.setAnimationLoop((now) => {
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / anim.ms), e = t * t * (3 - 2 * t);
    knifeZ = anim.from + (anim.to - anim.from) * e;
    if (t >= 1) { const d = anim.done; anim = null; d(); }
  }
  // physics: fixed 1/120 s steps, also while the kernel works (the pieces it cuts are held kinematic meanwhile)
  {
    world.timestep = 1 / 120;
    const steps = Math.min(4, Math.round((now - last) / (1000 / 120)));
    for (let i = 0; i < steps; i++) {
      world.step();
      for (const p of pieces) {
        const v = p.body.linvel(), s = Math.hypot(v.x, v.y, v.z);
        if (s > VMAX) p.body.setLinvel({ x: v.x * VMAX / s, y: v.y * VMAX / s, z: v.z * VMAX / s }, true);
        const w = p.body.angvel(), r = Math.hypot(w.x, w.y, w.z);
        if (r > WMAX) p.body.setAngvel({ x: w.x * WMAX / r, y: w.y * WMAX / r, z: w.z * WMAX / r }, true);
      }
    }
    // (no sound for pieces landing on the board: it sounded odd, user 2026-11-24)
    // hard stop: FREEZE_AFTER ms after the last cut or toss, every piece still on the board is stopped and put to
    // sleep, whatever it is doing (overlapping hulls can keep a piece jumping); the next cut or toss wakes them
    if (now - lastEvent > FREEZE_AFTER) {
      for (const p of pieces) {
        if (p.falling || p.held || p.body.isSleeping()) continue;
        p.body.setLinvel({ x: 0, y: 0, z: 0 }, false); p.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
        p.body.sleep(); p.still = p.lowE = 0;
      }
    }
    // settling: near rest, damp hard; still for 0.4 s -> sleep (a cut, a toss or a hit wakes it again)
    const dt = steps / 120;
    for (const p of pieces) {
      if (!p.body.isSleeping()) {
        const v = p.body.linvel(), w = p.body.angvel();
        const sv = Math.hypot(v.x, v.y, v.z) / PS, sw = Math.hypot(w.x, w.y, w.z);
        // slow, or turning in place (spin with almost no travel: two overlapping hulls pushing, not real rolling);
        // a fresh cut's 4 cm/s drift still glides
        const slow = (sv < 0.03 && sw < 1.5) || (sv < 0.015 && sw < 8);
        p.body.setAngularDamping(slow ? 12 : 2.5);
        p.body.setLinearDamping(slow ? 6 : 0.6);
        p.still = sv < 0.02 && sw < 0.6 ? (p.still || 0) + dt : 0;
        p.lowE = slow ? (p.lowE || 0) + dt : 0;             // low-energy jitter that a contact keeps feeding
        // watchdog: 2 s after the last cut / toss, a piece that went < 5 mm in the last second is stopped, however
        // fast it turns (overlapping hulls can keep feeding a spin in place; real sliding or falling moves on)
        const M = poseMatrix(p.body), c = new THREE.Vector3(...p.c).applyMatrix4(M);
        if (!p.anchor || now - p.anchorT > 1000) {
          const stuck = p.anchor && now - lastEvent > 2000 && c.distanceTo(p.anchor) < 0.005;
          p.anchor = c; p.anchorT = now;
          if (stuck) p.lowE = 99;
        }
        if (p.still > 0.4 || p.lowE > 1.2) {
          p.body.setLinvel({ x: 0, y: 0, z: 0 }, false); p.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
          p.body.sleep(); p.still = p.lowE = 0;
        }
      }
      p.group.matrix.copy(poseMatrix(p.body));
    }
    // off the board: once a piece's center drops below the board top it falls, fades out over 1.5 s, and is gone
    const gone = [];
    for (const p of pieces) {
      if (!p.falling) {
        const c = new THREE.Vector3(...p.c).applyMatrix4(p.group.matrix);
        if (c.z < BOARD_HI[2] - 0.012) {
          p.falling = now;
          p.group.traverse((o) => {
            if (!o.material) return;
            const m = o.material.clone();
            m.onBeforeCompile = o.material.onBeforeCompile;   // keep the cut-face shader
            m.transparent = true; m.depthWrite = false;
            o.material = m; o.castShadow = false;
          });
        }
      } else {
        const a = 1 - (now - p.falling) / 1500;
        p.group.traverse((o) => { if (o.material) o.material.opacity = Math.max(0, a); });
        if (a <= 0) gone.push(p);
      }
    }
    for (const p of gone) {
      droppedSum += p.vol;
      p.group.traverse((o) => { if (o.material) o.material.dispose(); });
      removePiece(p);
      $("pieces").textContent = pieces.length;
      $("vol").textContent = volErr().toExponential(1);
    }
  }
  if (game.on && !game.ending) {
    const rem = game.round - (now - game.t0) / 1000;
    $("timer").textContent = `${Math.max(0, rem).toFixed(1)} s`;      // the points are on the score card
    $("timer").classList.toggle("low", rem < 5);
    const sec = Math.ceil(rem);                              // ticks over the last 3 s
    if (sec < game.tick && sec >= 1 && sec <= 3) sfx.tick(sec === 1);
    game.tick = Math.min(game.tick, sec);
    if (rem <= 0) endRound();
  }
  flies.update((now - last) / 1000, now);
  last = now;
  TIME.value = now / 1000 + TSHIFT;
  // the knife points away from the camera (handle at +x), its blade over the cut
  const x = busy ? cutX : aimX, y = busy ? cutY : aimY, kt = (busy ? cutA : aimA) * Math.PI / 180;
  knife.position.set(x + KNIFE_DX * Math.cos(kt), y + KNIFE_DX * Math.sin(kt), knifeZ);
  knife.rotation.set(0, 0, kt + Math.PI);
  // the swipe stroke fades out after the cut
  if (stroke && stroke.done) {
    const a = 1 - (now - stroke.done) / 400;
    drawInk(a);
    if (a <= 0) stroke = null;
  }
  zoomStep(Math.min(0.05, (now - lastFrame) / 1000));
  scoreFrame((now - lastFrame) / 1000);
  guide.frame(now);
  controls.update();
  renderer.render(scene, flies.viewCamera(now, (now - lastFrame) / 1000) || camera);
  lastFrame = now;
});
