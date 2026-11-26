// Banana anatomy in 3D, for the cut-face shader: a centerline through the fruit plus the surface radius around it.
// The shader colors a cut point by where it really sits in the banana (distance to the axis, angle, position along
// it), so a cut across, lengthwise or slanted shows the matching section: rings and a three-part core across,
// rind stripes, a core band and a row of seeds lengthwise, stretched rings when slanted.
export const NS = 32, NA = 32;          // centerline points; angle bins of the radius table

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// nearest point of polyline P to p: [s (point index + fraction), squared distance]
function nearest(P, p) {
  let best = Infinity, bs = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const e = sub(P[i + 1], P[i]), t = Math.min(1, Math.max(0, dot(sub(p, P[i]), e) / dot(e, e)));
    const q = sub(p, [P[i][0] + t * e[0], P[i][1] + t * e[1], P[i][2] + t * e[2]]), d2 = dot(q, q);
    if (d2 < best) { best = d2; bs = i + t; }
  }
  return [bs, best];
}

// surface samples: the vertices plus three points inside each triangle (even coverage for the radius table)
function samples(V, T) {
  const S = [];
  for (let i = 0; i < V.length; i += 3) S.push([V[i], V[i + 1], V[i + 2]]);
  const W = [[4, 1, 1], [1, 4, 1], [1, 1, 4]];
  for (let f = 0; f < T.length; f += 3) {
    const a = 3 * T[f], b = 3 * T[f + 1], c = 3 * T[f + 2];
    for (const [u, v, w] of W) S.push([0, 1, 2].map((k) => (u * V[a + k] + v * V[b + k] + w * V[c + k]) / 6));
  }
  return S;
}

function binCentroids(S, u, nb) {
  let lo = Infinity, hi = -Infinity;
  for (const x of u) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const acc = Array.from({ length: nb }, () => [0, 0, 0, 0]);
  S.forEach((p, i) => {
    const b = Math.min(nb - 1, Math.floor((u[i] - lo) / (hi - lo) * nb));
    acc[b][0] += p[0]; acc[b][1] += p[1]; acc[b][2] += p[2]; acc[b][3]++;
  });
  return acc.filter((a) => a[3] > 0).map((a) => [a[0] / a[3], a[1] / a[3], a[2] / a[3]]);
}

// least-squares polynomial (degree DEG) of each coordinate over the arc length of P, evaluated at n even steps
const DEG = 5;
function polyCurve(P, n) {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(...sub(P[i], P[i - 1])));
  const t = L.map((l) => 2 * l / L[L.length - 1] - 1), m = DEG + 1;
  const pw = (x) => Array.from({ length: m }, (_, k) => x ** k);
  const M = Array.from({ length: m }, () => new Array(m).fill(0)), rhs = [0, 1, 2].map(() => new Array(m).fill(0));
  t.forEach((x, i) => {
    const b = pw(x);
    for (let a = 0; a < m; a++) {
      for (let c = 0; c < m; c++) M[a][c] += b[a] * b[c];
      for (let d = 0; d < 3; d++) rhs[d][a] += b[a] * P[i][d];
    }
  });
  const coef = rhs.map((r) => solve(M.map((row) => row.slice()), r.slice()));
  return Array.from({ length: n }, (_, k) => {
    const b = pw(-1 + 2 * k / (n - 1));
    return coef.map((c) => c.reduce((s, ck, j) => s + ck * b[j], 0));
  });
}
function solve(A, b) {                                       // Gaussian elimination with partial pivoting
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

function resample(P, n) {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(...sub(P[i], P[i - 1])));
  const out = [];
  for (let k = 0, i = 0; k < n; k++) {
    const s = L[L.length - 1] * k / (n - 1);
    while (i < P.length - 2 && L[i + 1] < s) i++;
    const t = (s - L[i]) / ((L[i + 1] - L[i]) || 1);
    out.push([0, 1, 2].map((d) => P[i][d] + t * (P[i + 1][d] - P[i][d])));
  }
  return { P: out, seg: L[L.length - 1] / (n - 1) };
}

