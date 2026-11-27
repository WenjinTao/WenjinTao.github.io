// Our own physics kernel (phys-kernel, C++ -> bp.mjs + bp.wasm) behind the small part of Rapier's JS API this page
// uses, so app.js only swaps its import. World, RigidBodyDesc, ColliderDesc, RigidBodyType, bodies with
// translation / rotation / linvel / angvel / impulses / sleep / damping / body type.
import BPFactory from "./bp.mjs?v=b291ec8e57";

let M = null;
const TYPE = { Fixed: 0, Dynamic: 1, KinematicPositionBased: 2 };

class RigidBody {
  constructor(id) { this.id = id; }
  _s() { return M._bp_state(this.id) >> 3; }
  translation() { const i = this._s(), H = M.HEAPF64; return { x: H[i], y: H[i + 1], z: H[i + 2] }; }
  rotation() { const i = this._s(), H = M.HEAPF64; return { x: H[i + 3], y: H[i + 4], z: H[i + 5], w: H[i + 6] }; }
  linvel() { const i = this._s(), H = M.HEAPF64; return { x: H[i + 7], y: H[i + 8], z: H[i + 9] }; }
  angvel() { const i = this._s(), H = M.HEAPF64; return { x: H[i + 10], y: H[i + 11], z: H[i + 12] }; }
  setLinvel(v, wake) { M._bp_set_linvel(this.id, v.x, v.y, v.z, wake ? 1 : 0); }
  setAngvel(v, wake) { M._bp_set_angvel(this.id, v.x, v.y, v.z, wake ? 1 : 0); }
  applyImpulse(v, wake) { M._bp_apply_impulse(this.id, v.x, v.y, v.z, wake ? 1 : 0); }
  applyTorqueImpulse(v, wake) { M._bp_apply_torque_impulse(this.id, v.x, v.y, v.z, wake ? 1 : 0); }
  mass() { return M._bp_mass(this.id); }
  wakeUp() { M._bp_wake(this.id); }
  sleep() { M._bp_sleep(this.id); }
  isSleeping() { return M._bp_is_sleeping(this.id) === 1; }
  setBodyType(t, wake) { M._bp_set_type(this.id, t, wake ? 1 : 0); }
  setLinearDamping(d) { M._bp_set_lin_damping(this.id, d); }
  setAngularDamping(d) { M._bp_set_ang_damping(this.id, d); }
}

class BodyDesc {
  constructor(type) {
    this.type = type; this.t = [0, 0, 0]; this.q = { x: 0, y: 0, z: 0, w: 1 };
    this.lv = [0, 0, 0]; this.av = [0, 0, 0]; this.ld = 0; this.ad = 0;
  }
  setTranslation(x, y, z) { this.t = [x, y, z]; return this; }
  setRotation(q) { this.q = q; return this; }
  setLinvel(x, y, z) { this.lv = [x, y, z]; return this; }
  setAngvel(v) { this.av = [v.x, v.y, v.z]; return this; }
  setCcdEnabled() { return this; }                       // speculative contacts instead
  setLinearDamping(d) { this.ld = d; return this; }
  setAngularDamping(d) { this.ad = d; return this; }
}
const RigidBodyDesc = { dynamic: () => new BodyDesc(TYPE.Dynamic), fixed: () => new BodyDesc(TYPE.Fixed) };

class ColDesc {
  constructor(kind, data) { this.kind = kind; this.data = data; this.fr = 0.5; this.rest = 0; this.dens = 1; }
  setFriction(f) { this.fr = f; return this; }
  setRestitution(r) { this.rest = r; return this; }
  setDensity(d) { this.dens = d; return this; }
}
const ColliderDesc = {
  cuboid: (hx, hy, hz) => new ColDesc("box", [hx, hy, hz]),
  convexHull: (pts) => (pts && pts.length >= 12 ? new ColDesc("hull", pts) : null),
};

class World {
  constructor(g, unitsPerMeter = 10) {                     // the page works at 10 units per meter
    M._bp_reset(g.x, g.y, g.z);
    M._bp_set_scale(unitsPerMeter);                       // tolerances (slop, margin, sleep speed) in page units
    this.timestep = 1 / 60;
    this.integrationParameters = {
      set numSolverIterations(n) { M._bp_set_iterations(n); },
    };
  }
  step() { M._bp_step(this.timestep); }
  createRigidBody(d) {
    const id = M._bp_body_new(d.type, d.t[0], d.t[1], d.t[2], d.q.x, d.q.y, d.q.z, d.q.w);
    const b = new RigidBody(id);
    M._bp_set_damping(id, d.ld, d.ad);
    if (d.type === TYPE.Dynamic) {
      M._bp_set_linvel(id, d.lv[0], d.lv[1], d.lv[2], 1);
      M._bp_set_angvel(id, d.av[0], d.av[1], d.av[2], 1);
    }
    return b;
  }
  createCollider(cd, body) {
    let id;
    if (cd.kind === "box") id = M._bp_box(body.id, cd.data[0], cd.data[1], cd.data[2], cd.fr, cd.rest, cd.dens);
    else {
      const n = cd.data.length / 3, ptr = M._malloc(cd.data.length * 4);
      M.HEAPF32.set(cd.data, ptr >> 2);
      id = M._bp_hull(body.id, ptr, n, cd.fr, cd.rest, cd.dens);
      M._free(ptr);
    }
    return id >= 0 ? { id } : null;
  }
  removeRigidBody(b) { M._bp_body_remove(b.id); }
  // last step: time (all, narrow phase, solver), broad-phase pairs, manifolds (of which reused), contact points, SAT work
  // (edge pairs, Gauss-map tests, cached axes tried / still separating, board contacts by the half-space shortcut)
  stats() {
    const i = M._bp_stats() >> 3, H = M.HEAPF64;
    return { ms: H[i], msNarrow: H[i + 5], msSolve: H[i + 6], pairs: H[i + 1], manifolds: H[i + 2], reused: H[i + 10],
             contacts: H[i + 3], edgePairs: H[i + 4], minkowski: H[i + 7], cacheTests: H[i + 8], cacheHits: H[i + 9],
             halfSpace: H[i + 11] };
  }
}

export default {
  async init() { if (!M) M = await BPFactory(); },
  World, RigidBodyDesc, ColliderDesc, RigidBodyType: TYPE,
};
