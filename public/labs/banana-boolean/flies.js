// Fruit flies come by smell. Each cut face smells in proportion to its area and how long it has been out
// (nothing for the first minute, full after ~3.5 min, page time; browning runs at x30, so that is hours of real
// banana): smell = sum of area x ripeness over every face on the board. One fly per 10 cm2 of full-smelling face,
// at most 5: one cut left out brings a fly after ~2.5 min, a board of slices brings a swarm sooner. They come
// faster, and land more, when nobody is touching the page (idle > 20 s); a cut startles the ones near it into the
// air. They zigzag around the smelliest piece and land on its cut faces (not on faces looking down). Tap or swipe
// through one to shoo it; it comes back a few seconds later. Reset or a challenge round sends them all away.
// A faint buzz while they fly. F calls one more (summoned flies stay until shooed).
import * as THREE from "three";
import { audio, sfx, loop } from "./sound.js?v=b291ec8e57";

const MAX = 5;                                              // flies
const RIPE0 = 60, RIPE1 = 210;                              // s (page time): a face starts to smell / smells fully
const PER_FLY = 0.001;                                      // m2 of full-smelling cut face per fly (10 cm2)
const IDLE = 20;                                            // s without input: flies come faster, land more
const SIZE = 0.28;                                          // x the ~4.5 mm body model: ~1.3 mm

const sphere = new THREE.SphereGeometry(1, 12, 8);
const wingG = new THREE.CircleGeometry(1, 14).scale(0.0018, 0.0007, 1).translate(-0.0016, 0, 0);
const legG = new THREE.CylinderGeometry(0.00009, 0.00005, 0.003, 5).translate(0, -0.0015, 0);     // from its hip along -y
const DOWN_Y = new THREE.Vector3(0, -1, 0);

// each fly gets its own materials: on the glass it is drawn over everything (depthTest off)
function flyModel() {
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b231d, roughness: 0.55 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.25 });   // dark eyes (no red)
  const wingM = new THREE.MeshBasicMaterial({ color: 0xc9d1dc, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
                                              depthWrite: false });
  const g = new THREE.Group();
  const part = (m, s, p) => { const o = new THREE.Mesh(sphere, m); o.scale.set(...s); o.position.set(...p); o.castShadow = true; g.add(o); return o; };
  part(dark, [0.0021, 0.0012, 0.0011], [-0.0012, 0, 0.0001]);          // abdomen
  part(dark, [0.0011, 0.0010, 0.0010], [0.0005, 0, 0.0002]);           // thorax
  part(dark, [0.0007, 0.0008, 0.0007], [0.0017, 0, 0.0002]);           // head
  for (const s of [1, -1]) part(eyeM, [0.00045, 0.00045, 0.0005], [0.0019, s * 0.0005, 0.0004]);
  // six legs from under the thorax, splayed out and down (front pair forward, back pair back).
  // On the glass they spread flat against it, thicker, so you see them planted on the pane.
  const legs = [];
  for (const [x, fwd] of [[0.0009, 0.7], [0.0005, 0], [0.0001, -0.7]]) for (const s of [1, -1]) {
    const leg = new THREE.Mesh(legG, dark);
    leg.position.set(x, s * 0.0004, -0.0004);
    const q = new THREE.Quaternion().setFromUnitVectors(DOWN_Y, new THREE.Vector3(fwd, s * 1.0, -0.45).normalize());
    const qGlass = new THREE.Quaternion().setFromUnitVectors(DOWN_Y, new THREE.Vector3(1.6 * fwd, s * 1.0, -0.28).normalize());
    leg.quaternion.copy(q);
    leg.castShadow = true;
    g.add(leg);
    legs.push({ leg, q, qGlass });
  }
  const wings = [1, -1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.0004, s * 0.0004, 0.0011);
    const w = new THREE.Mesh(wingG, wingM);
    w.rotation.z = s * 0.35;                                   // swept back and out
    pivot.add(w); g.add(pivot);
    return pivot;
  });
  g.scale.setScalar(SIZE);
  return { g, wings, legs, mats: [dark, eyeM, wingM] };
}
// the model's length (m, at SIZE): sets how far from the camera a fly on the glass sits
const FLY_LEN = 0.0057 * SIZE;
const SIT = 0.0013 * SIZE;                                  // m: body center above a face it sits on
const GLASS_PX = 14;                                          // a fly on the screen: about a real fly's size on a monitor

