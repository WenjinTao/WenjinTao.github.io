// Runs the bool-kernel (bk.wasm) off the main thread. One message = one cut:
//   pieces = A - slab, removed = A ∩ slab  (both from the kernel; their volumes must add up to A's)
importScripts("bk.js");

let M = null;
const ready = BK().then((m) => { M = m; });

function put(arr, Ctor) {
  const bytes = arr.length * Ctor.BYTES_PER_ELEMENT;
  const p = M._malloc(Math.max(bytes, 8));
  (Ctor === Float64Array ? M.HEAPF64 : M.HEAP32).set(arr, p / Ctor.BYTES_PER_ELEMENT);
  return p;
}

function run(A, B, op) {
  const pa = put(A.V, Float64Array), ta = put(A.T, Int32Array);
  const pb = put(B.V, Float64Array), tb = put(B.T, Int32Array);
  const t0 = performance.now();
  const status = M._bk_op(pa, A.V.length / 3, ta, A.T.length / 3, pb, B.V.length / 3, tb, B.T.length / 3, op);
  const ms = performance.now() - t0;
  [pa, ta, pb, tb].forEach((p) => M._free(p));
  const nv = M._bk_nv(), nt = M._bk_nt();
  const V = M.HEAPF64.slice(M._bk_v() / 8, M._bk_v() / 8 + 3 * nv);
  const T = M.HEAP32.slice(M._bk_t() / 4, M._bk_t() / 4 + 3 * nt);
  const tmesh = M.HEAP32.slice(M._bk_tmesh() / 4, M._bk_tmesh() / 4 + nt);
  const tface = M.HEAP32.slice(M._bk_tface() / 4, M._bk_tface() / 4 + nt);
  const r = M.HEAPF64.slice(M._bk_report() / 8, M._bk_report() / 8 + 12);
  const report = { V: r[0], E: r[1], F: r[2], R: r[3], shells: r[4], genus: r[5], open: r[6], nonmanifold: r[7],
                   trifail: r[8], volume: r[9], segments: r[10], fragments: r[11], clean: status === 0 };
  return { V, T, tmesh, tface, report, ms };
}

onmessage = async (e) => {
  await ready;
  const { id, A, B } = e.data;
  try {
    const cut = run(A, B, 2);
    const removed = run(A, B, 1);
    postMessage({ id, cut, removed: { report: removed.report, ms: removed.ms } },
                [cut.V.buffer, cut.T.buffer, cut.tmesh.buffer, cut.tface.buffer]);
  } catch (err) {
    postMessage({ id, error: String(err) });
  }
};
