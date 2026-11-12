'use strict';
/* ===== Human Body (v9 test): an adult female body, front view, real proportions, zoom cm by cm to mm =====
   API: VBODY.init(host, opts) · destroy() · isOpen() · focus(id) · layers(obj?) · debug() · parts · w2s(x,y) · pts()
   World units are millimetres. y = 0 at the top of the head, the body is 1,650 mm tall (an average adult woman).
   Front (anatomical) view: the person's RIGHT side is on the viewer's LEFT (x < 0).
   Built to grow later: BUILD[sex]() returns the parts, so a male body can be added as BUILD.male. */
const VBODY = (() => {
  const W = 'https://en.wikipedia.org/wiki/';
  const H = 1650; // mm
  // ---------- cards (layer 1 = a, Read more = b). s: k known · t we think · u unknown. d: how the drawing is simplified ----------
  const P = BODY_P;
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, SNAME = { k: 'Known', t: 'We think so', u: 'Unknown' };
  const LAYERS = [['muscle', 'Muscles', '#ff6b7a'], ['bone', 'Skeleton', '#f2ead8'], ['organ', 'Organs', '#ffb43d'], ['vessel', 'Blood vessels', '#ff4d5e'], ['nerve', 'Nerves', '#ffe14d']];

  // ---------- geometry helpers (all in mm) ----------
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const cap = (x1, y1, r1, x2, y2, r2, p = new Path2D()) => { const a = Math.atan2(y2 - y1, x2 - x1), d = Math.hypot(x2 - x1, y2 - y1), t = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    p.moveTo(x1 + Math.cos(a + Math.PI / 2 + t) * r1, y1 + Math.sin(a + Math.PI / 2 + t) * r1); p.arc(x1, y1, r1, a + Math.PI / 2 + t, a - Math.PI / 2 - t); p.arc(x2, y2, r2, a - Math.PI / 2 - t, a + Math.PI / 2 + t); p.closePath(); return p; };
  const ell = (x, y, rx, ry, rot = 0, p = new Path2D()) => { p.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); p.ellipse(x, y, rx, ry, rot, 0, 6.2832); p.closePath(); return p; };
  const smooth = (pts, closed = true, p = new Path2D()) => { if (closed) { let A = 0; for (let i = 0; i < pts.length; i++) { const u = pts[i], v = pts[(i + 1) % pts.length]; A += u[0] * v[1] - v[0] * u[1]; } if (A < 0) pts = pts.slice().reverse(); } const n = pts.length, m = (i) => { const a = pts[(i + n) % n], b = pts[(i + 1 + n) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    if (closed) { const s = m(-1); p.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const e = m(i); p.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); } p.closePath(); }
    else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const e = m(i); p.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); } return p; };
  const mir = pts => pts.map(([x, y]) => [-x, y]);
  // v10 proportions: old drawing y -> real y. Arms: wrist 800->850, fingertips 1022->1028 (hand ~0.108 H). Legs: hip 832->800, knee 1170->1205, ankle 1555->1585.
  const lerpMap = K => y => { if (y <= K[0][0]) return y; for (let i = 1; i < K.length; i++) if (y <= K[i][0]) { const [a, A] = K[i - 1], [b, B_] = K[i]; return A + (y - a) / (b - a) * (B_ - A); } return y; };
  const ARMY = lerpMap([[612, 612], [800, 850], [1022, 1028]]), LEGY = lerpMap([[760, 760], [832, 800], [1170, 1205], [1555, 1585], [1650, 1650]]);
  const WA = pts => pts.map(([x, y]) => [x, ARMY(y)]), WL = pts => pts.map(([x, y]) => [x, LEGY(y)]);
  const WP = pts => pts.map(([x, y]) => [x, Math.abs(x) >= 150 && y > 600 ? ARMY(y) : y > 840 || (y > 760 && Math.abs(x) > 40) ? LEGY(y) : y]); // vessels / nerves running into the limbs
  const sym = half => [...half, ...mir(half).reverse()]; // half = person's left side (x > 0) from top to bottom
  const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const along = (pts, s) => { for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= l) { const u = s / l; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; } s -= l; } return pts[pts.length - 1]; };

  // ---------- the female body (proportions for a 1.65 m adult) ----------
  const BUILD = {};
  BUILD.female = () => {
    const parts = []; const add = (id, layer, path, o = {}) => { const q = { id, layer, path, ...o }; parts.push(q); return q; };
    const lines = []; // stroked tubes: vessels, nerves, cord {id, layer, pts, w, col, kind}
    const tube = (id, layer, pts, w, kind) => { const q = { id, layer, pts, w, kind, path: smooth(pts, false), L: plen(pts) }; lines.push(q); return q; };
    // --- skin silhouette (union of smooth shapes) ---
    const sk = new Path2D();
    ell(0, 112, 74, 112, 0, sk);                                  // head 22 cm tall (vertex to chin), 15 cm wide
    sk.addPath(smooth(sym([[38, 200], [42, 262], [150, 292], [178, 318], [178, 360], [150, 420], [132, 520], [118, 610], [140, 720], [172, 800], [178, 860], [150, 900], [20, 900]]))); // neck, shoulders, chest, waist (~0.68 of hip), hips
    for (const s of [1, -1]) {
      cap(s * 165, 330, 46, s * 200, 612, 36, sk);                // upper arm (elbow at ~0.37 H)
      cap(s * 200, 612, 36, s * 222, 850, 25, sk);                // forearm (wrist ~0.515 H from the top)
      sk.addPath(smooth([[s * 204, 842], [s * 246, 848], [s * 262, 905], [s * 250, 1000], [s * 232, 1028], [s * 214, 1000], [s * 200, 930]])); // hand ~178 mm, fingertips ~0.62 H
      cap(s * 95, 815, 92, s * 72, 1205, 52, sk);                  // thigh (knee joint ~0.27 H above the floor)
      sk.addPath(smooth(WL([[s * 30, 1160], [s * 118, 1170], [s * 120, 1290], [s * 98, 1450], [s * 82, 1560], [s * 46, 1565], [s * 30, 1440], [s * 26, 1290]]))); // lower leg with calf
      sk.addPath(smooth([[s * 40, 1575], [s * 92, 1578], [s * 112, 1630], [s * 100, 1650], [s * 30, 1650], [s * 30, 1610]])); // foot (front view)
    }
    add('skin', 'skin', sk, { fill: '#8fd0e8', stroke: '#9ff5ea' });
    // external anatomy (skin layer): plain clinical lines, front view
    const SKF = { stroke: '#d8fffa', lw: 2.2, fill: null, ext: true };
    const RG = (g, x, y, r0, r1, stops) => { const G = g.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) G.addColorStop(o, c); return G; };
    add('face', 'skin', (() => { const p = new Path2D(); for (const s of [1, -1]) { ell(s * 28, 115, 14, 6, 0, p); ell(s * 75, 130, 7, 26, 0, p); p.moveTo(s * 14, 100); p.quadraticCurveTo(s * 28, 92, s * 44, 100); } p.moveTo(0, 125); p.lineTo(-7, 160); p.lineTo(7, 160); p.moveTo(-18, 186); p.quadraticCurveTo(0, 192, 18, 186); return p; })(), { ...SKF, lw: 1.8, hitR: [0, 150, 60, 70] });
    for (const s of [1, -1]) {
      // collarbone (clavicle) under the skin: a gentle S from the base of the neck to the shoulder tip
      add('collar', 'skin', (() => { const p = new Path2D(); p.moveTo(s * 16, 300); p.bezierCurveTo(s * 50, 312, s * 90, 290, s * 140, 296); return p; })(), { ...SKF, hitE: [s * 78, 300, 64, 14] });
      // breast: rounded mound over the chest muscle, lower crease (inframammary fold) and outer edge
      const br = (() => { const p = new Path2D(); p.moveTo(s * 46, 462); p.bezierCurveTo(s * 50, 492, s * 72, 502, s * 98, 501); p.bezierCurveTo(s * 132, 500, s * 150, 472, s * 146, 422); return p; })();
      add('breast', 'skin', br, { ...SKF, lw: 2.6, hitE: [s * 94, 452, 56, 50],
        shade: g => { g.fillStyle = RG(g, s * 92, 440, 6, 62, [[0, 'rgba(210,255,250,.30)'], [.65, 'rgba(120,220,230,.14)'], [1, 'rgba(10,40,60,0)']]); g.beginPath(); g.ellipse(s * 94, 455, 54, 46, 0, 0, 6.29); g.fill();
          g.fillStyle = 'rgba(5,30,45,.35)'; g.beginPath(); g.moveTo(s * 50, 478); g.bezierCurveTo(s * 64, 500, s * 128, 504, s * 144, 470); g.bezierCurveTo(s * 130, 496, s * 66, 496, s * 50, 478); g.fill(); } });
      // areola (~4 cm across) and nipple (~1 cm)
      add('nipple', 'skin', (() => { const p = ell(s * 95, 458, 18, 18); ell(s * 95, 458, 5.5, 5.5, 0, p); return p; })(), { ...SKF, stroke: '#ffd0dc', lw: 2.2, hitE: [s * 95, 458, 20, 20],
        shade: g => { g.fillStyle = 'rgba(255,170,190,.42)'; g.beginPath(); g.arc(s * 95, 458, 18, 0, 6.29); g.fill(); g.fillStyle = 'rgba(255,205,215,.95)'; g.beginPath(); g.arc(s * 95, 458, 5.5, 0, 6.29); g.fill(); } });
      // knee: kneecap (patella) outline and the soft crease below it
      add('knee', 'skin', (() => { const p = ell(s * 74, 1148, 22, 28); p.moveTo(s * 50, 1188); p.quadraticCurveTo(s * 74, 1198, s * 98, 1188); return p; })(), { ...SKF, lw: 1.8, hitE: [s * 74, 1150, 34, 44],
        shade: g => { g.fillStyle = RG(g, s * 74, 1144, 2, 30, [[0, 'rgba(210,255,250,.28)'], [1, 'rgba(10,40,60,0)']]); g.beginPath(); g.arc(s * 74, 1148, 30, 0, 6.29); g.fill(); } });
    }
    // sternum notch + midline of the chest and belly (linea alba), faint
    add('navel', 'skin', (() => { const p = ell(0, 660, 6, 9); p.moveTo(0, 520); p.lineTo(0, 640); return p; })(), { ...SKF, lw: 2, hitE: [0, 660, 16, 18],
      shade: g => { g.fillStyle = 'rgba(5,30,45,.7)'; g.beginPath(); g.ellipse(0, 661, 5, 8, 0, 0, 6.29); g.fill(); } });
    // groin creases (inguinal) and the mons pubis: a rounded pad of fat over the pubic bone
    add('mons', 'skin', (() => { const p = new Path2D(); for (const s of [1, -1]) { p.moveTo(s * 128, 770); p.quadraticCurveTo(s * 66, 812, s * 22, 852); } p.moveTo(-46, 830); p.quadraticCurveTo(0, 812, 46, 830); return p; })(), { ...SKF, lw: 2, hitE: [0, 832, 44, 20],
      shade: g => { g.fillStyle = RG(g, 0, 832, 4, 50, [[0, 'rgba(210,255,250,.26)'], [1, 'rgba(10,40,60,0)']]); g.beginPath(); g.ellipse(0, 834, 48, 26, 0, 0, 6.29); g.fill(); } });
    add('vulva', 'skin', (() => { const p = new Path2D(); p.moveTo(-12, 856); p.bezierCurveTo(-19, 874, -10, 892, 0, 898); p.bezierCurveTo(10, 892, 19, 874, 12, 856); p.moveTo(0, 860); p.lineTo(0, 894); return p; })(), { ...SKF, stroke: '#ffd0dc', lw: 2.2, hitE: [0, 877, 24, 24],
      shade: g => { g.fillStyle = 'rgba(255,150,180,.22)'; g.beginPath(); g.ellipse(0, 877, 13, 21, 0, 0, 6.29); g.fill(); } });
    // --- skeleton ---
    const BONE = { fill: '#e9e1cc', stroke: '#fff6dc' };
    const skull = new Path2D(); ell(0, 100, 68, 92, 0, skull); skull.addPath(smooth([[-50, 150], [-46, 196], [-20, 222], [20, 222], [46, 196], [50, 150]]));
    add('skull', 'bone', skull, { ...BONE, extra: g => { g.fillStyle = '#1a1420'; for (const s of [1, -1]) { g.beginPath(); g.ellipse(s * 28, 115, 17, 14, 0, 0, 6.28); g.fill(); } g.beginPath(); g.moveTo(-8, 160); g.lineTo(8, 160); g.lineTo(0, 140); g.fill(); g.strokeStyle = '#1a1420'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 200); g.lineTo(26, 200); g.stroke(); } });
    { const sp = new Path2D(); const v = []; for (let i = 0; i < 24; i++) { const y = i < 7 ? 210 + i * 12 : i < 19 ? 294 + (i - 7) * 23 : 570 + (i - 19) * 33, h = i < 7 ? 10 : i < 19 ? 20 : 29, w = i < 7 ? 26 : i < 19 ? 32 + (i - 7) : 46; v.push([y, h, w]); sp.rect(-w / 2, y, w, h); }
      sp.addPath(smooth([[-50, 740], [50, 740], [30, 830], [0, 850], [-30, 830]])); add('spine', 'bone', sp, { ...BONE, back: true }); }
    { const rb = new Path2D(), OW = [58, 76, 90, 101, 109, 114, 117, 118, 116, 110, 100, 88]; // v10: outer half-width of each rib (mm): cage ~23–24 cm wide, inside the body outline
      for (let i = 0; i < 12; i++) { const y0 = 300 + i * 22, w = OW[i], dy = 40 + i * 6, front = i < 7 ? 16 : i < 10 ? 40 + (i - 7) * 18 : w * .8;
        for (const s of [1, -1]) { const r = smooth([[s * 14, y0], [s * w * .8, y0 + dy * .12], [s * w, y0 + dy * .6], [s * (front + (w - front) * .55), y0 + dy * 1.15], [s * Math.max(18, front), y0 + dy * (i < 10 ? 1.3 : 1.1)]], false); rb.addPath(r); } }
      add('ribs', 'bone', rb, { stroke: '#f2ead8', lw: 7, line: true, alpha: .8 }); }
    add('sternum', 'bone', smooth([[-16, 318], [16, 318], [13, 400], [11, 470], [0, 492], [-11, 470], [-13, 400]]), BONE);
    for (const s of [1, -1]) {
      add('clavicle', 'bone', cap(s * 16, 312, 8, s * 150, 300, 9), BONE);
      add('humerus', 'bone', (() => { const p = cap(s * 168, 330, 14, s * 197, 598, 11); ell(s * 162, 328, 26, 26, 0, p); ell(s * 198, 600, 26, 13, 0, p); return p; })(), BONE);
      // forearm in the anatomical position (palm forward): radius on the thumb (outer) side, ulna on the inner side, side by side
      add('radius', 'bone', (() => { const p = cap(s * 186, 615, 8, s * 206, 845, 7); cap(s * 210, 612, 8, s * 236, 842, 10, p); return p; })(), BONE);
      // hand ~178 mm: carpals, 5 metacarpals, fingers; palm faces forward so the THUMB is on the outside (away from the body)
      add('hand', 'bone', (() => { const p = ell(s * 222, 866, 24, 14); for (let f = 0; f < 4; f++) { const x0 = s * (206 + f * 10), y0 = 882, mc = [62, 66, 68, 66][f], fl = [58, 72, 80, 74][f], ang = (f - 1.5) * .05 * s; // little, ring, middle, index
          const x1 = x0 + Math.sin(ang) * mc, y1 = y0 + mc * .95; cap(x0, y0, 4.5, x1, y1, 4, p); cap(x1, y1, 3.8, x1 + Math.sin(ang) * fl, y1 + fl * .92, 3, p); }
        const tx = s * 244, ty = 874, ta = .5 * s; cap(tx, ty, 5, tx + Math.sin(ta) * 44, ty + 40, 4.5, p); cap(tx + Math.sin(ta) * 44, ty + 40, 4, tx + Math.sin(ta) * 62, ty + 86, 3.2, p); return p; })(), BONE); // thumb
      add('femur', 'bone', (() => { const p = ell(s * 92, 800, 23, 23); cap(s * 92, 800, 15, s * 150, 822, 18, p); cap(s * 142, 830, 16, s * 64, 1190, 13, p); ell(s * 66, 1198, 40, 17, 0, p); return p; })(), BONE); // ~42 cm, the longest bone
      add('patella', 'bone', ell(s * 68, 1172, 22, 25), BONE);
      add('tibia', 'bone', (() => { const p = cap(s * 60, 1222, 22, s * 52, 1578, 14); cap(s * 102, 1226, 9, s * 88, 1578, 9, p); return p; })(), BONE); // ~36 cm, shorter than the femur
      add('foot', 'bone', (() => { const p = ell(s * 66, 1592, 30, 13); for (let f = 0; f < 5; f++) cap(s * (42 + f * 13), 1606, 6, s * (40 + f * 15), 1644, 4.5, p); return p; })(), BONE);
    }
    add('pelvis', 'bone', (() => { const p = new Path2D(); for (const s of [1, -1]) p.addPath(smooth([[s * 30, 740], [s * 110, 690], [s * 150, 720], [s * 140, 790], [s * 112, 812], [s * 92, 848], [s * 54, 880], [s * 14, 880], [s * 30, 850], [s * 66, 832], [s * 70, 790]])); return p; })(), { ...BONE, holes: true });
    // --- organs ---
    add('brain', 'organ', ell(0, 64, 64, 56), { fill: '#ff9ad6', stroke: '#ffc0e6', extra: g => { g.strokeStyle = 'rgba(120,30,80,.55)'; g.lineWidth = 1.6; const R = rng(5); for (let i = 0; i < 40; i++) { const x = (R() - .5) * 100, y = 22 + R() * 80; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + (R() - .5) * 20, x + 18 * (R() - .5), y + 14); g.stroke(); } g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 118); g.stroke(); } });
    for (const s of [1, -1]) add('eye', 'organ', ell(s * 28, 115, 12, 12), { fill: '#f4f8ff', stroke: '#7fd7ff', extra: g => { g.fillStyle = '#3d7bd8'; g.beginPath(); g.arc(s * 28, 115, 5, 0, 6.28); g.fill(); } });
    add('thyroid', 'organ', (() => { const p = ell(-14, 268, 11, 18, .2); ell(14, 268, 11, 18, -.2); ell(14, 268, 11, 18, -.2, p); return p; })(), { fill: '#ff8a5a', stroke: '#ffb08a' });
    const lungR = smooth([[-40, 290], [-20, 320], [-14, 420], [-30, 520], [-80, 540], [-128, 548], [-130, 430], [-100, 330], [-62, 290]]); // person's right: 3 lobes
    const lungL = smooth([[42, 290], [30, 330], [40, 400], [80, 440], [60, 470], [40, 525], [80, 548], [128, 552], [132, 430], [104, 330], [64, 290]]); // left: 2 lobes + cardiac notch
    add('lungs', 'organ', lungR, { fill: '#ff8fa8', stroke: '#ffc0cf', breathe: true, extra: g => { g.strokeStyle = 'rgba(140,40,70,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-28, 360); g.quadraticCurveTo(-80, 420, -128, 470); g.moveTo(-70, 420); g.lineTo(-126, 430); g.stroke(); } });
    add('lungs', 'organ', lungL, { fill: '#ff8fa8', stroke: '#ffc0cf', breathe: true, extra: g => { g.strokeStyle = 'rgba(140,40,70,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(54, 345); g.quadraticCurveTo(100, 430, 120, 540); g.stroke(); } });
    add('heart', 'organ', smooth([[-34, 392], [0, 380], [40, 395], [80, 440], [88, 478], [60, 500], [10, 506], [-30, 488], [-46, 440]]), { fill: '#ff4d5e', stroke: '#ff9aa6', beat: [22, 446], extra: g => heartInside(g) }); // apex to the person's left, 5th intercostal space
    add('liver', 'organ', smooth([[-138, 520], [-60, 505], [20, 512], [70, 535], [40, 560], [-20, 600], [-90, 640], [-130, 630], [-145, 580]]), { fill: '#a04838', stroke: '#e07a62' });
    add('gall', 'organ', ell(-62, 612, 12, 22, .4), { fill: '#3dbf6a', stroke: '#8affb0' });
    add('stomach', 'organ', smooth([[40, 545], [80, 528], [118, 548], [124, 600], [100, 650], [50, 660], [10, 640], [6, 620], [40, 630], [76, 615], [82, 580], [60, 560]]), { fill: '#ff9e8a', stroke: '#ffcbb8' });
    add('spleen', 'organ', ell(128, 580, 20, 50, .3), { fill: '#7a2a5a', stroke: '#c75a9a' });
    add('pancreas', 'organ', smooth([[-40, 605], [10, 590], [70, 583], [108, 590], [70, 605], [10, 615], [-36, 627]]), { fill: '#ffd07a', stroke: '#fff0b8', back: true });
    add('kidney', 'organ', (() => { const p = new Path2D(); ell(-68, 612, 26, 52, -.15, p); ell(66, 598, 26, 52, .15, p); return p; })(), { fill: '#b8405a', stroke: '#ff8aa6', back: true }); // v10: T12–L3, right one ~1.5 cm lower
    { const R = rng(9), pts = []; let x = -60, y = 690, d = 1; for (let row = 0; row < 7; row++) { for (let k = 0; k <= 8; k++) pts.push([x + d * k * 15, y + Math.sin(k * 1.6 + row) * 6]); x += d * 120; d = -d; y += 17; } // coils
      add('smallint', 'organ', smooth(pts, false), { stroke: '#ffb0a0', lw: 15, line: true, under: '#d8706a' }); }
    add('largeint', 'organ', smooth([[-92, 800], [-102, 760], [-108, 660], [-80, 645], [0, 668], [80, 640], [112, 660], [110, 760], [92, 806], [40, 820], [10, 846]], false), { stroke: '#d89060', lw: 26, line: true, under: '#a8603a', haustra: true });
    add('uterus', 'organ', smooth([[-27, 795], [27, 795], [31, 815], [14, 850], [-14, 850], [-31, 815]]), { fill: '#ff7aa8', stroke: '#ffb8d0' });   // body ~5.5 cm + cervix ~2.5 cm
    add('cervix', 'organ', smooth([[-11, 846], [11, 846], [10, 874], [-10, 874]]), { fill: '#ff94b8', stroke: '#ffc8da' });
    add('vagina', 'organ', cap(0, 872, 9, 0, 904, 8), { fill: '#e8789c', stroke: '#ffb8d0' });
    add('tube', 'organ', (() => { const p = new Path2D(); for (const s of [1, -1]) cap(s * 26, 800, 3, s * 62, 790, 4, cap(s * 62, 790, 4, s * 80, 808, 6, p)); return p; })(), { fill: '#ff9ac4', stroke: '#ffc8da' });
    add('ovary', 'organ', (() => { const p = ell(-66, 812, 15, 9, .3); ell(66, 812, 15, 9, -.3, p); return p; })(), { fill: '#ffb8d0', stroke: '#ffe0ec' });
    add('bladder', 'organ', ell(0, 862, 30, 22), { fill: '#ffe08a', stroke: '#fff4c0', alpha: .45 });
    for (const s of [1, -1]) add('mammary', 'organ', ell(s * 94, 450, 50, 42), { fill: 'rgba(255,214,170,.35)', stroke: '#ffd6aa', extra: g => { const R = rng(s > 0 ? 3 : 4); g.strokeStyle = '#ffe2c0'; g.lineWidth = 1.4; g.fillStyle = 'rgba(255,190,140,.75)';
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, r = 28 + R() * 10, x = s * 94 + Math.cos(a) * r, y = 452 + Math.sin(a) * r * .8; g.beginPath(); g.moveTo(s * 95, 455); g.lineTo(x, y); g.stroke(); for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(x + (R() - .5) * 8, y + (R() - .5) * 8, 3, 0, 6.283); g.fill(); } } } });
    // --- muscles (front, surface) ---
    const MU = { fill: '#c0394a', stroke: '#ff8a96', fib: true };
    for (const s of [1, -1]) {
      add('scm', 'muscle', cap(s * 40, 190, 10, s * 18, 305, 9), MU);
      add('deltoid', 'muscle', smooth([[s * 120, 300], [s * 175, 296], [s * 210, 350], [s * 196, 440], [s * 168, 410], [s * 150, 340]]), MU);
      add('pec', 'muscle', smooth([[s * 18, 320], [s * 120, 310], [s * 160, 360], [s * 150, 400], [s * 100, 430], [s * 30, 440], [s * 16, 400]]), MU);
      add('biceps', 'muscle', cap(s * 180, 420, 26, s * 196, 585, 15), MU);
      add('forearm', 'muscle', cap(s * 200, 625, 30, s * 220, 825, 16), MU);
      add('oblique', 'muscle', smooth([[s * 60, 460], [s * 125, 470], [s * 122, 600], [s * 140, 715], [s * 70, 720], [s * 62, 600]]), MU);
      add('quads', 'muscle', smooth(WL([[s * 130, 860], [s * 170, 900], [s * 160, 1060], [s * 120, 1140], [s * 70, 1130], [s * 60, 1000], [s * 100, 900]])), MU);
      add('sartorius', 'muscle', cap(s * 140, 810, 12, s * 42, 1205, 10), { ...MU, fill: '#d24a5a' });
      add('adductor', 'muscle', smooth(WL([[s * 20, 885], [s * 70, 880], [s * 75, 1000], [s * 60, 1080], [s * 30, 960]])), MU);
      add('tibant', 'muscle', cap(s * 80, 1245, 20, s * 62, 1530, 8), MU);
      add('calf', 'muscle', smooth(WL([[s * 34, 1200], [s * 70, 1205], [s * 60, 1360], [s * 40, 1400], [s * 30, 1300]])), { ...MU, fill: '#a82e3e' });
    }
    add('abs', 'muscle', (() => { const p = new Path2D(); for (const s of [1, -1]) for (let k = 0; k < 4; k++) { const y = 470 + k * (k < 3 ? 70 : 60), h = k < 3 ? 62 : 150; p.addPath(smooth([[s * 6, y], [s * 56, y], [s * 54, y + h], [s * 6, y + h]])); } return p; })(), MU);
    // --- blood vessels (mapped main ones; mm) ---
    const A = (pts, w, id = 'artery') => tube(id, 'vessel', WP(pts), w, 'a'), V = (pts, w) => tube('vein', 'vessel', WP(pts), w, 'v');
    A([[12, 386], [8, 366], [-2, 350], [24, 346], [34, 372], [32, 392]], 26, 'aorta'); A([[32, 392], [24, 430], [16, 520], [12, 560], [10, 700]], 24, 'aorta').back = true; // v10: leaves the heart at the top (aortic valve), passes BEHIND it   // ascending, arch, descending; splits near the navel (L4)
    for (const s of [1, -1]) {
      A([[s * 10, 360], [s * 28, 300], [s * 34, 230], [s * 40, 160]], 8);                                     // common carotid
      A([[s * 18, 356], [s * 90, 318], [s * 160, 340], [s * 186, 450], [s * 198, 600], [s * 202, 640], [s * 216, 790], [s * 222, 820]], 7); // subclavian › axillary › brachial › radial
      A([[s * 198, 620], [s * 226, 790], [s * 232, 822]], 5);                                                   // ulnar
      A([[s * 2, 700], [s * 50, 760], [s * 80, 840], [s * 92, 900], [s * 70, 1100], [s * 55, 1190], [s * 62, 1250], [s * 64, 1540], [s * 70, 1600]], 9); // iliac › femoral › popliteal › tibial
      V([[s * 46, 160], [s * 48, 260], [s * 34, 340]], 11);                                                     // internal jugular
      V([[-14, 340], [s * 100, 326], [s * 172, 350], [s * 192, 600], [s * 212, 780]], 7);                      // subclavian › cephalic/brachial
      V([[-16, 560], [-16, 700], [s * 40, 760], [s * 66, 840], [s * 74, 900], [s * 56, 1100], [s * 44, 1250], [s * 40, 1540], [s * 52, 1590]], 9); // iliac › femoral › great saphenous (inner leg)
    }
    V([[-18, 340], [-24, 398]], 20); V([[-26, 492], [-16, 540], [-16, 700]], 22); // superior and inferior vena cava (person's right of the aorta)
    // --- nerves ---
    const N = (pts, w, id = 'nerve') => tube(id, 'nerve', WP(pts), w, 'n');
    N([[0, 170], [0, 300], [0, 590]], 10, 'cord').back = true; for (let k = -2; k <= 2; k++) N([[0, 590], [k * 7, 700], [k * 14, 820]], 3, 'cord').back = true;
    for (const s of [1, -1]) {
      N([[s * 8, 300], [s * 80, 310], [s * 160, 360], [s * 180, 460], [s * 196, 610], [s * 214, 790], [s * 220, 860]], 4, 'median');
      N([[s * 160, 370], [s * 200, 470], [s * 214, 610], [s * 234, 800], [s * 242, 870]], 3, 'median');
      N([[s * 20, 820], [s * 80, 880], [s * 100, 1000], [s * 86, 1150]], 9, 'sciatic'); N([[s * 86, 1150], [s * 60, 1300], [s * 58, 1540], [s * 66, 1610]], 5, 'sciatic'); N([[s * 86, 1150], [s * 104, 1200], [s * 86, 1400], [s * 76, 1560]], 3, 'sciatic');
      N([[s * 40, 760], [s * 92, 860], [s * 100, 960], [s * 90, 1080]], 4); // femoral nerve
    }
    // v10 heart: textbook cut-away (coronal section) with 4 chambers, the septum and 4 valves; each is its own tappable part
    const HS = [], hs = (id, path, o = {}) => { const q = { id, layer: 'organ', path, sub: 'heart', ...o }; HS.push(q); return q; };
    hs('h_tri', ell(-16, 462, 11, 5), { valve: [-16, 462, 'av'] }); hs('h_mit', ell(46, 430, 11, 5), { valve: [46, 430, 'av'] });
    hs('h_pulm', ell(2, 446, 9, 5), { valve: [2, 446, 'sl'] }); hs('h_aov', ell(16, 412, 9, 5), { valve: [16, 412, 'sl'] });
    hs('h_sep', smooth([[27, 432], [33, 432], [34, 500], [26, 500]]), { fill: '#c23a4a' });
    hs('h_ra', ell(-20, 432, 20, 30), { fill: '#6a5ad8' }); hs('h_la', ell(50, 414, 20, 12), { fill: '#ff6b7a' });
    hs('h_rv', smooth([[-24, 468], [4, 454], [24, 462], [26, 496], [10, 504], [-22, 486]]), { fill: '#5a6ce0' });
    hs('h_lv', smooth([[36, 434], [66, 442], [84, 474], [62, 496], [36, 500], [36, 466]]), { fill: '#ff5468' });
    return { parts, lines, H, HS };
  };

  // ---------- state ----------
  let oc = null, og = null, root, cv, cx, hc, raf = 0, alive = false, B = null, cam = { x: 0, y: H / 2, z: .4 }, anim = null, sel = null, layer = 1, t = 0, last = 0, fps = 0, fpsN = 0, fpsT = 0, opts = {}, sex = 'female';
  const ON = { skin: false, muscle: true, bone: true, organ: true, vessel: true, nerve: true }, ON0 = { ...ON };
  let crEl, hint, scl, pop, ban, onKey, banTxt = '', crumbTxt = '';
  const VW = () => cv.clientWidth, VH = () => cv.clientHeight, mob = () => innerWidth <= 600, TOP = () => mob() ? 215 : 100; // mobile: room for layer row, crumb and the note so nothing covers the head
  const fitZ = () => Math.min(VW() / 620, (VH() - TOP() - 60) / (H * 1.04)), ZMAX = 20; // finite: at most 20 px per mm
  const clampZ = z => Math.max(fitZ() * .8, Math.min(ZMAX, z));
  const w2s = (x, y) => [(x - cam.x) * cam.z + VW() / 2, (y - cam.y) * cam.z + (VH() + TOP()) / 2];
  const s2w = (X, Y) => [(X - VW() / 2) / cam.z + cam.x, (Y - (VH() + TOP()) / 2) / cam.z + cam.y];
  const ease = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
  function animTo(x, y, z, ms = 800) { anim = { f: { ...cam }, t: { x, y, z: clampZ(z) }, s: performance.now(), ms }; }
  function clampCam() { cam.z = clampZ(cam.z); cam.x = Math.max(-400, Math.min(400, cam.x)); cam.y = Math.max(-100, Math.min(H + 100, cam.y)); }
  const fit = () => { sel = null; showPop(); animTo(0, H / 2, fitZ()); };

  // ---------- generative small branches (level of detail): made only when zoomed in, cached ----------
  const BR = new Map();
  function branches(l) { if (l.kind === 'n' && l.w < 2) return []; let b = BR.get(l); if (b) return b; const R = rng(Math.round(l.L * 7 + l.w * 13)); b = [];
    const grow = (x, y, a, len, w, d) => { const pts = [[x, y]]; let h = a; for (let k = 0; k < 4; k++) { h += (R() - .5) * .5; x += Math.cos(h) * len / 4; y += Math.sin(h) * len / 4; if (!inSkin(x, y)) break; pts.push([x, y]); }
      if (pts.length < 2) return; b.push({ pts, w, d }); if (d < 1) for (let k = 0; k < 2; k++) { const [px, py] = pts[Math.min(pts.length - 1, 1 + k)]; grow(px, py, h + (k ? .7 : -.7), len * .55, w * .55, d + 1); } };
    for (let s = 25; s < l.L - 10; s += 55 + R() * 40) { const [x, y] = along(l.pts, s), [x2, y2] = along(l.pts, s + 2), a = Math.atan2(y2 - y, x2 - x) + (R() < .5 ? 1 : -1) * (.6 + R() * .5); grow(x, y, a, 26 + R() * 30, Math.max(.6, l.w * .35), 0); }
    BR.set(l, b); return b; }
  let skinPath = null; const inSkin = (x, y) => hc.isPointInPath(skinPath, x, y);

  // ---------- drawing ----------
  const HR = 70 / 60, BRE = 14 / 60; // heart 70 beats/min, breathing 14/min
  // chambers: blue = oxygen-poor side, red = oxygen-rich side. Valves: AV valves (tricuspid, mitral) open while the ventricles fill; aortic + pulmonary open while they squeeze
  function heartInside(g) { const z = cam.z, a = sm(.55, 1, z); if (a < .01) return; const sys = Math.sin(t * HR * 6.283) > 0; g.save(); g.globalAlpha *= a;
    for (const q of B.HS) { if (q.valve) continue; g.fillStyle = q.fill; g.fill(q.path); g.strokeStyle = 'rgba(255,220,225,.7)'; g.lineWidth = Math.max(.6, 1 / z); g.stroke(q.path); }
    for (const q of B.HS) { if (!q.valve) continue; const [x, y, k] = q.valve, open = k === 'sl' ? sys : !sys; g.strokeStyle = '#fff0b8'; g.lineWidth = Math.max(1, 2.2 / z); g.lineCap = 'round'; g.beginPath();
      if (open) { g.moveTo(x - 7, y - 3); g.lineTo(x - 6, y + (k === 'sl' ? -8 : 8)); g.moveTo(x + 7, y - 3); g.lineTo(x + 6, y + (k === 'sl' ? -8 : 8)); } else { g.moveTo(x - 9, y); g.lineTo(x - .5, y + (k === 'sl' ? -2 : 2)); g.moveTo(x + 9, y); g.lineTo(x + .5, y + (k === 'sl' ? -2 : 2)); } g.stroke(); }
    if (sel && B.HS.some(q => q.id === sel[0])) { const q = B.HS.find(q => q.id === sel[0]); g.globalAlpha = 1; g.strokeStyle = '#ffd36b'; g.lineWidth = Math.max(1.5, 2.5 / z); g.setLineDash([5 / z, 4 / z]); g.stroke(q.path); g.setLineDash([]); }
    g.restore(); }
  function heartHit(wx, wy) { if (cam.z < .8) return null; const h = B.parts.find(p => p.id === 'heart'); if (!hc.isPointInPath(h.path, wx, wy)) return null;
    for (const q of B.HS) if (hc.isPointInPath(q.path, wx, wy)) return q; return null; }
  function drawParts(g, lay, z, alpha) {
    for (const q of B.parts) { if (q.layer !== lay || q.ext) continue; g.save(); g.globalAlpha = alpha * (q.alpha || 1);
      if (q.beat) { const k = 1 + .045 * Math.max(0, Math.sin(t * HR * 6.283)) ** 3; g.translate(q.beat[0], q.beat[1]); g.scale(k, k); g.translate(-q.beat[0], -q.beat[1]); }
      if (q.breathe) { const k = 1 + .03 * Math.sin(t * BRE * 6.283); g.translate(0, 300); g.scale(1 + (k - 1) * .5, k); g.translate(0, -300); }
      const hot = sel && sel[0] === q.id;
      if (q.line) { if (q.under) { g.strokeStyle = q.under; g.lineWidth = q.lw + 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(q.path); } g.strokeStyle = q.stroke; g.lineWidth = q.lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(q.path);
        if (q.haustra && z > .8) { g.setLineDash([3, 9]); g.strokeStyle = q.under; g.lineWidth = q.lw * .9; g.stroke(q.path); g.setLineDash([]); } }
      else { g.fillStyle = q.fill; g.fill(q.path, 'nonzero');
        if (q.fib && z > 1) { g.save(); g.clip(q.path); g.globalAlpha *= .25 * Math.min(1, z - 1); g.strokeStyle = '#ffd0d6'; g.lineWidth = .6; g.beginPath(); for (let k = -1700; k < 1700; k += 4) { g.moveTo(k, 0); g.lineTo(k + 300, H); } g.stroke(); g.restore(); }
        if (q.extra) q.extra(g);
        g.strokeStyle = q.stroke; g.lineWidth = Math.max(1, 1.5 / z); g.stroke(q.path); }
      if (hot) { g.globalAlpha = .9; g.strokeStyle = '#ffd36b'; g.lineWidth = Math.max(2, 3 / z); g.setLineDash([8 / z, 6 / z]); g.stroke(q.path); g.setLineDash([]); }
      g.restore(); } }
  function drawLines(g, lay, z, back) { const sub = sm(.9, 2.2, z);
    for (const l of B.lines) { if (l.layer !== lay || !!l.back !== !!back) continue; const col = l.kind === 'a' ? '#ff4d5e' : l.kind === 'v' ? '#5a8cff' : '#ffe14d', hot = sel && sel[0] === l.id;
      g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = .25; g.strokeStyle = col; g.lineWidth = l.w + 6; g.stroke(l.path); g.globalAlpha = 1; g.lineWidth = l.w; g.stroke(l.path);
      if (hot) { g.strokeStyle = '#ffd36b'; g.lineWidth = Math.max(2, 2.5 / z); g.setLineDash([8 / z, 6 / z]); g.stroke(l.path); g.setLineDash([]); }
      if (sub > .01) { g.globalAlpha = sub * .85; g.strokeStyle = col; for (const b of branches(l)) { g.lineWidth = b.w; g.beginPath(); g.moveTo(...b.pts[0]); for (const p of b.pts) g.lineTo(...p); g.stroke(); } }
      // flow: blood at ~200 mm/s in big arteries (real average in the aorta), slower in veins; nerve signals shown 1/400 of real speed
      const v = l.kind === 'a' ? 200 : l.kind === 'v' ? 100 : 300, sp = 40, off = (t * v) % sp; g.globalAlpha = .9; g.fillStyle = l.kind === 'n' ? '#fff6b0' : l.kind === 'a' ? '#ffc0c8' : '#c8d8ff';
      for (let s = off; s < l.L; s += sp) { const [x, y] = along(l.pts, s); g.beginPath(); g.arc(x, y, Math.max(.8, l.w * .2), 0, 6.283); g.fill(); } g.globalAlpha = 1; } }
  const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  function frame(now) { if (!alive) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    fpsN++; if (now - fpsT > 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; root.dataset.fps = fps.toFixed(0); }
    if (anim) { const u = Math.min(1, (now - anim.s) / anim.ms), e = ease(u); cam.z = Math.exp(Math.log(anim.f.z) + (Math.log(anim.t.z) - Math.log(anim.f.z)) * e); cam.x = anim.f.x + (anim.t.x - anim.f.x) * e; cam.y = anim.f.y + (anim.t.y - anim.f.y) * e; if (u >= 1) { cam = { ...anim.t }; anim = null; } }
    const dpr = Math.min(2, devicePixelRatio || 1), w = VW(), h = VH(); if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h); const z = cam.z;
    cx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 - cam.x * z), dpr * ((h + TOP()) / 2 - cam.y * z));
    const inner = !ON.skin && (ON.muscle || ON.bone || ON.organ || ON.vessel || ON.nerve), hid = ON.skin; // skin on = opaque top layer, inner layers hidden under it
    // skin first as a soft glow body, so inner layers sit "inside" it
    if (ON.skin) { cx.globalAlpha = inner ? .16 : 1; cx.fillStyle = inner ? '#4ff3e3' : '#2a6f86'; cx.fill(skinPath); }
    if (!hid) { if (ON.bone) drawParts(cx, 'bone', z, 1);
    if (ON.nerve) drawLines(cx, 'nerve', z, true);
    if (ON.organ) { cx.save(); drawParts(cx, 'organ', z, 1); cx.restore(); }
    if (ON.vessel) drawLines(cx, 'vessel', z); if (ON.nerve) drawLines(cx, 'nerve', z);
    if (ON.muscle) drawParts(cx, 'muscle', z, ON.organ || ON.bone ? .82 : 1); }
    if (ON.skin) { if (!oc) { oc = document.createElement('canvas'); og = oc.getContext('2d'); } if (oc.width !== cv.width || oc.height !== cv.height) { oc.width = cv.width; oc.height = cv.height; }
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, oc.width, oc.height); og.setTransform(cx.getTransform()); og.lineWidth = Math.max(2.4, 5 / z); og.strokeStyle = '#9ff5ea'; og.lineJoin = 'round'; og.stroke(skinPath);
      og.globalCompositeOperation = 'destination-out'; og.fill(skinPath); og.globalCompositeOperation = 'source-over';
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.shadowColor = '#4ff3e3'; cx.shadowBlur = inner ? 0 : 12 * dpr; cx.drawImage(oc, 0, 0); cx.restore();
      if (!inner) { cx.globalAlpha = .9; const q = B.parts.find(p => p.id === 'skin'); } }
    if (ON.skin) for (const q of B.parts) { if (!q.ext) continue; cx.globalAlpha = inner ? .45 : 1; if (q.shade && !inner) q.shade(cx); if (q.fill) { cx.fillStyle = q.fill; cx.fill(q.path); } cx.strokeStyle = sel && sel[0] === q.id ? '#ffd36b' : q.stroke; cx.lineWidth = Math.max(.6, q.lw * (inner ? .6 : 1) / z); cx.shadowColor = q.stroke; cx.shadowBlur = inner ? 0 : 6; cx.lineCap = 'round'; cx.stroke(q.path); cx.shadowBlur = 0; }
    cx.globalAlpha = 1; cx.setTransform(dpr, 0, 0, dpr, 0, 0); labels(); scale(); crumb(); status(); }
  // ---------- labels ----------
  const LAB = [['brain', 0, 45], ['heart', 30, 446], ['lungs', -95, 420], ['liver', -95, 570], ['stomach', 90, 590], ['kidney', 66, 598], ['largeint', -104, 720], ['smallint', 0, 740], ['bladder', 0, 862], ['uterus', 0, 826], ['skull', 0, 30], ['ribs', 110, 470], ['pelvis', 125, 745], ['femur', 110, 1000], ['humerus', 185, 470], ['spine', 0, 520], ['aorta', 22, 600], ['cord', 0, 250], ['sciatic', 96, 1020], ['quads', 130, 980], ['pec', 90, 370], ['abs', 30, 560], ['deltoid', 185, 360], ['thyroid', 0, 268], ['spleen', 132, 560], ['ovary', 64, 818], ['tibia', 64, 1380], ['skin', -220, 500], ['breast', -150, 470], ['nipple', 95, 432], ['navel', 0, 675], ['vulva', 0, 915], ['mons', 0, 800], ['collar', 150, 312], ['knee', 112, 1150], ['face', 0, 205], ['mammary', -94, 405], ['cervix', 0, 862], ['vagina', 0, 905], ['tube', -84, 785]];
  const LMIN = { brain: .2, heart: .2, lungs: .2, liver: .2, stomach: .3, kidney: .45, largeint: .45, smallint: .5, bladder: .6, uterus: .7, skull: .3, ribs: .45, pelvis: .35, femur: .35, humerus: .5, spine: .7, aorta: .6, cord: .8, sciatic: .6, quads: .35, pec: .4, abs: .5, deltoid: .5, thyroid: .9, spleen: .7, ovary: 1, tibia: .5, skin: .2, breast: .3, nipple: .9, navel: .6, vulva: .5, mons: .6, collar: .5, knee: .5, face: .7, mammary: .6, cervix: 1.4, vagina: 1.4, tube: 1.1 };
  let labEls = {};
  function labels() { const z = cam.z, used = []; for (const [id, x, y] of LAB) { const q = B.parts.find(p => p.id === id) || B.lines.find(p => p.id === id); let el = labEls[id];
      const show = q && ON[q.layer] && z >= LMIN[id] && (q.layer === 'skin' || !ON.skin); const [X, Y] = w2s(x, y);
      const ok = show && X > 30 && X < VW() - 30 && Y > TOP() + 10 && Y < VH() - 60 && !used.some(([a, b]) => Math.abs(a - X) < 90 && Math.abs(b - Y) < 22);
      if (!ok) { if (el) el.style.display = 'none'; continue; } used.push([X, Y]);
      if (!el) { el = labEls[id] = document.createElement('div'); el.className = 'vlab'; el.textContent = P[id].n.replace(/ \(.*\)/, ''); root.appendChild(el); }
      el.style.display = 'block'; el.style.transform = `translate(${(X).toFixed(0)}px,${Y.toFixed(0)}px) translate(-50%,-50%)`; } }
  // ---------- crumb, banner, scale ----------
  function regionName(x, y) { const r = y < 230 ? 'Head' : y < 300 ? 'Neck' : Math.abs(x) > 160 && y < 1030 ? (x < 0 ? 'Right arm' : 'Left arm') : y < 520 ? 'Chest' : y < 760 ? 'Abdomen' : y < 890 ? 'Pelvis' : y < 1550 ? (x < 0 ? 'Right leg' : 'Left leg') : (x < 0 ? 'Right foot' : 'Left foot'); return r; }
  function crumb() { const z = cam.z, parts = ['Human body']; if (z > fitZ() * 1.6) parts.push(regionName(cam.x, cam.y)); if (sel) parts.push(P[sel[0]].n.replace(/ \(.*\)/, ''));
    const txt = parts.join(' › '); if (txt !== crumbTxt) { crumbTxt = txt; crEl.textContent = txt; } }
  function status() { const z = cam.z, b = z > .9 ? 'Small vessel and nerve branches appear as you zoom: a generated pattern, not mapped (simplified)' : 'Front view, real proportions for a 1.65 m adult · shapes simplified · person’s right is on your left';
    if (b !== banTxt) { banTxt = b; ban.textContent = b; } }
  const MMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]; let sclKey = '';
  function scale() { let pick = 1; for (const v of MMS) if (v * cam.z <= 140) { pick = v; break; } const len = (pick * cam.z).toFixed(0), k = len + pick; if (k === sclKey) return; sclKey = k;
    scl.innerHTML = `<i style="width:${len}px"></i>${pick >= 1000 ? pick / 1000 + ' m' : pick >= 10 ? pick / 10 + ' cm' : pick + ' mm'} <small>· true scale</small>`; }
  // ---------- picking: top visible layer first ----------
  function hit(wx, wy) { const z = cam.z, slop = 8 / z;
    const tryLines = (lay, back = false) => { for (const l of B.lines) { if (l.layer !== lay || !!l.back !== back) continue; hc.lineWidth = l.w + slop * 2; if (hc.isPointInStroke(l.path, wx, wy)) return l; } return null; };
    const tryParts = (lay, rev) => { const L = B.parts.filter(p => p.layer === lay); if (rev) L.reverse(); for (const q of L) { if (q.line) { hc.lineWidth = (q.lw || 4) + slop; if (hc.isPointInStroke(q.path, wx, wy)) return q; } else if (hc.isPointInPath(q.path, wx, wy)) return q; } return null; };
    if (!inSkin(wx, wy) && !(ON.vessel && (tryLines('vessel') || tryLines('vessel', true)))) return null;
    const ext = () => { for (const q of B.parts) { if (!q.ext) continue; const e = q.hitE || [q.hitR[0], q.hitR[1], q.hitR[2], q.hitR[3]]; if (((wx - e[0]) / e[2]) ** 2 + ((wy - e[1]) / e[3]) ** 2 < 1) return q.id === 'breast' && (((wx - e[0]) / 18) ** 2 + ((wy - 458) / 18) ** 2 < 1) ? B.parts.find(p => p.id === 'nipple') : q; } return null; };
    if (ON.skin) return ext() || B.parts[0];
    return (ON.muscle && tryParts('muscle', true)) || (ON.nerve && tryLines('nerve')) || (ON.vessel && tryLines('vessel')) || (ON.organ && (heartHit(wx, wy) || tryParts('organ', true))) || (ON.nerve && tryLines('nerve', true)) || (ON.vessel && tryLines('vessel', true)) || (ON.bone && tryParts('bone', true)) || (ON.skin && (ext() || B.parts[0])) || null; }
  function boundsOf(q) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let y = -50; y <= H + 50; y += 6) for (let x = -300; x <= 300; x += 6) { const inn = q.pts ? (hc.lineWidth = q.w + 2, hc.isPointInStroke(q.path, x, y)) : q.line ? (hc.lineWidth = q.lw, hc.isPointInStroke(q.path, x, y)) : hc.isPointInPath(q.path, x, y); if (inn) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } } return [x0, y0, x1, y1]; }
  function select(q, zoomTo) { if (!q) { sel = null; showPop(); return; } const b = boundsOf(q); sel = [q.id, b]; layer = 1; showPop();
    if (zoomTo) { const bw = Math.max(40, b[2] - b[0]), bh = Math.max(40, b[3] - b[1]); animTo((b[0] + b[2]) / 2 + (mob() ? 0 : bw * .25), (b[1] + b[3]) / 2 + (mob() ? bh * .3 : 0), Math.min(VW() * .4 / bw, (VH() - TOP() - 80) * (mob() ? .45 : .6) / bh, 2.2)); } }
  function showPop() { if (!sel) { pop.style.display = 'none'; return; } const c = P[sel[0]]; pop.style.display = 'block';
    pop.innerHTML = `<button class="x" aria-label="Close">×</button><b class="t1">${c.n}</b><div class="chip"><i style="background:${SCOL[c.s]}"></i>${SNAME[c.s]}${c.s2 ? ` · <i style="background:${SCOL[c.s2]}"></i>some parts still being studied` : ''}</div>${c.a.map(x => `<p>${x}</p>`).join('')}
      <div class="chip"><i style="background:${SCOL.t}"></i>Drawing: ${c.d || 'position and size to scale; shape simplified.'}</div>
      ${layer >= 2 ? `<div class="lay">${c.b.map(x => `<p>${x}</p>`).join('')}<div class="src">Sources: ${c.src.map(([n, u]) => srcInlineHTML(n, u)).join('')}</div></div>` : ''}
      <div class="pact">${layer < 2 ? '<button class="more">Read more ▾</button>' : ''}<span class="lv">Layer ${layer} of 2</span>${copyBtnHTML(SITE + '#body=' + encodeURIComponent(sel[0]))}${fixBtnHTML('Human Body', c.n, 'body/' + sel[0], SITE + '#body=' + encodeURIComponent(sel[0]))}</div>${cellOf(sel[0]) && opts.onCell ? `<button class="more vtocell">🔬 See its cells</button>` : ''}`;
    const tc = pop.querySelector('.vtocell'); if (tc) tc.onclick = () => { const id = sel[0], f = opts.onCell; destroy(); f(id, cellOf(id)); };
    pop.querySelector('.x').onclick = () => { sel = null; showPop(); }; const m = pop.querySelector('.more'); if (m) m.onclick = () => { layer = 2; showPop(); }; }
  const cellOf = id => typeof BODY_CELLS !== 'undefined' && (BODY_CELLS[id] || (/^h_/.test(id) && BODY_CELLS.heart) || null);
  // ---------- input ----------
  function zoomAt(X, Y, k) { const [wx, wy] = s2w(X, Y); anim = null; cam.z = clampZ(cam.z * k); const [wx2, wy2] = s2w(X, Y); cam.x += wx - wx2; cam.y += wy - wy2; clampCam(); }
  function bind() { const ptr = new Map(); let down = null, moved = false, pinch = null;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; moved = false; anim = null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const p = ptr.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch); pinch = d; moved = true; return; }
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) moved = true; if (moved) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); } });
    const up = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!moved && ptr.size === 0) { const r = cv.getBoundingClientRect(), [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top); select(hit(wx, wy), false); } }; // v10: a tap opens the card, it does not jump the zoom
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => ptr.delete(e.pointerId));
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015)); }, { passive: false });
    onKey = e => { if (!alive) return; if (e.key === 'Escape') { if (sel) { sel = null; showPop(); } else close(); } else if (e.key === '+' || e.key === '=') zoomAt(VW() / 2, VH() / 2, 1.4); else if (e.key === '-') zoomAt(VW() / 2, VH() / 2, 1 / 1.4); else if (e.key === '0') fit(); };
    addEventListener('keydown', onKey); }
  function setLayer(k, on) { ON[k] = on; const b = root.querySelector(`.vlay [data-l="${k}"]`); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); } if (sel) { const q = B.parts.find(p => p.id === sel[0]) || B.lines.find(p => p.id === sel[0]); if (q && !ON[q.layer]) { sel = null; showPop(); } } }
  // ---------- life cycle ----------
  function init(host = document.body, o = {}) { if (alive) destroy(); opts = o; alive = true; sex = 'female'; Object.assign(ON, ON0); B = BUILD[sex](); BR.clear(); skinPath = B.parts[0].path;
    root = document.createElement('div'); root.id = 'vbody'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Human Body');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">${heartSVG()} Human Body <small>v0.4</small></b><div class="vzm"><button class="vout" aria-label="Zoom out">−</button><button class="vin" aria-label="Zoom in">+</button><button class="vfit" aria-label="Show the whole body">⤢</button></div></div>` +
      `<div class="vtime vlay" role="group" aria-label="Layers">${LAYERS.map(([k, n, c]) => `<button data-l="${k}" aria-pressed="${ON[k]}" class="${ON[k] ? 'on' : ''}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>` +
      `<canvas aria-label="Human body, front view. Tap a part to learn about it."></canvas><div class="vcrumb"></div><div class="vscl"></div><div class="vban"></div><div class="vhint">Tap any part · pinch or scroll to zoom · toggle layers above</div><div class="vpop" role="dialog" aria-live="polite"></div>`;
    host.appendChild(root); const $ = s => root.querySelector(s); cv = $('canvas'); cx = cv.getContext('2d'); hc = document.createElement('canvas').getContext('2d');
    crEl = $('.vcrumb'); hint = $('.vhint'); scl = $('.vscl'); pop = $('.vpop'); ban = $('.vban'); labEls = {}; banTxt = crumbTxt = sclKey = '';
    $('.vback').onclick = close; $('.vin').onclick = () => zoomAt(VW() / 2, VH() / 2, 1.6); $('.vout').onclick = () => zoomAt(VW() / 2, VH() / 2, 1 / 1.6); $('.vfit').onclick = fit;
    root.querySelectorAll('.vlay [data-l]').forEach(b => b.onclick = () => setLayer(b.dataset.l, !ON[b.dataset.l]));
    bind(); requestAnimationFrame(() => { cam = { x: 0, y: H / 2, z: fitZ() }; if (o.focus) focus(o.focus); }); last = 0; fpsT = performance.now(); raf = requestAnimationFrame(frame); focusQuiet($('.vback')); }
  function destroy() { alive = false; cancelAnimationFrame(raf); if (onKey) removeEventListener('keydown', onKey); if (root) root.remove(); root = null; }
  function close() { destroy(); opts.onClose && opts.onClose(); }
  function focus(id) { if (!alive || !P[id]) return; const q = B.parts.find(p => p.id === id) || B.lines.find(p => p.id === id); if (!q) { /* v0.3: heart cut-away parts and whole-body cards open from a shared link too */ if (B.HS.some(h => h.id === id)) { const hq = B.parts.find(p => p.id === 'heart'); if (hq) { if (!ON[hq.layer]) setLayer(hq.layer, true); if (ON.skin) setLayer('skin', false); select(hq, true); } sel = [id, sel ? sel[1] : null]; } else sel = [id, null]; layer = 1; showPop(); return; } if (!ON[q.layer]) setLayer(q.layer, true); if (q.layer !== 'skin' && ON.skin) setLayer('skin', false); select(q, true); }
  return { init, destroy, focus, isOpen: () => alive, parts: P, w2s: (x, y) => w2s(x, y), layers: o => { if (o) for (const k in o) setLayer(k, !!o[k]); return { ...ON }; },
    go: (x, y, z) => animTo(x, y, z), pts: () => ({ breast: [94, 425], nipple: [95, 458], collar: [80, 302], knee: [74, 1150], mons: [0, 828], vulva: [0, 880], navel: [0, 660], heart: [20, 450], liver: [-90, 570], femur: [100, 1010], skin: [-150, 1000], brain: [0, 70], aorta: [11, 620] }), crumb: () => crumbTxt,
    debug: () => ({ cam: { ...cam }, sel: sel && sel[0], layer, fps, on: { ...ON }, branches: [...BR.values()].reduce((a, b) => a + b.length, 0), sex }), BUILD };
})();