// frame at fractional index s: foot point, tangent, normal (z-up projected), binormal
function frameAt(C, Tn, Nn, s) {
  const i = Math.min(Math.floor(s), NS - 2), t = s - i;
  const lerp = (A) => [0, 1, 2].map((d) => A[i][d] + t * (A[i + 1][d] - A[i][d]));
  const T = unit(lerp(Tn));
  let N = lerp(Nn); N = unit(sub(N, T.map((x) => x * dot(N, T))));
  return { F: lerp(C), T, N, B: cross(T, N) };
}

export function bananaAnatomy(V, T) {
  const S = samples(V, T);
  // start: centroids of slices across the long (PCA) axis
  const c = [0, 0, 0];
  for (const p of S) { c[0] += p[0] / S.length; c[1] += p[1] / S.length; c[2] += p[2] / S.length; }
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of S) { const d = sub(p, c); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cov[a][b] += d[a] * d[b]; }
  let ax = [1, 1, 1];
  for (let it = 0; it < 60; it++) ax = unit(cov.map((row) => dot(row, ax)));
  let P = binCentroids(S, S.map((p) => dot(sub(p, c), ax)), 12);
  // refine on the curve itself: slice by the arc position along the current line, re-center, then a smooth
  // polynomial through the slice centers (plain neighbor smoothing let a zigzag feed back through the slicing)
  P = polyCurve(P, 24);
  for (let it = 0; it < 5; it++) P = polyCurve(binCentroids(S, S.map((p) => nearest(P, p)[0]), 24), 24);
  const { P: C, seg } = resample(P, NS);
  const up = [0, 0, 1];
  const Tn = C.map((_, i) => unit(sub(C[Math.min(i + 1, NS - 1)], C[Math.max(i - 1, 0)])));
  const Nn = Tn.map((t) => unit(sub(up, t.map((x) => x * dot(up, t)))));
  // radius table: mean distance of the surface samples per (centerline point, angle) cell
  const sum = new Float64Array(NS * NA), cnt = new Float64Array(NS * NA);
  for (const p of S) {
    const [s] = nearest(C, p);
    if (s <= 0 || s >= NS - 1) continue;                     // beyond the ends: the stalk and the tip
    const f = frameAt(C, Tn, Nn, s), d = sub(p, f.F);
    const th = Math.atan2(dot(d, f.B), dot(d, f.N)) / (2 * Math.PI);
    const j = Math.floor((th - Math.floor(th)) * NA) % NA, i = Math.round(s);
    sum[i * NA + j] += Math.hypot(...d); cnt[i * NA + j]++;
  }
  const R = new Float64Array(NS * NA).fill(-1);
  for (let k = 0; k < NS * NA; k++) if (cnt[k]) R[k] = sum[k] / cnt[k];
  for (let left = true; left;) {                             // fill empty cells from their neighbors
    left = false;
    const R2 = R.slice();
    for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) {
      if (R[i * NA + j] >= 0) continue;
      let a = 0, n = 0;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ii = i + di, jj = (j + dj + NA) % NA;
        if (ii >= 0 && ii < NS && R[ii * NA + jj] >= 0) { a += R[ii * NA + jj]; n++; }
      }
      if (n) R2[i * NA + j] = a / n; else left = true;
    }
    R.set(R2);
  }
  let rmax = 0;
  for (const r of R) rmax = Math.max(rmax, r);
  const R8 = new Uint8Array(NS * NA);
  for (let k = 0; k < NS * NA; k++) R8[k] = Math.round(R[k] / rmax * 255);
  return { C, Tn, Nn, seg, R8, rmax, R, frameAt: (s) => frameAt(C, Tn, Nn, s), nearest: (p) => nearest(C, p) };
}
