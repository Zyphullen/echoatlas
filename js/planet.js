'use strict';
/* ============ v11: Planet view (Earth cut-away, real layer depths to scale) ============
   API: VPLANET.init(host, opts) · destroy() · isOpen() · go(id) · debug() · w2s(x,y)
   World units: km. Earth's centre at (0,0), sea level at r = 6371. Land = left half, ocean = right half (simplified). */
const VPLANET = (() => {
  const R = 6371, P = PLANET_P, SCOL = { k: '#3dff8a', t: '#ff9a3d', u: '#ff4d5e' }, SNAME = { k: 'Known', t: 'We think', u: 'Unknown' };
  const COL = { exo: 'rgba(79,243,227,.06)', thermo: 'rgba(79,243,227,.11)', meso: 'rgba(79,243,227,.17)', strato: 'rgba(79,243,227,.25)', tropo: 'rgba(120,200,255,.38)',
    ocean: '#0f4c8a', ocrust: '#5b4a3a', ccrust: '#a8823e', umantle: '#c2551f', tzone: '#d9692a', lmantle: '#b8361f', ocore: '#ffae2e', icore: '#ffe27a' };
  const ATMO = ['exo', 'thermo', 'meso', 'strato', 'tropo'], STOPS = ['earth', 'exo', 'thermo', 'meso', 'strato', 'tropo', 'ocean', 'ccrust', 'umantle', 'tzone', 'lmantle', 'ocore', 'icore'];
  let peel = 0; const PEELN = 7, PL = { exo: 2, thermo: 2, meso: 2, strato: 2, tropo: 2, karman: 2, ocean: 3, ocrust: 3, ccrust: 3, crust: 3, umantle: 4, tzone: 5, lmantle: 6, ocore: 7, icore: 99, atmo: 2 }, PDEF = { earth: 0, exo: 1, thermo: 1, meso: 1, strato: 1, tropo: 1, ocean: 1, ccrust: 1, umantle: 1, tzone: 3, lmantle: 4, ocore: 6, icore: 7 };
  const vis = k => peel < (PL[k] || 99);
  let root, cv, cx, pop, crEl, scl, raf = 0, alive = false, opts = {}, cam = { x: 0, y: -R, z: .05 }, anim = null, sel = null, layer = 1, stop = 0, onKey = null, t = 0, last = 0;
  const VW = () => root.clientWidth, VH = () => root.clientHeight, TOP = () => 60;
  const fitZ = () => Math.min(VW(), VH() - TOP()) / (2 * (R + 900) * 1.04), minZ = () => fitZ() * .42, maxZ = 400;
  const clampZ = z => Math.max(minZ(), Math.min(maxZ, z));
  const w2s = (x, y) => [VW() / 2 + (x - cam.x) * cam.z, (VH() + TOP()) / 2 + (y - cam.y) * cam.z];
  const s2w = (X, Y) => [cam.x + (X - VW() / 2) / cam.z, cam.y + (Y - (VH() + TOP()) / 2) / cam.z];
  const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  function animTo(x, y, z, ms = 900) { anim = { f: { ...cam }, t: { x, y, z: clampZ(z) }, s: performance.now(), ms }; }
  // visible angle range around the camera ray, so huge circles are drawn only where you can see them (keeps deep zoom exact)
  function span() { const d = Math.hypot(cam.x, cam.y), diag = Math.hypot(VW(), VH()) / cam.z, aC = Math.atan2(cam.y, cam.x);
    return d > diag * 1.05 ? [aC, Math.asin(Math.min(1, diag / d)) + .02] : [aC, Math.PI + .01]; }
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // half: 'sea' = right half (angles -90°..90°), 'land' = left half, null = all
  function wedge(r, half) { const [aC, sp] = span(); let a0 = aC - sp, a1 = aC + sp;
    if (half) { const h0 = half === 'sea' ? -Math.PI / 2 : Math.PI / 2, h1 = h0 + Math.PI; if (sp >= Math.PI) { a0 = h0; a1 = h1; } else { const c = h0 + Math.PI / 2 + wrap(aC - h0 - Math.PI / 2); // camera angle unwrapped next to this half
        a0 = Math.max(c - sp, h0); a1 = Math.min(c + sp, h1); if (a1 <= a0) return null; } }
    const n = 220, [ox, oy] = w2s(0, 0); cx.beginPath(); cx.moveTo(ox, oy);
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const [X, Y] = w2s(Math.cos(a) * r, Math.sin(a) * r); cx.lineTo(X, Y); } cx.closePath(); return true; }
  const fillW = (r, half, col) => { if (wedge(r, half)) { cx.fillStyle = col; cx.fill(); } };
  // radial gradient between two radii (km), stops [[0..1 from inner→outer, colour]]
  function rg(rIn, rOut, st) { const [ox, oy] = w2s(0, 0), z = cam.z; if (rOut * z > 8000) { const a = span()[0], c = Math.cos(a), sn = Math.sin(a), [X0, Y0] = w2s(c * rIn, sn * rIn), [X1, Y1] = w2s(c * rOut, sn * rOut), L = cx.createLinearGradient(X0, Y0, X1, Y1); for (const [u, col] of st) L.addColorStop(u, col); return L; }
    const g = cx.createRadialGradient(ox, oy, Math.max(0, rIn * z), ox, oy, Math.max(rIn * z + .5, rOut * z)); for (const [u, c] of st) g.addColorStop(u, c); return g; }
  const band = (rIn, rOut, half, st) => { if (wedge(rOut, half)) { cx.fillStyle = rg(rIn, rOut, st); cx.fill(); } };
  function arcPts(r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push(w2s(Math.cos(a) * r, Math.sin(a) * r)); } return o; }
  function ring(r, col, w, dash, glow) { const [aC, sp] = span(), n = 220; cx.beginPath(); for (let i = 0; i <= n; i++) { const a = aC - sp + 2 * sp * i / n, [X, Y] = w2s(Math.cos(a) * r, Math.sin(a) * r); i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }
    cx.save(); if (glow) { cx.shadowColor = glow; cx.shadowBlur = 10; } cx.strokeStyle = col; cx.lineWidth = w; cx.setLineDash(dash || []); cx.stroke(); cx.restore(); }
  // ---------- star field (screen space, fixed seed; drifts gently with the camera) ----------
  let STARS = null; function stars(w, h) { if (!STARS) { let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; STARS = [];
      for (let i = 0; i < 520; i++) STARS.push([rnd(), rnd(), rnd() < .06 ? 1.3 + rnd() * .9 : .35 + rnd() * .6, rnd() * 6.28, rnd() < .15 ? '#ffe7a8' : rnd() < .3 ? '#bff8f2' : '#dfe8ff']); }
    const px = -cam.x * cam.z * .002, py = -cam.y * cam.z * .002;
    for (const [u, v, s, ph, c] of STARS) { const X = ((u * w + px) % w + w) % w, Y = ((v * h + py) % h + h) % h; cx.globalAlpha = (s > 1.2 ? .75 : .35) * (.7 + .3 * Math.sin(t * .9 + ph * 3)); cx.fillStyle = c; cx.fillRect(X, Y, s, s); } cx.globalAlpha = 1;
    // faint nebula wash
    const g = cx.createRadialGradient(w * .82, h * .2, 0, w * .82, h * .2, w * .6); g.addColorStop(0, 'rgba(79,243,227,.05)'); g.addColorStop(1, 'rgba(79,243,227,0)'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    const g2 = cx.createRadialGradient(w * .12, h * .85, 0, w * .12, h * .85, w * .5); g2.addColorStop(0, 'rgba(255,211,107,.04)'); g2.addColorStop(1, 'rgba(255,211,107,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, w, h); }
  // simplified terrain profile on land (hills up to ~3 km, a pattern not a map)
  const terr = a => Math.max(0, 1.2 + .9 * Math.sin(a * 2100) + .6 * Math.sin(a * 5300 + 1) + .4 * Math.sin(a * 13100 + 2)) * .9;
  const ISSA = -Math.PI / 2 + .3, issXY = () => [Math.cos(ISSA + t * 2 * Math.PI / 5400) * (R + 410), Math.sin(ISSA + t * 2 * Math.PI / 5400) * (R + 410)]; // real orbit: ~92 minutes
  // ---------- intact Earth from space (stylised land: a pattern, not a map) ----------
  const LAND = [[-.45, -.25, .32, 1], [-.2, .35, .26, 2], [.38, -.3, .2, 3], [.42, .3, .3, 4], [.05, -.05, .13, 5], [-.6, .25, .14, 6], [.15, .62, .16, 7]];
  function face() { const [ox, oy] = w2s(0, 0), rr = R * cam.z; cx.save(); cx.beginPath(); cx.arc(ox, oy, rr, 0, 6.283); cx.clip();
    let g = cx.createRadialGradient(ox - rr * .3, oy - rr * .35, rr * .05, ox, oy, rr); g.addColorStop(0, '#3aa0e8'); g.addColorStop(.6, '#145c9e'); g.addColorStop(1, '#06264a'); cx.fillStyle = g; cx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
    for (const [u, v, s, sd] of LAND) { cx.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283, k = 1 + .28 * Math.sin(a * 3 + sd) + .16 * Math.sin(a * 5 + sd * 2) + .08 * Math.sin(a * 11 + sd * 3), X = ox + (u + Math.cos(a) * s * k) * rr, Y = oy + (v + Math.sin(a) * s * k * .85) * rr; i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); } cx.closePath();
      const lg = cx.createRadialGradient(ox + u * rr, oy + v * rr, 0, ox + u * rr, oy + v * rr, s * rr * 1.2); lg.addColorStop(0, sd % 2 ? '#b0915a' : '#4f8a3c'); lg.addColorStop(.6, '#5f8f42'); lg.addColorStop(1, '#3d6e34'); cx.fillStyle = lg; cx.fill(); }
    for (const sgn of [-1, 1]) { const c = cx.createRadialGradient(ox, oy + sgn * rr, 0, ox, oy + sgn * rr, rr * .32); c.addColorStop(0, 'rgba(245,250,255,.95)'); c.addColorStop(.7, 'rgba(235,245,255,.6)'); c.addColorStop(1, 'rgba(235,245,255,0)'); cx.fillStyle = c; cx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2); }
    cx.fillStyle = 'rgba(255,255,255,.13)'; for (let i = 0; i < 14; i++) { const y = oy + (-.75 + i * .115) * rr, ph = i * 1.7 + t * .02; for (let j = 0; j < 3; j++) { cx.beginPath(); cx.ellipse(ox + (Math.sin(ph + j * 2.1) * .5) * rr, y + j * rr * .02, rr * (.12 + .06 * ((i + j) % 3)), rr * (.025 + .01 * (j % 2)), Math.sin(ph) * .25, 0, 6.283); cx.fill(); } }
    g = cx.createRadialGradient(ox - rr * .35, oy - rr * .35, rr * .2, ox, oy, rr * 1.02); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.7, 'rgba(0,0,20,0)'); g.addColorStop(1, 'rgba(0,4,20,.6)'); cx.fillStyle = g; cx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2); cx.restore();
    ring(R, 'rgba(127,248,236,.8)', 1.5, null, 'rgba(79,243,227,.9)');
    const [ix, iy] = issXY(), [IX, IY] = w2s(ix, iy); cx.strokeStyle = '#ffd36b'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(IX - 10, IY); cx.lineTo(IX + 10, IY); cx.moveTo(IX, IY - 6); cx.lineTo(IX, IY + 6); cx.stroke(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(IX, IY, 2.6, 0, 6.283); cx.fill(); }
  function setPeel(n) { peel = Math.max(0, Math.min(PEELN, n)); if (sel && !vis(sel)) { sel = null; showPop(); } if (root) { root.querySelector('.vban').textContent = peel === 0 ? 'Earth from space · land shapes simplified' : 'Cut-away: real depths · land left, ocean right'; root.querySelector('.vpeel').disabled = peel >= PEELN; root.querySelector('.vrest').disabled = peel === 0; } }
  function draw() { const w = VW(), h = VH(), z = cam.z; cx.clearRect(0, 0, w, h); stars(w, h);
    // limb glow: soft turquoise→gold haze, reads as a glowing sphere from space
    if (z < 2 && peel < 2) band(R, R + 2600, null, [[0, 'rgba(79,243,227,.30)'], [.06, 'rgba(79,243,227,.16)'], [.3, 'rgba(120,180,255,.06)'], [.7, 'rgba(255,211,107,.025)'], [1, 'rgba(255,211,107,0)']]);
    // atmosphere: density falls with height (each band lighter outwards)
    const AT = { exo: ['rgba(79,243,227,0)', 'rgba(79,243,227,.09)'], thermo: ['rgba(120,110,255,.08)', 'rgba(150,120,255,.20)'], meso: ['rgba(60,110,220,.16)', 'rgba(79,190,240,.30)'], strato: ['rgba(50,150,230,.28)', 'rgba(110,210,255,.48)'], tropo: ['rgba(120,200,255,.46)', 'rgba(210,242,255,.80)'] };
    if (peel < 2) for (const k of ATMO) { const rO = R - P[k].r0, rI = R - P[k].r1, [aC, sp] = span(), o = arcPts(rO, aC - sp, aC + sp, 220), ii = arcPts(rI, aC + sp, aC - sp, 220);
      cx.beginPath(); o.forEach(([X, Y], j) => j ? cx.lineTo(X, Y) : cx.moveTo(X, Y)); ii.forEach(([X, Y]) => cx.lineTo(X, Y)); cx.closePath(); cx.fillStyle = rg(rI, rO, [[0, AT[k][1]], [1, AT[k][0]]]); cx.fill(); }
    // clouds: soft haze puffs 1–10 km up, only when zoomed in enough to see the troposphere
    if (z > 3 && peel < 2) { const [aC, sp] = span(), N = 90; cx.save(); cx.globalAlpha = Math.min(1, (z - 3) / 6) * .5;
      for (let i = -N; i <= N; i++) { const step = sp / N, a = Math.round(aC / step) * step + i * step, k = Math.sin(a * 7777.7) * 43758.5, f = k - Math.floor(k); if (f < .45) continue;
        const alt = 2 + f * 7, [X, Y] = w2s(Math.cos(a) * (R + alt), Math.sin(a) * (R + alt)), rr = Math.max(4, Math.min(70, 2.2 * z)); const g = cx.createRadialGradient(X, Y, 0, X, Y, rr); g.addColorStop(0, 'rgba(240,250,255,.55)'); g.addColorStop(1, 'rgba(240,250,255,0)'); cx.fillStyle = g; cx.fillRect(X - rr, Y - rr, rr * 2, rr * 2); } cx.restore(); }
    if (peel === 0) { face(); labels(); return; }
    if (peel < 3) {
    // ocean (right): bright at the surface, deep blue below
    band(R - 3.7, R, 'sea', [[0, '#031a3a'], [.55, '#08386e'], [.9, '#1366a8'], [1, '#2a8fd0']]);
    band(R - 10.7, R - 3.7, 'sea', [[0, '#2a2420'], [1, '#4a3d32']]);
    band(R - 35, R - 10.7, 'sea', [[0, '#9a3d17'], [1, '#7a3416']]);
    // land (right→left): warm earth tones, darker with depth
    band(R - 35, R, 'land', [[0, '#5a3a22'], [.5, '#7d5a32'], [.85, '#a8823e'], [.97, '#b99a55'], [1, '#6f8f45']]);
    // terrain hint above sea level on land (simplified)
    if (z > 8) { const [aC, sp] = span(), n = 400, lo = aC - sp, hi = aC + sp; cx.beginPath();
      for (let i = 0; i <= n; i++) { const a = lo + (hi - lo) * i / n, rr = Math.cos(a) < 0 ? R + terr(a) : R - .3, [X, Y] = w2s(Math.cos(a) * rr, Math.sin(a) * rr); i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }
      for (let i = n; i >= 0; i--) { const a = lo + (hi - lo) * i / n, [X, Y] = w2s(Math.cos(a) * (R - .3), Math.sin(a) * (R - .3)); cx.lineTo(X, Y); } cx.closePath(); cx.fillStyle = rg(R - .3, R + 3, [[0, '#6f8f45'], [.5, '#7b7040'], [1, '#c9b48a']]); cx.fill(); }
    }
    // mantle: hot and deep
    if (vis('umantle')) band(R - 410, R - 35, null, [[0, '#c4451a'], [1, '#8f3115']]);
    if (vis('tzone')) band(R - 660, R - 410, null, [[0, '#d65a20'], [1, '#c24a1c']]);
    if (vis('lmantle')) band(R - 2891, R - 660, null, [[0, '#e8601e'], [.4, '#b8361f'], [1, '#d8461c']]);
    // outer core: molten, with slow swirl streaks
    if (vis('ocore')) band(R - 5150, R - 2891, null, [[0, '#ffd36b'], [.5, '#ffae2e'], [1, '#ff8a1e']]);
    if (vis('ocore') && wedge(R - 2891, null)) { cx.save(); cx.clip(); cx.globalAlpha = .18; cx.strokeStyle = '#fff1b8'; cx.lineWidth = Math.max(1, 30 * z);
      for (let i = 0; i < 6; i++) { const r = R - 3100 - i * 360, a0 = t * .05 * (i % 2 ? 1 : -1) + i; cx.beginPath(); arcPts(r, a0, a0 + 2.2, 60).forEach(([X, Y], j) => j ? cx.lineTo(X, Y) : cx.moveTo(X, Y)); cx.stroke(); } cx.restore(); }
    // inner core: bright with a soft glow
    { const [ox, oy] = w2s(0, 0), rc = (R - 5150) * z; cx.save(); cx.shadowColor = 'rgba(255,230,140,.9)'; cx.shadowBlur = Math.min(60, rc * .25);
      if (wedge(R - 5150, null)) { cx.fillStyle = rg(0, R - 5150, [[0, '#fffdf0'], [.45, '#fff1a8'], [1, '#ffd36b']]); cx.fill(); } cx.restore(); }
    // boundaries: faint gold lines
    for (const d of [3.7, 10.7, 35, 410, 660, 2891, 5150]) if ((z * 4 > 1 || d > 400) && d >= [0, 0, 0, 35, 410, 660, 2891, 5150][peel]) ring(R - d, 'rgba(255,230,170,.22)', 1);
    // sea level: clear glowing line
    { const top = [0, 0, 0, 35, 410, 660, 2891, 5150][peel]; ring(R - top, '#7ff8ec', Math.max(1.2, Math.min(3, z * 2)), null, 'rgba(79,243,227,.9)'); }
    if ((P.karman.vis = z > .25 && peel < 2)) ring(R + 100, 'rgba(255,211,107,.8)', 1.2, [6, 5]);
    // selected layer: soft gold fill + glowing edges
    if (sel) { const q = P[sel]; if (q && q.r0 != null && vis(sel)) { const half = q.side || null; 
        { const [aC, sp] = span(), n = 220, o = arcPts(R - q.r0, aC - sp, aC + sp, n), ii = arcPts(Math.max(0, R - q.r1), aC + sp, aC - sp, n); cx.beginPath(); o.forEach(([X, Y], j) => j ? cx.lineTo(X, Y) : cx.moveTo(X, Y)); ii.forEach(([X, Y]) => cx.lineTo(X, Y)); cx.closePath();
          if (half) { cx.save(); wedge(R + 20000, half); cx.clip(); } else cx.save(); cx.beginPath(); o.forEach(([X, Y], j) => j ? cx.lineTo(X, Y) : cx.moveTo(X, Y)); ii.forEach(([X, Y]) => cx.lineTo(X, Y)); cx.closePath(); cx.fillStyle = 'rgba(255,211,107,.16)'; cx.fill(); cx.restore(); }
        ring(R - q.r0, '#ffd36b', 2, null, 'rgba(255,211,107,.9)'); if (q.r1 < R) ring(R - q.r1, '#ffd36b', 2, null, 'rgba(255,211,107,.9)'); } }
    // ISS: gold cross with a soft glow
    const [ix, iy] = issXY(), [IX, IY] = w2s(ix, iy); { const g = cx.createRadialGradient(IX, IY, 0, IX, IY, 16); g.addColorStop(0, 'rgba(255,211,107,.55)'); g.addColorStop(1, 'rgba(255,211,107,0)'); cx.fillStyle = g; cx.fillRect(IX - 16, IY - 16, 32, 32);
      cx.strokeStyle = '#ffd36b'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(IX - 10, IY); cx.lineTo(IX + 10, IY); cx.moveTo(IX, IY - 6); cx.lineTo(IX, IY + 6); cx.stroke(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(IX, IY, 2.6, 0, 6.283); cx.fill(); }
    labels(); }
  // labels sit on the camera ray, only when the band is thick enough to read
  function labels() { const [aC] = span(), z = cam.z, used = []; cx.font = '600 13px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const side = Math.cos(aC) >= 0 ? 'sea' : 'land', L = [...ATMO, side === 'sea' ? 'ocean' : null, side === 'sea' ? 'ocrust' : 'ccrust', 'umantle', 'tzone', 'lmantle', 'ocore', 'icore'].filter(Boolean);
    for (const k of L) { if (peel === 0 || !vis(k)) continue; const q = P[k], th = (q.r1 - q.r0) * z; if (th < 18) continue; let rr = R - (q.r0 + q.r1) / 2, a = aC;
      const [X0, Y0] = w2s(Math.cos(a) * rr, Math.sin(a) * rr); let X = X0, Y = Y0;
      if (X < 40 || X > VW() - 40 || Y < TOP() + 20 || Y > VH() - 30) { const [, dy] = [0, 0]; const cr = Math.hypot(cam.x, cam.y); rr = Math.max(R - q.r1, Math.min(R - q.r0, cr)); X = VW() * .25; Y = (VH() + TOP()) / 2; const [wx, wy] = s2w(X, Y), d = R - Math.hypot(wx, wy); if (d < q.r0 || d > q.r1) continue; }
      const tw = cx.measureText(q.n).width + 14; if (used.some(([ux, uy, uw]) => Math.abs(ux - X) < (uw + tw) / 2 && Math.abs(uy - Y) < 22)) continue; used.push([X, Y, tw]); cx.fillStyle = 'rgba(6,10,24,.78)'; cx.fillRect(X - tw / 2, Y - 10, tw, 20); cx.fillStyle = '#e8f6ff'; cx.fillText(q.n, X, Y); } }
  // ---------- picking: only what is drawn and big enough to see ----------
  function hit(X, Y) { const z = cam.z, [ix, iy] = issXY(), [IX, IY] = w2s(ix, iy); if (Math.hypot(X - IX, Y - IY) < 14) return 'iss';
    const [wx, wy] = s2w(X, Y), r = Math.hypot(wx, wy), d = R - r, sea = wx >= 0;
    if (peel === 0) return r <= R ? 'earth' : r <= R + 600 ? 'atmo' : null;
    const top = [0, 0, 0, 35, 410, 660, 2891, 5150][peel]; if (d < top) { if (peel >= 2) return null; }
    if (P.karman.vis && Math.abs(r - (R + 100)) * z < 6) return 'karman';
    if (d < -10000) return null;
    const pick = (k, g) => (P[k].r1 - P[k].r0) * z >= 6 ? k : g;
    for (const k of ATMO) if (d >= P[k].r0 && d < P[k].r1) return pick(k, 'atmo');
    if (sea && d < 3.7) return pick('ocean', 'earth'); if (sea && d < 10.7) return pick('ocrust', 'crust'); if (!sea && d < 35) return pick('ccrust', 'crust');
    if (d < 410) return 'umantle'; for (const k of ['tzone', 'lmantle', 'ocore', 'icore']) if (d >= P[k].r0 && d <= P[k].r1) return k; return null; }
  function showPop() { if (!sel) { pop.style.display = 'none'; return; } const c = P[sel]; pop.style.display = 'block';
    const dep = c.r0 != null ? (c.r1 <= 0 ? `${fmt(-c.r1)}–${fmt(-c.r0)} km up` : `${fmt(c.r0)}–${fmt(c.r1)} km down`) : '';
    pop.innerHTML = `<button class="x" aria-label="Close">×</button><b class="t1">${c.n}</b><div class="chip"><i style="background:${SCOL[c.s]}"></i>${SNAME[c.s]}${c.s2 ? ` · <i style="background:${SCOL[c.s2]}"></i>${c.s2 === 'u' ? 'part still unknown' : 'part still debated'}` : ''}${dep ? ' · ' + dep : ''}</div>${depthBarHTML(P, sel)}${c.a.map(x => `<p>${x}</p>`).join('')}
      ${layer >= 2 ? `<div class="lay">${c.b.map(x => `<p>${x}</p>`).join('')}<div class="src">Sources: ${c.src.map(([n, u]) => srcInlineHTML(n, u)).join('')}</div></div>` : ''}
      <div class="pact">${layer < 2 ? '<button class="more">Read more ▾</button>' : ''}<span class="lv">Layer ${layer} of 2</span>${copyBtnHTML(SITE + '#planet=' + encodeURIComponent(sel))}${fixBtnHTML('Planet Earth', c.n, 'planet/' + sel, SITE + '#planet=' + encodeURIComponent(sel))}</div>`;
    pop.querySelector('.x').onclick = () => { sel = null; showPop(); }; const m = pop.querySelector('.more'); if (m) m.onclick = () => { layer = 2; showPop(); }; }
  const fmt = v => Math.round(v).toLocaleString('en-GB');
  function crumb() { const r = Math.hypot(cam.x, cam.y), d = R - r, z = cam.z, view = (VH() - TOP()) / z;
    crEl.textContent = view > 9000 ? 'Earth · whole planet' : d < 0 ? `Earth › ${fmt(-d)} km up` : `Earth › ${fmt(d)} km down`;
    const MM = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]; let pick = 1; for (const v of MM) if (v * z <= 140) { pick = v; break; }
    scl.innerHTML = `<i style="width:${(pick * z).toFixed(0)}px"></i>${fmt(pick)} km <small>· true scale</small>`; }
  // ---------- layer-by-layer stops ----------
  function go(k, ms) { const i = STOPS.indexOf(k); if (i < 0) return; stop = i; setPeel(PDEF[k]); if (k === 'earth') return animTo(0, 0, fitZ(), ms);
    const q = P[k], mid = (q.r0 + q.r1) / 2, th = q.r1 - q.r0, a = -Math.PI / 2 + (k === 'ocean' ? .0006 : 0);
    animTo(Math.cos(a) * (R - mid) + (k === 'ocean' ? 4 : k === 'ccrust' ? -25 : 0), Math.sin(a) * (R - mid), Math.min(maxZ, (VH() - TOP()) * .45 / th, k === 'exo' ? fitZ() * 1.6 : 1e9), ms); }
  function zoomAt(X, Y, k) { const [wx, wy] = s2w(X, Y); anim = null; const z0 = cam.z; cam.z = clampZ(cam.z * k); if (peel === 0 && cam.z > fitZ() * 2.5) setPeel(1); else if (peel > 0 && cam.z < z0 && cam.z <= fitZ() * 1.5 && z0 > fitZ() * 1.5) { setPeel(0); stop = 0; } const [wx2, wy2] = s2w(X, Y); cam.x += wx - wx2; cam.y += wy - wy2; clampCam(); }
  function clampCam() { const m = R + 11000; cam.x = Math.max(-m, Math.min(m, cam.x)); cam.y = Math.max(-m, Math.min(m, cam.y)); }
  function frame(now) { if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    if (anim) { const u = Math.min(1, (now - anim.s) / anim.ms), e = ease(u); cam.z = Math.exp(Math.log(anim.f.z) + (Math.log(anim.t.z) - Math.log(anim.f.z)) * e); cam.x = anim.f.x + (anim.t.x - anim.f.x) * e; cam.y = anim.f.y + (anim.t.y - anim.f.y) * e; if (u >= 1) { cam = { ...anim.t }; anim = null; } }
    const dpr = Math.min(2, devicePixelRatio || 1), w = VW(), h = VH(); if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); crumb(); }
  function bind() { const ptr = new Map(); let down = null, moved = false, pinch = null;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; moved = false; anim = null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const p = ptr.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch); pinch = d; moved = true; return; }
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) moved = true; if (moved) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); } });
    cv.addEventListener('pointerup', e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!moved && ptr.size === 0) { const r = cv.getBoundingClientRect(); sel = hit(e.clientX - r.left, e.clientY - r.top); layer = 1; showPop(); } });
    cv.addEventListener('pointercancel', e => ptr.delete(e.pointerId));
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015)); }, { passive: false });
    onKey = e => { if (!alive) return; if (e.key === 'Escape') { if (sel) { sel = null; showPop(); } else close(); } else if (e.key === '+' || e.key === '=') zoomAt(VW() / 2, (VH() + TOP()) / 2, 1.4); else if (e.key === '-') zoomAt(VW() / 2, (VH() + TOP()) / 2, 1 / 1.4); else if (e.key === 'ArrowDown') go(STOPS[Math.min(STOPS.length - 1, stop + 1)]); else if (e.key === 'ArrowUp') go(STOPS[Math.max(0, stop - 1)]); };
    addEventListener('keydown', onKey); }
  function init(host = document.body, o = {}) { if (alive) destroy(); opts = o; alive = true; sel = null; stop = 0; t = 0; last = 0;
    root = document.createElement('div'); root.id = 'vplanet'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Planet Earth');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">🌍 Planet Earth <small>v0.6</small></b><div class="vzm"><button class="vup" aria-label="Go up a layer">↑</button><button class="vdn" aria-label="Go down a layer">↓</button><button class="vout" aria-label="Zoom out">−</button><button class="vin" aria-label="Zoom in">+</button><button class="vfit" aria-label="Show the whole planet">⤢</button><button class="vpeel" aria-label="Peel off the outer layer" title="Peel a layer">🧅</button><button class="vrest" aria-label="Put all layers back" title="Whole Earth">🌍</button></div></div>` +
      `<canvas aria-label="Earth cut-away, layers to scale. Tap a layer to learn about it."></canvas><div class="vcrumb"></div><div class="vscl"></div><div class="vban">Cut-away: real layer depths (averages) · land left, ocean right (simplified)</div><div class="vhint">↓ dives · 🧅 peels a layer · tap any layer</div><div class="vpop" role="dialog" aria-live="polite"></div>`;
    host.appendChild(root); const $ = s => root.querySelector(s); cv = $('canvas'); cx = cv.getContext('2d'); pop = $('.vpop'); crEl = $('.vcrumb'); scl = $('.vscl');
    $('.vback').onclick = close; $('.vin').onclick = () => zoomAt(VW() / 2, (VH() + TOP()) / 2, 1.6); $('.vout').onclick = () => zoomAt(VW() / 2, (VH() + TOP()) / 2, 1 / 1.6); $('.vfit').onclick = () => go('earth'); $('.vpeel').onclick = () => setPeel(peel + 1); $('.vrest').onclick = () => setPeel(0);
    $('.vdn').onclick = () => go(STOPS[Math.min(STOPS.length - 1, stop + 1)]); $('.vup').onclick = () => go(STOPS[Math.max(0, stop - 1)]);
    bind(); peel = 0; setPeel(0); cam = { x: 0, y: 0, z: fitZ() }; if (o.focus) { const k = o.focus, near = { karman: 'thermo', iss: 'thermo', ocrust: 'ccrust', crust: 'ccrust', atmo: 'tropo' }; go(STOPS.includes(k) ? k : near[k] || 'earth', 10); if (k !== 'earth' && P[k]) { sel = k; layer = 1; showPop(); } } /* v0.3: a shared #planet= link opens that card */ raf = requestAnimationFrame(frame); focusQuiet($('.vback')); }
  function destroy() { alive = false; cancelAnimationFrame(raf); raf=0; anim=null; if (onKey) removeEventListener('keydown', onKey); if (root) root.remove(); root = null; }
  function close() { destroy(); opts.onClose && opts.onClose(); }
  return { init, destroy, isOpen: () => alive, go, w2s, hit, peel: n => n == null ? peel : setPeel(n), debug: () => ({ peel, cam: { ...cam }, sel, stop, depth: R - Math.hypot(cam.x, cam.y) }) };
})();
