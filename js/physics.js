'use strict';
/* ===== Echo Atlas v0.5: PHYSICS (forces, particles, light) =====
   A map like the Maths Map: three category panels, ideas left → right in the order they build on each other.
   Colour = certainty (green known, orange we think, red unknown). Tap a card for its facts, sources and links to other sections.
   Pan: drag / arrow keys · zoom: wheel or pinch at the pointer, + / − · category names grow when zoomed out (node names do not).
   API: VPHYS.init(host, opts) · destroy() · isOpen() · open(id) · debug() · cam · w2s(x,y) */
const VPHYS = (() => {
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, WORD = { k: 'KNOWN · established', t: 'WE THINK SO · leading idea', u: 'UNKNOWN · open question' };
  const RANKP = { k: 0, t: 1, u: 2 }, COLW = 340, ROWH = 168, PAD = 150, R0 = 34;
  const CATS = Object.keys(PHYS_CATS), BY = PHYS_BY_ID;
  /* ---------- layout (computed once) ---------- */
  const depth = {}; const dOf = id => depth[id] != null ? depth[id] : (depth[id] = 0, depth[id] = BY[id].p.length ? 1 + Math.max(...BY[id].p.map(dOf)) : 0);
  PHYS.forEach(n => dOf(n.id));
  const rows = []; let y = 0, maxD = 0;
  for (const c of CATS) {
    const ns = PHYS.filter(n => n.cat === c), cols = {};
    ns.forEach(n => { (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n); maxD = Math.max(maxD, depth[n.id]); });
    const per = Math.max(...Object.values(cols).map(a => a.length)), top = y + 120;
    for (const [d, a] of Object.entries(cols)) a.forEach((n, i) => { n.px = PAD + d * COLW; n.py = top + (i + (per - a.length) / 2) * ROWH + 40; });
    const h = 120 + per * ROWH + 40; rows.push({ c, y0: y, y1: y + h }); y += h + 40;
  }
  const WW = PAD * 2 + maxD * COLW, HH = y;
  const EDGES = []; PHYS.forEach(n => n.p.forEach(p => { const a = BY[p]; EDGES.push({ a: p, b: n.id, s: RANKP[n.s] >= RANKP[a.s] ? n.s : a.s }); }));
  /* ---------- drawing ---------- */
  const wrap = t => { if (t.length <= 20) return [t]; const w = t.split(' '); let a = '', i = 0; while (i < w.length && (a + ' ' + w[i]).trim().length <= Math.ceil(t.length / 2) + 3) a = (a + ' ' + w[i++]).trim(); return [a, w.slice(i).join(' ')]; };
  const T = (x, y, s, sz, col, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${sz}" fill="${col}" ${extra}>${esc(s)}</text>`;
  function glyph(g, col) {
    const st = `fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (g) {
      case 'motion': return `<path ${st} d="M-13 0H11M5-6l7 6-7 6"/><circle r="4" cx="-15" fill="${col}"/>`;
      case 'orbit': return `<ellipse rx="15" ry="7" ${st} transform="rotate(-20)"/><circle r="5" fill="${col}"/><circle r="2.6" cx="13" cy="-5" fill="#e8f4ff"/>`;
      case 'charge': return `<circle cx="-8" r="7" ${st}/><circle cx="9" r="7" ${st}/><path ${st} d="M-11 0h6M-8-3v6M6 0h6"/>`;
      case 'sym': return `<path ${st} d="M0-14V14M-3-9L-14 0-3 9ZM3-9L14 0 3 9Z"/>`;
      case 'warp': return `<path ${st} stroke-width="1.5" d="M-15-8Q0 6 15-8M-15 0Q0 14 15 0M-15 8Q0 18 15 8M-8-12Q-4 4-8 14M8-12Q4 4 8 14"/><circle r="4" cy="3" fill="${col}"/>`;
      case 'gw': return `<path ${st} d="M-6-6a8.5 8.5 0 0 1 0 12M6-6a8.5 8.5 0 0 0 0 12" /><path ${st} stroke-width="1.4" opacity=".7" d="M-11-11a15.5 15.5 0 0 1 0 22M11-11a15.5 15.5 0 0 0 0 22"/><circle r="2.5" cx="-2" fill="${col}"/><circle r="2.5" cx="2" fill="${col}"/>`;
      case 'nucleus': case 'quark': return `<circle cx="0" cy="-7" r="5" fill="#ff6b7a"/><circle cx="-7" cy="5" r="5" fill="#3dff8a"/><circle cx="7" cy="5" r="5" fill="#5aa8ff"/><path ${st} stroke-width="1.3" opacity=".8" d="M0-7L-7 5 7 5Z"/>`;
      case 'beta': return T(-7, 5, 'n', 14, col, 'font-weight="700"') + `<path ${st} d="M-1 0H6M3-3l3 3-3 3"/>` + T(11, 5, 'p', 14, col, 'font-weight="700"');
      case 'merge': return `<path ${st} d="M-14-9Q-2-9 2 0M-14 9Q-2 9 2 0H14"/>`;
      case 'four': return `<circle cx="-7" cy="-7" r="4" fill="#ffd36b"/><circle cx="7" cy="-7" r="4" fill="#4ff3e3"/><circle cx="-7" cy="7" r="4" fill="#ff9ad5"/><circle cx="7" cy="7" r="4" fill="#5cf0a0"/>`;
      case 'unify': return `<path ${st} d="M-14-10Q-4-10 0 0M-14 0H0M-14 10Q-4 10 0 0H14" stroke-dasharray="3 3"/>`;
      case 'qg': return `<path ${st} stroke-width="1.2" opacity=".6" d="M-13-6H13M-13 6H13M-6-13V13M6-13V13"/>` + T(0, 7, '?', 20, col, 'font-weight="800"');
      case 'lepton': return T(0, 6, 'e⁻', 17, col, 'font-weight="700"');
      case 'anti': return T(-7, 5, 'e⁻', 12, '#4ff3e3', 'font-weight="700"') + T(8, 5, 'e⁺', 12, '#ff9ad5', 'font-weight="700"');
      case 'boson': return `<path ${st} d="M-15 0c2.5-6 5-6 7.5 0s5 6 7.5 0 5-6 7.5 0 5 6 7.5 0"/>`;
      case 'sm': { let r = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r += `<rect x="${-13 + i * 7}" y="${-13 + j * 7}" width="5.5" height="5.5" rx="1" fill="${['#ffd36b', '#4ff3e3', '#e79cff', '#ff9ad5'][i]}" opacity="${j === 3 && i > 1 ? .25 : .85}"/>`; return r; }
      case 'higgs': return `<path ${st} stroke-width="1.3" opacity=".6" d="M0-15V-9M0 9V15M-15 0H-9M9 0H15M-10-10l4 4M6 6l4 4M10-10l-4 4M-6 6l-4 4"/>` + T(0, 6, 'H', 17, col, 'font-weight="800"');
      case 'osc': return `<path fill="none" stroke-width="2.2" stroke-linecap="round" stroke="#4ff3e3" d="M-15 0c3-7 5-7 7.5 0"/><path fill="none" stroke-width="2.2" stroke-linecap="round" stroke="#ffd36b" d="M-7.5 0c2.5 7 5 7 7.5 0"/><path fill="none" stroke-width="2.2" stroke-linecap="round" stroke="#ff9ad5" d="M0 0c2.5-7 5-7 7.5 0s5 7 7.5 0"/>`;
      case 'numass': return T(0, 6, 'ν ?', 16, col, 'font-weight="700"');
      case 'asym': return `<path ${st} d="M-14 4L14-4M0-12V12"/><circle cx="-12" cy="9" r="4" fill="#4ff3e3"/><circle cx="12" cy="1" r="2" fill="#ff9ad5"/>`;
      case 'dm': return `<circle r="13" ${st} stroke-dasharray="3 3"/><circle r="2" cx="-4" cy="-3" fill="${col}"/><circle r="2" cx="5" cy="2" fill="${col}"/><circle r="2" cx="-1" cy="6" fill="${col}"/>`;
      case 'em': return `<path fill="none" stroke="#ffd36b" stroke-width="2" d="M-15 0c2.5-8 5-8 7.5 0s5 8 7.5 0 5-8 7.5 0 5 8 7.5 0"/><path fill="none" stroke="#4ff3e3" stroke-width="1.6" opacity=".85" d="M-15 0c2.5 5 5 5 7.5 0s5-5 7.5 0 5 5 7.5 0 5-5 7.5 0"/>`;
      case 'spectrum': return ['#ff4d5e', '#ffa53d', '#ffd36b', '#3dff8a', '#4ff3e3', '#5aa8ff', '#e79cff'].map((c, i) => `<rect x="${-14 + i * 4}" y="-11" width="3.4" height="22" rx="1" fill="${c}"/>`).join('');
      case 'c': return T(0, 7, 'c', 22, col, 'font-weight="700" font-style="italic"');
      case 'rel': return T(0, 5, 'E=mc²', 11.5, col, 'font-weight="700"');
      case 'bb': return `<path ${st} d="M-14 12C-9 12-6-12 0-12S8 8 14 10"/><path ${st} stroke-width="1" opacity=".5" d="M-14 12H14"/>`;
      case 'photon': return `<path ${st} d="M-15 3c2-6 4-6 6 0s4 6 6 0 4-6 6 0M3 3H13M9-1l4 4-4 4"/>` + T(-6, -7, 'γ', 11, '#ffe19b');
      case 'duality': return `<path ${st} d="M-15 0c2.5-8 5-8 7.5 0s5 8 7.5 0"/><circle cx="9" r="5" fill="${col}"/>`;
      case 'lines': return ['#ff4d5e', '#4ff3e3', '#5aa8ff', '#e79cff'].map((c, i) => `<rect x="${[-11, -2, 5, 10][i]}" y="-11" width="2.4" height="22" fill="${c}"/>`).join('') + `<rect x="-14" y="-11" width="28" height="22" fill="none" stroke="${col}" stroke-opacity=".4"/>`;
      case 'qed': return `<path ${st} d="M-13-11L0 0-13 11"/><path ${st} d="M0 0c2-4 4-4 5 0s3 4 5 0"/><circle r="2.2" fill="${col}"/>`;
      case 'cmb': { let r = `<circle r="13" fill="#0a1a33" stroke="${col}" stroke-width="1.5"/>`; const P = [[-5, -6, '#ff6b7a'], [4, -3, '#5aa8ff'], [-2, 5, '#ffa53d'], [6, 6, '#4ff3e3'], [-8, 2, '#5aa8ff'], [1, -9, '#ffa53d']]; for (const [x, y2, c] of P) r += `<circle cx="${x}" cy="${y2}" r="2.6" fill="${c}" opacity=".85"/>`; return r; }
      default: return `<circle r="6" fill="${col}"/>`;
    }
  }
  function nodeSVG(n) {
    const c = SCOL[n.s], cat = PHYS_CATS[n.cat].col, L = wrap(n.name), u = n.s === 'u';
    return `<g class="phn" data-id="${n.id}" transform="translate(${n.px} ${n.py})" tabindex="0" role="button" aria-label="${esc(n.name)}: ${WORD[n.s]}">
      <circle class="phglow" r="${R0 + 14}" fill="${c}" opacity=".07"/><circle r="${R0}" fill="#081226" stroke="${c}" stroke-width="2.6" ${u ? 'stroke-dasharray="6 5"' : ''}/>
      ${u ? `<path d="M-24-24L24 24M24-24L-24 24" stroke="${c}" stroke-width="1.6" opacity=".35"/>` : ''}<g class="phg">${glyph(n.g, cat)}</g>
      <text class="phname" y="${R0 + 24}" text-anchor="middle">${L.map((l, i) => `<tspan x="0" dy="${i ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text>
      <text class="phsub" y="${R0 + 24 + L.length * 17 + 2}" text-anchor="middle">${esc(n.sub)}</text></g>`;
  }
  function worldSVG() {
    let bands = '', edges = '';
    for (const r of rows) { const C = PHYS_CATS[r.c];
      bands += `<g class="phband"><rect x="0" y="${r.y0}" width="${WW}" height="${r.y1 - r.y0}" rx="26" fill="${C.col}" opacity=".035"/><rect x="0" y="${r.y0}" width="${WW}" height="${r.y1 - r.y0}" rx="26" fill="none" stroke="${C.col}" stroke-opacity=".22" stroke-dasharray="4 8"/>
        <text class="phcat" x="40" y="${r.y0 + 58}" fill="${C.col}">${esc(C.name)}</text><text class="phcatsub" x="42" y="${r.y0 + 86}" fill="${C.col}">${esc(C.sub)}</text></g>`; }
    for (const e of EDGES) { const a = BY[e.a], b = BY[e.b], c = SCOL[e.s];
      const x0 = a.px + R0 + 6, y0 = a.py, x1 = b.px - R0 - 12, y1 = b.py, dx = Math.max(60, (x1 - x0) * .45);
      edges += `<path class="phe" data-a="${e.a}" data-b="${e.b}" d="M${x0} ${y0}C${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}" fill="none" stroke="${c}" stroke-opacity="${e.s === 'k' ? .5 : .7}" stroke-width="2.2" ${e.s === 'k' ? '' : `stroke-dasharray="${e.s === 't' ? '7 6' : '3 4'}"`} marker-end="url(#pharr-${e.s})"/>`; }
    return `<defs>${Object.entries(SCOL).map(([k, c]) => `<marker id="pharr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${c}"/></marker>`).join('')}</defs>
      <g class="phbands">${bands}</g><g class="phedges">${edges}</g><g class="phnodes">${PHYS.map(nodeSVG).join('')}</g>`;
  }
  /* ---------- state ---------- */
  let root = null, svg, wg, card, alive = false, opts = {}, sel = null, cam = { s: .7, tx: 0, ty: 0 }, mm = null, keyAuto = false, keyT = 0, catEls = [], anim = 0;
  const pts = new Map(); let drag = null, pinch = null, moved = false;
  const vw = () => root.clientWidth, vh = () => root.clientHeight, TOP = 62;
  const minS = () => Math.min(.9, Math.max(.08, Math.min((vw() - 40) / WW, (vh() - TOP - 40) / HH))) * .9, MAXS = 2.4;
  function clamp() { const W = vw(), H = vh(), open = card && !card.hidden, ph = W <= 600, cr = open && !ph ? 420 : 0, cb = open && ph ? H * .52 : 0;
    const cx = (W - cr) / 2, cy = TOP + (H - TOP - cb) / 2;
    // any idea can sit in the middle of the view, so far-left / far-right nodes are not blocked and wheel zoom stays on the mouse
    cam.tx = Math.min(Math.max(cam.tx, cx - WW * cam.s), cx);
    cam.ty = Math.min(Math.max(cam.ty, cy - HH * cam.s), cy); }
  // category names grow when zoomed out (target ~16 px on screen); node names keep their size
  function catScale() { const s = cam.s, S0 = .5, u = Math.max(0, Math.min(1, (S0 - s) / (S0 * .5)));
    for (const el of catEls) { const f = 1 + u * (Math.max(1, Math.min(7, el._t / (el._b * s))) - 1), k = f.toFixed(2); if (el._k !== k) { el._k = k; el.style.fontSize = (el._b * f).toFixed(1) + 'px'; } } }
  function apply() { clamp(); wg.setAttribute('transform', `translate(${cam.tx.toFixed(2)} ${cam.ty.toFixed(2)}) scale(${cam.s.toFixed(4)})`); catScale(); root.classList.toggle('far', cam.s < .42); if (mm) mm.update(); placeCard(); }
  function zoomAt(f, x, y) { const ns = Math.min(MAXS, Math.max(minS(), cam.s * f));
    // v0.5c: past the map's edge, zoom on the nearest point of the map, so clamp never has to yank the view (no jump, no new wall)
    x = Math.min(Math.max(x, cam.tx), cam.tx + WW * cam.s); y = Math.min(Math.max(y, cam.ty), cam.ty + HH * cam.s);
    cam.tx = x - (x - cam.tx) * ns / cam.s; cam.ty = y - (y - cam.ty) * ns / cam.s; cam.s = ns; apply(); }
  function animTo(s2, tx2, ty2, ms = 450) { cancelAnimationFrame(anim); const s0 = cam.s, x0 = cam.tx, y0 = cam.ty, t0 = performance.now();
    const st = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); cam.s = s0 + (s2 - s0) * e; cam.tx = x0 + (tx2 - x0) * e; cam.ty = y0 + (ty2 - y0) * e; apply(); if (k < 1) anim = requestAnimationFrame(st); }; anim = requestAnimationFrame(st); }
  const fit = () => { const s = minS() / .9; return [s, vw() / 2 - WW * s / 2, TOP + (vh() - TOP) / 2 - HH * s / 2]; };
  const home = () => { const s = vw() <= 600 ? .62 : .78, n = BY['newton-laws']; return [s, Math.min(60, vw() / 2 - n.px * s) + (vw() <= 600 ? 0 : 40), TOP + 30 - rows[0].y0 * s]; };
  function centreOn(id, now) { const n = BY[id], W = vw(), s = Math.max(cam.s, W <= 600 ? .62 : .8), cx = W <= 600 ? W / 2 : (W - (card && !card.hidden ? 400 : 0)) / 2, cy = W <= 600 ? TOP + (vh() * .45 - TOP) / 2 + 40 : TOP + (vh() - TOP) / 2;
    const t = [s, cx - n.px * s, cy - n.py * s]; if (now) { [cam.s, cam.tx, cam.ty] = t; apply(); } else animTo(...t); }
  /* ---------- card ---------- */
  const SITE_ = typeof SITE !== 'undefined' ? SITE : 'https://zyphullen.github.io/echoatlas/';
  const XKIND = { fntu: ['✦', 'From Nothing to Us', '#ffd36b'], maths: ['∑', 'Maths', '#4ff3e3'], tl: ['⏳', 'Big Bang to Today', '#e79cff'], atom: ['⚛', 'Atom Sandbox', '#ffd36b'], pt: ['▦', 'All the Elements', '#ffd36b'], ph: ['⚛', 'Physics', '#e79cff'], bio: ['🌿', 'Biology', '#5cf0a0'], planet: ['🌍', 'Planet Earth', '#4ff3e3'], cell: ['🧬', 'Virtual Cell', '#5cf0a0'], body: ['♥', 'Human Body', '#ff9ad5'] };
  function chip(k, id, label) { const [g, sec, col] = XKIND[k] || ['↗', '', '#ffd36b']; const t = typeof xsecTarget === 'function' ? xsecTarget(k, id) : null; if (!t) return '';
    return `<button class="xchip" data-xgo="${esc(t.hash)}" style="--c:${col}" title="${esc(label || '')}"><i>${g}</i><span><small>${esc(sec)}</small>${esc(t.title)}</span></button>`; }
  function render() { const n = BY[sel], c = SCOL[n.s], kids = PHYS.filter(k => k.p.includes(n.id));
    const srcs = n.src.map(k => SRC[k]).filter(Boolean).map(([t, u]) => srcItemHTML(t, u)).join('');
    card.innerHTML = `<button class="phx" aria-label="Close card">×</button><div class="phst" style="--c:${c}">${n.s === 'u' ? '✕' : '●'} ${WORD[n.s]}</div>
      <h3 id="phTitle">${esc(n.name)}</h3><div class="phwhere" style="--c:${PHYS_CATS[n.cat].col}">${esc(PHYS_CATS[n.cat].name)} · ${esc(n.sub)}</div>
      ${n.a.map(t => `<p class="pha">${esc(t)}</p>`).join('')}
      <div class="phb">${n.b.map(([h, t]) => `<div><b>${esc(h)}</b><span>${esc(t)}</span></div>`).join('')}</div>
      ${n.p.length || kids.length ? `<h4>On this map</h4><div class="phrel">${n.p.map(p => `<button class="phgo" data-go="${p}">← ${esc(BY[p].name)}</button>`).join('')}${kids.map(k => `<button class="phgo" data-go="${k.id}">${esc(k.name)} →</button>`).join('')}</div>` : ''}
      ${(() => { const L = [...n.rel, ...xsecBack('ph', n.id)].filter((r, i, a) => a.findIndex(q => q[0] === r[0] && q[1] === r[1]) === i); return L.length ? `<h4>In other sections</h4><div class="xchips">${L.map(([k, id, l]) => chip(k, id, l)).join('')}</div>` : ''; })()}
      <h4>Sources</h4><ul class="srcl">${srcs}</ul>
      <div class="phact">${copyBtnHTML(SITE_ + '#p=' + encodeURIComponent(n.id))}${fixBtnHTML('Physics', n.name, 'physics/' + n.id, SITE_ + '#p=' + encodeURIComponent(n.id))}</div>`;
  }
  function open(id, keepCam) { if (!BY[id]) return; sel = id; render(); card.hidden = false; card.scrollTop = 0; light(id); root.classList.add('carded');
    history.replaceState(null, '', location.pathname + location.search + '#p=' + encodeURIComponent(id)); if (!keepCam) centreOn(id); if (mm) mm.update(); try { EF.bonus && 0; } catch (e) {} }
  function closeCard() { if (!sel) return; sel = null; card.hidden = true; light(null); root.classList.remove('carded'); history.replaceState(null, '', location.pathname + location.search + '#physics=1'); if (mm) mm.update(); }
  function placeCard() {}
  function light(id) { const nb = id ? new Set([id, ...BY[id].p, ...PHYS.filter(k => k.p.includes(id)).map(k => k.id)]) : null;
    root.querySelectorAll('.phn').forEach(g => { g.classList.toggle('dim', !!nb && !nb.has(g.dataset.id)); g.classList.toggle('on', g.dataset.id === id); });
    root.querySelectorAll('.phe').forEach(e => e.classList.toggle('dim', !!id && e.dataset.a !== id && e.dataset.b !== id)); }
  /* ---------- Key (opens by itself on the first visit, like every map) ---------- */
  const KEYHTML = `<div class="kp"><div class="kh"><b>KEY</b><button class="kc" aria-label="Hide key" title="Hide key">–</button></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#0a1226" stroke="#3dff8a" stroke-width="2"/></svg><span>Known (tested, confirmed)</span></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#0a1226" stroke="#ffa53d" stroke-width="2"/></svg><span>We think so (best guess)</span></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="#0a1226" stroke="#ff4d5e" stroke-width="2" stroke-dasharray="3 2.4"/><path d="M5.5 5.5L12.5 12.5M12.5 5.5L5.5 12.5" stroke="#ff4d5e" stroke-width="1.8" stroke-linecap="round"/></svg><span>Unknown (dashed ring, X)</span></div>
    <div class="ks">LINES · colour = less certain end</div>
    <div class="kr"><svg width="30" height="10" viewBox="0 0 30 10"><path d="M1 5H26" stroke="#3dff8a" stroke-width="2.2" stroke-opacity=".8"/><path d="M24 1.5L29 5L24 8.5Z" fill="#3dff8a"/></svg><span>Solid: builds on (known)</span></div>
    <div class="kr"><svg width="30" height="10" viewBox="0 0 30 10"><path d="M1 5H26" stroke="#ffa53d" stroke-width="2.2" stroke-dasharray="5 4"/><path d="M24 1.5L29 5L24 8.5Z" fill="#ffa53d"/></svg><span>Orange dashed: we think so</span></div>
    <div class="kr"><svg width="30" height="10" viewBox="0 0 30 10"><path d="M1 5H26" stroke="#ff4d5e" stroke-width="2.2" stroke-dasharray="3 3"/><path d="M24 1.5L29 5L24 8.5Z" fill="#ff4d5e"/></svg><span>Red dashed: unknown</span></div>
    <div class="ks">PANELS</div>${CATS.map(c => `<div class="kr"><i class="kcat" style="--c:${PHYS_CATS[c].col}"></i><span>${esc(PHYS_CATS[c].name.charAt(0) + PHYS_CATS[c].name.slice(1).toLowerCase())}: ${esc(PHYS_CATS[c].sub)}</span></div>`).join('')}
    </div><button class="kchip" aria-label="Show colour key">Key</button>`;
  function keyInit() { const k = root.querySelector('.phkey'), get = () => { try { return localStorage.getItem('fntu-key'); } catch (e) { return null; } };
    let seen = null; try { seen = localStorage.getItem('ea-key-seen-physics'); } catch (e) {}
    if (!seen) { try { localStorage.setItem('ea-key-seen-physics', '1'); } catch (e) {} k.classList.remove('min'); keyAuto = vw() <= 600; k.classList.toggle('kfirst', keyAuto); if (keyAuto) keyT = setTimeout(keyFold, 12000); }
    else k.classList.toggle('min', get() ? get() === 'min' : vw() <= 600);
    k.querySelector('.kc').onclick = () => { keyAuto = false; k.classList.add('min'); k.classList.remove('kfirst'); try { localStorage.setItem('fntu-key', 'min'); } catch (e) {} mmSync(); };
    k.querySelector('.kchip').onclick = () => { k.classList.remove('min'); try { localStorage.setItem('fntu-key', 'open'); } catch (e) {} mmSync(); };
    k.addEventListener('wheel', e => e.stopPropagation(), { passive: true }); }
  function keyFold() { if (!keyAuto || !root) return; keyAuto = false; const k = root.querySelector('.phkey'); k.classList.add('min'); k.classList.remove('kfirst'); mmSync(); }
  const mmSync = () => { if (mm) mm.update(); };
  /* ---------- input ---------- */
  function onDown(e) { if (e.target.closest('.phcard,.vzm,.phkey,.mmap,.vcbar')) return; if (keyAuto) keyFold();
    const hit = e.target.closest && e.target.closest('.phn'); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, hit }; moved = false; }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s }; drag = null; moved = true; } }
  function onMove(e) { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const r = root.getBoundingClientRect();
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.s * d / pinch.d / cam.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!moved && Math.hypot(dx, dy) > 5) { moved = true; root.classList.add('moving'); } if (moved) { cancelAnimationFrame(anim); cam.tx = drag.tx + dx; cam.ty = drag.ty + dy; apply(); } } }
  function onUp(e) { const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (was && pts.size === 0) { root.classList.remove('moving'); if (!moved && drag) { const g = drag.hit; if (g) { if (sel === g.dataset.id) closeCard(); else open(g.dataset.id); } else closeCard(); } drag = null; } }
  function onWheel(e) { if (e.target.closest('.phcard,.phkey,.mmap')) return; e.preventDefault(); const r = root.getBoundingClientRect(); cancelAnimationFrame(anim);
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; zoomAt(Math.exp(-d * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top); }
  function onKey(e) { if (!alive || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.body.classList.contains('ai-open')) return;
    if (e.key === 'Escape') { if (sel) { e.preventDefault(); closeCard(); } return; }
    const g = e.target.closest && e.target.closest('.phn'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(g.dataset.id); return; }
    const P = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key];
    if (P && !e.target.closest('.phcard')) { e.preventDefault(); cam.tx += P[0]; cam.ty += P[1]; apply(); }
    else if (e.key === '+' || e.key === '=') zoomAt(1.25, vw() / 2, vh() / 2); else if (e.key === '-') zoomAt(.8, vw() / 2, vh() / 2); }
  function onResize() { if (alive) apply(); }
  /* ---------- open / close ---------- */
  function init(host = document.body, o = {}) {
    if (alive) destroy(); opts = o; alive = true; sel = null;
    root = document.createElement('div'); root.id = 'vphysics'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Physics: forces, particles and light');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">⚛ Physics <small>forces · particles · light · ${PHYS.length} ideas</small></b></div>
      <svg class="phsvg" aria-label="Physics map"><g class="phw">${worldSVG()}</g></svg>
      <div class="vzm phzm"><button data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button data-z="out" aria-label="Zoom out" title="Zoom out">−</button><button data-z="fit" aria-label="See everything" title="See everything"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#9ff5ea" stroke-width="2" stroke-linecap="round"><path d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5"/></svg></button><button data-z="home" aria-label="Back to the start" title="Back to the start"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#9ff5ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-6 6 6 6M6 11h12"/></svg></button></div>
      <div class="phkey">${KEYHTML}</div><aside class="phcard" hidden aria-labelledby="phTitle"></aside>`;
    host.appendChild(root); svg = root.querySelector('.phsvg'); wg = root.querySelector('.phw'); card = root.querySelector('.phcard');
    catEls = [...root.querySelectorAll('.phcat')].map(el => (el._b = 30, el._t = 17, el));
    [cam.s, cam.tx, cam.ty] = home();
    svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false }); addEventListener('keydown', onKey); addEventListener('resize', onResize);
    root.querySelector('.phzm').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; cancelAnimationFrame(anim);
      if (z === 'in') zoomAt(1.4, vw() / 2, vh() / 2); else if (z === 'out') zoomAt(1 / 1.4, vw() / 2, vh() / 2); else animTo(...(z === 'fit' ? fit() : home())); };
    card.addEventListener('click', e => { if (e.target.closest('.phx')) return closeCard(); const g = e.target.closest('[data-go]'); if (g) return open(g.dataset.go);
      const x = e.target.closest('[data-xgo]'); if (x) { e.preventDefault(); xsecGo(x.dataset.xgo); } });
    card.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    keyInit();
    if (typeof MiniMap === 'function') mm = MiniMap({ host: root, cls: 'phmm', bounds: () => [0, 0, WW, HH], scene: 'physics',
      dots: () => PHYS.map(n => [n.px, n.py, SCOL[n.s]]), bands: () => rows.map(r => [0, r.y0, WW, r.y1, PHYS_CATS[r.c].col]),
      view: () => [-cam.tx / cam.s, (TOP - cam.ty) / cam.s, (vw() - cam.tx) / cam.s, (vh() - cam.ty) / cam.s],
      here: () => { const cx = (vw() / 2 - cam.tx) / cam.s, cy = ((vh() + TOP) / 2 - cam.ty) / cam.s, r = rows.find(r => cy >= r.y0 - 20 && cy <= r.y1 + 20) || rows.reduce((a, b) => Math.abs((a.y0 + a.y1) / 2 - cy) < Math.abs((b.y0 + b.y1) / 2 - cy) ? a : b); return ['Physics', PHYS_CATS[r.c].name, PHYS_CATS[r.c].col]; },
      go: (wx, wy) => { cancelAnimationFrame(anim); cam.tx = vw() / 2 - wx * cam.s; cam.ty = (vh() + TOP) / 2 - wy * cam.s; apply(); },
      hidden: () => vw() <= 600 && (!card.hidden || !root.querySelector('.phkey').classList.contains('min')) });
    apply();
    if (o.focus && BY[o.focus]) { centreOn(o.focus, true); open(o.focus, true); }
    return root;
  }
  function destroy() { alive = false; cancelAnimationFrame(anim); clearTimeout(keyT); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); if (mm) mm.destroy(); mm = null; pts.clear(); if (root) root.remove(); root = null; sel = null; }
  return { init, destroy, isOpen: () => alive, open: id => open(id), close: closeCard, get cam() { return { ...cam }; }, w2s: (x, y) => [x * cam.s + cam.tx, y * cam.s + cam.ty],
    debug: () => ({ nodes: PHYS.length, edges: EDGES.length, W: WW, H: HH, sel, cam: { ...cam }, cats: catEls.map(el => +getComputedStyle(el).fontSize.replace('px', '')), names: [...root.querySelectorAll('.phname')].slice(0, 3).map(el => getComputedStyle(el).fontSize) }) };
})();
window.VPHYS = VPHYS;
