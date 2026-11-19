'use strict';
/* ===== Echo Atlas v0.9: SECTION VIEWS (one module for every section) =====
   map     = the spider Map: every card as a dot, every "builds on" link as a line, and the other sections as anchors round the edge,
             so you can see how ideas feed each other (maths → physics → chemistry → biology). From Nothing to Us, Maths, Physics, Biology.
   ring    = Physics and Biology Ring: the cards round one circle, grouped by panel, with their links across the middle.
   history = Physics and Biology History: one dated landmark per card in era columns you read top to bottom (PHYS_HIST / BIO_HIST).
   Colour = certainty (green known, orange we think, red unknown). Tap a card for its facts and sources; tap an anchor to go to that section.
   API: VSECT.init(host, { sec, mode, focus, onClose }) · destroy() · isOpen() · open(id) · state · debug() */
const VSECT = (() => {
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, WORD = { k: 'KNOWN · established', t: 'WE THINK SO · leading idea', u: 'UNKNOWN · open question' }, RK = { k: 0, t: 1, u: 2 };
  const SEC = { fntu: ['✦', 'From Nothing to Us', '#ffd36b'], maths: ['∑', 'Maths', '#4ff3e3'], physics: ['⚛', 'Physics', '#e79cff'], biology: ['🌿', 'Biology', '#5cf0a0'] };
  // other places a card can link to (cross-section kinds used in the data) → anchor on the spider Map
  const HUB = { fntu: ['fntu', '✦', 'From Nothing to Us', '#ffd36b'], maths: ['maths', '∑', 'Maths', '#4ff3e3'], ph: ['physics', '⚛', 'Physics', '#e79cff'], bio: ['biology', '🌿', 'Biology', '#5cf0a0'],
    tl: [null, '⏳', 'Big Bang to Today', '#c9a2ff'], uni: [null, '🔭', 'Universe', '#7fc8ff'], pt: [null, '▦', 'All the Elements', '#ffd36b'], cell: [null, '🧬', 'Virtual Cell', '#5cf0a0'], body: [null, '♥', 'Human Body', '#ff9ad5'] };
  const KIND_OF = { fntu: 'fntu', maths: 'maths', physics: 'ph', biology: 'bio' };
  const HUB_PAGE = { tl: '#timeline=1', uni: '#universe=1', pt: '#ptable=1', cell: '#cell=1', body: '#body=1' };
  const LANECOL = { cosmic: ['SPACE & PLANETS', '#7fc8ff'], matter: ['MATTER & CHEMISTRY', '#ffd36b'], chain: ['CHAIN THEORY', '#ffa53d'], life: ['LIFE', '#5cf0a0'] };
  const uniq = a => a.filter((r, i) => a.findIndex(q => q[0] === r[0] && q[1] === r[1]) === i);
  /* ---------- one adapter per section: cards, groups, links inside, links out ---------- */
  function data(sec) {
    if (sec === 'physics' || sec === 'biology') {
      const A = sec === 'physics' ? PHYS : BIO, C = sec === 'physics' ? PHYS_CATS : BIO_CATS, k = KIND_OF[sec];
      return { nodes: A.map(n => ({ id: n.id, name: n.name, sub: n.sub, s: n.s, g: n.cat, p: n.p, out: uniq([...n.rel, ...xsecBack(k, n.id)]) })),
        groups: Object.fromEntries(Object.entries(C).map(([g, c]) => [g, [c.name, c.col]])), raw: id => A.find(n => n.id === id) };
    }
    if (sec === 'maths') {
      const out = {}; for (const [m, u] of (typeof MATH_LINKS !== 'undefined' ? MATH_LINKS : [])) (out[m] = out[m] || []).push(['fntu', u]);
      return { nodes: MATH.map(n => ({ id: n.id, name: n.name, sub: n.sub, s: n.s, g: String(n.col), p: n.p, out: uniq([...(out[n.id] || []), ...xsecBack('maths', n.id)]) })),
        groups: Object.fromEntries(Object.entries(MATH_DOMAIN_NAMES).map(([g, c]) => [String(g), [String(c[0]).toUpperCase(), c[2]]])), raw: id => MATH_BY_ID[id] };
    }
    const back = {}; for (const [m, u] of (typeof MATH_LINKS !== 'undefined' ? MATH_LINKS : [])) (back[u] = back[u] || []).push(['maths', m]);
    return { nodes: N.map(n => ({ id: n.id, name: n.name, sub: n.line, s: n.s, g: n.lane, p: n.p, out: uniq([...(FNTU_EXPLORE[n.id] || []), ...(back[n.id] || []), ...xsecBack('fntu', n.id)]) })),
      groups: Object.fromEntries(Object.entries(LANECOL).map(([g, c]) => [g, c])), raw: id => byId[id] };
  }
  /* ---------- seeded random, so every visit gets the same picture ---------- */
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lw = n => Math.min(190, n.name.length * 7 + 10);   // label width, used to keep labels apart
  /* ---------- spider layout (computed once per section, then cached) ---------- */
  const LAYOUT = {};
  function spider(sec) {
    if (LAYOUT[sec]) return LAYOUT[sec];
    const D = data(sec), ns = D.nodes, by = {}, R = rnd(7 + sec.length * 31); ns.forEach(n => by[n.id] = n);
    const gs = Object.keys(D.groups).filter(g => ns.some(n => n.g === g)), G = gs.length, Rg = 200 + ns.length * 7;
    const gc = {}; gs.forEach((g, i) => { const a = -Math.PI / 2 + i / G * Math.PI * 2; gc[g] = [Math.cos(a) * Rg * .55, Math.sin(a) * Rg * .55]; });
    ns.forEach(n => { const c = gc[n.g] || [0, 0]; n.x = c[0] + (R() - .5) * 220; n.y = c[1] + (R() - .5) * 220; n.vx = 0; n.vy = 0; n.deg = 0; });
    const E = []; ns.forEach(n => n.p.forEach(p => { if (by[p]) { E.push({ a: p, b: n.id, s: RK[n.s] >= RK[by[p].s] ? n.s : by[p].s }); by[p].deg++; n.deg++; } }));
    // the other sections become anchors on an outer ring, at the angle of the cards that link to them
    const hubs = {}; ns.forEach(n => n.out.forEach(([k]) => { if (!HUB[k] || HUB[k][0] === sec) return; (hubs[k] = hubs[k] || []).push(n.id); }));
    for (let it = 0; it < 520; it++) {
      const T = 1 - it / 520, cool = .02 + .9 * T;
      for (let i = 0; i < ns.length; i++) { const a = ns[i];
        for (let j = i + 1; j < ns.length; j++) { const b = ns[j]; let dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy + .01, d = Math.sqrt(d2);
          const want = (lw(a) + lw(b)) / 2 + 40, f = 9000 / d2 + (d < want ? (want - d) * .5 : 0); dx /= d; dy /= d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f; } }
      for (const e of E) { const a = by[e.a], b = by[e.b]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) + .01, f = (d - 175) * .04;
        a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; }
      for (const n of ns) { const c = gc[n.g] || [0, 0]; n.vx += (c[0] - n.x) * .016 - n.x * .003; n.vy += (c[1] - n.y) * .016 - n.y * .003;
        const sp = Math.hypot(n.vx, n.vy), mx = 40 * cool; if (sp > mx) { n.vx *= mx / sp; n.vy *= mx / sp; } n.x += n.vx; n.y += n.vy; n.vx *= .55; n.vy *= .55; }
    }
    // labels sit under the dots: push apart any two whose label boxes still overlap
    const q = 1.5;
    for (let it = 0; it < 200; it++) { let moved = 0;
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const a = ns[i], b = ns[j], ox = (lw(a) + lw(b)) / 2 * q + 10 - Math.abs(a.x - b.x), oy = 40 * q - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) { moved = 1; if (ox < oy) { const s = a.x < b.x ? -1 : 1; a.x += s * ox / 2; b.x -= s * ox / 2; } else { const s = a.y < b.y ? -1 : 1; a.y += s * oy / 2; b.y -= s * oy / 2; } } }
      if (!moved) break; }
    // then the always-shown names once more, at the size they have when the whole web fits on screen
    for (let round = 0; round < 2; round++) { let rr = 0; ns.forEach(n => rr = Math.max(rr, Math.hypot(n.x, n.y))); const sFit = Math.min(1180 / (2 * rr + 860), 690 / (2 * rr + 560)), qq = Math.min(2.4, Math.max(1.5, 1 / sFit)) * 1.02;
      const dg = ns.map(n => n.deg).sort((a, b) => b - a), ct = dg[Math.min(dg.length - 1, Math.round(ns.length * .3))] || 0, B = ns.filter(n => n.deg > ct || (n.deg === ct && n.deg >= 3) || n.s === 'u');
      for (let it = 0; it < 200; it++) { let moved = 0;
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j], ox = (lw(a) + lw(b)) / 2 * qq * 1.04 + 8 - Math.abs(a.x - b.x), oy = 30 * qq - Math.abs(a.y - b.y);
          if (ox > 0 && oy > 0) { moved = 1; if (ox * .6 < oy) { const s = a.x < b.x ? -1 : 1; a.x += s * ox / 2; b.x -= s * ox / 2; } else { const s = a.y < b.y ? -1 : 1; a.y += s * oy / 2; b.y -= s * oy / 2; } } }
        if (!moved) break; } }
    const degs = ns.map(n => n.deg).sort((a, b) => b - a), cut = degs[Math.min(degs.length - 1, Math.round(ns.length * .3))] || 0; ns.forEach(n => n.big = n.deg > cut || (n.deg === cut && n.deg >= 3) || n.s === 'u');
    let rad = 0; ns.forEach(n => rad = Math.max(rad, Math.hypot(n.x, n.y))); const RH = rad + 170;
    const H = Object.entries(hubs).map(([k, ids]) => { let sx = 0, sy = 0; ids.forEach(id => { sx += by[id].x; sy += by[id].y; }); return { k, ids, a: Math.atan2(sy, sx) }; }).sort((p, q) => p.a - q.a);
    // spread the anchors so they never sit on top of each other
    const minA = Math.min(.9, Math.PI * 2 / Math.max(1, H.length)) * .92;
    for (let it = 0; it < 60; it++) for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; let d = b.a - a.a; if (i === H.length - 1) d += Math.PI * 2; if (H.length > 1 && d < minA) { a.a -= (minA - d) / 2; b.a += (minA - d) / 2; } }
    H.forEach(h => { h.x = Math.cos(h.a) * RH; h.y = Math.sin(h.a) * RH; });
    const L = { D, ns, by, E, H, RH, gc, gs }; LAYOUT[sec] = L; return L;
  }
  /* ---------- ring layout (Physics, Biology) ---------- */
  function ring(sec) {
    const key = sec + ':ring'; if (LAYOUT[key]) return LAYOUT[key];
    const D = data(sec), by = {}; D.nodes.forEach(n => by[n.id] = n);
    const dep = {}; const dOf = id => dep[id] != null ? dep[id] : (dep[id] = 0, dep[id] = by[id].p.filter(p => by[p]).length ? 1 + Math.max(...by[id].p.filter(p => by[p]).map(dOf)) : 0);
    const gs = Object.keys(D.groups), order = [];
    gs.forEach(g => D.nodes.filter(n => n.g === g).sort((a, b) => dOf(a.id) - dOf(b.id) || a.name.localeCompare(b.name)).forEach(n => order.push(n)));
    const GAP = 1.6, slots = order.length + GAP * gs.length, R = Math.max(380, slots * 86 / (Math.PI * 2));
    let k = GAP / 2; const arcs = [];
    gs.forEach(g => { const mine = order.filter(n => n.g === g); if (!mine.length) return; const a0 = k; mine.forEach(n => { n.ang = -Math.PI / 2 + (k + .5) / slots * Math.PI * 2; n.x = Math.cos(n.ang) * R; n.y = Math.sin(n.ang) * R; k++; });
      arcs.push({ g, a0: -Math.PI / 2 + (a0 - .2) / slots * Math.PI * 2, a1: -Math.PI / 2 + (k + .2) / slots * Math.PI * 2 }); k += GAP; });
    const E = []; D.nodes.forEach(n => n.p.forEach(p => { if (by[p]) E.push({ a: p, b: n.id, s: RK[n.s] >= RK[by[p].s] ? n.s : by[p].s }); }));
    const L = { D, ns: order, by, E, R, arcs }; LAYOUT[key] = L; return L;
  }
  /* ---------- state ---------- */
  let root, svg, wg, card, alive = false, opts = {}, sec = 'physics', mode = 'map', L = null, cam = { s: 1, tx: 0, ty: 0 }, sel = null, hov = null, drag = null, pts = new Map(), pinch = 0, anim = 0, onKey, onResize, moved = 0;
  const TOP = 0, vw = () => root.clientWidth, vh = () => root.clientHeight;
  const T = (x, y, s, cls, extra = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" ${extra}>${esc(s)}</text>`;
  /* ---------- drawing ---------- */
  function nodeSVG(n, r) { const c = SCOL[n.s], u = n.s === 'u', gcol = (L.D.groups[n.g] || ['', '#9fb4d0'])[1];
    return `<g class="vsn${n.big ? ' big' : ''}" data-id="${esc(n.id)}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(n.name)}">
      <circle class="vsh" r="${r + 9}" fill="${c}" opacity=".10"/><circle r="${r}" fill="#0a1226" stroke="${c}" stroke-width="2.4"${u ? ' stroke-dasharray="4 3"' : ''}/>
      <circle r="${Math.max(3, r * .36)}" fill="${gcol}" opacity=".9"/>${u ? `<path d="M${-r * .5} ${-r * .5}L${r * .5} ${r * .5}M${r * .5} ${-r * .5}L${-r * .5} ${r * .5}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>` : ''}
      <text class="vsl" y="${r + 17}" text-anchor="middle">${esc(n.name)}</text></g>`; }
  const curve = (a, b, bend) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y; return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`; };
  function drawMap() {
    L = spider(sec); const { ns, by, E, H, RH, gc } = L; let h = '';
    // the web: soft rings and spokes behind everything
    h += '<g class="vsweb">'; for (let i = 1; i <= 4; i++) h += `<circle r="${(RH * i / 4).toFixed(0)}" fill="none"/>`;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; h += `<line x1="0" y1="0" x2="${(Math.cos(a) * RH).toFixed(0)}" y2="${(Math.sin(a) * RH).toFixed(0)}"/>`; } h += '</g>';
    // group names sit just outside their own cluster, on the side facing away from the middle
    h += '<g class="vsgrp">'; for (const g of L.gs) { const ms = ns.filter(n => n.g === g); if (!ms.length) continue; let x = 0, y = 0; ms.forEach(n => { x += n.x; y += n.y; }); x /= ms.length; y /= ms.length;
      const a = Math.atan2(y, x), ext = Math.max(...ms.map(n => n.x * Math.cos(a) + n.y * Math.sin(a))) + 70, px = -Math.sin(a), py = Math.cos(a);
      const side = ms.reduce((m, n) => m + (n.x * px + n.y * py), 0) / ms.length, lx = Math.cos(a) * ext + px * side * .0, ly = Math.sin(a) * ext + py * side * .0;
      const [name, col] = L.D.groups[g]; if (L.gs.length <= 6) h += T(lx, ly, name, 'vsgl', `text-anchor="${Math.cos(a) > .35 ? 'start' : Math.cos(a) < -.35 ? 'end' : 'middle'}" fill="${col}"`); } h += '</g>';
    h += '<g class="vsx">'; for (const hb of H) { const col = HUB[hb.k][3]; for (const id of hb.ids) { const n = by[id]; h += `<path class="vse vsxe" data-a="${esc(id)}" data-b="hub:${hb.k}" d="${curve(n, hb, .12)}" stroke="${col}"/>`; } } h += '</g>';
    h += '<g class="vsin">'; for (const e of E) { const a = by[e.a], b = by[e.b]; h += `<path class="vse vsie s-${e.s}" data-a="${esc(e.a)}" data-b="${esc(e.b)}" d="${curve(a, b, .08)}" stroke="${SCOL[e.s]}" marker-end="url(#vsar-${e.s})"/>`; } h += '</g>';
    h += '<g>'; for (const n of ns) h += nodeSVG(n, 11 + Math.min(8, Math.sqrt(n.deg) * 2.6)); h += '</g>';
    h += '<g>'; for (const hb of H) { const [to, ic, name, col] = HUB[hb.k], w = name.length * 8.2 + 52;
      h += `<g class="vshub" data-hub="${hb.k}" style="transform:translate(${hb.x.toFixed(1)}px,${hb.y.toFixed(1)}px) scale(var(--hs,1))" tabindex="0" role="button" aria-label="${esc(name)}: ${hb.ids.length} link${hb.ids.length > 1 ? 's' : ''}${to ? ', open its Map' : ', open it'}">
        <rect x="${-w / 2}" y="-19" width="${w}" height="38" rx="19" fill="#071226" stroke="${col}" stroke-width="2"/><text x="${-w / 2 + 20}" y="6" text-anchor="middle" fill="${col}" class="vshi">${ic}</text>
        <text x="${-w / 2 + 36}" y="5.5" fill="#f0f6ff" class="vshn">${esc(name)}</text><text y="36" text-anchor="middle" class="vshc" fill="${col}">${hb.ids.length} link${hb.ids.length > 1 ? 's' : ''} ↗</text></g>`; } h += '</g>';
    wg.innerHTML = h; return [-RH - 260, -RH - 120, RH + 260, RH + 120];
  }
  function drawRing() {
    L = ring(sec); const { ns, by, E, R, arcs } = L; let h = '';
    const arc = (r, a0, a1) => `M${(Math.cos(a0) * r).toFixed(1)} ${(Math.sin(a0) * r).toFixed(1)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)}`;
    h += `<circle r="${R}" fill="none" stroke="#24405f" stroke-opacity=".5" stroke-width="1"/>`;
    // each panel is a coloured arc; its name runs along the inside of the arc (turned so it never reads upside down)
    const arcR = (r, a0, a1) => `M${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${(Math.cos(a0) * r).toFixed(1)} ${(Math.sin(a0) * r).toFixed(1)}`;
    arcs.forEach((A, i) => { const [name, col] = L.D.groups[A.g], am = (A.a0 + A.a1) / 2, low = Math.sin(am) > 0.2;
      h += `<path d="${arc(R, A.a0, A.a1)}" fill="none" stroke="${col}" stroke-opacity=".16" stroke-width="44" stroke-linecap="round"/><path d="${arc(R + 30, A.a0, A.a1)}" fill="none" stroke="${col}" stroke-opacity=".55" stroke-width="2"/>`;
      h += `<path id="vsarc${i}" d="${low ? arcR(R - 40, A.a0, A.a1) : arc(R - 52, A.a0, A.a1)}" fill="none"/><text class="vsgl vsarcl" fill="${col}" data-fm="${((low ? R - 40 : R - 52) * (A.a1 - A.a0) * .92 / (name.length * .78 + 1)).toFixed(1)}"><textPath href="#vsarc${i}" startOffset="50%" text-anchor="middle">${esc(name)}</textPath></text>`; });
    for (const e of E) { const a = by[e.a], b = by[e.b], mx = (a.x + b.x) / 2 * .32, my = (a.y + b.y) / 2 * .32;
      h += `<path class="vse vsie s-${e.s}" data-a="${esc(e.a)}" data-b="${esc(e.b)}" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="${SCOL[e.s]}"/>`; }
    // names point outwards like the spokes of a wheel (flipped on the left half so they read left to right)
    for (const n of ns) { const c = Math.cos(n.ang), r = 13, right = c >= 0, deg = n.ang * 180 / Math.PI + (right ? 0 : 180), lx = Math.cos(n.ang) * (R + 26), ly = Math.sin(n.ang) * (R + 26);
      h += nodeSVG(n, r).replace(/<text class="vsl"[^>]*>[^<]*<\/text>/, '');
      h += `<text class="vsl vsrl" data-for="${esc(n.id)}" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${deg.toFixed(1)})" y="4.5" text-anchor="${right ? 'start' : 'end'}">${esc(n.name)}</text>`; }
    const [ic, nm, col] = SEC[sec];
    h += `<text y="-6" text-anchor="middle" class="vsrc1" fill="${col}">${ic} ${esc(nm.toUpperCase())}</text><text y="22" text-anchor="middle" class="vsrc2">${ns.length} ideas · ${E.length} links</text>`;
    wg.innerHTML = h; const W = R + 330; return [-W, -R - 330, W, R + 330];
  }
  /* v1.0: History for all four sections, in the same columns. Each column has a plain border and a time-range box on top;
     the colour is only on the event boxes (green known / published, orange proposed or estimated, red still open). */
  const YR = 3.156e7, AGE = typeof TL_AGE !== 'undefined' ? TL_AGE : 13.787e9;
  const FNTU_COLS = [   // v1.0b: six shorter groups (6 events or fewer each)
    { name: 'The first second', sub: '13.8 billion years ago · the first second', note: 'from the very start to 1 second', to: 1.5 / YR },
    { name: 'The first atoms', sub: '3 minutes → 380,000 years', note: 'the first nuclei, then the first atoms', to: 380000 },
    { name: 'Cosmic dawn', sub: '13.8 → 12.8 billion years ago', note: 'first stars and galaxies', to: 1e9 },
    { name: 'Galaxies and the Sun', sub: '12.8 → 4.6 billion years ago', note: 'the universe fills with galaxies', to: AGE - 4.6e9 },
    { name: 'Earth and first life', sub: '4.6 → 3.5 billion years ago', note: 'our planet, water and the first life', to: AGE - 3e9 },
    { name: 'Oxygen to us', sub: '2.4 billion years ago → today', note: 'oxygen, animals, primates and people', to: Infinity }];
  let HIST = null;
  function hist(sec) {
    if (sec === 'physics' || sec === 'biology') {
      const H = sec === 'physics' ? PHYS_HIST : BIO_HIST, ERAS = sec === 'physics' ? PHYS_ERAS : BIO_ERAS, A = sec === 'physics' ? PHYS : BIO, by = {}; A.forEach(n => by[n.id] = n);
      const col = e => ERAS.find(E => E.open ? e.k === 'open' : e.k !== 'open' && e.y >= E.from && e.y < E.to);
      const ev = {}, all = []; for (const [id, e] of Object.entries(H)) { const n = by[id]; all.push(ev[id] = { id, node: id, when: e.when, name: n.name, t: e.t, y: e.y, s: e.k === 'open' ? 'u' : e.k === 'idea' ? 't' : n.s, era: col(e) }); }
      for (const r of (typeof HIST_RECENT !== 'undefined' && HIST_RECENT[sec]) || []) all.push(ev[r.id] = { id: r.id, node: r.node, when: r.when, name: r.name, t: r.t, y: r.y, s: r.s, recent: r, era: col({ y: r.y, k: 'fact' }) });
      return { ev, n: all.length, what: 'one for every card, plus progress since 2003', key: ['Published / measured', 'Proposed idea', 'Still open'],
        cols: split(ERAS.map(E => ({ name: E.open ? E.name : E.sub, note: E.open ? 'no answer yet' : E.name, open: !!E.open, ev: all.filter(e => e.era === E).sort((a, b) => a.y - b.y || a.name.localeCompare(b.name)) }))) };
    }
    if (sec === 'fntu') {
      const ev = {}, L = TL.map(e => { const yrs = e.t != null ? e.t / YR : AGE - e.ago; return ev[e.id] = { id: e.id, when: e.when, name: e.name, t: e.a, y: yrs, s: e.s, raw: e }; });
      return { ev, n: L.length, what: 'Big Bang to Today', key: ['Known', 'Leading idea / estimate', 'Unknown'],
        cols: split(FNTU_COLS.map((C, k) => ({ name: C.sub, note: C.name + ' · ' + C.note, fntu: true, ev: L.filter(e => e.y <= C.to && (k === 0 || e.y > FNTU_COLS[k - 1].to)).sort((a, b) => a.y - b.y) }))) };
    }
    const ev = {}, L = [];
    for (const [id, arr] of Object.entries(typeof MATH_HISTORY !== 'undefined' ? MATH_HISTORY : {})) { const n = MATH_BY_ID[id]; if (!n) continue;
      arr.forEach((e, i) => { const k = id + '-' + i, s = e.kind === 'idea' ? (n.s === 'u' ? 'u' : 't') : 'k'; L.push(ev[k] = { id: k, node: id, idx: i, when: (e.certainty === 'approximate' ? '≈ ' : '') + e.label, name: n.name, t: e.text, y: e.year, s, raw: e }); }); }
    for (const r of (typeof HIST_RECENT !== 'undefined' && HIST_RECENT.maths) || []) if (MATH_BY_ID[r.node]) L.push(ev[r.id] = { id: r.id, node: r.node, when: r.when, name: r.name, t: r.t, y: r.y, s: r.s, recent: r });
    return { ev, n: L.length, what: 'from every Maths card', key: ['Published / proved', 'Proposed idea', 'Proposed, still open'],
      cols: split(MATH_ERAS.map(E => ({ name: E.sub, note: E.label, ev: L.filter(e => e.y >= E.start && (e.y < E.end || (E.end >= 2027 && e.y <= E.end))).sort((a, b) => a.y - b.y || a.name.localeCompare(b.name)) }))) };
  }
  /* v1.0b: long eras are split into shorter groups (6 events or fewer), each with its own range box */
  const yl = y => y < 0 ? Math.round(-y).toLocaleString('en-GB') + ' BCE' : String(Math.floor(y));
  function split(cols) { const out = [];
    for (const C of cols) { const n = C.ev.length; if (n <= 6) { out.push(C); continue; }
      const k = Math.ceil(n / 6), size = Math.ceil(n / k);
      for (let i = 0; i < n; i += size) { const E = C.ev.slice(i, i + size), a = E[0], b = E[E.length - 1];
        const name = C.open ? C.name : C.fntu ? (a.when === b.when ? a.when : a.when + ' → ' + b.when) : (yl(a.y) === yl(b.y) ? yl(a.y) : yl(a.y) + ' → ' + yl(b.y));
        out.push({ name, note: C.note, ev: E, open: C.open }); } }
    return out; }
  function drawHistory() {
    HIST = hist(sec); const [ic, nm] = SEC[sec], K = HIST.key;
    return `<div class="vhhead"><b>${ic} ${esc(nm)} History</b><span>${HIST.n} dated landmarks · ${esc(HIST.what)} · read from top to bottom</span>
      <span class="vhkey"><i class="d k"></i>${K[0]} <i class="d t"></i>${K[1]} <i class="d u"></i>${K[2]}</span></div>
      <div class="vhcols vhbands">${HIST.cols.map(C => `<section class="vhcol"><div class="vhhd"><b>${esc(C.name)}</b><small>${esc(C.note)} · ${C.ev.length}</small></div><div class="vhgrid">
        ${C.ev.map(e => `<button class="vhev s-${e.s}" data-id="${esc(e.id)}"><span class="vhy">${esc(e.when)}</span><b>${esc(e.name)}</b><span class="vht">${esc(e.t)}</span></button>`).join('')}</div></section>`).join('')}</div>
      <p class="vhnote">A publication date is not always a discovery date, and several people often got there together.${sec === 'fntu' ? ' Early times are counted from the Big Bang (13.8 billion years ago).' : ''} Sources are on each card.</p>`;
  }
  /* ---------- camera ---------- */
  let box = [0, 0, 1, 1];
  function apply() { if (wg) wg.setAttribute('transform', `translate(${cam.tx.toFixed(2)} ${cam.ty.toFixed(2)}) scale(${cam.s.toFixed(4)})`);
    if (root) { root.style.setProperty('--is', (1 / cam.s).toFixed(4)); root.style.setProperty('--hs', Math.max(1, Math.min(2.4, 1 / cam.s)).toFixed(3)); root.classList.toggle('far', cam.s < .8); root.classList.toggle('vfar', cam.s < .34);
      // v0.9b: section names stay readable on screen at every zoom (clamped px), but a Ring name never outgrows its own arc
      root.style.setProperty('--gf', (Math.max(13, Math.min(28, 15 * cam.s)) / cam.s).toFixed(2) + 'px');
      if (mode === 'ring') for (const t of root.querySelectorAll('.vsarcl')) t.style.fontSize = Math.min(Math.max(14, Math.min(28, 13 * cam.s)) / cam.s, +t.dataset.fm).toFixed(2) + 'px'; } }
  const cardW = () => card && !card.hidden && vw() > 600 ? 442 : 0;
  function fitCam() { const [x0, y0, x1, y1] = box, W = vw() - cardW(), Hh = vh(), s = Math.min(W / (x1 - x0), Hh / (y1 - y0)) * .96;
    return [s, W / 2 - (x0 + x1) / 2 * s, Hh / 2 - (y0 + y1) / 2 * s]; }
  function animTo(s2, x2, y2, ms = 420) { cancelAnimationFrame(anim); const s0 = cam.s, a0 = cam.tx, b0 = cam.ty, t0 = performance.now();
    const st = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); cam.s = s0 + (s2 - s0) * e; cam.tx = a0 + (x2 - a0) * e; cam.ty = b0 + (y2 - b0) * e; apply(); if (k < 1) anim = requestAnimationFrame(st); }; anim = requestAnimationFrame(st); }
  function zoomAt(f, px, py) { const s2 = Math.max(mode === 'ring' ? fitCam()[0] * .5 : .12, Math.min(3.2, cam.s * f)), k = s2 / cam.s; cam.tx = px - (px - cam.tx) * k; cam.ty = py - (py - cam.ty) * k; cam.s = s2; apply(); }
  function centreOn(id) { const n = L && L.by[id]; if (!n) return; const W = vw() - (vw() > 600 ? 442 : 0), s = Math.max(cam.s, .8); animTo(s, W / 2 - n.x * s, vh() / 2 - n.y * s); }
  /* ---------- light up a card and its neighbours ---------- */
  function light(id) { if (mode === 'history') { root.querySelectorAll('.vhev').forEach(b => b.classList.toggle('on', b.dataset.id === id)); return; }
    const nb = id ? new Set([id]) : null;
    if (id) root.querySelectorAll('.vse').forEach(e => { if (e.dataset.a === id || e.dataset.b === id) { nb.add(e.dataset.a); nb.add(e.dataset.b); } });
    root.querySelectorAll('.vsn').forEach(g => { g.classList.toggle('dim', !!nb && !nb.has(g.dataset.id)); g.classList.toggle('on', g.dataset.id === id || g.dataset.id === sel); });
    root.querySelectorAll('.vsrl').forEach(t => t.classList.toggle('dim', !!nb && !nb.has(t.dataset.for)));
    root.querySelectorAll('.vshub').forEach(g => g.classList.toggle('dim', !!nb && !nb.has('hub:' + g.dataset.hub)));
    root.querySelectorAll('.vse').forEach(e => { const on = !!id && (e.dataset.a === id || e.dataset.b === id); e.classList.toggle('hot', on); e.classList.toggle('dim', !!id && !on); });
    root.classList.toggle('lit', !!id); }
  /* ---------- card (same look as the Physics and Biology cards) ---------- */
  function srcList(keys) { return keys.map(k => SRC[k] || (typeof MATH_SRC !== 'undefined' && MATH_SRC[k])).filter(Boolean).map(([t, u]) => srcItemHTML(t, u)).join(''); }
  const share = () => typeof SITE !== 'undefined' ? SITE : 'https://zyphullen.github.io/echoatlas/';
  const chipsOf = L => typeof xsecChipsHTML === 'function' ? xsecChipsHTML(L) : '';
  function renderEvent(e) { const c = SCOL[e.s], close = '<button class="phx" aria-label="Close card">×</button>';
    if (sec === 'fntu') { const r = e.raw, L = HIST.cols.flatMap(C => C.ev), i = L.indexOf(e), link = '#t=' + encodeURIComponent(e.id);
      const nb = `<div class="phrel">${i > 0 ? `<button class="phgo" data-go="${esc(L[i - 1].id)}">← ${esc(L[i - 1].name)}</button>` : ''}${i < L.length - 1 ? `<button class="phgo" data-go="${esc(L[i + 1].id)}">${esc(L[i + 1].name)} →</button>` : ''}</div>`;
      return CB({ x: close, t: esc(e.name), tid: 'vsTitle', sub: esc(e.when), c, w: WORD[e.s], q: `<p class="pha">${esc(r.a)}</p>`, m: `<h4>Before and after</h4>${nb}`,
        d: chipsOf(uniq([...(r.rel || []), ...xsecBack('tl', r.id)])), s: `<ul class="srcl">${srcList(r.src || [])}</ul>`,
        a: `<button class="vsbook" data-xgo="${esc(link)}">⏳ Open on the Big Bang to Today timeline</button>${copyBtnHTML(share() + link)}${fixBtnHTML('Big Bang to Today', e.name, 'timeline/' + e.id, share() + link)}` }); }
    const n = MATH_BY_ID[e.node], r = e.raw, same = MATH_HISTORY[e.node] || [], link = '#m=' + encodeURIComponent(e.node);
    const seq = same.length > 1 ? `<h4>Proposal → proof / formal problem</h4><div class="phrel">${same.map((s, k) => `<button class="phgo" data-go="${esc(e.node + '-' + k)}">${s.kind === 'idea' ? '◇' : '●'} ${esc(s.label)}</button>`).join('')}</div>` : '';
    return CB({ x: close, t: esc(n.name), tid: 'vsTitle', sub: esc(e.when + ' · ' + (MATH_DOMAIN_NAMES[n.col] || [''])[0]), c, w: r.kind === 'idea' ? 'PROPOSED IDEA' + (n.s === 'u' ? ' · still open' : '') : 'PUBLICATION / PROOF LANDMARK',
      q: `<p class="pha">${esc(e.t)}</p>`, m: `<p class="pha">${esc(n.summ)}</p><p class="pha"><b>${esc(n.tag || '')}</b> ${esc(n.date || '')}</p>${seq}`, d: `<p class="pha">${esc(MATH_HISTORY_NOTE)}</p>`,
      s: `<ul class="srcl">${srcList(r.src || [])}</ul>`, a: `<button class="vsbook" data-xgo="${esc(link)}">∑ Read the full Maths card</button>${copyBtnHTML(share() + '#sv=maths-history&c=' + encodeURIComponent(e.id))}${fixBtnHTML('Maths History', n.name + ' · ' + r.label, 'history/' + e.id, share() + '#sv=maths-history')}` });
  }
  function renderRecent(e) { const r = e.recent, c = SCOL[r.s], A = sec === 'maths' ? null : data(sec).nodes, nn = sec === 'maths' ? MATH_BY_ID[r.node].name : (A.find(q => q.id === r.node) || {}).name || '';
    const link = (sec === 'maths' ? '#m=' : sec === 'physics' ? '#p=' : '#b=') + encodeURIComponent(r.node), L = HIST.cols.flatMap(C => C.ev), i = L.indexOf(e);
    const nb = `<div class="phrel">${i > 0 ? `<button class="phgo" data-go="${esc(L[i - 1].id)}">← ${esc(L[i - 1].name)}</button>` : ''}${i < L.length - 1 ? `<button class="phgo" data-go="${esc(L[i + 1].id)}">${esc(L[i + 1].name)} →</button>` : ''}</div>`;
    const sh = share() + '#sv=' + sec + '-history&c=' + encodeURIComponent(r.id);
    return CB({ x: '<button class="phx" aria-label="Close card">×</button>', t: esc(r.name), tid: 'vsTitle', sub: esc(r.when + ' · ' + nn), c, w: WORD[r.s], q: `<p class="pha">${esc(r.t)}</p>`,
      m: `<h4>Before and after</h4>${nb}`, s: `<ul class="srcl">${srcList(r.src)}</ul>`,
      a: `<button class="vsbook" data-xgo="${esc(link)}">📖 Open the ${esc(nn)} card</button>${copyBtnHTML(sh)}${fixBtnHTML(SEC[sec][1] + ' History', r.name, sec + '-history/' + r.id, sh)}` }); }
  function render(id) { if (mode === 'history' && HIST && HIST.ev[id] && HIST.ev[id].recent) return renderRecent(HIST.ev[id]);
    if (mode === 'history' && HIST && (sec === 'fntu' || sec === 'maths')) { const e = HIST.ev[id]; return e ? renderEvent(e) : ''; }
    const D = data(sec), n = D.nodes.find(q => q.id === id), raw = D.raw(id); if (!n || !raw) return '';
    const c = SCOL[n.s], [gname, gcol] = D.groups[n.g] || ['', '#9fb4d0'], by = {}; D.nodes.forEach(q => by[q.id] = q);
    const kids = D.nodes.filter(q => q.p.includes(id)), parents = n.p.filter(p => by[p]);
    let q = '', m = '', link = '', bookLabel = 'Open in Book';
    if (sec === 'physics' || sec === 'biology') { q = raw.a.map(t => `<p class="pha">${esc(t)}</p>`).join(''); m = `<div class="phb">${raw.b.map(([h, t]) => `<div><b>${esc(h)}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
      const HH = (sec === 'physics' ? PHYS_HIST : BIO_HIST)[id]; if (HH) m += `<div class="vhwhen" style="--c:${gcol}"><b>${esc(HH.when)}</b><span>${esc(HH.t)}</span></div>`;
      link = (sec === 'physics' ? '#p=' : '#b=') + encodeURIComponent(id); }
    else { const info = (raw.info || (raw.summ ? [raw.summ] : [])).filter(Boolean); q = info.map(t => `<p class="pha">${esc(t)}</p>`).join('');
      const L2 = raw.L2 || [], parts = []; let cur = null; for (const l of L2) { if (l.startsWith('## ')) { cur = [l.slice(3), []]; parts.push(cur); } else if (cur) cur[1].push(l); else parts.push(['', [l]]); }
      if (parts.length) m = `<div class="phb">${parts.slice(0, 4).map(([h, t]) => `<div>${h ? `<b>${esc(h)}</b>` : ''}<span>${esc(t.join(' '))}</span></div>`).join('')}</div>`;
      link = (sec === 'maths' ? '#m=' : '#n=') + encodeURIComponent(id); bookLabel = 'Open in Book (every detail)'; }
    const d = (parents.length || kids.length ? `<h4>Connected here</h4><div class="phrel">${parents.map(p => `<button class="phgo" data-go="${esc(p)}">← ${esc(by[p].name)}</button>`).join('')}${kids.map(k => `<button class="phgo" data-go="${esc(k.id)}">${esc(k.name)} →</button>`).join('')}</div>` : '') + chipsOf(n.out);
    return CB({ x: '<button class="phx" aria-label="Close card">×</button>', t: esc(n.name), tid: 'vsTitle', sub: esc(gname + (n.sub ? ' · ' + n.sub : '')), c, w: raw.cw ? esc(raw.cw) : WORD[n.s], q, m, d,
      s: `<ul class="srcl">${srcList(raw.src || [])}</ul>`, a: `<button class="vsbook" data-xgo="${esc(link)}">📖 ${bookLabel}</button>${copyBtnHTML(share() + link)}${fixBtnHTML(SEC[sec][1], n.name, sec + '/' + id, share() + link)}` }); }
  function open(id, keepCam) { const h = render(id); if (!h) return; sel = id; card.innerHTML = h; card.hidden = false; card.scrollTop = 0; root.classList.add('carded'); light(id); hashSet();
    if (!keepCam && mode !== 'history') { const n = L && L.by[id]; if (n) { const s = cam.s, sx = n.x * s + cam.tx, sy = n.y * s + cam.ty; if (sx > vw() - 430 || sx < 40 || sy < 40 || sy > vh() - 40) centreOn(id); } } }
  function closeCard() { if (!sel) return; sel = null; card.hidden = true; root.classList.remove('carded'); light(hov); hashSet(); }
  function hashSet() { if (!alive) return; const h = '#sv=' + sec + '-' + mode + (sel ? '&c=' + encodeURIComponent(sel) : ''); if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h); }
  /* ---------- input ---------- */
  function onDown(e) { if (mode === 'history' || e.target.closest('.phcard,.vzm,.vskey')) return; pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; } else drag = { x: e.clientX, y: e.clientY }; cancelAnimationFrame(anim);
    try { svg.setPointerCapture(e.pointerId); } catch (_) {} root.classList.add('moving'); }
  function onMove(e) { if (!pts.has(e.pointerId)) { if (mode !== 'history' && !drag) { const g = e.target.closest && e.target.closest('.vsn'); const id = g ? g.dataset.id : null; if (id !== hov) { hov = id; if (!sel) light(id); } } return; }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = root.getBoundingClientRect(); if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch = d; moved = 9; return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 2) moved += Math.abs(dx) + Math.abs(dy); cam.tx += dx; cam.ty += dy; drag = { x: e.clientX, y: e.clientY }; apply(); }
  function onUp(e) { const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) { drag = null; root.classList.remove('moving'); }
    if (was && moved < 6) tap(e); }
  function tap(e) { const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return; const g = el.closest('.vsn'), hb = el.closest('.vshub');
    if (g) return open(g.dataset.id, true); if (hb) return hubGo(hb.dataset.hub); if (sel) closeCard(); }
  function hubGo(k) { const to = HUB[k][0]; if (to && typeof SCREENS !== 'undefined' && SCREENS.goSec) return SCREENS.goSec(to, 'map'); if (HUB_PAGE[k]) xsecGo(HUB_PAGE[k]); }
  function onWheel(e) { if (mode === 'history' || e.target.closest('.phcard,.vskey')) return; e.preventDefault(); const r = root.getBoundingClientRect(); cancelAnimationFrame(anim);
    zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * .0022), e.clientX - r.left, e.clientY - r.top); }
  /* ---------- build ---------- */
  const KEY = `<div class="vskey"><div><i class="d k"></i>Known</div><div><i class="d t"></i>We think so</div><div><i class="d u"></i>Unknown</div><div><i class="ln"></i>builds on</div><div class="vsk-map"><i class="pill"></i>another section</div></div>`;
  function init(host = document.body, o = {}) {
    if (alive) destroy(); opts = o; alive = true; sec = SEC[o.sec] ? o.sec : 'physics'; mode = ['map', 'ring', 'history'].includes(o.mode) ? o.mode : 'map';
    if (mode === 'ring' && sec !== 'physics' && sec !== 'biology') mode = 'map';
    root = document.createElement('div'); root.id = 'vsect'; root.className = 'vs-' + mode; root.dataset.sec = sec; root.setAttribute('role', 'region');
    const [ic, nm, col] = SEC[sec], what = { map: 'Map · how the ideas connect', ring: 'Ring · every idea round one circle', history: 'History · when each idea arrived' }[mode];
    root.setAttribute('aria-label', nm + ' ' + what); root.style.setProperty('--sc', col);
    root.innerHTML = (mode === 'history' ? `<div class="vhwrap">${drawHistory()}</div>` :
      `<svg class="vssvg" aria-label="${esc(nm + ' ' + what)}"><defs>${['k', 't', 'u'].map(s => `<marker id="vsar-${s}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9Z" fill="${SCOL[s]}"/></marker>`).join('')}</defs><g class="vsw"></g></svg>
      <div class="vstit"><b style="color:${col}">${ic} ${esc(nm)}</b> <span>${esc(what)}</span></div>${KEY}
      <div class="vzm"><button data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button data-z="out" aria-label="Zoom out" title="Zoom out">−</button><button data-z="fit" aria-label="Show everything" title="Show everything">⛶</button></div>`) +
      `<aside class="phcard" hidden aria-labelledby="vsTitle"></aside>`;
    host.appendChild(root); card = root.querySelector('.phcard');
    if (mode !== 'history') { svg = root.querySelector('.vssvg'); wg = root.querySelector('.vsw'); box = mode === 'ring' ? drawRing() : drawMap(); [cam.s, cam.tx, cam.ty] = fitCam(); apply();
      svg.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp); svg.addEventListener('wheel', onWheel, { passive: false });
      root.querySelector('.vzm').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; if (z === 'fit') return animTo(...fitCam()); zoomAt(z === 'in' ? 1.3 : 1 / 1.3, (vw() - cardW()) / 2, vh() / 2); };
      svg.addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('.vsn,.vshub'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); g.dataset.hub ? hubGo(g.dataset.hub) : open(g.dataset.id); } });
      svg.addEventListener('focusin', e => { const g = e.target.closest && e.target.closest('.vsn'); if (g && !sel) light(g.dataset.id); });
    } else root.querySelector('.vhwrap').addEventListener('click', e => { const b = e.target.closest('.vhev'); if (b) open(b.dataset.id, true); });
    card.addEventListener('click', e => { if (e.target.closest('.phx')) return closeCard(); const g = e.target.closest('[data-go]'); if (g) return open(g.dataset.go);
      const x = e.target.closest('[data-xgo]'); if (x) { e.preventDefault(); xsecGo(x.dataset.xgo); } });
    card.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    onKey = e => { if (!alive || e.target.closest && e.target.closest('input,textarea')) return; const m = document.getElementById('xmenu'); if (m && m.classList.contains('on')) return;
      if (e.key === 'Escape' && sel) { closeCard(); e.stopPropagation(); return; } if (mode === 'history') return;
      if (e.key === '+' || e.key === '=') zoomAt(1.25, vw() / 2, vh() / 2); else if (e.key === '-') zoomAt(.8, vw() / 2, vh() / 2); else if (e.key === 'Home') animTo(...fitCam());
      else if (e.key.startsWith('Arrow')) { const d = 60; cam.tx += e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0; cam.ty += e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0; apply(); } };
    addEventListener('keydown', onKey); onResize = () => { if (mode !== 'history') apply(); }; addEventListener('resize', onResize);
    if (o.focus && (mode === 'history' && HIST ? HIST.ev[o.focus] : data(sec).nodes.some(n => n.id === o.focus))) open(o.focus); else hashSet();
    return root;
  }
  function destroy() { alive = false; cancelAnimationFrame(anim); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    pts.clear(); drag = null; if (root) root.remove(); root = null; sel = null; hov = null; }
  return { init, destroy, isOpen: () => alive, open: id => open(id), close: closeCard, setCam: c => { if (!alive || mode === 'history' || !c) return; cancelAnimationFrame(anim); cam.s = c.s; cam.tx = c.tx; cam.ty = c.ty; apply(); }, get sec() { return sec; }, get mode() { return mode; },
    get state() { return alive ? { sec, mode, sel, cam: { ...cam }, nodes: root.querySelectorAll('.vsn,.vhev').length, hubs: root.querySelectorAll('.vshub').length, edges: root.querySelectorAll('.vse').length } : null; },
    w2s: (x, y) => [x * cam.s + cam.tx, y * cam.s + cam.ty], node: id => { const n = L && L.by[id]; return n ? { x: n.x, y: n.y } : null; } };
})();
window.VSECT = VSECT;
