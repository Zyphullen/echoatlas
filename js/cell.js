'use strict';
/* ===== Virtual Cell (v9 prototype): a typical human cell (generalised) at real scale =====
   API: VCELL.init(host, opts) -> starts the view inside `host` (default document.body)
          opts.onClose()      called when Back is pressed
          opts.onMapLink(id)  "See it on the map" buttons
          opts.focus          part id to zoom to on open (e.g. 'mito')
        VCELL.destroy() · VCELL.focus(id) · VCELL.isOpen()
   World units: 1 unit = 10 nm (100 units = 1 µm). Everything in the cell is drawn at its real size and in real numbers
   where that is practical; simulated motion uses measured rates (diffusion, motor speeds, microtubule growth, translation).
   Things that are only "look-alike" are marked in comments with LOOK-ALIKE. */
const VCELL = (() => {
  const W2UM = 100;                       // units per micrometre (1 unit = 10 nm)
  const W = 'https://en.wikipedia.org/wiki/';
  // ---------- real numbers used by the simulation (sources in the cards) ----------
  const RATE = {
    kinesin: .8,        // µm/s, kinesin-1 walking speed (8 nm steps)
    dynein: 1.0,        // µm/s, cytoplasmic dynein (towards the centre)
    runLen: 1.2,        // µm, typical run before letting go
    rebind: .4,         // 1/s, chance per second a free cargo grabs a microtubule again
    Dves: .004,         // µm²/s, diffusion of a ~100 nm vesicle in crowded cytoplasm
    Dlys: .002,         // µm²/s, larger organelles (lysosomes, peroxisomes)
    mtGrow: .2,         // µm/s, microtubule plus-end growth (~12 µm/min)
    mtShrink: .45,      // µm/s, shrinkage (~27 µm/min)
    mtCat: .02,         // 1/s, catastrophe (switch to shrinking)
    mtRes: .06,         // 1/s, rescue (switch back to growing)
    aaPerSec: 5.6,      // amino acids added per second by a human ribosome
    atpsRev: 130,       // ATP synthase rotations per second
    edge: .04,          // µm/s, lamellipodium edge protrusion/retraction (LOOK-ALIKE pattern, real-ish speed)
    cycleH: 24          // hours, typical human cell cycle in culture
  };
  // status: k = known (green), t = we think so (orange), u = unknown (red)
  const P = CELL_P;
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, SNAME = { k: 'Known', t: 'We think so', u: 'Unknown' };

  let root, cv, cx, raf = 0, focusTimer = 0, backFocusTimer = 0, opts = {}, alive = false, t = 0, last = 0, paused = false;
  let simT = 0, speed = 1, tm = 0;               // simT: cell time in seconds; speed: time multiplier; tm: frozen time for shapes when zoomed far in
  const SPEEDS = [1, 10, 100, 1000, 10000];
  let cam = { x: 0, y: 0, z: .2 }, anim = null, sel = null, layer = 1, fps = 0, fpsN = 0, fpsT = 0;
  let D, pop, hint, scl, crEl, clk, ban, offs = [], Q = 1, qT = 0, qLow = 0, qHigh = 0;
  function adapt(now) { if (now - qT < 1000) return; qT = now; if (!fps) return; if (fps < 42) { qLow += fps < 30 ? 2 : 1; qHigh = 0; } else if (fps > 57) { qHigh++; qLow = 0; } else { qLow = qHigh = 0; }
    if (qLow >= 2 && Q > .35) { Q = Math.max(.35, Q - .3); qLow = 0; } if (qHigh >= 4 && Q < 1) { Q = Math.min(1, Q + .15); qHigh = 0; } root && (root.dataset.q = Q.toFixed(2)); }
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mob = () => innerWidth <= 600;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  const gauss = R => { const u = R() || 1e-9, v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };

  // ---------- geometry (units: 10 nm) ----------
  // A typical human cell, generalised: rounded, ~23 × 20 µm, gently ruffling edge.
  const RX = 1150, RY = 1000; // a typical human cell, generalised: about 23 × 20 µm, rounded like the v8 cell
  const OM = .13; // rad/s, edge ruffle angular speed: amplitude × ω ≈ 0.04 µm/s (real lamellipodium speeds 0.02–0.1 µm/s)
  const memR = (a, tt) => { const c = Math.cos(a), f = c > 0 ? c * c : 0;
    return 1 + .02 * c + .035 * Math.cos(3 * a + .3) + .025 * Math.sin(5 * a + 1) + .01 * Math.sin(7 * a + OM * tt) + .006 * Math.sin(11 * a - 1.3 * OM * tt) + f * .008 * Math.sin(9 * a + OM * 1.7 * tt); };
  const memPt = (a, tt, k = 1) => { const m = memR(a, tt) * k; return [Math.cos(a) * RX * m, Math.sin(a) * RY * m]; };
  const cellRho = (x, y, tt) => { const a = Math.atan2(y / RY, x / RX); return Math.hypot(x / RX, y / RY) / memR(a, tt); };
  const NUC = { x: -90, y: 30, rx: 480, ry: 420 };                     // ~9.6 × 8.4 µm nucleus (typical 5–10 µm)
  const nucRho = (x, y) => Math.hypot((x - NUC.x) / NUC.rx, (y - NUC.y) / NUC.ry);
  const NUCL = [{ x: -220, y: -60, r: 100 }, { x: 60, y: 120, r: 75 }, { x: -120, y: 220, r: 50 }]; // nucleoli 1.1–2.2 µm
  const CENT = { x: 520, y: -90 };                                      // centrosome, in front of the nucleus (towards the leading edge)
  const ucell = x => x / W2UM;                                          // units -> µm
  // simple spatial hash for picking and region tests
  function grid(cs) { const m = new Map(); return { cs, add(o, x0, y0, x1, y1) { for (let i = Math.floor(x0 / cs); i <= Math.floor(x1 / cs); i++) for (let j = Math.floor(y0 / cs); j <= Math.floor(y1 / cs); j++) { const k = i + ',' + j; let a = m.get(k); if (!a) m.set(k, a = []); a.push(o); } },
    at(x, y) { return m.get(Math.floor(x / cs) + ',' + Math.floor(y / cs)) || []; } }; }
  const segD = (px_, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; let u = ((px_ - ax) * dx + (py - ay) * dy) / L2; u = Math.max(0, Math.min(1, u)); return [Math.hypot(px_ - ax - dx * u, py - ay - dy * u), u]; };
  function polyD(pts, x, y) { let bd = 1e18, bi = 0, bu = 0; for (let i = 1; i < pts.length; i++) { const [d, u] = segD(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (d < bd) { bd = d; bi = i; bu = u; } } return [bd, bi, bu]; }

  function build() {
    const R = rng(9);
    const d = { mitos: [], lyso: [], perox: [], lipd: [], ves: [], mts: [], er: [], erSheet: [], golgi: [], fibres: [], fa: [], vim: [], vaults: [], pores: [], ribs: [] };
    const inCell = (x, y, k = .95) => cellRho(x, y, 0) < k;
    const freeOf = (x, y, r) => nucRho(x, y) > 1 + r / 400 && Math.hypot(x - CENT.x, y - CENT.y) > 60 + r;
    // centre-weighted sampling: organelles crowd around the nucleus (as in real cells)
    const sample = (k, pull) => { for (let n = 0; n < 200; n++) { const x = (R() - .5) * 2 * RX * 1.1, y = (R() - .5) * 2 * RY * 1.1; if (!inCell(x, y, k)) continue; const dn = nucRho(x, y); if (R() > Math.exp(-(dn - 1) * pull)) continue; return [x, y]; } return [0, 0]; };
    // microtubules: ~140 drawn (a real cell has hundreds) from the centrosome, curving gently, deflected by the nucleus, ending at the membrane
    for (let i = 0; i < 140; i++) { let a = i / 140 * 6.2832 + R() * .03, x = CENT.x, y = CENT.y; const pts = [[x, y]]; let h = a;
      for (let s = 0; s < 260; s++) { h += gauss(R) * .045; let nx = x + Math.cos(h) * 25, ny = y + Math.sin(h) * 25;
        if (nucRho(nx, ny) < 1.04) { const ga = Math.atan2((ny - NUC.y) / NUC.ry ** 2, (nx - NUC.x) / NUC.rx ** 2); h = ga + (Math.sin(h - ga) > 0 ? 1.45 : -1.45); nx = x + Math.cos(h) * 25; ny = y + Math.sin(h) * 25; if (nucRho(nx, ny) < 1.02) break; }
        if (!inCell(nx, ny, .975)) break; x = nx; y = ny; pts.push([x, y]); }
      if (pts.length < 8) continue; const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + 25);
      const Lmax = cum[cum.length - 1]; d.mts.push({ pts, cum, Lmax, len: Lmax * (.4 + R() * .6), grow: R() < .6 }); }
    // ER: a lace of tubules (jittered grid, nodes joined to near neighbours) + flat sheets near the nucleus
    { const nodes = [], sp = 115; for (let x = -RX * 1.15; x < RX * 1.2; x += sp) for (let y = -RY * 1.2; y < RY * 1.2; y += sp) { const px_ = x + (R() - .5) * sp * .8, py = y + (R() - .5) * sp * .8; if (!inCell(px_, py, .93) || nucRho(px_, py) < 1.02) continue; nodes.push([px_, py]); }
      const g = grid(sp * 1.6); nodes.forEach((n, i) => g.add(i, n[0], n[1], n[0], n[1]));
      const seen = new Set(); nodes.forEach((n, i) => { const near = []; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const j of g.at(n[0] + di * g.cs, n[1] + dj * g.cs)) if (j !== i) near.push([Math.hypot(nodes[j][0] - n[0], nodes[j][1] - n[1]), j]);
        near.sort((a, b) => a[0] - b[0]); for (const [dd, j] of near.slice(0, 3)) { if (dd > sp * 1.7) continue; const k = i < j ? i + '-' + j : j + '-' + i; if (seen.has(k)) continue; seen.add(k); const m = [(n[0] + nodes[j][0]) / 2 + (R() - .5) * 30, (n[1] + nodes[j][1]) / 2 + (R() - .5) * 30];
          if (nucRho(m[0], m[1]) < 1.02) continue; d.er.push([n, m, nodes[j]]); } }); d.erNodes = nodes;
      for (let i = 0; i < 26; i++) { const a = R() * 6.2832, k = 1.08 + R() * .22; d.erSheet.push({ x: NUC.x + Math.cos(a) * NUC.rx * k, y: NUC.y + Math.sin(a) * NUC.ry * k, a: a + 1.5708, rx: 70 + R() * 90, ry: 18 + R() * 16 }); } }
    // Golgi ribbon: ~10 mini-stacks curving round the nucleus next to the centrosome, each 4–7 cisternae
    for (let i = 0; i < 10; i++) { const a = -.75 + i * .15 + (R() - .5) * .05, k = 1.13 + R() * .06; d.golgi.push({ x: NUC.x + Math.cos(a) * NUC.rx * k, y: NUC.y + Math.sin(a) * NUC.ry * k * 1.25, a: Math.atan2(Math.sin(a) / NUC.ry, Math.cos(a) / NUC.rx), n: 4 + ((R() * 4) | 0), w: 60 + R() * 50 }); }
    // mitochondria: ~240 tubes 0.4–0.6 µm wide, 1–6 µm long, densest around the nucleus
    let tries = 0; while (d.mitos.length < 160 && tries++ < 20000) { const [x, y] = sample(.9, 1.1); if (!freeOf(x, y, 40)) continue; const L = 100 + Math.pow(R(), 1.8) * 500, n = Math.max(2, Math.round(L / 90));
      let h = R() * 6.2832; const tow = Math.atan2(y - NUC.y, x - NUC.x); if (R() < .6) h = tow + (R() - .5) * .8; // many point radially (they ride microtubules)
      const pts = [[x, y]]; let px_ = x, py = y, ok = true; for (let k = 0; k < n; k++) { h += gauss(R) * .35; px_ += Math.cos(h) * L / n; py += Math.sin(h) * L / n; if (!inCell(px_, py, .93) || nucRho(px_, py) < 1.03) { ok = false; break; } pts.push([px_, py]); }
      if (!ok) continue; d.mitos.push({ pts, w: 40 + R() * 16, L, ph: R() * 6, ox: 0, oy: 0 }); }
    const offMito = (x, y, r) => !d.mitos.some(m => { for (let i = 1; i < m.pts.length; i++) if (segD(x, y, ...m.pts[i - 1], ...m.pts[i])[0] < m.w / 2 + r + 4) return true; return false; });
    tries = 0; while (d.lyso.length < 100 && tries++ < 9000) { const [x, y] = sample(.92, .7); const r_ = 10 + Math.pow(R(), 2) * 30; if (!freeOf(x, y, 30) || !offMito(x, y, r_)) continue; d.lyso.push({ x, y, r: r_, ox: 0, oy: 0, ph: R() * 6 }); }
    tries = 0; while (d.perox.length < 100 && tries++ < 9000) { const [x, y] = sample(.92, .3); const r_ = 6 + R() * 12; if (!freeOf(x, y, 15) || !offMito(x, y, r_)) continue; d.perox.push({ x, y, r: r_, ox: 0, oy: 0, ph: R() * 6 }); }
    tries = 0; while (d.lipd.length < 7 && tries++ < 9000) { const [x, y] = sample(.85, 1.2); if (!freeOf(x, y, 80)) continue; d.lipd.push({ x, y, r: 30 + R() * 45, ox: 0, oy: 0 }); }
    tries = 0; while (d.vaults.length < 30 && tries++ < 9000) { const [x, y] = sample(.9, .4); if (!freeOf(x, y, 10)) continue; d.vaults.push({ x, y, a: R() * 3.14 }); }
    // vesicles (50–100 nm): start on microtubules
    for (let i = 0; i < 160; i++) { const m = (R() * d.mts.length) | 0; d.ves.push({ mt: m, s: R() * d.mts[m].len, dir: R() < .5 ? 1 : -1, run: R() * RATE.runLen * W2UM, x: 0, y: 0, r: 2.5 + R() * 2.5, c: (R() * 3) | 0 }); }
    // actin stress fibres: long straight bundles roughly along the cell's long axis, ending in focal adhesions
    for (let i = 0, made = 0; i < 160 && d.fibres.length < 46; i++) { const y0 = (R() - .5) * 1.5 * RY, a = (R() - .5) * .35 + (y0 / RY) * .12, c = Math.cos(a), s = Math.sin(a);
      let lo = -4000, hi = 4000; const on = u => inCell(u * c, y0 + u * s, .955); let u0 = 0; if (!on(0)) { let f = false; for (let u = -3000; u < 3000; u += 50) if (on(u)) { u0 = u; f = true; break; } if (!f) continue; }
      let u1 = u0; while (on(u1 + 20) && u1 < 3500) u1 += 20; let um = u0; while (on(um - 20) && um > -3500) um -= 20; lo = um; hi = u1; if (hi - lo < 600) continue; { let hit = false; for (let u = lo; u <= hi; u += 40) if (nucRho(u * c, y0 + u * s) < 1.06) { hit = true; break; } if (hit) continue; }
      const p0 = [lo * c, y0 + lo * s], p1 = [hi * c, y0 + hi * s], w = 12 + R() * 22, nucX = segD(NUC.x, NUC.y, ...p0, ...p1)[0] < Math.min(NUC.rx, NUC.ry) * .5;
      d.fibres.push({ p0, p1, w, a, dorsal: nucX }); for (const [p, sg] of [[p0, 1], [p1, -1]]) d.fa.push({ x: p[0] + c * sg * 60, y: p[1] + s * sg * 60, a, L: 100 + R() * 160, w: 25 + R() * 15 }); }
    // vimentin: wavy filaments forming a cage around the nucleus and fanning out
    for (let i = 0; i < 70; i++) { let a = R() * 6.2832, x = NUC.x + Math.cos(a) * NUC.rx * 1.05, y = NUC.y + Math.sin(a) * NUC.ry * 1.05, h = a + (R() - .5) * 1.4; const pts = [[x, y]];
      for (let k = 0; k < 60; k++) { h += gauss(R) * .18; x += Math.cos(h) * 30; y += Math.sin(h) * 30; if (nucRho(x, y) < 1.03) { h += 1.2; continue; } if (!inCell(x, y, .85)) break; pts.push([x, y]); } if (pts.length > 4) d.vim.push(pts); }
    // nuclear pores along the rim (about one every 300 nm of envelope)
    { const per = 2 * Math.PI * Math.sqrt((NUC.rx ** 2 + NUC.ry ** 2) / 2), n = Math.round(per / 30); for (let i = 0; i < n; i++) d.pores.push(i / n * 6.2832 + (R() - .5) * .006); }
    // spatial index
    for (const arr of [d.mitos, d.lyso, d.perox]) arr.forEach((o, i) => o.lr = (i * .618034) % 1); // level-of-detail rank: which ones appear first
    d.G = grid(250); d.mitos.forEach(m => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of m.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } const p = m.w + 30; d.G.add(['mito', m], x0 - p, y0 - p, x1 + p, y1 + p); });
    for (const [k, arr] of [['lyso', d.lyso], ['perox', d.perox], ['lipd', d.lipd]]) arr.forEach(o => d.G.add([k, o], o.x - o.r - 40, o.y - o.r - 40, o.x + o.r + 40, o.y + o.r + 40));
    d.golgi.forEach(g => d.G.add(['golgi', g], g.x - 150, g.y - 150, g.x + 150, g.y + 150));
    d.mts.forEach((m, mi) => m.pts.forEach((p, k) => k % 4 === 0 && d.G.add(['mt', m, k], p[0] - 60, p[1] - 60, p[0] + 60, p[1] + 60)));
    d.er.forEach(e => d.G.add(['er', e], Math.min(e[0][0], e[2][0]) - 20, Math.min(e[0][1], e[2][1]) - 20, Math.max(e[0][0], e[2][0]) + 20, Math.max(e[0][1], e[2][1]) + 20));
    d.fibres.forEach(f => { const n = Math.ceil(Math.hypot(f.p1[0] - f.p0[0], f.p1[1] - f.p0[1]) / 200); for (let k = 0; k <= n; k++) { const x = f.p0[0] + (f.p1[0] - f.p0[0]) * k / n, y = f.p0[1] + (f.p1[1] - f.p0[1]) * k / n; d.G.add(['actin', f], x - 120, y - 120, x + 120, y + 120); } });
    d.fa.forEach(f => d.G.add(['fa', f], f.x - 120, f.y - 120, f.x + 120, f.y + 120));
    d.vim.forEach(v => v.forEach((p, k) => k % 3 === 0 && d.G.add(['vim', v], p[0] - 60, p[1] - 60, p[0] + 60, p[1] + 60)));
    d.vaults.forEach(v => d.G.add(['vault', v], v.x - 20, v.y - 20, v.x + 20, v.y + 20));
    return d;
  }
  const mtPos = (m, s) => { const i = Math.max(0, Math.min(m.pts.length - 2, Math.floor(s / 25))), u = Math.max(0, Math.min(1, s / 25 - i)), a = m.pts[i], b = m.pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };

  // ---------- simulation at real rates (seconds of cell time) ----------
  let simR = rng(4242);
  function stepSim(dt) {
    const d = D, U = W2UM, R = simR;
    // microtubule dynamic instability
    for (const m of d.mts) { if (m.grow) { m.len += RATE.mtGrow * U * dt; if (m.len >= m.Lmax) { m.len = m.Lmax; m.grow = false; } else if (R() < 1 - Math.exp(-RATE.mtCat * dt)) m.grow = false; }
      else { m.len -= RATE.mtShrink * U * dt; if (m.len <= 0) { m.len = 0; m.grow = true; } else if (R() < 1 - Math.exp(-RATE.mtRes * dt)) m.grow = true; } }
    // vesicles: motor runs (kinesin out, dynein in), then free diffusion, then re-binding
    for (const v of d.ves) { if (v.mt >= 0) { const m = d.mts[v.mt], sp = (v.dir > 0 ? RATE.kinesin : RATE.dynein) * U * dt; v.s += v.dir * sp; v.run -= sp;
        if (v.s > m.len || v.s < 0 || v.run <= 0) { const [x, y] = mtPos(m, Math.max(0, Math.min(m.len, v.s))); v.x = x; v.y = y; v.mt = -1; } }
      else { const sg = Math.sqrt(2 * RATE.Dves * 1e4 * dt); v.x += gauss(R) * sg; v.y += gauss(R) * sg; if (cellRho(v.x, v.y, tm) > .97 || nucRho(v.x, v.y) < 1.01) { v.x *= .995; v.y *= .995; }
        if (R() < 1 - Math.exp(-RATE.rebind * dt)) { const near = d.G.at(v.x, v.y).filter(o => o[0] === 'mt'); if (near.length) { const [, m, k] = near[(R() * near.length) | 0], mi = d.mts.indexOf(m); if (k * 25 < m.len) { v.mt = mi; v.s = k * 25; v.dir = R() < .5 ? 1 : -1; v.run = -Math.log(R() || 1e-6) * RATE.runLen * U; } } } } }
    if (cam.z < 25) { // slow drift of organelles (Ornstein–Uhlenbeck: diffusion with a soft tether, so they stay in place on average)
      const ou = (o, Dm, k) => { const sg = Math.sqrt(2 * Dm * 1e4 * dt), e = Math.exp(-k * dt); o.ox = o.ox * e + gauss(R) * sg; o.oy = o.oy * e + gauss(R) * sg; };
      for (const m of d.mitos) ou(m, .0004, .01); for (const l of d.lyso) ou(l, RATE.Dlys, .01); for (const p of d.perox) ou(p, RATE.Dlys, .01); for (const l of d.lipd) ou(l, .0002, .01); }
  }
  function advance(dts) { if (dts <= 0) return; simT += dts; if (cam.z < 25) tm = simT; const n = Math.min(80, Math.ceil(dts / .25)), h = dts / n; for (let i = 0; i < n; i++) stepSim(h); }

  // ---------- camera ----------
  const VW = () => cv.clientWidth, VH = () => cv.clientHeight;
  const TOP = () => mob() ? 96 : 100;           // top bar + time bar
  function fitZ() { return Math.min(VW() / (RX * 2.3), (VH() - TOP() - 40) / (RY * 2.5)); }
  const ZMAX = 4e5;              // from the whole cell down to inside one atom (no zoom-out above the cell)
  const clampZ = z => Math.max(fitZ() * .6, Math.min(ZMAX, z));
  function centreOff() { if (!sel) return [0, TOP() / 2 - 10]; return mob() ? [0, -VH() * .2 + TOP() / 2] : [-170, TOP() / 2 - 10]; }
  const w2s = (x, y) => [(x - cam.x) * cam.z + VW() / 2 + offs[0], (y - cam.y) * cam.z + VH() / 2 + offs[1]];
  const s2w = (X, Y) => [(X - VW() / 2 - offs[0]) / cam.z + cam.x, (Y - VH() / 2 - offs[1]) / cam.z + cam.y];
  function animTo(x, y, z, ms = 900) { const z0 = cam.z, z1 = clampZ(z), span = Math.abs(Math.log(z1 / z0)); anim = { f: { ...cam, o0: offs[0], o1: offs[1] }, t: { x, y, z: z1 }, o: centreOff(), s: performance.now(), ms: RM() ? 1 : Math.min(2600, ms + span * 90) }; }
  function zoomAt(X, Y, f) { anim = null; const [wx, wy] = s2w(X, Y); const z = clampZ(cam.z * f); cam.x = wx - (X - VW() / 2 - offs[0]) / z; cam.y = wy - (Y - VH() / 2 - offs[1]) / z; cam.z = z; anim = null; }
  function fit() { sel = null; showPop(); animTo(0, 0, fitZ()); }

  // ---------- drawing helpers ----------
  let VB; const vis = (x, y, r) => x + r > VB[0] && x - r < VB[2] && y + r > VB[1] && y - r < VB[3];
  const px = n => n / cam.z;
  function poly(g, pts, n = pts.length, st = 1) { g.moveTo(pts[0][0], pts[0][1]); let i = st; for (; i < n; i += st) g.lineTo(pts[i][0], pts[i][1]); if (st > 1 && i - st !== n - 1) g.lineTo(pts[n - 1][0], pts[n - 1][1]); }
  // fluorescence channels (dark-field palette): what each part would be stained with
  const CH = { dna: '#4f8dff', mito: '#ffb43d', mt: '#4ff3e3', actin: '#c58cff', er: '#a8ff6b', golgi: '#ffe14d', lyso: '#ff5ab4', perox: '#3dff8a', mem: '#7fd7ff', vim: '#ff8a5a', lipd: '#fff2c8' };
  // FL = 1 when it should look like a fluorescence (light) microscope, 0 when we are below its ~200 nm limit
  const LODK = () => SCOPE ? 1 : Math.min(1, .3 + .7 * sm(.3, 1.3, cam.z)); // share of mitochondria/lysosomes drawn: more spawn in as you zoom
  const lodOk = o => o.lr == null || o.lr <= LODK();
  let SCOPE = false; // optional microscope look; default is the clear, labelled style
  const FL = z => SCOPE ? 1 - sm(1.6, 5, z) : 0;
  const BLUR = 22; // units: ~220 nm, the blur of a good light microscope

  // static layers (ER, actin, vimentin, Golgi) are painted once into an image for the overview
  let STAT = null, DAPI = null; const SRES = .32, DRES = .9;
  function paintStatic(g, z, cull, fl) {
    const lw = (w, minPx) => Math.max(w, minPx / z);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'lighter';
    // ER network
    const drawER = () => { g.beginPath(); for (const e of D.er) { if (cull && !vis(e[1][0], e[1][1], 140)) continue; g.moveTo(e[0][0], e[0][1]); g.quadraticCurveTo(e[1][0], e[1][1], e[2][0], e[2][1]); } };
    drawER(); if (fl > .01) { g.globalAlpha = .1 * fl; g.lineWidth = 6 + BLUR * 1.6; g.strokeStyle = CH.er; g.stroke(); } g.globalAlpha = SCOPE ? .45 + .2 * (1 - fl) : .3; g.lineWidth = lw(SCOPE ? 6 : 5, .9); g.strokeStyle = SCOPE ? CH.er : '#4ff3e3'; g.stroke();
    if (z > 2.5) { g.globalAlpha = .9 * sm(2.5, 5, z); g.lineWidth = lw(3.6, .5); g.strokeStyle = '#05140a'; g.globalCompositeOperation = 'source-over'; g.stroke(); g.globalCompositeOperation = 'lighter'; } // hollow tubes (membrane outline) below the light limit
    for (const s of D.erSheet) { if (cull && !vis(s.x, s.y, s.rx)) continue; g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.beginPath(); g.ellipse(0, 0, s.rx, s.ry, 0, 0, 6.2832); g.globalAlpha = SCOPE ? .22 + .1 * (1 - fl) : .16; g.fillStyle = SCOPE ? CH.er : '#4ff3e3'; g.fill(); g.globalAlpha = .6; g.lineWidth = lw(1, .8); g.strokeStyle = SCOPE ? CH.er : '#4ff3e3'; g.stroke(); g.restore(); }
    // actin stress fibres + focal adhesions
    for (const f of D.fibres) { if (cull && !(vis(f.p0[0], f.p0[1], 3000) || vis(f.p1[0], f.p1[1], 3000))) continue;
      const dx = f.p1[0] - f.p0[0], dy = f.p1[1] - f.p0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      if (z < 3) { g.beginPath(); g.moveTo(...f.p0); g.lineTo(...f.p1); if (fl > .01) { g.globalAlpha = .06 * fl; g.lineWidth = f.w + BLUR * 1.4; g.strokeStyle = CH.actin; g.stroke(); } g.globalAlpha = SCOPE ? .28 : .14; g.lineWidth = lw(f.w, .9); g.strokeStyle = CH.actin; g.stroke(); }
      if (z >= 2) { const n = Math.round(f.w / 1.6); g.globalAlpha = .55 * sm(2, 4, z); g.lineWidth = lw(.7, .6); g.strokeStyle = CH.actin; g.beginPath(); // individual 7 nm filaments in the bundle
        for (let k = 0; k < n; k++) { const o = (k / (n - 1) - .5) * f.w, w0 = Math.sin(k * 2.1) * .35; g.moveTo(f.p0[0] + nx * (o + w0), f.p0[1] + ny * (o + w0)); g.lineTo(f.p1[0] + nx * (o - w0), f.p1[1] + ny * (o - w0)); } g.stroke(); } }
    for (const a of D.fa) { if (cull && !vis(a.x, a.y, a.L)) continue; g.save(); g.translate(a.x, a.y); g.rotate(a.a); g.beginPath(); g.ellipse(0, 0, a.L / 2, a.w / 2, 0, 0, 6.2832); g.globalAlpha = .3; g.fillStyle = '#d8a0ff'; g.fill(); g.restore(); }
    // vimentin
    g.beginPath(); for (const v of D.vim) { if (cull && !v.some(p => vis(p[0], p[1], 40))) continue; poly(g, v); } g.globalAlpha = SCOPE ? .28 : .1 + .2 * sm(1, 3, z); g.lineWidth = lw(1, .7); g.strokeStyle = CH.vim; g.stroke();
    // Golgi ribbon: mini-stacks of curved cisternae (each ~25 nm thick, ~50 nm apart)
    for (const s of D.golgi) { if (cull && !vis(s.x, s.y, 120)) continue; g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      if (fl > .01) { g.globalAlpha = .35 * fl; g.fillStyle = CH.golgi; g.beginPath(); g.ellipse(0, 0, 30 + BLUR, s.w / 2 + BLUR * .5, 0, 0, 6.2832); g.fill(); }
      for (let k = 0; k < s.n; k++) { const o = (k - (s.n - 1) / 2) * 5, r = 140 - o * 1.5; g.beginPath(); g.arc(-r + o, 0, r, -s.w / 2 / r, s.w / 2 / r); g.globalAlpha = SCOPE ? .75 : .95; g.lineWidth = lw(SCOPE ? 2.5 : 4, 1.2); g.strokeStyle = CH.golgi; g.stroke(); }
      g.restore(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function buildCaches() {
    const c = document.createElement('canvas'); c.width = Math.ceil(RX * 2.5 * SRES); c.height = Math.ceil(RY * 2.6 * SRES); const g = c.getContext('2d');
    mkChrom(); g.setTransform(SRES, 0, 0, SRES, c.width / 2, c.height / 2); paintStatic(g, SRES, false, SCOPE ? 1 : 0); STAT = c;
    // DAPI-like nucleus: chromatin domains, brighter rim (heterochromatin), dim nucleoli
    const d = document.createElement('canvas'); d.width = Math.ceil(NUC.rx * 2.3 * DRES); d.height = Math.ceil(NUC.ry * 2.3 * DRES); const h = d.getContext('2d');
    h.setTransform(DRES, 0, 0, DRES, d.width / 2, d.height / 2); const R = rng(77);
    h.save(); h.beginPath(); h.ellipse(0, 0, NUC.rx, NUC.ry, 0, 0, 6.2832); h.clip();
    let gr = h.createRadialGradient(0, 0, 10, 0, 0, NUC.rx); gr.addColorStop(0, 'rgba(40,80,200,.55)'); gr.addColorStop(.85, 'rgba(50,100,230,.65)'); gr.addColorStop(1, 'rgba(90,150,255,.9)'); h.setTransform(DRES, 0, 0, DRES * NUC.ry / NUC.rx, d.width / 2, d.height / 2); h.fillStyle = gr; h.fillRect(-NUC.rx, -NUC.rx, NUC.rx * 2, NUC.rx * 2); h.setTransform(DRES, 0, 0, DRES, d.width / 2, d.height / 2);
    h.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3200; i++) { const a = R() * 6.2832, rr = Math.sqrt(R()), x = Math.cos(a) * rr * NUC.rx, y = Math.sin(a) * rr * NUC.ry, s = 8 + R() * 26, rim = rr > .85 ? 1.6 : 1;
      h.globalAlpha = (.05 + R() * .12) * rim; h.drawImage(glowS(R() < .8 ? '#4f8dff' : '#9fd0ff'), x - s, y - s, s * 2, s * 2); }
    h.globalCompositeOperation = 'destination-out'; for (const n of NUCL) { const gg = h.createRadialGradient(n.x - NUC.x, n.y - NUC.y, 0, n.x - NUC.x, n.y - NUC.y, n.r * 1.15); gg.addColorStop(0, 'rgba(0,0,0,.85)'); gg.addColorStop(.75, 'rgba(0,0,0,.7)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); h.globalAlpha = 1; h.fillStyle = gg; h.fillRect(n.x - NUC.x - n.r * 1.2, n.y - NUC.y - n.r * 1.2, n.r * 2.4, n.r * 2.4); }
    h.restore(); DAPI = d;
  }
  // chromatin chains (irregular, 5–24 nm in living cells) generated per 600 nm tile inside the nucleus, only for the area you look at
  const TC = 60, CT = new Map(); let CHN = 0;
  function chromTile(i, j) { const key = i + ',' + j; let L = CT.get(key); if (L) return L; L = []; const R = rng(((i * 73856093) ^ (j * 19349663)) | 0);
    for (let c = 0; c < 2; c++) { let x = (i + R()) * TC, y = (j + R()) * TC, h = R() * 6.28; if (nucRho(x, y) > .97) continue; const pts = [[x, y]];
      for (let k = 0; k < 16; k++) { h += (R() - .5) * 1.3; x += Math.cos(h) * 7; y += Math.sin(h) * 7; if (nucRho(x, y) > .97) break; pts.push([x, y]); } if (pts.length > 2) L.push(pts); }
    if (CT.size > 4000) CT.clear(); CT.set(key, L); return L; }
  let CHROM = []; function mkChrom() { const R = rng(808); CHROM = []; for (let i = 0; i < 26; i++) { let a = R() * 6.28, r = Math.sqrt(R()) * .8, x = NUC.x + Math.cos(a) * r * NUC.rx, y = NUC.y + Math.sin(a) * r * NUC.ry, h = R() * 6.28; const L = [[x, y]]; for (let k = 0; k < 14; k++) { h += (R() - .5) * 1.4; x += Math.cos(h) * 45; y += Math.sin(h) * 45; if (nucRho(x, y) > .95) break; L.push([x, y]); } if (L.length > 2) CHROM.push(L); } }
  function cellPath(g, tt, k = 1) { g.beginPath(); for (let i = 0; i <= 240; i++) { const [x, y] = memPt(i / 240 * 6.2832, tt, k); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }

  function drawCell(z) {
    const d = D, fl = FL(z), ga = cx.globalAlpha, T = simT;
    // cytoplasm: faint autofluorescence + cell outline (like a membrane dye)
    cellPath(cx, tm); if (SCOPE) { cx.fillStyle = `rgba(20,46,70,${.32 + .2 * (1 - fl)})`; cx.fill(); } else { const gr = cx.createRadialGradient(NUC.x, NUC.y, 100, 0, 0, RX); gr.addColorStop(0, 'rgba(26,62,104,.92)'); gr.addColorStop(1, 'rgba(14,34,64,.88)'); cx.fillStyle = gr; cx.fill();
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * .25; cx.lineWidth = Math.max(px(14), 30); cx.strokeStyle = '#4ff3e3'; cx.stroke(); cx.globalAlpha = ga * .95; cx.lineWidth = Math.max(px(3), 6); cx.stroke(); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga; }
    cx.globalCompositeOperation = 'lighter'; if (fl > .01) { cx.globalAlpha = ga * .12 * fl; cx.lineWidth = BLUR * 2; cx.strokeStyle = CH.mem; cx.stroke(); }
    cx.globalAlpha = ga * .7; cx.lineWidth = Math.max(.5, px(1.2)); cx.strokeStyle = CH.mem; cx.stroke(); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga;
    // static layers
    if (z < .55 && STAT) { cx.globalAlpha = ga; cx.drawImage(STAT, -STAT.width / 2 / SRES, -STAT.height / 2 / SRES, STAT.width / SRES, STAT.height / SRES); }
    else { cx.save(); paintStatic(cx, z, true, fl); cx.restore(); cx.globalAlpha = ga; }
    // nucleus
    if (vis(NUC.x, NUC.y, NUC.rx) && !SCOPE) { cx.save(); cx.beginPath(); cx.ellipse(NUC.x, NUC.y, NUC.rx, NUC.ry, 0, 0, 6.2832); const gr = cx.createRadialGradient(NUC.x - 150, NUC.y - 80, 20, NUC.x, NUC.y, NUC.rx); gr.addColorStop(0, '#a888ff'); gr.addColorStop(.35, '#6a46d0'); gr.addColorStop(1, '#2c1670'); cx.globalAlpha = ga * (1 - .6 * sm(10, 40, z)); cx.fillStyle = gr; cx.fill();
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * .3; cx.lineWidth = Math.max(px(12), 26); cx.strokeStyle = '#b48cff'; cx.stroke(); cx.globalAlpha = ga * .9; cx.lineWidth = Math.max(px(2.5), 5); cx.stroke(); cx.clip();
      if (z < 12) { cx.globalAlpha = ga * .6 * (1 - sm(5, 12, z)); cx.strokeStyle = '#ff8ad8'; cx.lineWidth = Math.max(px(1.4), 4); cx.beginPath(); for (const c_ of CHROM) poly(cx, c_); cx.stroke(); }
      if (z > 1.5 && z < 60) { const al = sm(1.5, 4, z) * (1 - sm(10, 22, z)); const [ax, ay] = s2w(-20, -20), [bx, by] = s2w(VW() + 20, VH() + 20); cx.globalAlpha = ga * .85 * al; cx.strokeStyle = '#ff8ad8'; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = Math.max(px(1.1), 3); cx.beginPath(); CHN = 0;
        for (let i = Math.floor(ax / TC); i <= Math.floor(bx / TC); i++) for (let j = Math.floor(ay / TC); j <= Math.floor(by / TC); j++) for (const L of chromTile(i, j)) { poly(cx, L); CHN++; } cx.stroke(); cx.globalAlpha = ga; }
      for (const n of NUCL) { const s_ = n.r * 3; cx.globalAlpha = ga * .7; cx.drawImage(glowS('#d9b8ff'), n.x - s_ / 2, n.y - s_ / 2, s_, s_); } cx.restore(); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga; }
    if (vis(NUC.x, NUC.y, NUC.rx)) { cx.globalAlpha = ga * (SCOPE ? 1 - .6 * sm(10, 40, z) : 0); if (SCOPE) cx.drawImage(DAPI, NUC.x - DAPI.width / 2 / DRES, NUC.y - DAPI.height / 2 / DRES, DAPI.width / DRES, DAPI.height / DRES); cx.globalAlpha = ga;
      // nuclear envelope: two membranes 30 nm apart (visible below the light limit), pores ~120 nm
      if (z > 1.5) { const al = sm(1.5, 4, z); cx.globalAlpha = ga * al; cx.lineWidth = Math.max(.5, px(1)); cx.strokeStyle = '#9fc4ff';
        for (const k of [0, 3]) { cx.beginPath(); cx.ellipse(NUC.x, NUC.y, NUC.rx + k, NUC.ry + k, 0, 0, 6.2832); cx.stroke(); }
        for (const a of d.pores) { const x = NUC.x + Math.cos(a) * (NUC.rx + 1.5), y = NUC.y + Math.sin(a) * (NUC.ry + 1.5); if (!vis(x, y, 10)) continue; cx.beginPath(); cx.arc(x, y, 5, 0, 6.2832); cx.fillStyle = 'rgba(70,110,170,.35)'; cx.fill(); cx.strokeStyle = 'rgba(255,211,107,.7)'; cx.lineWidth = Math.max(.4, px(1.6)); cx.stroke(); if (z > 6) { cx.beginPath(); for (let k = 0; k < 8; k++) { const q = k * .7854; cx.moveTo(x + Math.cos(q) * 2, y + Math.sin(q) * 2); cx.lineTo(x + Math.cos(q) * 5, y + Math.sin(q) * 5); } cx.lineWidth = px(.8) > .3 ? .8 : .3; cx.stroke(); } } cx.globalAlpha = ga; }
      for (const n of NUCL) if (z > 1 && vis(n.x, n.y, n.r)) { cx.globalAlpha = ga * .35 * sm(1, 3, z); cx.beginPath(); cx.arc(n.x, n.y, n.r, 0, 6.2832); cx.strokeStyle = '#ff9ad6'; cx.lineWidth = Math.max(.6, px(1)); cx.setLineDash([px(3), px(4)]); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = ga; } }
    cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; cx.lineJoin = 'round';
    // microtubules (+ EB1-like bright growing tips)
    { cx.beginPath(); for (const m of d.mts) { if (m.len < 1) continue; const n = Math.min(m.pts.length, Math.floor(m.len / 25) + 1); if (z > .55 && !m.pts.some((p, i) => i < n && i % 6 === 0 && vis(p[0], p[1], 160))) continue; poly(cx, m.pts, n, z < .35 ? 4 : z < 1 ? 2 : 1); const [x, y] = mtPos(m, m.len); cx.lineTo(x, y); }
      if (z < .55) { cx.globalAlpha = ga * (SCOPE ? .2 : .13); cx.lineWidth = SCOPE ? 9 : 6; cx.strokeStyle = CH.mt; cx.stroke(); } else { // overview: one soft stroke (cheaper, same look)
      if (fl > .01) { cx.globalAlpha = ga * .07 * fl; cx.lineWidth = 2.5 + BLUR; cx.strokeStyle = CH.mt; cx.stroke(); }
      cx.globalAlpha = ga * (z > 4 ? .5 : .55); cx.lineWidth = Math.max(2.5, px(.8)); cx.strokeStyle = CH.mt; cx.stroke(); }
      if (z > 4) { cx.globalAlpha = ga * .8 * sm(4, 8, z); cx.globalCompositeOperation = 'source-over'; cx.lineWidth = 1.6; cx.strokeStyle = '#03141a'; cx.stroke(); cx.globalCompositeOperation = 'lighter'; } // hollow 25 nm tube: 15 nm lumen
      cx.globalAlpha = ga * .9; for (const m of d.mts) { if (!m.grow || m.len < 30) continue; const [x, y] = mtPos(m, m.len); if (!vis(x, y, 40)) continue; const s = Math.max(px(9), 30); cx.drawImage(glowS('#c8fff8'), x - s / 2, y - s / 2, s, s); } }
    // mitochondria
    { cx.beginPath(); for (const m of d.mitos) { const p0 = m.pts[0]; if (!lodOk(m)) continue; if (z > .55 && !vis(p0[0] + m.ox, p0[1] + m.oy, m.L + 60)) continue; cx.moveTo(p0[0] + m.ox, p0[1] + m.oy); for (let i = 1; i < m.pts.length; i++) cx.lineTo(m.pts[i][0] + m.ox, m.pts[i][1] + m.oy); }
      if (!SCOPE && z < 1.4) { cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga; cx.lineWidth = 50; cx.strokeStyle = '#ffb43d'; cx.stroke(); cx.lineWidth = 50 - Math.max(8, px(2.4)); cx.strokeStyle = '#8a5514'; cx.stroke(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * .25; cx.lineWidth = 20; cx.strokeStyle = '#ffd36b'; cx.stroke(); }
      else if (z < .55) { cx.globalAlpha = ga * .6; cx.lineWidth = 56; cx.strokeStyle = CH.mito; cx.stroke(); } else {
      if (fl > .01) { cx.globalAlpha = ga * .14 * fl; cx.lineWidth = 48 + BLUR * 1.5; cx.strokeStyle = CH.mito; cx.stroke(); }
      cx.globalAlpha = ga * (.55 - .25 * (1 - fl)); cx.lineWidth = 46; cx.strokeStyle = CH.mito; cx.stroke(); } }
    if (z > 1.4) { cx.globalCompositeOperation = 'source-over'; const al = sm(1.4, 3, z); // membranes and cristae (electron-microscope view)
      for (const m of d.mitos) { const p0 = m.pts[0]; if (!vis(p0[0] + m.ox, p0[1] + m.oy, m.L + 60)) continue; const P_ = m.pts.map(p => [p[0] + m.ox, p[1] + m.oy]);
        cx.globalAlpha = ga * al; cx.beginPath(); poly(cx, P_); cx.lineWidth = m.w; cx.strokeStyle = '#ffd36b'; cx.stroke(); cx.lineWidth = m.w - 2; cx.strokeStyle = '#2a1600'; cx.stroke(); cx.lineWidth = m.w - 4; cx.strokeStyle = '#ffb43d'; cx.stroke(); cx.lineWidth = m.w - 5; cx.strokeStyle = SCOPE ? '#3b2306' : '#5e3810'; cx.stroke();
        if (!SCOPE && z < 10) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * al * .5 * (1 - sm(5, 10, z)); for (let i = 1; i < P_.length; i++) for (let k = 0; k < 3; k++) { const u = (k + .5 + .3 * Math.sin(i * 3 + k + m.ph)) / 3, x = P_[i - 1][0] + (P_[i][0] - P_[i - 1][0]) * u, y = P_[i - 1][1] + (P_[i][1] - P_[i - 1][1]) * u, s_ = m.w * .5; cx.drawImage(glowS('#ffc46b'), x - s_ / 2, y - s_ / 2, s_, s_); } cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga * al; } // outer + inner membrane, 20 nm apart
        cx.beginPath(); for (let i = 1; i < P_.length; i++) { const [ax, ay] = P_[i - 1], [bx, by] = P_[i], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L, n = Math.floor(L / 13);
          for (let k = 0; k < n; k++) { const u = (k + .5) / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, s = ((k + i) % 2 ? 1 : -1), h = (m.w / 2 - 2.5), l = h * (.55 + .35 * Math.sin(k * 1.9 + m.ph)); cx.moveTo(x + nx * h * s, y + ny * h * s); cx.lineTo(x + nx * (h - l) * s, y + ny * (h - l) * s); } }
        cx.lineWidth = SCOPE ? 2 : 3; cx.strokeStyle = SCOPE ? '#ffb43d' : '#ffd36b'; cx.stroke(); }
      cx.globalAlpha = ga; cx.globalCompositeOperation = 'lighter'; }
    // lysosomes, peroxisomes, lipid droplets, vesicles
    const blobs = (arr, col, a0, dark) => { for (const o of arr) { const x = o.x + o.ox, y = o.y + o.oy; if (!vis(x, y, o.r + 40)) continue; const s = (o.r + BLUR * fl) * 2.4; cx.globalAlpha = ga * a0; cx.drawImage(glowS(col), x - s / 2, y - s / 2, s, s);
      if (z > 1.5) { cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga * sm(1.5, 3, z); cx.beginPath(); cx.arc(x, y, o.r, 0, 6.2832); const gr = cx.createRadialGradient(x - o.r * .3, y - o.r * .3, o.r * .1, x, y, o.r); gr.addColorStop(0, col + '55'); gr.addColorStop(.6, dark); gr.addColorStop(1, dark); cx.fillStyle = gr; cx.fill(); cx.lineWidth = Math.max(.5, px(1)); cx.strokeStyle = col; cx.stroke();
        if (z > 3 && o.ph != null) { cx.globalAlpha = ga * sm(3, 6, z) * .7; cx.strokeStyle = col; cx.lineWidth = Math.max(.3, px(.8));
          if (col === CH.lyso) { for (let k = 0; k < 4; k++) { const an = o.ph + k * 1.9, rr = o.r * (.25 + .12 * k), vr = o.r * (.16 + .04 * (k % 2)); cx.beginPath(); cx.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr, vr, 0, 6.2832); cx.stroke(); } }
          else if (col === CH.perox) { cx.save(); cx.translate(x, y); cx.rotate(o.ph); cx.fillStyle = col + '66'; const c_ = o.r * .42; cx.fillRect(-c_ / 2, -c_ / 2, c_, c_); cx.restore(); } }
        cx.globalCompositeOperation = 'lighter'; } } };
    if (!SCOPE && z < 1.5) { cx.globalCompositeOperation = 'source-over'; for (const [arr, f_, st] of [[d.lyso, 'rgba(120,80,210,.75)', '#c8a8ff'], [d.perox, 'rgba(30,120,70,.8)', '#6bff9f']]) { cx.beginPath(); for (const o of arr) { const x = o.x + o.ox, y = o.y + o.oy; if (!lodOk(o) || !vis(x, y, o.r + 20)) continue; cx.moveTo(x + o.r, y); cx.arc(x, y, o.r, 0, 6.2832); } cx.globalAlpha = ga; cx.fillStyle = f_; cx.fill(); cx.lineWidth = Math.max(px(1.5), 4); cx.strokeStyle = st; cx.stroke(); } cx.globalCompositeOperation = 'lighter'; }
    else { blobs(d.lyso, CH.lyso, .8, 'rgba(60,8,40,.85)'); blobs(d.perox, CH.perox, .7, 'rgba(6,40,20,.85)'); } blobs(d.lipd, CH.lipd, .35, 'rgba(40,36,20,.6)');
    for (const v of d.ves) { const [x, y] = v.mt >= 0 ? mtPos(d.mts[v.mt], Math.max(0, Math.min(d.mts[v.mt].len, v.s))) : [v.x, v.y]; if (!vis(x, y, 30)) continue; const col = ['#ffe14d', '#a8ff6b', '#ff5ab4'][v.c], s = Math.max(px(6), v.r * 2 + BLUR * fl * 2);
      cx.globalAlpha = ga * .75; cx.drawImage(glowS(col), x - s / 2, y - s / 2, s, s); if (z > 3) { cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga * sm(3, 6, z); cx.beginPath(); cx.arc(x, y, v.r, 0, 6.2832); cx.fillStyle = '#120d02'; cx.fill(); cx.lineWidth = Math.max(.5, px(1)); cx.strokeStyle = col; cx.stroke(); cx.globalCompositeOperation = 'lighter'; } }
    if (z > 2) { cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga * sm(2, 5, z); cx.lineWidth = Math.max(.3, px(1)); // vaults: hollow barrels ~40 × 70 nm (30 drawn of ~10,000)
      for (const v of d.vaults) { if (!vis(v.x, v.y, 10)) continue; cx.save(); cx.translate(v.x, v.y); cx.rotate(v.a); cx.beginPath(); cx.ellipse(0, 0, 3.5, 2, 0, 0, 6.2832); cx.fillStyle = 'rgba(255,165,61,.25)'; cx.fill(); cx.strokeStyle = '#ffa53d'; cx.stroke();
        if (z > 8) { cx.beginPath(); for (const q of [-1.8, 0, 1.8]) { cx.moveTo(q, -1.9); cx.lineTo(q, 1.9); } cx.stroke(); } cx.restore(); } cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga; }
    // centrosome: bright spot; below the light limit, two centrioles at right angles (250 × 500 nm)
    { const s = 70 + BLUR * fl * 2; cx.globalAlpha = ga * .9; cx.drawImage(glowS('#c8fff8'), CENT.x - s / 2, CENT.y - s / 2, s, s);
      if (z > 2) { cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga * sm(2, 5, z); cx.fillStyle = '#062022'; cx.strokeStyle = CH.mt; cx.lineWidth = Math.max(.5, px(1));
        cx.beginPath(); cx.rect(CENT.x - 25, CENT.y - 12.5, 50, 25); cx.fill(); cx.stroke(); cx.beginPath(); cx.arc(CENT.x + 40, CENT.y + 5, 12.5, 0, 6.2832); cx.fill(); cx.stroke();
        if (z > 12) for (let k = 0; k < 9; k++) { const a = k / 9 * 6.2832; for (let j = 0; j < 3; j++) { cx.beginPath(); cx.arc(CENT.x + 40 + Math.cos(a + j * .12) * (9 + j * 1.2), CENT.y + 5 + Math.sin(a + j * .12) * (9 + j * 1.2), 1.1, 0, 6.2832); cx.stroke(); } } } }
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga;
  }
  const A = W2UM / 1e4; // world units per ångström (1 µm = 10,000 Å)
  const EL = { H: { c: '#eaf6ff', r: .38, p: 1, n: 0, nm: 'Hydrogen' }, C: { c: '#8fb4d8', r: .72, p: 6, n: 6, nm: 'Carbon' }, N: { c: '#5a9cff', r: .68, p: 7, n: 7, nm: 'Nitrogen' },
    O: { c: '#ff5a6e', r: .64, p: 8, n: 8, nm: 'Oxygen' }, P: { c: '#ffa53d', r: 1.0, p: 15, n: 16, nm: 'Phosphorus' } };
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (Math.log(x) - Math.log(a)) / (Math.log(b) - Math.log(a)))); return u * u * (3 - 2 * u); };
  const SPR = {};
  function sprite(key, size, paint) { if (SPR[key]) return SPR[key]; const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size); return SPR[key] = c; }
  const glowS = col => sprite('g' + col, 64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, col + 'ff'); r.addColorStop(.18, col + 'cc'); r.addColorStop(.45, col + '40'); r.addColorStop(1, col + '00'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  const SK = 48 / 30; // sphere sprite: drawn radius 30 inside a 96px canvas (room for glow)
  const sphereS = col => sprite('s' + col, 96, (g, s) => { const c = s / 2; let r = g.createRadialGradient(c, c, 24, c, c, 48); r.addColorStop(0, col + '55'); r.addColorStop(1, col + '00'); g.fillStyle = r; g.fillRect(0, 0, s, s);
    r = g.createRadialGradient(c - 10, c - 11, 1, c, c, 30); r.addColorStop(0, '#ffffff'); r.addColorStop(.28, col); r.addColorStop(1, '#0a1430'); g.fillStyle = r; g.beginPath(); g.arc(c, c, 30, 0, 6.283); g.fill();
    g.lineWidth = 1.2; g.strokeStyle = col + 'aa'; g.stroke(); });
  // molecule templates (positions in Å; shapes simplified)
  function TP(list) { let mx = 0, my = 0; list.forEach(a => { mx += a[1]; my += a[2]; }); mx /= list.length; my /= list.length;
    const at = list.map(([e, x, y]) => [e, x - mx, y - my]), bd = [];
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) { const d = Math.hypot(at[i][1] - at[j][1], at[i][2] - at[j][2]), lim = (at[i][0] === 'H' || at[j][0] === 'H') ? 1.2 : 1.75; if (d < lim && !(at[i][0] === 'H' && at[j][0] === 'H')) bd.push([i, j]); }
    let r = 0; at.forEach(a => r = Math.max(r, Math.hypot(a[1], a[2]))); const co = at.filter((a, i) => a[0] !== 'H' && i % 3 === 0); if (!co.length) co.push(at[0]);
    return { at, bd, r: r + 1, co }; }
  const pol = (cx_, cy_, r, a) => [cx_ + Math.cos(a) * r, cy_ + Math.sin(a) * r];
  function mkTemplates() {
    const T = {};
    T.water = [TP([['O', 0, 0], ['H', .76, .59], ['H', -.76, .59]])];
    { const L = []; const el = ['C', 'C', 'C', 'C', 'C', 'O']; // glucose ring: C1–C5 + ring O; C1–C4 carry OH, C5 carries CH2OH (C6)
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; L.push([el[k], ...pol(0, 0, 1.45, a)]);
        if (k < 4) { L.push(['O', ...pol(0, 0, 2.85, a)]); L.push(['H', ...pol(0, 0, 3.8, a)]); }
        if (k === 4) { const c6 = pol(0, 0, 2.95, a), o6 = pol(c6[0], c6[1], 1.42, a - .6); L.push(['C', ...c6], ['O', ...o6], ['H', ...pol(o6[0], o6[1], .96, a - .6)]); } } T.glu = [TP(L)]; }
    { const L = [], d2r = Math.PI / 180, he = ['C', 'N', 'C', 'N', 'C', 'C']; for (let k = 0; k < 6; k++) L.push([he[k], ...pol(0, 0, 1.4, (90 + 60 * k) * d2r)]);
      L.push(['N', 0, 2.8], ['H', .85, 3.35], ['H', -.85, 3.35]); const pc = [2.175, 0]; [['N', 72], ['C', 0], ['N', -72]].forEach(([e, a]) => L.push([e, ...pol(pc[0], pc[1], 1.19, a * d2r)]));
      const n9 = pol(pc[0], pc[1], 1.19, -72 * d2r), dir = [n9[0] - pc[0], n9[1] - pc[1]], dl = Math.hypot(...dir); dir[0] /= dl; dir[1] /= dl;
      const c1 = [n9[0] + dir[0] * 1.45, n9[1] + dir[1] * 1.45], rc = [c1[0] + dir[0] * 1.19, c1[1] + dir[1] * 1.19], a0 = Math.atan2(c1[1] - rc[1], c1[0] - rc[0]);
      const rb = ['C', 'C', 'C', 'C', 'O'], rp = []; for (let k = 0; k < 5; k++) { const p = pol(rc[0], rc[1], 1.19, a0 + k * 72 * d2r); rp.push(p); L.push([rb[k], ...p]); }
      [1, 2].forEach(k => { const v = [rp[k][0] - rc[0], rp[k][1] - rc[1]], l = Math.hypot(...v); L.push(['O', rp[k][0] + v[0] / l * 1.4, rp[k][1] + v[1] / l * 1.4]); });
      const v4 = [rp[3][0] - rc[0], rp[3][1] - rc[1]], l4 = Math.hypot(...v4), u = [v4[0] / l4, v4[1] / l4], nn = [-u[1], u[0]]; let p = [rp[3][0] + u[0] * 1.5, rp[3][1] + u[1] * 1.5]; L.push(['C', ...p]);
      const seq = ['O', 'P', 'O', 'P', 'O', 'P', 'O']; seq.forEach((e, k) => { const off = (k % 2 ? .45 : -.45); p = [p[0] + u[0] * 1.55, p[1] + u[1] * 1.55]; L.push([e, p[0] + nn[0] * off, p[1] + nn[1] * off]);
        if (e === 'P') { L.push(['O', p[0] + nn[0] * (off + 1.5), p[1] + nn[1] * (off + 1.5)]); L.push(['O', p[0] - nn[0] * (1.5 - off), p[1] - nn[1] * (1.5 - off)]); } });
      T.atp = [TP(L)]; }
    { const L = [], hd = ['N', 'C', 'C', 'O', 'P', 'O', 'C', 'C']; hd.forEach((e, k) => L.push([e, -1.3 * k, (k % 2) * .75])); L.push(['O', -5.2, 1.55], ['O', -5.2, -1.5], ['C', -9.1, -.75]);
      L.push(['H', 0, -1.0], ['H', .9, .6]);
      for (const sg of [1, -1]) { L.push(['O', -10.4, 1.5 * sg]); for (let i = 0; i < 14; i++) { const x = -11.7 - 1.3 * i, y = sg * (1.5 + (i % 2) * .75) + (sg > 0 && i > 7 ? .5 : 0); L.push(['C', x, y]); if (i % 2 === 0) L.push(['H', x, y + sg * 1.0]); } }
      T.lipid = [TP(L)]; }
    { const L = [], d2r = Math.PI / 180;
      // left: a purine (guanine) = 6-ring fused to a 5-ring; right: a pyrimidine (cytosine) = one 6-ring. Each hangs on a deoxyribose + phosphate.
      { const hc = [-2.5, 0], hx = ['N', 'C', 'C', 'C', 'N', 'C']; // 6-ring vertices at 30°+60k: N1(30) C6(90) C5(150) C4(210) N3(270) C2(330)
        for (let k = 0; k < 6; k++) L.push([hx[k], ...pol(hc[0], hc[1], 1.4, (30 + 60 * k) * d2r)]);
        const pc = [hc[0] - 1.212 - .963, 0]; L.push(['N', ...pol(pc[0], pc[1], 1.19, 108 * d2r)], ['C', ...pol(pc[0], pc[1], 1.19, 180 * d2r)], ['N', ...pol(pc[0], pc[1], 1.19, 252 * d2r)]); // N7, C8, N9
        L.push(['O', ...pol(hc[0], hc[1], 2.65, 90 * d2r)], ['H', ...pol(hc[0], hc[1], 2.4, 30 * d2r)], ['N', ...pol(hc[0], hc[1], 2.75, 330 * d2r)]); // O6, H on N1, NH2 on C2
        const n9 = pol(pc[0], pc[1], 1.19, 252 * d2r), u = [Math.cos(252 * d2r), Math.sin(252 * d2r)], c1 = [n9[0] + u[0] * 1.47, n9[1] + u[1] * 1.47], sc = [c1[0] + u[0] * 1.19, c1[1] + u[1] * 1.19], a0 = Math.atan2(-u[1], -u[0]);
        ['C', 'C', 'C', 'C', 'O'].forEach((e, k) => L.push([e, ...pol(sc[0], sc[1], 1.19, a0 + k * 72 * d2r)]));
        const pp = [sc[0] - 2.4, sc[1] - .6]; L.push(['P', ...pp], ['O', pp[0], pp[1] + 1.5], ['O', pp[0] - 1.45, pp[1] + .2], ['O', pp[0] + .2, pp[1] - 1.45]); }
      { const sg = -1, he = ['N', 'C', 'N', 'C', 'C', 'N'];
        for (let k = 0; k < 6; k++) L.push([he[k], ...pol(-2.5 * sg, 0, 1.4, (60 * k) * d2r)]);
        const sc = -6.3 * sg, sp = ['C', 'C', 'C', 'O', 'C']; for (let k = 0; k < 5; k++) L.push([sp[k], ...pol(sc, 0, 1.19, 180 * d2r + k * 72 * d2r)]);
        L.push(['P', -8.6 * sg, .8 * sg], ['O', -8.6 * sg, 2.3 * sg], ['O', -9.95 * sg, .1 * sg], ['O', -9.0 * sg, -.65 * sg]);
        L.push(['O', ...pol(-2.5 * sg, 0, 2.65, 240 * d2r)], ['H', ...pol(-2.5 * sg, 0, 2.4, 120 * d2r)]); }
      T.dna = [TP(L)]; }
    { const L = []; for (let k = 0; k < 12; k++) { const e = ['N', 'C', 'C'][k % 3], y = (k % 2) * .8; L.push([e, 1.25 * k, y]);
        if (k % 3 === 2) L.push(['O', 1.25 * k, k % 2 ? 2.05 : -1.25]); if (k % 3 === 1) { const yy = k % 2 ? 2.3 : -1.5; L.push(['C', 1.25 * k, yy]); if (k % 6 === 1) L.push(['O', 1.25 * k + .9, yy + (k % 2 ? 1.0 : -1.0)]); }
        if (k % 3 === 0) L.push(['H', 1.25 * k, k % 2 ? 1.8 : -1.0]); } T.aa = [TP(L)]; }
    T.prot = []; for (let v = 0; v < 4; v++) { const R = rng(100 + v), L = []; let tries = 0;
      while (L.length < 46 && tries++ < 3000) { const a = R() * 6.283, rr = Math.sqrt(R()), x = Math.cos(a) * rr * 10, y = Math.sin(a) * rr * 7.5; if (L.some(p => Math.hypot(p[1] - x, p[2] - y) < 1.38)) continue;
        const q_ = R(); L.push([q_ < .52 ? 'C' : q_ < .68 ? 'N' : q_ < .9 ? 'O' : 'H', x, y]); } T.prot.push(TP(L)); }
    return T; }
  let TPL = null;
  const MKEY = { water: 'water', glu: 'glucose', atp: 'atp', lipid: 'lipid', dna: 'basepair', aa: 'peptide', prot: 'protein' };
  const MCOL = { water: '#4ff3e3', glu: '#a8ff6b', atp: '#ffd36b', lipid: '#ffc46b', dna: '#ff78be', aa: '#3dff8a', prot: '#c58cff' };
  const MIX = { cyto: [['water', 44], ['prot', 22], ['glu', 12], ['atp', 12], ['aa', 6]], mito: [['atp', 34], ['water', 30], ['prot', 36]], nuc: [['water', 45], ['prot', 40], ['atp', 15]], nucleolus: [['prot', 55], ['water', 35], ['atp', 10]],
    dna: [['dna', 100]], mem: [['lipid', 100]], ribo: [['aa', 70], ['water', 30]], prot: [['prot', 60], ['water', 40]], lyso: [['prot', 35], ['water', 60]], perox: [['prot', 50], ['water', 45]], lipd: [['lipid', 70]], out: [['water', 40], ['glu', 4]] };
  const TILE = 26 * A; let CACHE = new Map(), cacheTm = null;
  // what is at this exact point? membranes first, then big molecules (macromolecule layer), then the compartment -> keeps the zoom in strict size order
  function regionAt(x, y) {
    { const rho = cellRho(x, y, tm), d = (rho - 1) * Math.hypot(x, y) / Math.max(rho, .01); if (Math.abs(d) < .3) { const o = Math.atan2(y / (RY * RY), x / (RX * RX)); return { k: 'mem', n: 'Cell membrane', s: 'Lipid bilayer', o: o + (d < 0 ? Math.PI : 0) }; } }
    { const nr = nucRho(x, y), dn = (nr - 1) * Math.hypot(x - NUC.x, y - NUC.y) / Math.max(nr, .01); for (const off of [0, 3]) if (Math.abs(dn - off) < .3) { const o = Math.atan2((y - NUC.y) / NUC.ry ** 2, (x - NUC.x) / NUC.rx ** 2); return { k: 'mem', n: 'Nucleus', s: 'Nuclear envelope', o: o + (dn - off < 0 ? Math.PI : 0) }; } }
    for (const [k, o] of D.G.at(x, y)) if (k === 'mito') { const P_ = o.pts.map(p => [p[0] + o.ox, p[1] + o.oy]), [dd, i, u] = polyD(P_, x, y);
      for (const rr of [o.w / 2, o.w / 2 - 2]) if (Math.abs(dd - rr) < .3) { const a = P_[i - 1], b = P_[i], qx = a[0] + (b[0] - a[0]) * u, qy = a[1] + (b[1] - a[1]) * u; return { k: 'mem', n: 'Mitochondrion', s: 'Mitochondrial membrane', o: Math.atan2(y - qy, x - qx) + (dd < rr ? Math.PI : 0) }; } }
    const g = compAt(x, y), tl = macroTile(Math.floor(x / TM), Math.floor(y / TM));
    for (const ch of tl.nuc) for (let k = 0; k < ch.length; k++) { const b = ch[k]; if (Math.hypot(x - b.x, y - b.y) < .58) { const nb = ch[k + 1] || ch[k - 1] || b; return { k: 'dna', n: 'Nucleus', s: 'Nucleosome › DNA', o: Math.atan2(nb.y - b.y, nb.x - b.x) + Math.atan2(y - b.y, x - b.x) * 0 + 1.5708 }; } }
    for (const r of tl.rib) if (Math.hypot(x - r.x, y - r.y) < 1.3) return { k: r.sub ? 'prot' : 'ribo', n: g.n, s: 'Ribosome' };
    for (const p of tl.prot) if (Math.hypot(x - p.x, y - p.y) < p.r) return { k: 'prot', n: g.n, s: 'Protein' };
    return g; }
  function mol(i, j) { if(!Number.isSafeInteger(i)||!Number.isSafeInteger(j))return null; if (cacheTm !== tm) { CACHE.clear(); cacheTm = tm; } const key = i + ',' + j; let m = CACHE.get(key); if (m !== undefined) return m;
    const cxw = (i + .5) * TILE, cyw = (j + .5) * TILE, R = rng(((i * 73856093) ^ (j * 19349663)) | 0), g = regionAt(cxw, cyw);
    let roll = R() * 100, type = null; for (const [tp, w] of MIX[g.k]) { if ((roll -= w) < 0) { type = tp; break; } }
    if (!type) { CACHE.set(key, null); return null; }
    const vs = TPL[type], tp = vs[(R() * vs.length) | 0], ang = Number.isFinite(g.o) ? g.o + (R() - .5) * .3 : R() * 6.283, X = cxw + (R() - .5) * TILE * .55, Y = cyw + (R() - .5) * TILE * .55, c = Math.cos(ang), s_ = Math.sin(ang);
    const tf = ([e, ax, ay]) => ({ e, x: X + (ax * c - ay * s_) * A, y: Y + (ax * s_ + ay * c) * A, sd: (ax * 7.1 + ay * 3.3) });
    m = { type, key: MKEY[type], col: MCOL[type], x: X, y: Y, r: tp.r, at: tp.at.map(tf), bd: tp.bd, co: tp.co.map(tf) };
    if (CACHE.size > 12000) CACHE.clear(); CACHE.set(key, m); return m; }
  function tilesInView(pad) { const [x0, y0] = s2w(-pad, -pad), [x1, y1] = s2w(VW() + pad, VH() + pad); return [Math.floor(x0 / TILE), Math.floor(y0 / TILE), Math.floor(x1 / TILE), Math.floor(y1 / TILE)]; }
  const S2 = (x, y) => [(x - cam.x) * cam.z + VW() / 2 + offs[0], (y - cam.y) * cam.z + VH() / 2 + offs[1]];
  // DNA double helix inside the nucleus: 2 nm wide, one turn per 3.4 nm (10.5 base pairs), base pairs 0.34 nm apart
  let HXN = 0; const BASEC = ['#ff5a7a', '#5ad1ff', '#ffd36b', '#7dff8a']; // A T G C
  function helixHit(wx, wy) { if (nucRho(wx, wy) > .98) return null; const RH = 1.6, slop = 8 / cam.z;
    for (let j = Math.floor(wy / RH) - 1; j <= Math.floor(wy / RH) + 1; j++) { const R = rng(j * 7919 + 3), yb = j * RH + .5 + R() * .6, ph = R() * 9, y = yb + .25 * Math.sin(wx / 2.3 + ph);
      if (Math.abs(wy - y) < .14 + slop) return ['dna', wx, y, .6]; } return null; }
  function drawHelix() { const z = cam.z; HXN = 0; const al = sm(170, 240, z) * (1 - sm(450, 800, z)); if (al <= .01 || compAt(cam.x, cam.y).k !== 'nuc') return;
    const [wx0, wy0] = s2w(-40, -40), [wx1, wy1] = s2w(VW() + 40, VH() + 40), RH = 1.6, S = (x, y) => [(x - cam.x) * z + VW() / 2 + offs[0], (y - cam.y) * z + VH() / 2 + offs[1]];
    for (let j = Math.floor(wy0 / RH); j <= Math.floor(wy1 / RH); j++) { const R = rng(j * 7919 + 3), yb = j * RH + .5 + R() * .6, ph = R() * 9, yy = x => yb + .25 * Math.sin(x / 2.3 + ph);
      if (nucRho(cam.x, yb) > .98) continue; HXN++; const st = .0340, i0 = Math.floor(wx0 / st), i1 = Math.ceil(wx1 / st), Rw = .1, k = 6.2832 / .34;
      cx.globalAlpha = al; for (let i = i0; i <= i1; i++) { const x = i * st, y = yy(x), a = Math.sin(x * k) * Rw, b = Math.sin(x * k + 2.4) * Rw, h = (((i * 2654435761) ^ (j * 40503)) >>> 0) % 4; const [sx, s1] = S(x, y + a), [, s2] = S(x, y + b);
        cx.strokeStyle = BASEC[h]; cx.lineWidth = Math.max(1, .012 * z); cx.beginPath(); cx.moveTo(sx, s1); cx.lineTo(sx, (s1 + s2) / 2); cx.stroke(); cx.strokeStyle = BASEC[[1, 0, 3, 2][h]]; cx.beginPath(); cx.moveTo(sx, (s1 + s2) / 2); cx.lineTo(sx, s2); cx.stroke(); }
      for (const [off, col] of [[0, '#ff9ad6'], [2.4, '#b48cff']]) { cx.beginPath(); for (let x = Math.floor(wx0 / st) * st; x <= wx1; x += st / 2) { const [sx, sy] = S(x, yy(x) + Math.sin(x * k + off) * Rw); x === Math.floor(wx0 / st) * st ? cx.moveTo(sx, sy) : cx.lineTo(sx, sy); } cx.strokeStyle = col; cx.lineWidth = Math.max(2, .03 * z); cx.stroke(); } }
    cx.globalAlpha = 1; }
  function drawDeep() {
    const z = cam.z, ma = sm(110, 190, z); if (ma <= .01) return;
    const apx = A * z, [i0, j0, i1, j1] = tilesInView(60); if ((i1 - i0 + 1) * (j1 - j0 + 1) > 9000) return;
    const coarseA = ma * (1 - sm(330, 560, z)), atomA = ma * sm(330, 560, z), W_ = VW(), H_ = VH();
    if (coarseA > .01) { cx.globalCompositeOperation = 'lighter'; const sz = Math.max(3, 2.4 * apx) * 2.2;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const m = mol(i, j); if (!m) continue; const spr = glowS(m.col); cx.globalAlpha = coarseA * (m.type === 'water' ? .5 : .85);
        if (apx < 1.6 / Q) { const [sx, sy] = S2(m.x, m.y), k = Math.max(sz, m.r * apx * 1.6); cx.drawImage(spr, sx - k / 2, sy - k / 2, k, k); continue; }
        for (const a of m.co) { const [sx, sy] = S2(a.x, a.y); cx.drawImage(spr, sx - sz / 2, sy - sz / 2, sz, sz); } }
      cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; }
    if (atomA > .01) { const inside = [];
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        // Skip invisible tile generation, but retain the possible atomic envelope
        // of a large rotated molecule. Visible geometry remains deterministic.
        const tx=(i+.5)*TILE,ty=(j+.5)*TILE,envelope=(25*A*apx)+(TILE+3*A)*z/Math.SQRT2+60;
        if(tx<cam.x-envelope||tx>cam.x+envelope||ty<cam.y-envelope||ty>cam.y+envelope)continue;
        const m = mol(i, j); if (!m) continue;
        const [mx, my] = S2(m.x, m.y), mr = m.r * apx + 30; if (mx < -mr || my < -mr || mx > W_ + mr || my > H_ + mr) continue;
        if (apx < 70) { cx.globalAlpha = atomA * Math.min(1, (70 - apx) / 30); cx.lineCap = 'round'; cx.lineWidth = Math.max(1, Math.min(.28 * apx, 14)); cx.strokeStyle = 'rgba(200,225,245,.55)'; cx.beginPath();
          for (const [p, q2] of m.bd) { const a = m.at[p], b = m.at[q2], [ax, ay] = S2(a.x, a.y), [bx, by] = S2(b.x, b.y); cx.moveTo(ax, ay); cx.lineTo(bx, by); } cx.stroke();
          if (m.type === 'dna' && apx > 6) { cx.setLineDash([4, 4]); cx.lineWidth = 1.2; cx.strokeStyle = 'rgba(255,211,107,.6)'; cx.beginPath(); const a = S2(m.at[2].x, m.at[2].y), b = S2(m.at[2].x, m.at[2].y); cx.stroke(); cx.setLineDash([]); } }
        for (const a of m.at) { const e = EL[a.e], R = e.r * apx, [sx, sy] = S2(a.x, a.y); if (sx < -R * 2 || sy < -R * 2 || sx > W_ + R * 2 || sy > H_ + R * 2) continue;
          const ia = R > 90 ? Math.min(1, (R - 90) / 150) : 0; if (ia > 0) inside.push([a, R, sx, sy, ia]);
          if (ia < 1) { cx.globalAlpha = atomA * (1 - ia); const k = R * SK; cx.drawImage(sphereS(e.c), sx - k, sy - k, 2 * k, 2 * k);
            if (R >= 13 && R < 160) { cx.globalAlpha = atomA * (1 - ia) * .9; cx.font = `700 ${Math.min(22, R * .7).toFixed(0)}px system-ui,sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#04060f'; cx.fillText(a.e, sx, sy + 1); } } } }
      cx.globalAlpha = 1; for (const it of inside) atomInside(...it); }
    cx.globalAlpha = 1; }
  function atomInside(a, R, sx, sy, al) { const e = EL[a.e];
    if (!e || ![R,sx,sy,al].every(Number.isFinite) || R < 0) return;
    cx.globalAlpha = al; let g = cx.createRadialGradient(sx, sy, 0, sx, sy, R * 1.5); g.addColorStop(0, e.c + '50'); g.addColorStop(.45, e.c + '22'); g.addColorStop(1, e.c + '00'); cx.fillStyle = g; cx.beginPath(); cx.arc(sx, sy, R * 1.5, 0, 6.283); cx.fill();
    // electron "cloud": where an electron is likely to be found (twinkling dots)
    const Rr = rng(Math.abs(Math.round(a.sd * 1000)) + 7); cx.globalCompositeOperation = 'lighter'; const spr = glowS('#9ff5ea');
    for (let k = 0; k < 170; k++) { const u1 = Rr() || 1e-6, u2 = Rr(), rr = Math.sqrt(-2 * Math.log(u1)) * .42 * R, an = u2 * 6.283 + t * .05 * (k % 2 ? 1 : -1); const tw = .35 + .65 * Math.abs(Math.sin(t * 1.3 + k * 1.7));
      const x = sx + Math.cos(an) * rr, y = sy + Math.sin(an) * rr, sz = 5 + (k % 3) * 2; cx.globalAlpha = al * .5 * tw; cx.drawImage(spr, x - sz / 2, y - sz / 2, sz, sz); }
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = al * .35; cx.setLineDash([3, 7]); cx.lineWidth = 1; cx.strokeStyle = '#9ff5ea';
    for (const f of (e.p > 2 ? [.35, .75] : [.6])) { cx.beginPath(); cx.arc(sx, sy, R * f, 0, 6.283); cx.stroke(); } cx.setLineDash([]);
    // nucleus: protons (orange-red) and neutrons (blue-grey), drawn MUCH bigger than real
    const Rn = Math.max(5, R * .05), n = e.p + e.n, ns = Rn / Math.sqrt(n) * 1.25; cx.globalAlpha = al; const glo = Rn * 4; cx.drawImage(glowS('#ffd36b'), sx - glo, sy - glo, glo * 2, glo * 2);
    for (let k = 0; k < n; k++) { const rr = Rn * Math.sqrt((k + .5) / n), an = k * 2.39996; const x = sx + Math.cos(an) * rr, y = sy + Math.sin(an) * rr, kk = ns * SK;
      cx.drawImage(sphereS((k * 7) % n < e.p ? '#ff7a5a' : '#9fb3c8'), x - kk, y - kk, kk * 2, kk * 2); }
    if (R > 260) { cx.globalAlpha = al * .85; cx.font = '600 12px system-ui,sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#e8f4ff'; cx.fillText(`${e.nm} nucleus · ${e.p} proton${e.p > 1 ? 's' : ''}${e.n ? ', ' + e.n + ' neutrons' : ''}`, sx, sy + Rn + ns + 18);
      cx.fillStyle = '#a8b9d2'; cx.fillText('(really ~100,000× smaller than the atom)', sx, sy + Rn + ns + 34); }
    cx.globalAlpha = 1; }
  function deepLabels() { const z = cam.z; if (z < 200 || z > 1400) return; const apx = A * z, [ci, cj] = [Math.floor(cam.x / TILE), Math.floor(cam.y / TILE)], ms = [];
    for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) { const m = mol(i, j); if (m) ms.push(m); }
    ms.sort((a, b) => Math.hypot(a.x - cam.x, a.y - cam.y) - Math.hypot(b.x - cam.x, b.y - cam.y)); const seen = new Set(); let n = 0;
    cx.font = '600 13px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const m of ms) { if (n >= 3 || seen.has(m.type)) continue; seen.add(m.type); n++; const [sx, sy0] = S2(m.x, m.y), sy = sy0 - m.r * apx - 14, txt = P[m.key].n, w = cx.measureText(txt).width + 16;
      if (sy < TOP() + 30) continue; cx.globalAlpha = Math.min(1, sm(200, 280, z) * (1 - sm(800, 1400, z)) * 1.2); cx.fillStyle = 'rgba(6,12,28,.8)'; cx.strokeStyle = m.col + '99'; cx.lineWidth = 1; cx.beginPath(); cx.roundRect ? cx.roundRect(sx - w / 2, sy - 11, w, 22, 11) : cx.rect(sx - w / 2, sy - 11, w, 22); cx.fill(); cx.stroke(); cx.fillStyle = '#e8f4ff'; cx.fillText(txt, sx, sy + .5); }
    cx.globalAlpha = 1; }
  function deepHit(wx, wy) { const z = cam.z, apx = A * z, slop = 14 / z, i = Math.floor(wx / TILE), j = Math.floor(wy / TILE); let best = null, bd = 1e9;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const m = mol(i + di, j + dj); if (!m) continue;
      if (apx >= 3) { for (const a of m.at) { const d = Math.hypot(wx - a.x, wy - a.y) - EL[a.e].r * A; if (d < slop && d < bd) { bd = d; best = [m, a]; } } }
      else for (const a of m.co) { const d = Math.hypot(wx - a.x, wy - a.y) - 2.4 * A; if (d < slop && d < bd) { bd = d; best = [m, null]; } } }
    if (!best) return null; const [m, a] = best;
    if (!a || apx < 9) return [m.key, m.x, m.y, Math.max(m.r, 12) * A];
    const ra = EL[a.e].r * A, R = EL[a.e].r * apx;
    if (R > 90) { const dn = Math.hypot(wx - a.x, wy - a.y); return dn < Math.max(9 / z, ra * .08) ? ['anuc', a.x, a.y, ra * .12] : ['cloud', a.x, a.y, ra * 1.25]; }
    return ['el' + a.e, a.x, a.y, ra * 6]; }
  function nearestAtom(wx, wy) { const i = Math.floor(wx / TILE), j = Math.floor(wy / TILE); let b = null, bd = 1e9;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const m = mol(i + di, j + dj); if (m) for (const a of m.at) { const d = Math.hypot(wx - a.x, wy - a.y); if (a.e !== 'H' && d < bd) { bd = d; b = a; } } }
    return b && { x: b.x, y: b.y, e: b.e, r: EL[b.e].r * A }; }

  // ---------- macromolecule layer (proteins, ribosomes, nucleosomes, ATP synthase) ----------
  // Built per 100 nm tile, from what compartment the tile sits in. Positions are a frozen snapshot (real proteins move ~1 µm in 0.1 s).
  const TM = 10; let MC = new Map(), mcTm = null;
  function compAt(x, y) {
    if (cellRho(x, y, tm) > 1) return { k: 'out', n: 'Outside the cell', s: 'Tissue fluid' };
    if (nucRho(x, y) < 1) { for (const n of NUCL) if (Math.hypot(x - n.x, y - n.y) < n.r) return { k: 'nucleolus', n: 'Nucleolus', s: 'Ribosome parts' }; return { k: 'nuc', n: 'Nucleus', s: 'Chromatin' }; }
    for (const [k, o] of D.G.at(x, y)) {
      if (k === 'mito') { const P_ = o.pts.map(p => [p[0] + o.ox, p[1] + o.oy]), [dd] = polyD(P_, x, y); if (dd < o.w / 2) return { k: 'mito', n: 'Mitochondrion', s: 'Matrix & cristae', o, dd }; }
      else if ((k === 'lyso' || k === 'perox' || k === 'lipd') && Math.hypot(x - o.x - o.ox, y - o.y - o.oy) < o.r) return { k, n: P[k].n, s: k === 'lipd' ? 'Stored fat' : 'Enzymes', o }; }
    for (const [k, o] of D.G.at(x, y)) if (k === 'golgi' && Math.hypot(x - o.x, y - o.y) < 90) return { k: 'cyto', n: 'Golgi apparatus', s: 'Cisternae' };
    return { k: 'cyto', n: 'Cytosol', s: 'Crowded fluid' };
  }
  const PCOL = { cyto: ['#8fb4ff', '#b49cff', '#7fe3d8', '#ffc98a', '#9fd8ff'], nuc: ['#7aa2ff', '#c59cff'], nucleolus: ['#ff9ad6', '#ffc0e6'], mito: ['#ffc46b', '#ffa53d', '#ffe0a0'], lyso: ['#ff7ac4'], perox: ['#6bff9f'], out: ['#9fb3c8'], lipd: ['#fff2c8'] };
  const PN = { cyto: 30, nuc: 12, nucleolus: 34, mito: 38, lyso: 18, perox: 26, out: 3, lipd: 0 }; // per (100 nm)² tile: ~1/8 of real crowding, so you can see between them
  function macroTile(i, j) {
    if (mcTm !== tm) { MC.clear(); mcTm = tm; } const key = i + ',' + j; let t_ = MC.get(key); if (t_) return t_;
    const x0 = i * TM, y0 = j * TM, R = rng(((i * 92837111) ^ (j * 689287499)) | 0), g = compAt(x0 + TM / 2, y0 + TM / 2), cols = PCOL[g.k] || PCOL.cyto;
    t_ = { g, prot: [], rib: [], nuc: [], atps: [] }; const r_ = (a, b) => a + R() * (b - a), inT = m => [x0 + m + R() * (TM - 2 * m), y0 + m + R() * (TM - 2 * m)];
    if (g.k === 'nuc') for (let c = 0; c < 2; c++) { let [x, y] = inT(1.5), h = R() * 6.28; const ch = [];
      for (let k = 0; k < 7; k++) { ch.push({ x, y, a: R() * 6.28 }); h += (R() - .5) * 1.6; const nx = x + Math.cos(h) * 1.7, ny = y + Math.sin(h) * 1.7; if (nx < x0 + .7 || ny < y0 + .7 || nx > x0 + TM - .7 || ny > y0 + TM - .7) { h += 2.5; continue; } x = nx; y = ny; }
      t_.nuc.push(ch); }
    if ((g.k === 'cyto' && R() < .6) || g.k === 'nucleolus') { const [x, y] = inT(1.5); t_.rib.push({ x, y, a: R() * 6.28, ph: R() * 400, sub: g.k === 'nucleolus' }); }
    if (g.k === 'mito' && g.o && g.o.pts) { const m = g.o, P_ = m.pts.map(p => [p[0] + m.ox, p[1] + m.oy]); // ATP synthase sits on the cristae folds, in rows
      for (let i = 1; i < P_.length; i++) { const [ax, ay] = P_[i - 1], [bx, by] = P_[i], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L, n = Math.floor(L / 13);
        for (let k = 0; k < n; k++) { const u = (k + .5) / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, sg = ((k + i) % 2 ? 1 : -1), h = (m.w / 2 - 2.5), l = h * (.55 + .35 * Math.sin(k * 1.9 + m.ph));
          for (let t = 1.2; t < l; t += 1.6) for (const side of [-1.5, 1.5]) { const px_ = x + nx * (h - t) * sg + (bx - ax) / L * side, py = y + ny * (h - t) * sg + (by - ay) / L * side; if (px_ >= x0 && px_ < x0 + TM && py >= y0 && py < y0 + TM) t_.atps.push({ x: px_, y: py, a: R() * 6.28 }); } } } }
    const N = Math.round((PN[g.k] || 0) * (.7 + R() * .6));
    for (let k = 0; k < N; k++) { const r = Math.pow(R(), 2.2) * .4 + .12, [x, y] = inT(r + .05); if (t_.rib.some(b => Math.hypot(b.x - x, b.y - y) < 1.4 + r) || t_.nuc.some(c => c.some(b => Math.hypot(b.x - x, b.y - y) < .7 + r))) continue; t_.prot.push({ x, y, r, c: cols[(R() * cols.length) | 0], v: (R() * 4) | 0, a: R() * 6.28 }); }
    if (MC.size > 6000) MC.clear(); MC.set(key, t_); return t_;
  }
  const protS = (col, v) => sprite('p' + col + v, 64, (g, s) => { const R = rng(31 + v * 7), c = s / 2; for (let k = 0; k < 7; k++) { const a = R() * 6.28, rr = R() * 9, r = 9 + R() * 7, x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    const gr = g.createRadialGradient(x - r * .35, y - r * .4, 1, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, col); gr.addColorStop(1, col + '30'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } });
  function drawMacro(alpha) {
    const z = cam.z, W_ = VW(), H_ = VH(); if (alpha <= .01) return; const [wx0, wy0] = s2w(-20, -20), [wx1, wy1] = s2w(W_ + 20, H_ + 20);
    const i0 = Math.floor(wx0 / TM), j0 = Math.floor(wy0 / TM), i1 = Math.floor(wx1 / TM), j1 = Math.floor(wy1 / TM); if ((i1 - i0 + 1) * (j1 - j0 + 1) > 2600) return;
    const S = (x, y) => [(x - cam.x) * z + W_ / 2 + offs[0], (y - cam.y) * z + H_ / 2 + offs[1]], T_ = simT;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const tl = macroTile(i, j);
      // nucleosomes: histone spools (11 nm) on linker DNA (2 nm)
      // beads on a string (v8 look): the 2 nm double helix as two twisted strands (one turn per 3.4 nm), through 11 nm histone beads
      for (const ch of tl.nuc) { cx.globalAlpha = alpha * .95; cx.lineWidth = Math.max(1.6, .06 * z); const tw = z > 14;
        for (const [ph, col] of [[0, '#ff8ad8'], [2.4, '#4ff3e3']]) { cx.beginPath(); let u = 0;
          for (let k = 1; k < ch.length; k++) { const a = ch[k - 1], b = ch[k], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1), n = tw ? Math.max(2, Math.ceil(L / .04)) : 1;
            for (let q = 0; q <= n; q++) { const f = q / n, o = tw ? .1 * Math.sin((u + f * L) * 18.48 + ph) : 0, [sx, sy] = S(a.x + (b.x - a.x) * f + nx * o, a.y + (b.y - a.y) * f + ny * o); (k === 1 && q === 0) ? cx.moveTo(sx, sy) : cx.lineTo(sx, sy); } u += L; }
          cx.strokeStyle = col; cx.stroke(); }
        for (const b of ch) { const [sx, sy] = S(b.x, b.y), k = .55 * z * SK; cx.globalAlpha = alpha * .6; cx.drawImage(sphereS('#9a7cff'), sx - k, sy - k, 2 * k, 2 * k); cx.globalAlpha = alpha * .95; if (z > 60) { cx.beginPath(); cx.ellipse(sx, sy, .58 * z, .3 * z, b.a, 0, 6.283); cx.lineWidth = .2 * z; cx.strokeStyle = '#ff78be'; cx.stroke(); } } }
      // proteins (3–8 nm blobs)
      for (const p of tl.prot) { const [sx, sy] = S(p.x, p.y), k = p.r * z * 1.25; if (k < .6) continue; cx.globalAlpha = alpha * .85; cx.drawImage(protS(p.c, p.v), sx - k, sy - k, 2 * k, 2 * k); }
      // ribosomes: large (60S) + small (40S) subunit, mRNA thread, and the new protein chain growing at ~5.6 amino acids per second
      for (const r of tl.rib) { const [sx, sy] = S(r.x, r.y), c = Math.cos(r.a), s_ = Math.sin(r.a); cx.globalAlpha = alpha;
        if (!r.sub) { cx.beginPath(); cx.moveTo(sx - c * 3.2 * z, sy - s_ * 3.2 * z); cx.lineTo(sx + c * 3.2 * z, sy + s_ * 3.2 * z); cx.lineWidth = Math.max(1, .15 * z); cx.strokeStyle = '#ff4d5e'; cx.stroke();
          const n = Math.floor((T_ * RATE.aaPerSec + r.ph) % 400), Lc = Math.min(n, 120); cx.beginPath(); let x = sx - s_ * 1.2 * z, y = sy + c * 1.2 * z; cx.moveTo(x, y); const st = .035 * z * 2.2;
          for (let k = 0; k < Lc; k++) { const a = r.a + 1.5708 + Math.sin(k * .7 + r.ph) * 1.1; x += Math.cos(a) * st; y += Math.sin(a) * st; cx.lineTo(x, y); } cx.lineWidth = Math.max(.8, .06 * z); cx.strokeStyle = '#3dff8a'; cx.stroke();
          if (n > 120) { const k = Math.min(1.2, (n - 120) / 280 * 1.2 + .3) * z; cx.drawImage(protS('#3dff8a', 1), x - k, y - k, 2 * k, 2 * k); } }
        let k = 1.25 * z * SK; cx.drawImage(sphereS('#ffd36b'), sx - k + s_ * .35 * z, sy - k - c * .35 * z, 2 * k, 2 * k); k = .9 * z * SK; cx.drawImage(sphereS('#7ff0e3'), sx - k - s_ * .8 * z, sy - k + c * .8 * z, 2 * k, 2 * k); }
      // ATP synthase on cristae: 10 nm rotor, ~130 turns a second (shown as a blur ring + one marker, sampled)
      for (const a of tl.atps) { const [sx, sy] = S(a.x, a.y), k = .5 * z; if (sx < -k || sy < -k || sx > W_ + k || sy > H_ + k) continue; cx.globalAlpha = alpha; cx.beginPath(); cx.arc(sx, sy, k, 0, 6.283); cx.fillStyle = 'rgba(255,211,107,.35)'; cx.fill(); cx.lineWidth = Math.max(1, .1 * z); cx.strokeStyle = '#ffd36b'; cx.stroke();
        const an = (T_ * RATE.atpsRev % 1) * 6.283 + a.a; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx + Math.cos(an) * k, sy + Math.sin(an) * k); cx.stroke(); } }
    // filaments at true size: microtubule 25 nm (13 protofilaments, 8 nm tubulin dimers), actin 7 nm (two twisted strands)
    if (z > 15) { const ma = alpha * sm(15, 30, z); cx.globalAlpha = ma; for (const m of D.mts) { const n = Math.min(m.pts.length, Math.floor(m.len / 25) + 1); for (let i = 1; i < n; i++) { const a = m.pts[i - 1], b = m.pts[i]; if (!vis((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 20)) continue;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
        for (let p = 0; p < 7; p++) { const o = (p / 6 - .5) * 2.2; const [sx, sy] = S(a[0] + nx * o, a[1] + ny * o), [ex, ey] = S(b[0] + nx * o, b[1] + ny * o); cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.lineWidth = Math.max(.6, .26 * z); cx.strokeStyle = p % 2 ? '#2fbfb2' : '#7ff0e3'; cx.stroke(); }
        if (z > 60) for (let s = 0; s < L; s += .8) { const [sx, sy] = S(a[0] + ux * s - nx * 1.1, a[1] + uy * s - ny * 1.1), [ex, ey] = S(a[0] + ux * s + nx * 1.1, a[1] + uy * s + ny * 1.1); if (sx < -50 || sx > W_ + 50 || sy < -50 || sy > H_ + 50) continue; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.lineWidth = 1; cx.strokeStyle = (Math.round(s / .8) % 2) ? 'rgba(3,20,26,.8)' : 'rgba(3,20,26,.35)'; cx.stroke(); } } }
      if (z > 30) for (const f of D.fibres) { if (segD(cam.x, cam.y, ...f.p0, ...f.p1)[0] > f.w + 3000 / z) continue; const dx = f.p1[0] - f.p0[0], dy = f.p1[1] - f.p0[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, nF = Math.round(f.w / 1.6);
        const [, u] = segD(cam.x, cam.y, ...f.p0, ...f.p1), s0 = Math.max(0, u * L - 1000 / z), s1 = Math.min(L, u * L + 1000 / z);
        for (let k = 0; k < nF; k++) { const o = (k / (nF - 1) - .5) * f.w + Math.sin(k * 2.1) * .35; for (let s = Math.floor(s0 / .55) * .55; s < s1; s += .55) { const st = Math.round(s / .55), tw = Math.sin(s / 3.7 * 3.1416) * .17, [sx, sy] = S(f.p0[0] + ux * s + nx * (o + (st % 2 ? tw : -tw)), f.p0[1] + uy * s + ny * (o + (st % 2 ? tw : -tw)));
          if (sx < -30 || sx > W_ + 30 || sy < -30 || sy > H_ + 30) continue; const kk = .27 * z * SK; cx.drawImage(sphereS(st % 2 ? '#c58cff' : '#a070ff'), sx - kk, sy - kk, 2 * kk, 2 * kk); } } }
      cx.globalAlpha = 1; }
    // membranes at true thickness: two layers of lipids, 5 nm in all
    if (z > 12) { const ma = alpha * sm(12, 25, z); cx.globalAlpha = ma; const lw = Math.max(1, .14 * z);
      const band = (pts) => { for (const o of [-.2, .2]) { cx.beginPath(); pts.forEach(([x, y, nx, ny], k) => { const [sx, sy] = S(x + nx * o, y + ny * o); k ? cx.lineTo(sx, sy) : cx.moveTo(sx, sy); }); cx.lineWidth = lw; cx.strokeStyle = '#ffd36b'; cx.stroke(); } };
      const [cxw, cyw] = [cam.x, cam.y], span = 1600 / z;
      { const a0 = Math.atan2(cyw / RY, cxw / RX), pts = []; const da = span / (RX * 1.2) / 60; for (let k = -60; k <= 60; k++) { const a = a0 + k * da, [x, y] = memPt(a, tm), gx = x / (RX * RX), gy = y / (RY * RY), gl = Math.hypot(gx, gy); pts.push([x, y, gx / gl, gy / gl]); } band(pts); }
      for (const off of [0, 3]) { const a0 = Math.atan2((cyw - NUC.y) / NUC.ry, (cxw - NUC.x) / NUC.rx), pts = [], da = span / NUC.rx / 60; for (let k = -60; k <= 60; k++) { const a = a0 + k * da, x = NUC.x + Math.cos(a) * (NUC.rx + off), y = NUC.y + Math.sin(a) * (NUC.ry + off), gx = (x - NUC.x) / NUC.rx ** 2, gy = (y - NUC.y) / NUC.ry ** 2, gl = Math.hypot(gx, gy); pts.push([x, y, gx / gl, gy / gl]); } band(pts); }
      cx.globalAlpha = 1; }
  }

  // ---------- frame ----------
  let VIG = null, vigKey = '';
  function vignette(w, h) { const k = w + 'x' + h; if (k !== vigKey) { vigKey = k; VIG = cx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .4, w / 2, h / 2, Math.hypot(w, h) * .62); VIG.addColorStop(0, 'rgba(2,4,10,0)'); VIG.addColorStop(1, 'rgba(2,4,10,.55)'); }
    cx.fillStyle = VIG; cx.fillRect(0, 0, w, h); }
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    fpsN++; if (now - fpsT > 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; root.dataset.fps = fps.toFixed(0); }
    if (anim) { let u = Math.min(1, (now - anim.s) / anim.ms); const e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const lz = Math.log(anim.f.z) + (Math.log(anim.t.z) - Math.log(anim.f.z)) * e, zz = Math.exp(lz), k = (1 / zz - 1 / anim.f.z) / ((1 / anim.t.z - 1 / anim.f.z) || 1e-30); // move in step with the zoom so the target never leaves the screen
      const kk = Math.abs(anim.t.z - anim.f.z) / anim.f.z < 1e-6 ? e : Math.max(0, Math.min(1, k));
      cam.x = anim.f.x + (anim.t.x - anim.f.x) * kk; cam.y = anim.f.y + (anim.t.y - anim.f.y) * kk; cam.z = zz;
      offs = [anim.f.o0 + (anim.o[0] - anim.f.o0) * e, anim.f.o1 + (anim.o[1] - anim.f.o1) * e]; if (u >= 1) { cam.x = anim.t.x; cam.y = anim.t.y; cam.z = anim.t.z; anim = null; } }
    if (!paused) advance(dt * speed); else if (cam.z < 6) tm = simT;
    adapt(now);
    const dpr = Math.min(mob() ? 1.5 : 2, devicePixelRatio || 1) * (Q < .5 ? .8 : 1), w = VW(), h = VH();
    if (![cam.x,cam.y,cam.z,offs[0],offs[1],dpr,w,h].every(Number.isFinite) || w <= 0 || h <= 0) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
    const [x0, y0] = s2w(0, 0), [x1, y1] = s2w(w, h); VB = [x0, y0, x1, y1]; const z = cam.z;
    const ca = 1 - sm(60, 140, z);
    if (ca > .01 && vis(0, 0, RX * 1.3)) { cx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 + offs[0] - cam.x * z), dpr * (h / 2 + offs[1] - cam.y * z)); cx.globalAlpha = ca; drawCell(z); cx.globalAlpha = 1; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    drawMacro(sm(8, 16, z) * (1 - sm(130, 230, z))); drawDeep(); drawHelix(); vignette(w, h);
    if (z > .03 && z < 150) labels(); deepLabels(); scale(); crumb(); status();
  }
  // ---------- labels (one per kind, shown when its size on screen suits the zoom) ----------
  function nearestOf(arr, f) { let b = null, bd = 1e18; for (const a of arr) { const [x, y] = f(a), dd = (x - cam.x) ** 2 + (y - cam.y) ** 2; if (dd < bd) { bd = dd; b = a; } } return b; }
  function labels() {
    const z = cam.z, L = [];
    const add = (id, x, y, r, min = 22, max = 900) => { if (x == null) return; const s = r * z; if (s < min || s > max) return; const [X, Y] = w2s(x, y); if (X < 20 || Y < TOP() + 10 || X > VW() - 20 || Y > VH() - 50) return; L.push([id, X, Y]); };
    add('cell', 0, -RY * .95, RX, 60, 4000); add('nucleus', NUC.x, NUC.y + NUC.ry * .6, NUC.ry, 40, 900);
    { const n = nearestOf(NUCL, n => [n.x, n.y]); add('nucleolus', n.x, n.y, n.r, 50, 900); }
    { const m = nearestOf(D.mitos.filter(lodOk), m => [m.pts[0][0] + m.ox, m.pts[0][1] + m.oy]); m && add('mito', m.pts[0][0] + m.ox, m.pts[0][1] + m.oy - 40, m.L / 2, 30, 900); }
    { const g = nearestOf(D.golgi, g => [g.x, g.y]); add('golgi', g.x, g.y - 40, 300, 50, 1200); }
    { const e = nearestOf(D.erNodes, e => e); add('er', e[0], e[1], 120, 50, 900); }
    { const l = nearestOf(D.lyso.filter(lodOk), l => [l.x + l.ox, l.y + l.oy]); add('lyso', l.x + l.ox, l.y + l.oy + l.r + 12 / z, l.r, 14, 600); }
    { const l = nearestOf(D.perox.filter(lodOk), l => [l.x + l.ox, l.y + l.oy]); add('perox', l.x + l.ox, l.y + l.oy + l.r + 12 / z, l.r, 14, 600); }
    { const l = nearestOf(D.lipd, l => [l.x + l.ox, l.y + l.oy]); add('lipd', l.x + l.ox, l.y + l.oy + l.r + 12 / z, l.r, 20, 700); }
    add('cent', CENT.x, CENT.y + 40, 40, 25, 700);
    { const f = nearestOf(D.fibres, f => [(f.p0[0] + f.p1[0]) / 2, (f.p0[1] + f.p1[1]) / 2]); if (f) { const [, u] = segD(cam.x, cam.y, ...f.p0, ...f.p1); add('actin', f.p0[0] + (f.p1[0] - f.p0[0]) * u, f.p0[1] + (f.p1[1] - f.p0[1]) * u, 60, 40, 1500); } }
    { const m = D.mts[5]; if (m && m.len > 400) { const [x, y] = mtPos(m, Math.min(m.len, 600)); add('mt', x, y, 60, 50, 3000); } }
    { const a = Math.atan2(cam.y / RY, cam.x / RX), p = memPt(a, tm); add('membrane', p[0], p[1], 120, 20, 5000); }
    if (z > 9) { const tl = macroTile(Math.floor(cam.x / TM), Math.floor(cam.y / TM)); if (tl.rib[0]) add('rib', tl.rib[0].x, tl.rib[0].y - 2, 1.3, 14, 900); if (tl.nuc[0]) add('nucleosome', tl.nuc[0][0].x, tl.nuc[0][0].y - 1, .6, 10, 600); if (tl.atps[0]) add('atps', tl.atps[0].x, tl.atps[0].y - 1, .5, 10, 600); if (tl.prot[0]) add('protein', tl.prot[0].x, tl.prot[0].y - tl.prot[0].r - .3, tl.prot[0].r, 10, 500); }
    cx.font = '600 13px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; const placed = [];
    cx.globalAlpha = sm(.03, .06, z);
    for (const [id, X, Y] of L) { const txt = P[id].n, w = cx.measureText(txt).width + 16; if (placed.some(([a, b, c]) => Math.abs(a - X) < (c + w) / 2 && Math.abs(b - Y) < 24)) continue; placed.push([X, Y, w]);
      cx.fillStyle = 'rgba(6,12,28,.78)'; cx.strokeStyle = 'rgba(79,243,227,.45)'; cx.lineWidth = 1; cx.beginPath(); cx.roundRect ? cx.roundRect(X - w / 2, Y - 11, w, 22, 11) : cx.rect(X - w / 2, Y - 11, w, 22); cx.fill(); cx.stroke();
      cx.fillStyle = '#e8f4ff'; cx.fillText(txt, X, Y + .5); }
    cx.globalAlpha = 1;
  }
  // ---------- breadcrumb, banner, clock ----------
  let crumbTxt = '';
  function crumb() { const z = cam.z; let parts, hintT = 'Tap any part to learn about it · pinch or scroll to zoom';
    { parts = ['Human cell']; const g = regionAt(cam.x, cam.y);
      if (z >= 1.2 && g.k !== 'out') parts.push(g.n); else if (z >= 1.2) parts.push('Outside the cell');
      if (z >= 8 && z < 110) { parts.push('Macromolecules' + (g.s && g.s !== g.n ? ': ' + g.s : '')); hintT = 'Big molecules: proteins, ribosomes, DNA spools (2–30 nm)'; }
      if (z >= 110) { const m = mol(Math.floor(cam.x / TILE), Math.floor(cam.y / TILE)); parts.push('Molecules' + (m ? ': ' + P[m.key].n : '')); hintT = 'Keep zooming: every molecule is made of atoms'; }
      if (z >= 450) { const a = nearestAtom(cam.x, cam.y); parts.push('Atoms' + (a ? ': ' + EL[a.e].nm : '')); hintT = 'Zoom into one atom to look inside it';
        if (a && a.r * z > 90) { parts.push('Inside an atom'); hintT = 'Mostly empty space: a tiny nucleus in a cloud of electrons'; } } }
    const txt = parts.join(' › '); if (txt !== crumbTxt) { crumbTxt = txt; crEl.textContent = txt; } if (hint.textContent !== hintT) hint.textContent = hintT; }
  let banTxt = '', clkTxt = '';
  const fmtT = s => { if (s < 60) return s.toFixed(1) + ' s'; const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = Math.floor(s % 60); return (d ? d + ' d ' : '') + h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); };
  function status() { const z = cam.z;
    let b = z < 1.6 ? (SCOPE ? 'Microscope look: each part glows in the colour of its stain' : (LODK() < .99 ? `Real sizes; showing ${Math.round(LODK() * 100)}% of the ${D.mitos.length} mitochondria so you can see: more appear as you zoom` : 'Real sizes and counts; colours and outlines added so each part is easy to tell apart')) : z < 8 ? 'Finer than a light microscope can see (~200 nm): membranes and folds shown'
      : z < 110 ? 'Macromolecules: a frozen snapshot, about 1/8 as crowded as real (real proteins jiggle ~1 µm in 0.1 s)' : z < 450 ? 'Molecules: real ones jiggle trillions of times a second (shown still); ~99 in 100 are water'
      : 'Atoms to scale; inside an atom the nucleus is drawn ~10,000× too big';
    if (b !== banTxt) { banTxt = b; ban.textContent = b; }
    const hh = (simT / 3600 + 3) % RATE.cycleH, ph = hh < 11 ? 'G1 (growing)' : hh < 19 ? 'S (copying DNA)' : hh < 23 ? 'G2 (getting ready)' : 'M (dividing)';
    const c = `⏱ ${fmtT(simT)} <small>cell time · ×${speed >= 1e4 ? '10,000' : speed.toLocaleString('en-GB')}${paused ? ' · paused' : ''} · cycle: ${ph}</small>`; if (c !== clkTxt) { clkTxt = c; clk.innerHTML = c; } }
  // ---------- scale bar ----------
  const UMS = [1e6, 5e5, 2e5, 1e5, 5e4, 2e4, 1e4, 5e3, 2e3, 1e3, 500, 200, 100, 50, 20, 10, 5, 2, 1, .5, .2, .1, .05, .02, .01, .005, .002, .001, 5e-4, 2e-4, 1e-4, 5e-5, 2e-5, 1e-5, 5e-6, 2e-6, 1e-6];
  const ulab = v => v >= 1e6 ? v / 1e6 + ' m' : v >= 1e4 ? v / 1e4 + ' cm' : v >= 1e3 ? v / 1e3 + ' mm' : v >= 1 ? v + ' µm' : v >= 1e-3 ? +(v * 1e3).toPrecision(3) + ' nm' : v >= 1e-4 ? +(v * 1e4).toPrecision(3) + ' Å' : +(v * 1e6).toPrecision(3) + ' pm';
  let sclKey = '';
  function scale() { let pick = UMS[UMS.length - 1]; for (const v of UMS) { if (v * W2UM * cam.z <= 140) { pick = v; break; } }
    const len = (pick * W2UM * cam.z).toFixed(0), k = len + pick; if (k === sclKey) return; sclKey = k;
    scl.innerHTML = `<i style="width:${len}px"></i>${ulab(pick)} <small>· true scale</small>`; }
  // ---------- picking (by scale: only things that exist at this zoom) ----------
  function hit(wx, wy) { const z = cam.z;
    if (z < .09 && cellRho(wx, wy, tm) > 1.15) return null;
    if (z >= 200 && z < 800) { const hh = helixHit(wx, wy); if (hh) return hh; }
    if (z >= 110) return deepHit(wx, wy) || macroHit(wx, wy) || hitCell(wx, wy);
    if (z >= 8) return macroHit(wx, wy) || hitCell(wx, wy); return hitCell(wx, wy); }
  // v10: a tap first looks for an exact hit on what is drawn on top; only if nothing is exactly under the finger does it allow a small margin
  function hitCell(wx, wy) { return hitCellK(wx, wy, 0) || hitCellK(wx, wy, 1); }
  function macroHit(wx, wy) { const slop = 10 / cam.z, i = Math.floor(wx / TM), j = Math.floor(wy / TM);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const tl = macroTile(i + di, j + dj);
      for (const r of tl.rib) if (Math.hypot(wx - r.x, wy - r.y) < 1.4 + slop) return ['rib', r.x, r.y, 4];
      for (const a of tl.atps) if (Math.hypot(wx - a.x, wy - a.y) < .6 + slop) return ['atps', a.x, a.y, 2];
      for (const ch of tl.nuc) for (const b of ch) if (Math.hypot(wx - b.x, wy - b.y) < .6 + slop * .4) return ['nucleosome', b.x, b.y, 2.5];
      for (const ch of tl.nuc) for (let k = 1; k < ch.length; k++) if (segD(wx, wy, ch[k - 1].x, ch[k - 1].y, ch[k].x, ch[k].y)[0] < .15 + slop * .6) return ['dna', wx, wy, 6];
      for (const p of tl.prot) if (Math.hypot(wx - p.x, wy - p.y) < p.r + slop * .5) return ['protein', p.x, p.y, 1.5]; }
    return null; }
  function hitCellK(wx, wy, K) {
    const z = cam.z, near = (x, y, r) => Math.hypot(wx - x, wy - y) <= r, slop = K * 14 / z;
    if (z > 2) for (const v of D.vaults) if (near(v.x, v.y, 3.5 + slop * .3)) return ['vault', v.x, v.y, 14];
    if (z > 2) for (const v of D.ves) { const [x, y] = v.mt >= 0 ? mtPos(D.mts[v.mt], Math.max(0, Math.min(D.mts[v.mt].len, v.s))) : [v.x, v.y]; if (near(x, y, v.r + slop * .5)) return ['ves', x, y, 20]; }
    if (near(CENT.x + 20, CENT.y, 50 + slop * .5)) return ['cent', CENT.x + 20, CENT.y, 70];
    for (const [k, o] of D.G.at(wx, wy)) { if ((k === 'lyso' || k === 'perox' || k === 'lipd') && lodOk(o) && near(o.x + o.ox, o.y + o.oy, o.r + slop * .4)) return [k, o.x + o.ox, o.y + o.oy, Math.max(o.r * 1.6, 25)]; }
    for (const [k, o] of D.G.at(wx, wy)) if (k === 'mito' && lodOk(o)) { const P_ = o.pts.map(p => [p[0] + o.ox, p[1] + o.oy]), [dd] = polyD(P_, wx, wy); if (dd < o.w / 2 + slop * .3) { const c = P_[Math.floor(P_.length / 2)]; return ['mito', c[0], c[1], o.L * .6 + 40]; } }
    for (const [k, o] of D.G.at(wx, wy)) if (k === 'golgi' && near(o.x, o.y, 80)) return ['golgi', o.x, o.y, 220];
    if (nucRho(wx, wy) < 1) { // tap a chromatin strand (as in v8)
      if (z >= 1.5 && z < 12) for (const c_ of CHROM) { const [dd] = polyD(c_, wx, wy); if (dd < 4 + slop * .6) return ['dna', wx, wy, 60]; }
      if (z > 1.5 && z < 60) { const i0 = Math.floor(wx / TC), j0 = Math.floor(wy / TC); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const L of chromTile(i, j)) { const [dd] = polyD(L, wx, wy); if (dd < 1.5 + slop * .6) return ['dna', wx, wy, 25]; } } }
    for (const n of NUCL) if (near(n.x, n.y, n.r)) return ['nucleolus', n.x, n.y, n.r * 1.4];
    const nr = nucRho(wx, wy); if (z > 3) for (const a of D.pores) { const x = NUC.x + Math.cos(a) * (NUC.rx + 1.5), y = NUC.y + Math.sin(a) * (NUC.ry + 1.5); if (near(x, y, 6 + slop * .5)) return ['pore', x, y, 25]; }
    if (nr < 1.01) return ['nucleus', NUC.x, NUC.y, NUC.rx * 1.08];
    for (const [k, o] of D.G.at(wx, wy)) if (k === 'fa') { const c = Math.cos(-o.a), s = Math.sin(-o.a), lx = (wx - o.x) * c - (wy - o.y) * s, ly = (wx - o.x) * s + (wy - o.y) * c; if (Math.abs(lx) < o.L / 2 + slop * .3 && Math.abs(ly) < o.w / 2 + slop * .3) return ['fa', o.x, o.y, o.L]; }
    const rho = cellRho(wx, wy, tm), [mx, my] = memPt(Math.atan2(wy / RY, wx / RX), tm); if (Math.hypot(wx - mx, wy - my) < 6 + slop) return ['membrane', mx, my, 60];
    if (rho > 1) return null;
    if (z > 1) { let best = null, bd = 1e9; for (const [k, o, i] of D.G.at(wx, wy)) { if (k === 'mt') { const [dd, si, u] = polyD(o.pts.slice(Math.max(0, i - 4), Math.min(o.pts.length, i + 5)), wx, wy); if (dd < bd && dd < 3 + slop * .4) { bd = dd; best = ['mt', wx, wy, 60]; } }
        if (k === 'er') { const [dd] = polyD(o, wx, wy); if (dd < bd && dd < 6 + slop * .4) { bd = dd; best = ['er', wx, wy, 150]; } }
        if (k === 'vim' && z > 2) { const [dd] = polyD(o, wx, wy); if (dd < bd && dd < 1 + slop * .3) { bd = dd; best = ['vim', wx, wy, 80]; } } } if (best) return best; }
    for (const [k, o] of D.G.at(wx, wy)) if (k === 'actin') { const [dd] = segD(wx, wy, ...o.p0, ...o.p1); if (dd < o.w / 2 + slop * .4) return ['actin', wx, wy, 100]; }
    for (const s of D.erSheet) if (near(s.x, s.y, s.rx)) return ['er', s.x, s.y, 180];
    return K ? ['cyto', wx, wy, 160] : null;
  }
  function select(h, tap) {
    if (!h) { sel = null; showPop(); return; }
    const [id, x, y, r] = h; sel = id; layer = 1; showPop(); if (tap) return; // v10: a tap never jumps the zoom
    const box = mob() ? Math.min(VW(), VH() * .45) : Math.min(VW() - 380, VH() - TOP());
    animTo(x, y, (box * .42) / r);
  }
  function showPop() {
    if (!sel) { pop.style.display = 'none'; hint.style.display = ''; return; }
    const p = P[sel]; hint.style.display = 'none';
    pop.innerHTML = `<button class="x" aria-label="close">×</button><b class="t1">${p.n}</b><div class="chip"><i style="background:${SCOL[p.s]}"></i>${SNAME[p.s]}</div>` +
      p.a.map(s => `<p>${s}</p>`).join('') +
      (layer > 1 ? `<div class="lay">${p.b.map(s => `<p>${s}</p>`).join('')}<p class="src">Sources: ${p.src.map(([n, u]) => srcInlineHTML(n, u)).join('')}</p></div>` : '') +
      `<div class="pact">${layer < 2 ? '<button class="more">Read more ▾</button>' : '<button class="more">Less ▴</button>'}<span class="lv">Layer ${layer} of 2</span>${copyBtnHTML(SITE + '#cell=' + encodeURIComponent(sel))}${fixBtnHTML('Virtual Cell', p.n, 'cell/' + sel, SITE + '#cell=' + encodeURIComponent(sel))}</div>` +
      (p.map && opts.onMapLink ? `<button class="vmap">${p.map === 'atoms' ? atomSVG() + ' Atoms on the map' : '🗺️ See it on the map'}</button>` : '');
    pop.style.display = 'block';
    pop.querySelector('.x').onclick = () => { sel = null; showPop(); };
    pop.querySelector('.more').onclick = () => { layer = layer < 2 ? 2 : 1; showPop(); };
    const mb = pop.querySelector('.vmap'); if (mb) mb.onclick = () => { const f = opts.onMapLink, id = p.map; destroy(); f(id); };
  }
  // ---------- input ----------
  const ptrs = new Map(); let pinch = null, moved = 0, downAt = null;
  function on(el, ev, f, o) { el.addEventListener(ev, f, o); offs2.push(() => el.removeEventListener(ev, f, o)); }
  let offs2 = [];
  function bindInput() {
    on(cv, 'pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; downAt = [e.clientX, e.clientY]; anim = null;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; } });
    on(cv, 'pointermove', e => { if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const r = cv.getBoundingClientRect();
        zoomAt(mx - r.left, my - r.top, (pinch.z * d / pinch.d) / cam.z); moved = 99; return; }
      moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; } });
    const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0 && moved <= 6 && downAt) { const r = cv.getBoundingClientRect(); const [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top); select(hit(wx, wy), true); } };
    on(cv, 'pointerup', up); on(cv, 'pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; });
    on(cv, 'wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-Math.max(-300, Math.min(300, e.deltaY)) * .0022)); }, { passive: false });
    on(window, 'keydown', e => { if (!alive) return; const k = e.key; let used = true;
      if (k === 'Escape') { if (sel) { sel = null; showPop(); } else close(); }
      else if (k === '+' || k === '=') zoomAt(VW() / 2, VH() / 2, 1.4); else if (k === '-' || k === '_') zoomAt(VW() / 2, VH() / 2, 1 / 1.4);
      else if (k === 'ArrowLeft') cam.x -= 60 / cam.z; else if (k === 'ArrowRight') cam.x += 60 / cam.z; else if (k === 'ArrowUp') cam.y -= 60 / cam.z; else if (k === 'ArrowDown') cam.y += 60 / cam.z;
      else if (k === '0') fit(); else used = false;
      if (used) { e.preventDefault(); } e.stopImmediatePropagation(); }, true);
    on(window, 'resize', () => { if (!sel && !anim) cam.z = clampZ(cam.z); });
  }
  function close() { const f = opts.onClose; destroy(); if (f) f(); }
  function setSpeed(s) { speed = s; if (!root) return; root.querySelectorAll('.vtime [data-s]').forEach(b => { const on = +b.dataset.s === s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); clkTxt = ''; }
  function setPaused(p) { paused = p; const pl = root && root.querySelector('.vpl'); if (pl) { pl.textContent = paused ? '▶' : '⏸'; pl.setAttribute('aria-label', paused ? 'Play' : 'Pause'); } clkTxt = ''; }
  function init(host, o = {}) {
    if (alive) destroy(); opts = o; alive = true; D = build(); t = 0; last = 0; sel = null; layer = 1; offs = [0, 0]; simT = 0; tm = 0; simR = rng(4242); MC = new Map(); mcTm = null;
    root = document.createElement('div'); root.id = 'vcell'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Virtual Cell: a typical human cell');
    root.innerHTML = (o.embedded ? '' : `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">${dnaSVG()} Virtual Cell <small>typical human cell · v0.6</small></b>
      <div class="vzm"><button class="vout" aria-label="Zoom out">−</button><button class="vin" aria-label="Zoom in">+</button><button class="vfit" aria-label="Show the whole cell">⤢</button></div></div>`) +
      `<div class="vtime" role="group" aria-label="Time speed"><button class="vpl" aria-label="Pause">⏸</button>${SPEEDS.map(s => `<button data-s="${s}" aria-pressed="false">${s >= 1e4 ? '10k' : s}×</button>`).join('')}<button class="vsc" aria-pressed="false" title="Microscope look (subtle, optional)" aria-label="Microscope look">🔬</button><span class="vclk" aria-live="off"></span></div>` +
      `<div class="vban"></div><canvas aria-label="A typical human cell drawn to scale. Tap a part to learn about it."></canvas><div class="vcrumb" aria-live="polite"></div><div class="vhint">Tap any part to learn about it · pinch or scroll to zoom</div><div class="vscl"></div><div class="vpop" role="dialog" aria-live="polite"></div>`;
    if (o.tissue) { const [n, f, w] = o.tissue.cell; root.innerHTML += `<div class="vtis"><b>From the body: ${o.tissue.from} → ${n}</b><br>This is a typical human cell. ${f} <a href="https://en.wikipedia.org/wiki/${w}" target="_blank" rel="noopener">More</a></div>`; }
    (host || document.body).appendChild(root); if (o.tissue) { const b = root.querySelector('.vback'); if (b) { b.textContent = '← Body'; b.setAttribute('aria-label', 'Back to the body'); } }
    const $ = s => root.querySelector(s);
    cv = $('canvas'); cx = cv.getContext('2d'); pop = $('.vpop'); hint = $('.vhint'); scl = $('.vscl'); crEl = $('.vcrumb'); clk = $('.vclk'); ban = $('.vban'); crumbTxt = ''; sclKey = ''; banTxt = ''; clkTxt = '';
    SCOPE = false; if (!TPL) TPL = mkTemplates(); CACHE = new Map(); Q = .7; qT = 0; buildCaches();
    setPaused(RM()); setSpeed(1);
    $('.vpl').onclick = () => setPaused(!paused); $('.vsc').onclick = () => { SCOPE = !SCOPE; $('.vsc').setAttribute('aria-pressed', SCOPE); $('.vsc').classList.toggle('on', SCOPE); buildCaches(); banTxt = ''; }; root.querySelectorAll('.vtime [data-s]').forEach(b => b.onclick = () => { setSpeed(+b.dataset.s); if (paused) setPaused(false); });
    if (!o.embedded) { $('.vback').onclick = close; $('.vin').onclick = () => zoomAt(VW() / 2, VH() / 2, 1.6); $('.vout').onclick = () => zoomAt(VW() / 2, VH() / 2, 1 / 1.6); $('.vfit').onclick = fit; }
    bindInput(); cam = { x: 0, y: 0, z: fitZ() }; offs = centreOff();
    raf = requestAnimationFrame(frame);
    clearTimeout(focusTimer); clearTimeout(backFocusTimer);
    if (o.focus) focusTimer = setTimeout(() => {if (alive) focus(o.focus);}, 50);
    backFocusTimer = setTimeout(() => { const b = root && root.querySelector('.vback'); focusQuiet(b); }, 30);
    return api;
  }
  function destroy() { alive = false; clearTimeout(focusTimer); clearTimeout(backFocusTimer); focusTimer = backFocusTimer = 0; cancelAnimationFrame(raf); raf = 0; anim = null; ptrs.clear(); pinch = null; moved = 0; downAt = null; offs2.forEach(f => f()); offs2 = []; if (root) root.remove(); root = null; D = null; }
  function findMacro(cx0, cy0, f) { for (let r = 0; r < 30; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const tl = macroTile(Math.floor(cx0 / TM) + i, Math.floor(cy0 / TM) + j), v = f(tl); if (v) return v; } return null; }
  function spot(id) { const m0 = D.mitos[0], mc = m0.pts[Math.floor(m0.pts.length / 2)];
    const ribA = () => findMacro(CENT.x + 300, CENT.y + 300, tl => tl.g.k === 'cyto' && tl.rib[0]), nuA = () => findMacro(NUC.x + 120, NUC.y - 60, tl => tl.nuc[0] && tl.nuc[0][2]);
    const map = { cell: [0, 0, RX * 1.05], nucleus: [NUC.x, NUC.y, NUC.rx * 1.08], nucleolus: [NUCL[0].x, NUCL[0].y, NUCL[0].r * 1.4], golgi: [D.golgi[4].x, D.golgi[4].y, 220], cent: [CENT.x + 20, CENT.y, 70],
      mito: [mc[0] + m0.ox, mc[1] + m0.oy, m0.L * .6 + 40], lyso: [D.lyso[0].x, D.lyso[0].y, 40], perox: [D.perox[0].x, D.perox[0].y, 25], er: [D.erNodes[40][0], D.erNodes[40][1], 150], mt: [...mtPos(D.mts[5], 500), 60],
      rib: (() => { const r = ribA(); return [r.x, r.y, 4]; })(), dna: (() => { const b = nuA(); return [b.x, b.y, 3]; })(), nucleosome: (() => { const b = nuA(); return [b.x, b.y, 2.5]; })(), vault: [D.vaults[0].x, D.vaults[0].y, 14],
      actin: [(D.fibres[0].p0[0] + D.fibres[0].p1[0]) / 2, (D.fibres[0].p0[1] + D.fibres[0].p1[1]) / 2, 100] };
    return map[id]; }
  function focus(id) { if (!alive || !P[id]) return; const m = spot(id) || [0, 0, RX]; select([id, ...m]); }
  const api = { init, destroy, focus, isOpen: () => alive, parts: P, rate: RATE, nearestAtom, w2s: (x, y) => w2s(x, y), region: (x, y) => regionAt(x, y).k,
    strand: () => { const c = CHROM[0], k = Math.floor(c.length / 2); return c[k]; },
    linker: () => { const ok = t => t.nuc.some(c => c.some((b, k) => k && Math.hypot(b.x - c[k - 1].x, b.y - c[k - 1].y) > 1.6)) && t, tl = findMacro(NUC.x + 120, NUC.y - 60, ok); for (const c of tl.nuc) for (let k = 1; k < c.length; k++) { const a = c[k - 1], b = c[k]; if (Math.hypot(b.x - a.x, b.y - a.y) > 1.6) return { bead: [a.x, a.y], m: [(a.x + b.x) / 2, (a.y + b.y) / 2] }; } },
    helixPt: (x, y) => { const RH = 1.6, j = Math.floor(y / RH), R = rng(j * 7919 + 3), yb = j * RH + .5 + R() * .6, ph = R() * 9; return [x, yb + .25 * Math.sin(x / 2.3 + ph)]; },
    pts: () => { const m0 = D.mitos[0], mc = m0.pts[Math.floor(m0.pts.length / 2)], b = spot('dna'); return { dna: [b[0], b[1]], mito: [mc[0] + m0.ox, mc[1] + m0.oy], nuc: [NUC.x, NUC.y], mem: memPt(-1.2, tm).map(v => v * .9999), rib: spot('rib').slice(0, 2) }; },
    crumb: () => crumbTxt, go: (x, y, z) => { anim = null; sel = null; showPop(); cam = { x, y, z: clampZ(z) }; offs = centreOff(); },
    speed: s => { if (s != null) setSpeed(s); return speed; }, sim: () => ({ simT, speed, paused, mtLen: D.mts.reduce((a, m) => a + m.len, 0) / D.mts.length / W2UM, ves: D.ves.filter(v => v.mt >= 0).length }),
    debug: () => ({ cam: { ...cam }, sel, layer, fps, t, simT, speed, paused, Q, chromN: CHN, helixN: HXN, animating:!!anim }) };
  return api;
})();
window.VCELL = VCELL;