const rnd = (a, b) => a + Math.random() * (b - a);
const UP = new THREE.Vector3(0, 0, 1);

// inside(p): is world point p inside a piece (the flies' collision test, from app.js)
export function createFlies({ scene, camera, time, boardTop, getPieces, enabled, inside, idle }) {
  const flies = [];
  let nextSpawn = 0, buzzG = null, summoned = 0;      // summoned: called with F, stay until shooed or Reset
  let nextGlass = performance.now() + rnd(15000, 30000), glassStay = 0;

  // ---- the screen as a glass pane: now and then a fly lands on its inside, legs toward you ----
  // It sits a fixed distance in front of the camera, chosen so it shows ~GLASS_PX long, and moves with the camera
  // (orbiting doesn't move it); drawn over the scene. It walks a few steps, then flies back to the banana.
  const camBasis = () => {
    const e = camera.matrixWorld.elements;
    return { right: new THREE.Vector3(e[0], e[1], e[2]), up: new THREE.Vector3(e[4], e[5], e[6]),
             fwd: new THREE.Vector3(-e[8], -e[9], -e[10]) };
  };
  function glassPoint(gl) {                                     // gl.x, gl.y: NDC on the screen
    const D = FLY_LEN / (GLASS_PX / innerHeight) / (2 * Math.tan(camera.fov * Math.PI / 360));
    const dir = new THREE.Vector3(gl.x, gl.y, 0.5).unproject(camera).sub(camera.position).normalize();
    return camera.position.clone().addScaledVector(dir, D / dir.dot(camBasis().fwd));
  }
  function setGlass(f, on) {
    if (!!f.onGlass === on) return;
    f.onGlass = on;
    // body and eyes over the scene; the wings keep their depth test, so the body (which still writes depth) hides them
    for (const m of f.mats.slice(0, 2)) { m.depthTest = !on; m.needsUpdate = true; }
    // seen from the other side of the pane: belly and legs only, a dark silhouette lit from behind (the wings lie on
    // its back, away from you)
    const [dark, eyeM] = f.mats;
    dark.color.setHex(on ? 0x0d0a08 : 0x2b231d); eyeM.color.setHex(on ? 0x0d0a08 : 0x17130f);
    for (const w of f.wings) w.visible = !on;
    for (const l of f.legs) {
      l.leg.quaternion.copy(on ? l.qGlass : l.q);
      l.leg.scale.set(on ? 2.2 : 1, 1, on ? 2.2 : 1);
    }
    f.g.traverse((o) => { if (o.isMesh) { o.renderOrder = on ? 999 : 0; o.castShadow = !on; } });
  }

  // smell: per piece, sum of its cut faces' area x ripeness; the flies circle the smelliest piece
  const ripe = (age) => { const x = Math.min(1, Math.max(0, (age - RIPE0) / (RIPE1 - RIPE0))); return x * x * (3 - 2 * x); };
  function smelliest() {
    let best = null, top = -1, total = 0;
    for (const p of getPieces()) {
      if (p.falling) continue;
      const s = (p.faces || []).reduce((a, f) => a + f.area * ripe(time() - f.rec.t0), 0);
      total += s;
      if (s > top) { top = s; best = p; }
    }
    return { piece: best, total };                            // nothing cut yet: any piece (for summoned flies)
  }
  const cutMesh = (p) => p.group.children.find((o) => o.geometry && o.geometry.attributes.born);
  function center(p) {
    const b = new THREE.Box3().setFromObject(p.group);
    return b.getCenter(new THREE.Vector3());
  }
  // a landing spot on p, in p's frame (point + normal): mostly on a cut face (the smell), sometimes on the peel.
  // Only where there is open air in front of it (two faces a few mm apart leave no room for a fly), and not on a
  // surface looking down. None if every try fails.
  const peelMesh = (p) => p.group.children.find((o) => o.isMesh && o.geometry.attributes.uv);
  function spot(p) {
    const nw = new THREE.Matrix3().setFromMatrix4(p.group.matrix), M = p.group.matrix;
    for (let k = 0; k < 12; k++) {
      const m = (Math.random() < 0.7 && cutMesh(p)) || peelMesh(p);
      if (!m) return null;
      const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, nt = P.count / 3;
      const t = Math.floor(Math.random() * nt);
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const a = new THREE.Vector3().fromBufferAttribute(P, 3 * t), b = new THREE.Vector3().fromBufferAttribute(P, 3 * t + 1);
      const c = new THREE.Vector3().fromBufferAttribute(P, 3 * t + 2);
      const q = a.clone().addScaledVector(b.clone().sub(a), u).addScaledVector(c.clone().sub(a), v);
      const n = new THREE.Vector3().fromBufferAttribute(N, 3 * t).add(new THREE.Vector3().fromBufferAttribute(N, 3 * t + 1))
        .add(new THREE.Vector3().fromBufferAttribute(N, 3 * t + 2)).normalize();
      const nW = n.clone().applyMatrix3(nw).normalize();
      if (nW.z < -0.3) continue;
      const qW = q.clone().applyMatrix4(M);
      if ([0.003, 0.007, 0.012].some((h) => inside(qW.clone().addScaledVector(nW, h)))) continue;
      return { piece: p, q, n, fwd: new THREE.Vector3().randomDirection() };   // fwd: its heading there, piece frame
    }
    return null;
  }

  // its orientation sitting on a face: back along the face normal n, heading fixed in the piece's frame
  function landHeading(f, M, n) {
    const fwd = f.land.fwd.clone().transformDirection(M).projectOnPlane(n).normalize();
    const left = new THREE.Vector3().crossVectors(n, fwd);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, left, n));
  }

  function spawn(target) {
    const { g, wings, legs, mats } = flyModel();
    const c = center(target), a = rnd(0, 2 * Math.PI);
    const pos = c.clone().add(new THREE.Vector3(Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.15));
    g.position.copy(pos);
    scene.add(g);
    flies.push({ g, wings, legs, mats, pos, vel: new THREE.Vector3(), goal: c.clone(), goalT: 0, mode: "fly", t: 0,
                 nextLand: performance.now() + rnd(3000, 7000), land: null, phase: rnd(0, 6) });
  }
  function leave(f, now) {
    setGlass(f, false);
    f.mode = "leave"; f.t = now; f.land = null;
    const away = f.pos.clone().sub(camera.position).setZ(0).normalize();
    f.goal = f.pos.clone().addScaledVector(away, 0.5).add(new THREE.Vector3(rnd(-0.2, 0.2), rnd(-0.2, 0.2), 0.25));
  }

  function update(dt, now) {
    dt = Math.min(dt, 0.05);
    const { piece, total } = smelliest();
    const quiet = idle() > IDLE;
    const bySmell = Math.min(MAX, Math.floor(total * (quiet ? 1.3 : 1) / PER_FLY));
    const want = enabled() && piece ? Math.max(bySmell, summoned) : 0;
    const active = flies.filter((f) => f.mode !== "leave");
    if (active.length < want && now > nextSpawn) { spawn(piece); nextSpawn = now + (quiet ? rnd(2000, 4000) : rnd(5000, 9000)); }
    for (const f of active.slice(want)) leave(f, now);
    const c = piece ? center(piece) : null;

    // now and then one flying fly heads for the glass (one at a time)
    if (now > nextGlass && (idle() > 8 || glassStay) && !flies.some((f) => f.mode === "toGlass" || f.mode === "glass")) {
      const f = flies.find((f) => f.mode === "fly");
      if (f) { f.mode = "toGlass"; f.gl = { x: rnd(-0.6, 0.6), y: rnd(-0.3, 0.6), a: rnd(0, 2 * Math.PI) }; }
      nextGlass = now + rnd(25000, 50000);
    }

    for (const f of flies) {
      if (f.mode === "glass") {
        const B = camBasis();
        if (now > f.t) {
          setGlass(f, false); f.mode = "fly"; f.goalT = 0; f.nextLand = now + rnd(3000, 7000);
          f.vel.copy(B.fwd).multiplyScalar(0.1);
        } else {
          if (now > f.stepT) {                                // a little walk: a step, a turn
            f.gl.a += rnd(-0.8, 0.8);
            const step = rnd(6, 18) / innerHeight * 2;
            f.gl.x += Math.cos(f.gl.a) * step * innerHeight / innerWidth; f.gl.y += Math.sin(f.gl.a) * step;
            f.gl.x = Math.max(-0.9, Math.min(0.9, f.gl.x)); f.gl.y = Math.max(-0.6, Math.min(0.85, f.gl.y));
            f.stepT = now + rnd(500, 1600);
          }
          f.pos.copy(glassPoint(f.gl));
          f.g.position.copy(f.pos);
          // its back away from you, its legs on the glass toward you
          const fwd = B.right.clone().multiplyScalar(Math.cos(f.gl.a)).addScaledVector(B.up, Math.sin(f.gl.a));
          const left = new THREE.Vector3().crossVectors(B.fwd, fwd);
          f.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, left, B.fwd));
          for (const [i, w] of f.wings.entries()) w.rotation.x = (i ? -1 : 1) * 0.08;
          continue;
        }
      }
      if (f.mode === "toGlass") {
        f.goal = glassPoint(f.gl);
        if (f.pos.distanceTo(f.goal) < 0.004) {
          f.mode = "glass"; f.t = now + (glassStay || rnd(3500, 7000)); glassStay = 0; f.stepT = now + 800; setGlass(f, true); continue;
        }
      }
      if (f.mode === "land") {
        const p = f.land.piece;
        if (p.falling || !getPieces().includes(p) || now > f.t) { f.mode = "fly"; f.land = null; f.nextLand = now + rnd(4000, 9000); }
        else {
          const M = p.group.matrix, n = f.land.n.clone().transformDirection(M);
          f.pos.copy(f.land.q).applyMatrix4(M).addScaledVector(n, SIT);
          f.g.quaternion.copy(landHeading(f, M, n));
          f.g.position.copy(f.pos).addScaledVector(n, 0.00012 * Math.sin(now * 0.03));    // rubbing its legs
          for (const [i, w] of f.wings.entries()) { w.rotation.x = (i ? -1 : 1) * 0.08; }
          continue;
        }
      }
      if (f.mode === "fly" && c) {
        if (now > f.goalT) {                                   // a new zig every 0.25-0.7 s
          for (let k = 0; k < 8; k++) {                          // a goal in the air, not inside a piece
            f.goal = c.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rnd(0.02, 0.05)));
            f.goal.z = Math.max(f.goal.z, boardTop + 0.01);
            if (!inside(f.goal)) break;
          }
          f.goalT = now + rnd(250, 700);
        }
        if (now > f.nextLand) {
          const s = spot(piece);
          f.nextLand = now + (quiet ? rnd(1500, 4000) : rnd(4000, 9000));
          if (s) { f.mode = "approach"; f.land = s; f.land.hover = true; f.land.bumps = 0; }
        }
      }
      let speed = 0.13;
      if (f.mode === "approach") {
        const p = f.land.piece;
        if (p.falling || !getPieces().includes(p)) { f.mode = "fly"; f.land = null; }
        else {
          const M = p.group.matrix, n = f.land.n.clone().transformDirection(M);
          // first to a point 12 mm out from the face, then straight down onto it along its normal
          f.goal = f.land.q.clone().applyMatrix4(M).addScaledVector(n, f.land.hover ? 0.012 : SIT);
          speed = Math.max(0.03, Math.min(0.13, f.pos.distanceTo(f.goal) * 3));
          if (f.land.hover && f.pos.distanceTo(f.goal) < 0.002) f.land.hover = false;
          else if (!f.land.hover && f.pos.distanceTo(f.goal) < 0.0015) { f.mode = "land"; f.t = now + rnd(2000, 5000); continue; }
        }
      }
      if (f.mode === "leave") speed = 0.4;
      if (f.mode === "toGlass") speed = 0.3;
      const desired = f.goal.clone().sub(f.pos);
      const dist = desired.length();
      if (dist > 1e-6) desired.multiplyScalar(speed / dist);
      f.vel.lerp(desired, 1 - Math.exp(-dt * (f.mode === "approach" ? 10 : 6)));
      // collisions: the board below, the pieces (a fly that would go into one bounces back and picks a new way)
      const prev = f.pos.clone();
      f.pos.addScaledVector(f.vel, dt);
      if (f.pos.z < boardTop + 0.001) { f.pos.z = boardTop + 0.001; f.vel.z = Math.abs(f.vel.z); }
      const dropping = f.mode === "approach" && !f.land.hover;
      if (f.mode !== "leave" && f.mode !== "toGlass" && !dropping && inside(f.pos)) {
        if (inside(prev)) f.pos.copy(prev).add(new THREE.Vector3(0, 0, 0.002));   // caught inside (a cut, a piece moved): rise out
        else f.pos.copy(prev);
        f.vel.multiplyScalar(-0.4).add(new THREE.Vector3(0, 0, 0.05));
        f.goalT = 0;
        if (f.mode === "approach" && ++f.land.bumps > 20) { f.mode = "fly"; f.land = null; }   // no clear way in
      }
      f.g.position.copy(f.pos);
      if (dropping) {
        const M = f.land.piece.group.matrix;
        f.g.quaternion.slerp(landHeading(f, M, f.land.n.clone().transformDirection(M)), 1 - Math.exp(-dt * 12));
      } else {
        const v = f.vel.lengthSq() > 1e-8 ? f.vel.clone().normalize() : new THREE.Vector3(1, 0, 0);
        const fwd = v.clone().setZ(v.z * 0.3).normalize(), left = new THREE.Vector3().crossVectors(UP, fwd).normalize();
        f.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, left, new THREE.Vector3().crossVectors(fwd, left)));
      }
      const flap = 0.15 + 0.75 * Math.abs(Math.sin(now * 0.19 + f.phase));
      for (const [i, w] of f.wings.entries()) w.rotation.x = (i ? -1 : 1) * flap;
    }
    // gone: left far enough
    for (const f of flies.filter((f) => f.mode === "leave" && now - f.t > 2500)) {
      scene.remove(f.g);
      flies.splice(flies.indexOf(f), 1);
    }
    buzz();
  }

  // screen points (a tap or a swipe stroke, CSS px) -> shoo the flies near them; returns how many
  function swat(points) {
    if (povOn) return 0;
    const now = performance.now(), r = innerWidth < 600 ? 34 : 26;
    let n = 0;
    for (const f of flies) {
      if (f.mode === "leave") continue;
      const s = f.pos.clone().project(camera);
      const x = (s.x + 1) / 2 * innerWidth, y = (1 - s.y) / 2 * innerHeight;
      if (points.some(([px, py]) => Math.hypot(px - x, py - y) < r)) { leave(f, now); n++; }
    }
    if (n) { nextSpawn = now + rnd(5000, 9000); summoned = Math.max(0, summoned - n); sfx.shoo(); }
    return n;
  }

  // buzz: the recorded fly loop (sound.js), louder with more flies flying near the camera; through the shared
  // output, so the one speaker switch mutes it too
  function buzz() {
    const A = audio();
    if (!A) return;
    if (!buzzG) buzzG = loop("buzz");
    if (!buzzG) return;                                       // samples not loaded yet
    let level = 0;
    for (const f of flies) {
      if (f.mode === "land") continue;
      level += 0.07 * Math.min(1.5, 0.25 / Math.max(0.05, f.pos.distanceTo(camera.position)));
    }
    buzzG.gain.setTargetAtTime(Math.min(0.22, level), A.ctx.currentTime, 0.08);
  }

  const screen = () => flies.map((f) => {                    // testing: [x, y (CSS px), mode] per fly
    const s = f.pos.clone().project(camera);
    return [Math.round((s.x + 1) / 2 * innerWidth), Math.round((1 - s.y) / 2 * innerHeight), f.mode];
  });
  // F: one more fly, right away (up to MAX); a shooed summoned fly doesn't come back
  function summon() { summoned = Math.min(MAX, summoned + 1); nextSpawn = 0; }
  const dismiss = () => { summoned = 0; };

  // ---- fly view (V): the scene through one fly's eyes; with several flies, a random other one every 6-10 s ----
  // A wide lens at the fly's head; the view turns smoothly toward where the fly heads (its zigzags would shake it),
  // on a face it looks along the surface, on the glass it looks out into the room. Its own body is hidden.
  const flyCam = new THREE.PerspectiveCamera(95, innerWidth / innerHeight, 0.0003, 3);
  const lookDir = new THREE.Vector3(1, 0, 0), camUp = new THREE.Vector3(0, 0, 1);
  let povOn = false, pov = null, povNext = 0;
  function showAll() { for (const f of flies) f.g.visible = true; }
  function setPov(on) {
    povOn = on; pov = null; showAll();
    if (on && !flies.some((f) => f.mode !== "leave")) summon();   // no fly yet: call one
    return povOn;
  }
  function pickPov(now) {
    const pool = flies.filter((f) => f.mode !== "leave" && f !== pov);
    povNext = now + rnd(6000, 10000);
    if (!pool.length) { if (pov && (pov.mode === "leave" || !flies.includes(pov))) pov = null; return; }
    pov = pool[Math.floor(Math.random() * pool.length)];
    flyCam.position.copy(pov.pos);
    lookDir.set(1, 0, 0).applyQuaternion(pov.g.quaternion);
  }
  // the camera to render with: the fly's, or null (the normal view)
  function viewCamera(now, dt) {
    if (!povOn) return null;
    if (!pov || pov.mode === "leave" || !flies.includes(pov) || now > povNext) pickPov(now);
    showAll();
    for (const f of flies) if (f.mode === "glass" || f.mode === "toGlass") f.g.visible = f === pov;   // the pane is ours
    if (!pov) return null;
    pov.g.visible = false;
    const q = pov.g.quaternion;
    let dir, up;
    if (pov.mode === "glass") { dir = camBasis().fwd; up = camBasis().up; }
    else {
      dir = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      up = pov.mode === "land" ? new THREE.Vector3(0, 0, 1).applyQuaternion(q) : UP;
    }
    const k = 1 - Math.exp(-dt / 0.35);
    lookDir.lerp(dir, k).normalize();
    camUp.lerp(up, k).normalize();
    const eye = pov.pos.clone().add(new THREE.Vector3(0.0019, 0, 0.0006).multiplyScalar(SIZE).applyQuaternion(q));
    flyCam.position.lerp(eye, 1 - Math.exp(-dt / 0.04));
    flyCam.up.copy(camUp);
    flyCam.lookAt(flyCam.position.clone().add(lookDir));
    return flyCam;
  }
  function resize() { flyCam.aspect = innerWidth / innerHeight; flyCam.updateProjectionMatrix(); }
  // a cut nearby: landed (or landing) flies within 6 cm take off; the one on the glass stays
  function startle(p) {
    for (const f of flies) {
      if ((f.mode === "land" || f.mode === "approach") && f.pos.distanceTo(p) < 0.06) {
        f.mode = "fly"; f.land = null; f.goalT = 0; f.nextLand = performance.now() + rnd(3000, 6000);
        f.vel.set(rnd(-0.05, 0.05), rnd(-0.05, 0.05), 0.12);
      }
    }
  }
  const glass = (ms) => { nextGlass = 0; glassStay = ms; };  // testing: send one to the glass now (optionally for ms)
  const world = () => flies.map((f) => [f.pos.clone(), f.mode, f.land && { hover: f.land.hover, bumps: f.land.bumps, d: f.goal && f.pos.distanceTo(f.goal) }]);   // testing
  return { update, swat, screen, world, summon, dismiss, glass, startle, setPov, viewCamera, resize,
           povOn: () => povOn, smell: () => smelliest().total, count: () => flies.filter((f) => f.mode !== "leave").length };
}
