'use strict';
/* ===== Echo Atlas v0.5: BIOICS (forces, particles, light) =====
   A map like the Maths Map: three category panels, ideas left → right in the order they build on each other.
   Colour = certainty (green known, orange we think, red unknown). Tap a card for its facts, sources and links to other sections.
   Pan: drag / arrow keys · zoom: wheel or pinch at the pointer, + / − · category names grow when zoomed out (node names do not).
   API: VBIO.init(host, opts) · destroy() · isOpen() · open(id) · debug() · cam · w2s(x,y) */
const VBIO = (() => {
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, WORD = { k: 'KNOWN · established', t: 'WE THINK SO · leading idea', u: 'UNKNOWN · open question' };
  const RANKP = { k: 0, t: 1, u: 2 }, COLW = 340, ROWH = 168, PAD = 150, R0 = 34;
  const CATS = Object.keys(BIO_CATS), BY = BIO_BY_ID;
  /* ---------- layout (computed once) ---------- */
  const depth = {}; const dOf = id => depth[id] != null ? depth[id] : (depth[id] = 0, depth[id] = BY[id].p.length ? 1 + Math.max(...BY[id].p.map(dOf)) : 0);
  BIO.forEach(n => dOf(n.id));
  const rows = []; let y = 0, maxD = 0;
  for (const c of CATS) {
    const ns = BIO.filter(n => n.cat === c), cols = {};
    ns.forEach(n => { (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n); maxD = Math.max(maxD, depth[n.id]); });
    const per = Math.max(...Object.values(cols).map(a => a.length)), top = y + 120;
    for (const [d, a] of Object.entries(cols)) a.forEach((n, i) => { n.px = PAD + d * COLW; n.py = top + (i + (per - a.length) / 2) * ROWH + 40; });
    const h = 120 + per * ROWH + 40; rows.push({ c, y0: y, y1: y + h }); y += h + 40;
  }
  const WW = PAD * 2 + maxD * COLW, HH = y;
  const EDGES = []; BIO.forEach(n => n.p.forEach(p => { const a = BY[p]; EDGES.push({ a: p, b: n.id, s: RANKP[n.s] >= RANKP[a.s] ? n.s : a.s }); }));
  /* ---------- drawing ---------- */
  const wrap = t => { if (t.length <= 20) return [t]; const w = t.split(' '); let a = '', i = 0; while (i < w.length && (a + ' ' + w[i]).trim().length <= Math.ceil(t.length / 2) + 3) a = (a + ' ' + w[i++]).trim(); return [a, w.slice(i).join(' ')]; };
  const T = (x, y, s, sz, col, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${sz}" fill="${col}" ${extra}>${esc(s)}</text>`;
  function glyph(g, col) {
    const st = `fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (g) {
      case 'chnops': return T(0, 6, 'C', 19, col, 'font-weight="800"') + ['#e8f4ff', '#5aa8ff', '#ff6b7a', '#ffa53d', '#ffd36b'].map((c, i) => `<circle cx="${(13 * Math.cos(i * 1.257 - 1.57)).toFixed(1)}" cy="${(13 * Math.sin(i * 1.257 - 1.57)).toFixed(1)}" r="2.6" fill="${c}"/>`).join('');
      case 'chain': return `<path ${st} d="M-14 4L-7-4 0 4 7-4 14 4"/>` + [-14, -7, 0, 7, 14].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? -4 : 4}" r="3.2" fill="${['#ffd36b', '#4ff3e3', '#ff9ad5', '#5cf0a0', '#e79cff'][i]}"/>`).join('');
      case 'cell': return `<ellipse rx="15" ry="11" ${st}/><circle cx="3" cy="-1" r="4.5" fill="${col}" opacity=".85"/><circle cx="-7" cy="4" r="1.6" fill="${col}"/><circle cx="-6" cy="-5" r="1.3" fill="${col}"/>`;
      case 'twocell': return `<rect x="-15" y="-6" width="12" height="12" rx="6" ${st}/><circle cx="8" r="8" ${st}/><circle cx="8" r="3" fill="${col}"/>`;
      case 'membrane': { let r = ''; for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; r += `<circle cx="${x}" cy="-6" r="2.2" fill="${col}"/><circle cx="${x}" cy="6" r="2.2" fill="${col}"/><path ${st} stroke-width="1.2" d="M${x - .6} -4V-1M${x + .6} -4V-1M${x - .6} 4V1M${x + .6} 4V1"/>`; } return r; }
      case 'helix': return `<path fill="none" stroke="${col}" stroke-width="2.2" d="M-8-15C8-9 8-3-8 3S8 15 8 15"/><path fill="none" stroke="#4ff3e3" stroke-width="2.2" d="M8-15C-8-9-8-3 8 3S-8 15-8 15"/><path stroke="#e8f4ff" stroke-width="1.2" opacity=".7" d="M-4-12H4M-5-6H5M-4 6H4M-5 12H5"/>`;
      case 'dogma': return T(0, -4, 'DNA', 8.5, col, 'font-weight="700"') + `<path ${st} stroke-width="1.4" d="M0-1V3"/>` + T(0, 9, 'RNA → P', 7.5, '#e8f4ff', 'font-weight="700"');
      case 'codon': return ['#3dff8a', '#ffd36b', '#ff6b7a'].map((c, i) => `<rect x="${-12 + i * 9}" y="-9" width="7" height="13" rx="2" fill="${c}" opacity=".85"/>`).join('') + `<path ${st} d="M-13 9H13"/>`;
      case 'enzyme': return `<path fill="${col}" opacity=".85" d="M0 0L12-7A14 14 0 1 0 12 7Z"/><circle cx="13" r="3.5" fill="#e8f4ff"/>`;
      case 'atp': return T(0, 5, 'ATP', 12, col, 'font-weight="800"') + `<path stroke="#ffd36b" stroke-width="2" fill="none" d="M10-13l-4 6h5l-4 6"/>`;
      case 'divide': return `<path ${st} d="M-2-10C-16-12-16 12-2 10M2-10C16-12 16 12 2 10"/><circle cx="-7" r="3" fill="${col}"/><circle cx="7" r="3" fill="${col}"/>`;
      case 'q': return T(0, 7, '?', 22, col, 'font-weight="800"') + `<circle cx="-11" cy="-8" r="2" fill="${col}"/><circle cx="12" cy="-6" r="1.6" fill="${col}"/><circle cx="10" cy="10" r="1.6" fill="${col}"/>`;
      case 'rna': return `<path fill="none" stroke="${col}" stroke-width="2.2" d="M-14 8C-8-12 0 12 6-6S14 4 14 4"/>` + [-11, -4, 3, 10].map((x, i) => `<path stroke="${['#ff6b7a', '#4ff3e3', '#ffd36b', '#5cf0a0'][i]}" stroke-width="2" d="M${x} ${i % 2 ? -1 : 2}v-6"/>`).join('');
      case 'tree': return `<path ${st} d="M0 14V2M0 2L-10-8M0 2L10-8M-10-8L-14-13M-10-8L-5-13M10-8L5-13M10-8L14-13"/><circle cy="14" r="2.5" fill="${col}"/>`;
      case 'domains': return `<path ${st} d="M0 13V3M0 3L-12-10M0 3L0-12M0 3L12-10"/><circle cx="-12" cy="-10" r="3" fill="#4ff3e3"/><circle cy="-12" r="3" fill="#ffa53d"/><circle cx="12" cy="-10" r="3" fill="#5cf0a0"/>`;
      case 'endo': return `<circle r="14" ${st}/><ellipse cx="2" cy="1" rx="7" ry="4" fill="none" stroke="#ff9ad5" stroke-width="1.8"/><path stroke="#ff9ad5" stroke-width="1.2" fill="none" d="M-2 1c1-2 2 2 3 0s2 2 3 0"/>`;
      case 'euk': return `<circle cx="-5" r="9" ${st}/><ellipse cx="9" cy="2" rx="5" ry="3" fill="none" stroke="#ff9ad5" stroke-width="1.8"/><path ${st} stroke-width="1.4" d="M1 9l3 3"/>` + T(-5, 4, '?', 11, col, 'font-weight="800"');
      case 'pea': return `<circle cx="-7" cy="-3" r="6" fill="#5cf0a0"/><circle cx="7" cy="-3" r="6" fill="#ffd36b"/><path ${st} stroke-width="1.4" d="M-7 4V9H7V4M0 9V14"/>`;
      case 'select': return `<path ${st} d="M-14 8L-6 0 0 5 13-9M7-9H13V-3"/><circle cx="-6" cy="0" r="2" fill="${col}"/>`;
      case 'synth': return T(-7, 5, 'D', 13, col, 'font-weight="800"') + `<path ${st} stroke-width="1.6" d="M-1 0H3M1-2V2"/>` + T(9, 5, 'G', 13, '#5cf0a0', 'font-weight="800"');
      case 'fork': return `<path ${st} d="M-14 0H-2M-2 0L12-10M-2 0L12 10"/><circle cx="12" cy="-10" r="3" fill="${col}"/><circle cx="12" cy="10" r="3" fill="#4ff3e3"/>`;
      case 'trilo': return `<ellipse rx="9" ry="13" ${st}/><path ${st} stroke-width="1.3" d="M-3-12V12M3-12V12M-9-4H-14M-9 2H-14M-9 8H-13M9-4H14M9 2H14M9 8H13"/>`;
      case 'extinct': return `<path ${st} d="M-14-10C-6-10-4 10 4 10H14"/><path ${st} d="M8 5l6 5-6 5"/>` + T(-9, -2, '5', 9, col, 'font-weight="800"');
      case 'human': return `<circle cy="-10" r="4" fill="${col}"/><path ${st} d="M0-5V5M0 5L-6 14M0 5L6 14M-8-2L0-3 8-2"/>`;
      case 'exo': return `<circle cx="-3" cy="2" r="9" ${st}/><ellipse cx="-3" cy="2" rx="15" ry="4" fill="none" stroke="${col}" stroke-width="1.3" opacity=".7"/>` + T(10, -6, '?', 12, '#e8f4ff', 'font-weight="800"');
      case 'leaf': return `<path fill="${col}" opacity=".85" d="M-12 12C-14-8 2-14 14-13 13 2 6 14-12 12Z"/><path stroke="#081226" stroke-width="1.6" fill="none" d="M-12 12L8-7"/><circle cx="10" cy="-12" r="0" fill="#ffd36b"/>`;
      case 'mito': return `<ellipse rx="15" ry="9" ${st}/><path fill="none" stroke="${col}" stroke-width="1.5" d="M-11 0c2-6 4 6 6 0s4 6 6 0 4 6 6 0 3 4 4 0"/>`;
      case 'o2': return T(-1, 6, 'O₂', 15, col, 'font-weight="800"') + `<path ${st} stroke-width="1.4" d="M10-12V-4M7-7l3-5 3 5"/>`;
      case 'web': return `<path ${st} stroke-width="1.5" d="M0-12L-11 4M0-12L11 4M-11 4L11 4M0-12V12M-11 4L0 12M11 4L0 12"/>` + [[0, -12], [-11, 4], [11, 4], [0, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${col}"/>`).join('');
      case 'cycle': return `<path ${st} d="M-11-5A12 12 0 0 1 11-5M11 5A12 12 0 0 1-11 5"/><path ${st} d="M8-10l3 5-6 1M-8 10l-3-5 6-1"/>` + T(0, 4, 'C', 11, col, 'font-weight="800"');
      case 'balance': return `<path ${st} d="M0-12V12M-12-6H12M-12-6L-15 3H-9ZM12-6L9 3H15ZM-6 12H6"/>`;
      case 'neuron': return `<circle cx="-7" r="5" fill="${col}"/><path ${st} d="M-2 0H14M14 0l-3-3M14 0l-3 3M-10-4l-5-6M-11 3l-4 6M-7-5V-12"/>`;
      case 'mind': return `<path ${st} d="M-12 4C-16-6-6-14 2-12 12-10 15 0 10 5 8 8 4 8 3 12H-6C-6 8-10 8-12 4Z" stroke-dasharray="3 3"/>` + T(0, 4, '?', 13, col, 'font-weight="800"');
      default: return `<circle r="6" fill="${col}"/>`;
    }
  }
  function nodeSVG(n) {
    const c = SCOL[n.s], cat = BIO_CATS[n.cat].col, L = wrap(n.name), u = n.s === 'u';
    return `<g class="phn" data-id="${n.id}" transform="translate(${n.px} ${n.py})" tabindex="0" role="button" aria-label="${esc(n.name)}: ${WORD[n.s]}">
      <circle class="phglow" r="${R0 + 14}" fill="${c}" opacity=".07"/><circle r="${R0}" fill="#081226" stroke="${c}" stroke-width="2.6" ${u ? 'stroke-dasharray="6 5"' : ''}/>
      ${u ? `<path d="M-24-24L24 24M24-24L-24 24" stroke="${c}" stroke-width="1.6" opacity=".35"/>` : ''}<g class="phg">${glyph(n.g, cat)}</g>
      <text class="phname" y="${R0 + 24}" text-anchor="middle">${L.map((l, i) => `<tspan x="0" dy="${i ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text>
      <text class="phsub" y="${R0 + 24 + L.length * 17 + 2}" text-anchor="middle">${esc(n.sub)}</text></g>`;
  }
  function worldSVG() {
    let bands = '', edges = '';
    for (const r of rows) { const C = BIO_CATS[r.c];
      bands += `<g class="phband"><rect x="0" y="${r.y0}" width="${WW}" height="${r.y1 - r.y0}" rx="26" fill="${C.col}" opacity=".035"/><rect x="0" y="${r.y0}" width="${WW}" height="${r.y1 - r.y0}" rx="26" fill="none" stroke="${C.col}" stroke-opacity=".22" stroke-dasharray="4 8"/>
        <text class="phcat" x="40" y="${r.y0 + 58}" fill="${C.col}">${esc(C.name)}</text><text class="phcatsub" x="42" y="${r.y0 + 86}" fill="${C.col}">${esc(C.sub)}</text></g>`; }
    for (const e of EDGES) { const a = BY[e.a], b = BY[e.b], c = SCOL[e.s];
      const x0 = a.px + R0 + 6, y0 = a.py, x1 = b.px - R0 - 12, y1 = b.py, dx = Math.max(60, (x1 - x0) * .45);
      edges += `<path class="phe" data-a="${e.a}" data-b="${e.b}" d="M${x0} ${y0}C${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}" fill="none" stroke="${c}" stroke-opacity="${e.s === 'k' ? .5 : .7}" stroke-width="2.2" ${e.s === 'k' ? '' : `stroke-dasharray="${e.s === 't' ? '7 6' : '3 4'}"`} marker-end="url(#bioarr-${e.s})"/>`; }
    return `<defs>${Object.entries(SCOL).map(([k, c]) => `<marker id="bioarr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${c}"/></marker>`).join('')}</defs>
      <g class="phbands">${bands}</g><g class="phedges">${edges}</g><g class="phnodes">${BIO.map(nodeSVG).join('')}</g>`;
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
  const home = () => { const s = vw() <= 600 ? .62 : .78, n = BY['chnops']; return [s, Math.min(60, vw() / 2 - n.px * s) + (vw() <= 600 ? 0 : 40), TOP + 30 - rows[0].y0 * s]; };
  function centreOn(id, now) { const n = BY[id], W = vw(), s = Math.max(cam.s, W <= 600 ? .62 : .8), cx = W <= 600 ? W / 2 : (W - (card && !card.hidden ? 400 : 0)) / 2, cy = W <= 600 ? TOP + (vh() * .45 - TOP) / 2 + 40 : TOP + (vh() - TOP) / 2;
    const t = [s, cx - n.px * s, cy - n.py * s]; if (now) { [cam.s, cam.tx, cam.ty] = t; apply(); } else animTo(...t); }
  /* ---------- card ---------- */
  const SITE_ = typeof SITE !== 'undefined' ? SITE : 'https://zyphullen.github.io/echoatlas/';
  const XKIND = { fntu: ['✦', 'From Nothing to Us', '#ffd36b'], maths: ['∑', 'Maths', '#4ff3e3'], tl: ['⏳', 'Big Bang to Today', '#e79cff'], atom: ['⚛', 'Atom Sandbox', '#ffd36b'], pt: ['▦', 'All the Elements', '#ffd36b'], ph: ['⚛', 'Physics', '#e79cff'], bio: ['🌿', 'Biology', '#5cf0a0'], uni: ['🔭', 'Universe', '#7fc8ff'], planet: ['🌍', 'Planet Earth', '#4ff3e3'], cell: ['🧬', 'Virtual Cell', '#5cf0a0'], body: ['♥', 'Human Body', '#ff9ad5'] };
  function chip(k, id, label) { const [g, sec, col] = XKIND[k] || ['↗', '', '#ffd36b']; const t = typeof xsecTarget === 'function' ? xsecTarget(k, id) : null; if (!t) return '';
    return `<button class="xchip" data-xgo="${esc(t.hash)}" style="--c:${col}" title="${esc(label || '')}"><i>${g}</i><span><small>${esc(sec)}</small>${esc(t.title)}</span></button>`; }
  function render() { const n = BY[sel], c = SCOL[n.s], kids = BIO.filter(k => k.p.includes(n.id));
    const srcs = n.src.map(k => SRC[k]).filter(Boolean).map(([t, u]) => srcItemHTML(t, u)).join('');
    card.innerHTML = `<button class="phx" aria-label="Close card">×</button><div class="phst" style="--c:${c}">${n.s === 'u' ? '✕' : '●'} ${WORD[n.s]}</div>
      <h3 id="phTitle">${esc(n.name)}</h3><div class="phwhere" style="--c:${BIO_CATS[n.cat].col}">${esc(BIO_CATS[n.cat].name)} · ${esc(n.sub)}</div>
      ${n.a.map(t => `<p class="pha">${esc(t)}</p>`).join('')}
      <div class="phb">${n.b.map(([h, t]) => `<div><b>${esc(h)}</b><span>${esc(t)}</span></div>`).join('')}</div>
      ${n.p.length || kids.length ? `<h4>On this map</h4><div class="phrel">${n.p.map(p => `<button class="phgo" data-go="${p}">← ${esc(BY[p].name)}</button>`).join('')}${kids.map(k => `<button class="phgo" data-go="${k.id}">${esc(k.name)} →</button>`).join('')}</div>` : ''}
      ${(() => { const L = [...n.rel, ...xsecBack('bio', n.id)].filter((r, i, a) => a.findIndex(q => q[0] === r[0] && q[1] === r[1]) === i); return L.length ? `<h4>In other sections</h4><div class="xchips">${L.map(([k, id, l]) => chip(k, id, l)).join('')}</div>` : ''; })()}
      <h4>Sources</h4><ul class="srcl">${srcs}</ul>
      <div class="phact">${copyBtnHTML(SITE_ + '#b=' + encodeURIComponent(n.id))}${fixBtnHTML('Biology', n.name, 'biology/' + n.id, SITE_ + '#b=' + encodeURIComponent(n.id))}</div>`;
  }
  function open(id, keepCam) { if (!BY[id]) return; sel = id; render(); card.hidden = false; card.scrollTop = 0; light(id); root.classList.add('carded');
    history.replaceState(null, '', location.pathname + location.search + '#b=' + encodeURIComponent(id)); if (!keepCam) centreOn(id); if (mm) mm.update(); try { EF.bonus && 0; } catch (e) {} }
  function closeCard() { if (!sel) return; sel = null; card.hidden = true; light(null); root.classList.remove('carded'); history.replaceState(null, '', location.pathname + location.search + '#biology=1'); if (mm) mm.update(); }
  function placeCard() {}
  function light(id) { const nb = id ? new Set([id, ...BY[id].p, ...BIO.filter(k => k.p.includes(id)).map(k => k.id)]) : null;
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
    <div class="ks">PANELS</div>${CATS.map(c => `<div class="kr"><i class="kcat" style="--c:${BIO_CATS[c].col}"></i><span>${esc(BIO_CATS[c].name.charAt(0) + BIO_CATS[c].name.slice(1).toLowerCase())}: ${esc(BIO_CATS[c].sub)}</span></div>`).join('')}
    </div><button class="kchip" aria-label="Show colour key">Key</button>`;
  function keyInit() { const k = root.querySelector('.phkey'), get = () => { try { return localStorage.getItem('fntu-key'); } catch (e) { return null; } };
    let seen = null; try { seen = localStorage.getItem('ea-key-seen-biology'); } catch (e) {}
    if (!seen) { try { localStorage.setItem('ea-key-seen-biology', '1'); } catch (e) {} k.classList.remove('min'); keyAuto = vw() <= 600; k.classList.toggle('kfirst', keyAuto); if (keyAuto) keyT = setTimeout(keyFold, 12000); }
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
    root = document.createElement('div'); root.id = 'vbiology'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Biology: cells, evolution and life systems');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">🌿 Biology <small>cells · evolution · life systems · ${BIO.length} ideas</small></b></div>
      <svg class="phsvg" aria-label="Biology map"><g class="phw">${worldSVG()}</g></svg>
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
    if (typeof MiniMap === 'function') mm = MiniMap({ host: root, cls: 'phmm', bounds: () => [0, 0, WW, HH], scene: 'biology',
      dots: () => BIO.map(n => [n.px, n.py, SCOL[n.s]]), bands: () => rows.map(r => [0, r.y0, WW, r.y1, BIO_CATS[r.c].col]),
      view: () => [-cam.tx / cam.s, (TOP - cam.ty) / cam.s, (vw() - cam.tx) / cam.s, (vh() - cam.ty) / cam.s],
      here: () => { const cx = (vw() / 2 - cam.tx) / cam.s, cy = ((vh() + TOP) / 2 - cam.ty) / cam.s, r = rows.find(r => cy >= r.y0 - 20 && cy <= r.y1 + 20) || rows.reduce((a, b) => Math.abs((a.y0 + a.y1) / 2 - cy) < Math.abs((b.y0 + b.y1) / 2 - cy) ? a : b); return ['Biology', BIO_CATS[r.c].name, BIO_CATS[r.c].col]; },
      go: (wx, wy) => { cancelAnimationFrame(anim); cam.tx = vw() / 2 - wx * cam.s; cam.ty = (vh() + TOP) / 2 - wy * cam.s; apply(); },
      hidden: () => vw() <= 600 && (!card.hidden || !root.querySelector('.phkey').classList.contains('min')) });
    apply();
    if (o.focus && BY[o.focus]) { centreOn(o.focus, true); open(o.focus, true); }
    return root;
  }
  function destroy() { alive = false; cancelAnimationFrame(anim); clearTimeout(keyT); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); if (mm) mm.destroy(); mm = null; pts.clear(); if (root) root.remove(); root = null; sel = null; }
  return { init, destroy, isOpen: () => alive, open: id => open(id), close: closeCard, get cam() { return { ...cam }; }, w2s: (x, y) => [x * cam.s + cam.tx, y * cam.s + cam.ty],
    debug: () => ({ nodes: BIO.length, edges: EDGES.length, W: WW, H: HH, sel, cam: { ...cam }, cats: catEls.map(el => +getComputedStyle(el).fontSize.replace('px', '')), names: [...root.querySelectorAll('.phname')].slice(0, 3).map(el => getComputedStyle(el).fontSize) }) };
})();
window.VBIO = VBIO;
