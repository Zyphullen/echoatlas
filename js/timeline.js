'use strict';
/* ===== Echo Atlas v0.5: BIG BANG TO TODAY (a timeline from the first instant to now) =====
   The scale changes between eras (log time in the first second, then years) so each era is readable; the era strip at the top
   shows the whole story and where you are. Colour = certainty. Drag / wheel / pinch / + − Fit. Tap an event for facts and sources.
   API: VTIME.init(host, opts) · destroy() · isOpen() · open(id) · debug() */
const VTIME = (() => {
  const SCOL = { k: '#3dff8a', t: '#ffa53d', u: '#ff4d5e' }, WORD = { k: 'KNOWN · established', t: 'WE THINK SO · leading idea', u: 'UNKNOWN · open question' };
  const YS = 3.156e7, EW = 1000, LOGAGO_MIN = 1e4;
  const L10 = Math.log10;
  // world x of each era start (0..TOTAL)
  let acc = 0; const ERA = TL_ERAS.map(e => { const o = { ...e, x0: acc, x1: acc + e.w * EW }; acc = o.x1; return o; }); const TOTAL = acc;
  function fracIn(e, t, ago) { // t seconds after the Big Bang, ago years before today
    if (e.scale === 'log-ago') return Math.min(1, (L10(e.from) - L10(Math.max(ago, LOGAGO_MIN))) / (L10(e.from) - L10(LOGAGO_MIN)));
    if (e.scale === 'lin') return (t - e.from) / (e.to - e.from);
    return (L10(Math.max(t, e.from)) - L10(e.from)) / (L10(e.to) - L10(e.from)); }
  function xOf(t, ago) { // returns world x
    if (ago != null && ago <= TL_ERAS[4].from) { const e = ERA[4]; return e.x0 + fracIn(e, null, ago) * (e.x1 - e.x0); }
    if (ago != null) t = (TL_AGE - ago) * YS;
    const e = ERA.slice(0, 4).find(e => t <= e.to) || ERA[3]; return e.x0 + Math.max(0, Math.min(1, fracIn(e, t))) * (e.x1 - e.x0); }
  const EV = TL.map(ev => ({ ...ev, x: xOf(ev.t, ev.ago), x1: ev.t1 != null || ev.ago1 != null ? xOf(ev.t1, ev.ago1) : null }));
  const BY = Object.fromEntries(EV.map(e => [e.id, e]));
  /* ---------- tick labels ---------- */
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const pow = k => '10' + String(k).split('').map(c => SUP[c]).join('');
  function secLabel(k) { const t = Math.pow(10, k);
    if (t < 1) return pow(k) + ' s'; if (t < 60) return t + ' s'; if (t < 3600) return Math.round(t / 60) + ' min'; if (t < 86400 * 2) return Math.round(t / 3600) + ' h';
    if (t < YS) return Math.round(t / 86400) + ' days'; const y = t / YS; return y < 1000 ? Math.round(y) + ' yr' : y < 1e6 ? Math.round(y / 1000) + ' kyr' : y < 1e9 ? Math.round(y / 1e6) + ' Myr' : (y / 1e9).toFixed(1) + ' Gyr'; }
  function agoLabel(y) { return y >= 1e9 ? (y / 1e9) + ' Gyr ago' : y >= 1e6 ? (y / 1e6) + ' Myr ago' : (y / 1e3) + ' kyr ago'; }
  function ticks() { const out = [];
    const NICE = [[1, '1 s', 3], [10, '10 s', 1], [60, '1 min', 2], [600, '10 min', 1], [3600, '1 h', 2], [86400, '1 day', 2], [30 * 86400, '1 month', 1], [YS, '1 yr', 3], [10 * YS, '10 yr', 1], [100 * YS, '100 yr', 2], [1e3 * YS, '1 kyr', 2], [1e4 * YS, '10 kyr', 1], [1e5 * YS, '100 kyr', 2], [1e6 * YS, '1 Myr', 3], [1e7 * YS, '10 Myr', 2], [1e8 * YS, '100 Myr', 3], [3e8 * YS, '300 Myr', 1]];
    for (const e of ERA.slice(0, 3)) { const a = Math.ceil(L10(e.from)), b = Math.min(-1, Math.floor(L10(e.to)));
      for (let k = a; k <= b; k++) { const x = e.x0 + fracIn(e, Math.pow(10, k)) * (e.x1 - e.x0); out.push([x, secLabel(k), k % 4 === 0 ? 3 : k % 2 === 0 ? 2 : 1]); }
      for (const [t, lab, lvl] of NICE) if (t >= e.from && t <= e.to) out.push([e.x0 + fracIn(e, t) * (e.x1 - e.x0), lab, lvl]); }
    out.sort((a, b) => a[0] - b[0]);
    { const e = ERA[3]; for (let g = 2; g * 1e9 * YS < e.to; g++) out.push([e.x0 + fracIn(e, g * 1e9 * YS) * (e.x1 - e.x0), g + ' Gyr', g % 2 ? 2 : 3]); }
    { const e = ERA[4]; [4e9, 3e9, 2e9, 1e9, 5e8, 2e8, 1e8, 5e7, 2e7, 1e7, 5e6, 2e6, 1e6, 5e5, 2e5, 1e5, 5e4, 2e4].forEach(y => out.push([e.x0 + fracIn(e, null, y) * (e.x1 - e.x0), agoLabel(y), /^[15]/.test(String(y)) ? (String(y)[0] === '1' ? 3 : 2) : 1])); }
    return out; }
  const TICKS = ticks();
  /* ---------- state ---------- */
  let tapT = 0; // v0.5c: time a touch tap opened a card (its follow-up click must not press a button on the new card)
  let root = null, svg, card, strip, alive = false, opts = {}, sel = null, cam = { s: 1, tx: 0 }, anim = 0, keyAuto = false, keyT = 0;
  const pts = new Map(); let drag = null, pinch = null, moved = false;
  const vw = () => root.clientWidth, vh = () => root.clientHeight, TOP = 132, phone = () => vw() <= 600;
  const minS = () => (vw() - 60) / TOTAL, MAXS = () => minS() * 40;
  const cardW = () => !phone() && card && !card.hidden ? 400 : 0;
  function clamp() { const s = cam.s, w = TOTAL * s, W = vw() - cardW(); cam.tx = Math.min(Math.max(cam.tx, W - w - W * .35), W * .35); }
  const sx = x => cam.tx + x * cam.s;
  function axisY() { const H = vh(), bot = phone() && !card.hidden ? Math.min(H * .52, H - 260) : H; return TOP + (bot - TOP) * .52; }
  function fmtName(e) { return e.name; }
  function draw() {
    const W = vw(), H = vh(), ay = axisY(), s = cam.s; let g = '';
    // era bands + era names (category labels: grow a little when zoomed far out)
    const far = Math.max(0, Math.min(1, (minS() * 2.2 - s) / (minS() * 1.2)));
    for (const e of ERA) { const a = sx(e.x0), b = sx(e.x1); if (b < -20 || a > W + 20) continue; const cx = Math.max(a, 0) + 12, room = Math.min(b, W) - cx - 10;
      let fs = 15 + 5 * far; while (fs > 10.5 && e.name.length * (fs * .7 + 2.2) > room) fs -= .5; // the era name stays inside its own band
      g += `<rect x="${a}" y="${TOP - 4}" width="${b - a}" height="${H - TOP + 4}" fill="${e.col}" opacity=".045"/><line x1="${a}" x2="${a}" y1="${TOP - 4}" y2="${H}" stroke="${e.col}" stroke-opacity=".3" stroke-dasharray="3 7"/>`
        + (e.name.length * (fs * .7 + 2.2) <= room ? `<text class="tlera" x="${cx}" y="${TOP + 22}" fill="${e.col}" style="font-size:${fs.toFixed(1)}px">${esc(e.name)}</text>` : ''); }
    // axis + ticks
    g += `<line x1="0" x2="${W}" y1="${ay}" y2="${ay}" class="tlax"/>`;
    let last = -1e9; for (const [x, lab, lvl] of TICKS) { const X = sx(x); if (X < -40 || X > W + 40) continue; g += `<line x1="${X}" x2="${X}" y1="${ay - 4 - lvl}" y2="${ay + 4 + lvl}" class="tltk"/>`;
      if (X - last > 64 && (lvl >= 2 || s > minS() * 3)) { g += `<text class="tltl" x="${X}" y="${ay + 22}">${esc(lab)}</text>`; last = X; } }
    // events: dot on the axis, label boxes packed into lanes above and below
    const lanesUp = [], lanesDn = [], room = Math.max(1, Math.floor((ay - TOP - 54) / 56)), roomD = Math.max(1, Math.floor((H - ay - 66 - (phone() && !card.hidden ? H - axisY() * 1.9 : 0)) / 56));
    const vis = EV.map(e => ({ e, X: sx(e.x), X1: e.x1 != null ? sx(e.x1) : null })).filter(o => o.X > -260 && o.X < W + 260);
    for (const o of vis) { const e = o.e, c = SCOL[e.s], w = Math.max(e.name.length * 7.4, e.when.length * 6.4) + 22;
      if (o.X1 != null) g += `<rect x="${o.X}" y="${ay - 5}" width="${Math.max(2, o.X1 - o.X)}" height="10" rx="5" fill="${c}" opacity=".35"/>`;
      let side = 0, lane = -1; const tryL = (L, n) => { for (let i = 0; i < n; i++) if ((L[i] == null ? -1e9 : L[i]) < o.X - 8) return i; return -1; };
      const u = tryL(lanesUp, room), d = tryL(lanesDn, roomD);
      if (u >= 0 && (d < 0 || u <= d)) { side = -1; lane = u; lanesUp[u] = o.X + w; } else if (d >= 0) { side = 1; lane = d; lanesDn[d] = o.X + w; }
      const on = sel === e.id ? ' on' : '', dim = sel && sel !== e.id ? ' dim' : '';
      g += `<g class="tle${on}${dim}" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(e.name)}, ${esc(e.when)}: ${WORD[e.s]}">`;
      if (lane >= 0) { const ly = side < 0 ? ay - 44 - lane * 56 : ay + 54 + lane * 56;
        g += `<line x1="${o.X}" x2="${o.X}" y1="${ay}" y2="${ly + (side < 0 ? 12 : -12)}" stroke="${c}" stroke-opacity=".55" ${e.s === 'k' ? '' : 'stroke-dasharray="4 4"'}/>
          <rect class="tlbox" x="${o.X - 6}" y="${ly - 22}" width="${w}" height="40" rx="9" stroke="${c}"/><text class="tlname" x="${o.X + 5}" y="${ly - 3}">${esc(fmtName(e))}</text><text class="tlwhen" x="${o.X + 5}" y="${ly + 12}">${esc(e.when)}</text>`; }
      g += `<circle cx="${o.X}" cy="${ay}" r="${sel === e.id ? 9 : 7}" fill="#081226" stroke="${c}" stroke-width="3" ${e.s === 'u' ? 'stroke-dasharray="3 2.5"' : ''}/><circle cx="${o.X}" cy="${ay}" r="18" fill="transparent"/></g>`; }
    svg.innerHTML = g; paintStrip();
  }
  function paintStrip() { const W = strip.clientWidth, k = W / TOTAL, a = Math.max(0, -cam.tx / cam.s * k), b = Math.min(W, (vw() - cardW() - cam.tx) / cam.s * k);
    const cx = (vw() - cardW()) / 2, wx = (cx - cam.tx) / cam.s, here = ERA.find(e => wx >= e.x0 && wx < e.x1) || (wx < 0 ? ERA[0] : ERA[4]);
    strip.querySelector('.tlsv').innerHTML = ERA.map(e => `<rect x="${e.x0 * k}" y="0" width="${(e.x1 - e.x0) * k - 1}" height="30" rx="5" fill="${e.col}" opacity="${e === here ? .5 : .22}"/>`).join('')
      + EV.map(e => `<circle cx="${e.x * k}" cy="15" r="2.6" fill="${SCOL[e.s]}"/>`).join('') + `<rect class="tlvp" x="${a}" y="1" width="${Math.max(6, b - a)}" height="28" rx="5"/>`;
    const h = strip.querySelector('.tlhere'); h.innerHTML = `<b>You are here</b> · ${esc(here.name)}`; h.style.setProperty('--c', here.col); }
  function apply() { clamp(); draw(); }
  function zoomAt(f, x) { const ns = Math.min(MAXS(), Math.max(minS() * .9, cam.s * f)); cam.tx = x - (x - cam.tx) * ns / cam.s; cam.s = ns; apply(); }
  function animTo(s2, tx2, ms = 450) { cancelAnimationFrame(anim); const s0 = cam.s, x0 = cam.tx, t0 = performance.now();
    const st = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); cam.s = s0 + (s2 - s0) * e; cam.tx = x0 + (tx2 - x0) * e; apply(); if (k < 1) anim = requestAnimationFrame(st); }; anim = requestAnimationFrame(st); }
  const fit = () => [minS(), 30];
  const startView = () => phone() ? [minS() * 4.2, 24] : [minS() * 1.6, 30];
  function centreOn(id, now) { const e = BY[id], s = Math.max(cam.s, minS() * (phone() ? 4 : 2.2)), t = [s, (vw() - cardW()) / 2 - e.x * s]; if (now) { [cam.s, cam.tx] = t; apply(); } else animTo(...t); }
  /* ---------- card ---------- */
  const SITE_ = typeof SITE !== 'undefined' ? SITE : 'https://zyphullen.github.io/echoatlas/';
  const XKIND = { fntu: ['✦', 'From Nothing to Us', '#ffd36b'], maths: ['∑', 'Maths', '#4ff3e3'], ph: ['⚛', 'Physics', '#e79cff'], bio: ['🌿', 'Biology', '#5cf0a0'], uni: ['🔭', 'Universe', '#7fc8ff'], pt: ['▦', 'All the Elements', '#ffd36b'], cell: ['🧬', 'Virtual Cell', '#5cf0a0'], body: ['♥', 'Human Body', '#ff9ad5'], tl: ['⏳', 'Big Bang to Today', '#e79cff'] };
  function chip(k, id, label) { const [g, sec, col] = XKIND[k] || ['↗', '', '#ffd36b']; const t = typeof xsecTarget === 'function' ? xsecTarget(k, id) : null; if (!t) return '';
    return `<button class="xchip" data-xgo="${esc(t.hash)}" style="--c:${col}" title="${esc(label || '')}"><i>${g}</i><span><small>${esc(sec)}</small>${esc(t.title)}</span></button>`; }
  function render() { const e = BY[sel], c = SCOL[e.s], i = EV.indexOf(e), era = ERA.find(r => e.x >= r.x0 && e.x <= r.x1) || ERA[4];
    card.innerHTML = `<button class="phx" aria-label="Close card">×</button><div class="phst" style="--c:${c}">${e.s === 'u' ? '✕' : '●'} ${WORD[e.s]}</div>
      <h3 id="tlTitle">${esc(e.name)}</h3><div class="phwhere" style="--c:${era.col}">${esc(e.when)} · ${esc(era.name)}</div><p class="pha">${esc(e.a)}</p>
      <div class="phrel">${i > 0 ? `<button class="phgo" data-go="${EV[i - 1].id}">← ${esc(EV[i - 1].name)}</button>` : ''}${i < EV.length - 1 ? `<button class="phgo" data-go="${EV[i + 1].id}">${esc(EV[i + 1].name)} →</button>` : ''}</div>
      ${(() => { const L = [...(e.rel || []), ...xsecBack('tl', e.id)].filter((r, i, a) => a.findIndex(q => q[0] === r[0] && q[1] === r[1]) === i); return L.length ? `<h4>In other sections</h4><div class="xchips">${L.map(([k, id, l]) => chip(k, id, l)).join('')}</div>` : ''; })()}
      <h4>Sources</h4><ul class="srcl">${e.src.map(k => SRC[k]).filter(Boolean).map(([t, u]) => srcItemHTML(t, u)).join('')}</ul>
      <div class="phact">${copyBtnHTML(SITE_ + '#t=' + encodeURIComponent(e.id))}${fixBtnHTML('Big Bang to Today', e.name, 'timeline/' + e.id, SITE_ + '#t=' + encodeURIComponent(e.id))}</div>`; }
  function open(id, keep) { if (!BY[id]) return; sel = id; card.hidden = false; render(); card.scrollTop = 0; root.classList.add('carded');
    history.replaceState(null, '', location.pathname + location.search + '#t=' + encodeURIComponent(id)); if (!keep) centreOn(id); else apply(); }
  function closeCard() { if (!sel) return; sel = null; card.hidden = true; root.classList.remove('carded'); history.replaceState(null, '', location.pathname + location.search + '#timeline=1'); apply(); }
  /* ---------- Key ---------- */
  const KEYHTML = `<div class="kp"><div class="kh"><b>KEY</b><button class="kc" aria-label="Hide key" title="Hide key">–</button></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#0a1226" stroke="#3dff8a" stroke-width="3"/></svg><span>Known (measured, established)</span></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#0a1226" stroke="#ffa53d" stroke-width="3"/></svg><span>We think so (best guess)</span></div>
    <div class="kr"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#0a1226" stroke="#ff4d5e" stroke-width="3" stroke-dasharray="3 2.5"/></svg><span>Unknown (dashed)</span></div>
    <div class="kr"><svg width="30" height="10" viewBox="0 0 30 10"><rect x="1" y="1" width="28" height="8" rx="4" fill="#3dff8a" opacity=".4"/></svg><span>Bar: an event that lasted a while</span></div>
    <div class="ks">SCALE</div><div class="kr kt"><span>The scale changes between eras so each one is readable. The first second is stretched out (each step is 10× longer). Ticks show time after the Big Bang, then years ago.</span></div>
    </div><button class="kchip" aria-label="Show colour key">Key</button>`;
  function keyInit() { const k = root.querySelector('.phkey'); let seen = null; try { seen = localStorage.getItem('ea-key-seen-timeline'); } catch (e) {}
    const pref = () => { try { return localStorage.getItem('fntu-key'); } catch (e) { return null; } };
    if (!seen) { try { localStorage.setItem('ea-key-seen-timeline', '1'); } catch (e) {} k.classList.remove('min'); keyAuto = phone(); k.classList.toggle('kfirst', keyAuto); if (keyAuto) keyT = setTimeout(keyFold, 12000); }
    else k.classList.toggle('min', pref() ? pref() === 'min' : phone());
    k.querySelector('.kc').onclick = () => { keyAuto = false; k.classList.add('min'); k.classList.remove('kfirst'); try { localStorage.setItem('fntu-key', 'min'); } catch (e) {} };
    k.querySelector('.kchip').onclick = () => { k.classList.remove('min'); try { localStorage.setItem('fntu-key', 'open'); } catch (e) {} };
    k.addEventListener('wheel', e => e.stopPropagation(), { passive: true }); }
  function keyFold() { if (!keyAuto || !root) return; keyAuto = false; const k = root.querySelector('.phkey'); k.classList.add('min'); k.classList.remove('kfirst'); }
  /* ---------- input ---------- */
  function onDown(e) { if (keyAuto) keyFold(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, tx: cam.tx }; moved = false; } else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.abs(a.x - b.x) + 1, s: cam.s }; drag = null; moved = true; } }
  function onMove(e) { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const r = root.getBoundingClientRect();
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; zoomAt(pinch.s * (Math.abs(a.x - b.x) + 1) / pinch.d / cam.s, (a.x + b.x) / 2 - r.left); return; }
    if (drag) { const dx = e.clientX - drag.x; if (!moved && Math.hypot(dx, e.clientY - drag.y) > 5) moved = true; if (moved) { cancelAnimationFrame(anim); cam.tx = drag.tx + dx; apply(); } } }
  function onUp(e) { const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (was && pts.size === 0) { if (!moved) { const t = document.elementFromPoint(e.clientX, e.clientY), g = t && t.closest && t.closest('.tle'); if (g) { if (sel === g.dataset.id) closeCard(); else { if (e.pointerType !== 'mouse') tapT = performance.now(); open(g.dataset.id); } } else closeCard(); } drag = null; } }
  function onWheel(e) { e.preventDefault(); const r = root.getBoundingClientRect(); cancelAnimationFrame(anim); const m = e.deltaMode === 1 ? 16 : 1;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) { cam.tx -= (e.deltaX || e.deltaY) * m; apply(); return; }
    zoomAt(Math.exp(-e.deltaY * m * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left); }
  function stripGo(e) { const r = strip.getBoundingClientRect(), wx = (e.clientX - r.left) / r.width * TOTAL; cancelAnimationFrame(anim); cam.tx = (vw() - cardW()) / 2 - wx * cam.s; apply(); }
  function onKey(e) { if (!alive || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.body.classList.contains('ai-open')) return;
    if (e.key === 'Escape') { if (sel) { e.preventDefault(); closeCard(); } return; }
    const g = e.target.closest && e.target.closest('.tle'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(g.dataset.id); return; }
    if (e.target.closest && e.target.closest('.phcard')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (sel) { const i = EV.findIndex(x => x.id === sel) + (e.key === 'ArrowLeft' ? -1 : 1); if (EV[i]) open(EV[i].id); } else { cam.tx += e.key === 'ArrowLeft' ? 120 : -120; apply(); } }
    else if (e.key === '+' || e.key === '=') zoomAt(1.4, vw() / 2); else if (e.key === '-') zoomAt(1 / 1.4, vw() / 2); }
  let rz = 0; function onResize() { if (!alive) return; cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (alive) { cam.s = Math.max(cam.s, minS() * .9); apply(); } }); }
  function init(host = document.body, o = {}) {
    if (alive) destroy(); opts = o; alive = true; sel = null;
    root = document.createElement('div'); root.id = 'vtimeline'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Big Bang to Today timeline');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">⏳ Big Bang to Today <small>13.8 billion years · ${EV.length} events</small></b></div>
      <div class="tlstrip" role="slider" aria-label="Whole timeline: tap to jump" tabindex="0"><svg class="tlsv" width="100%" height="30" preserveAspectRatio="none"></svg><div class="tlhere"></div></div>
      <svg class="tlsvg" aria-label="Timeline"></svg>
      <div class="vzm phzm"><button data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button data-z="out" aria-label="Zoom out" title="Zoom out">−</button><button data-z="fit" aria-label="See everything" title="See everything"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#9ff5ea" stroke-width="2" stroke-linecap="round"><path d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5"/></svg></button></div>
      <div class="phkey tlkey">${KEYHTML}</div><aside class="phcard" hidden aria-labelledby="tlTitle"></aside>`;
    host.appendChild(root); svg = root.querySelector('.tlsvg'); card = root.querySelector('.phcard'); strip = root.querySelector('.tlstrip');
    [cam.s, cam.tx] = startView();
    svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false }); addEventListener('keydown', onKey); addEventListener('resize', onResize);
    let sd = false; strip.addEventListener('pointerdown', e => { sd = true; try { strip.setPointerCapture(e.pointerId); } catch (_) {} stripGo(e); });
    strip.addEventListener('pointermove', e => { if (sd) stripGo(e); }); strip.addEventListener('pointerup', () => sd = false); strip.addEventListener('pointercancel', () => sd = false);
    strip.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); cam.tx += (e.key === 'ArrowLeft' ? 1 : -1) * vw() * .4; apply(); } });
    root.querySelector('.phzm').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; cancelAnimationFrame(anim);
      if (z === 'in') zoomAt(1.5, (vw() - cardW()) / 2); else if (z === 'out') zoomAt(1 / 1.5, (vw() - cardW()) / 2); else animTo(...fit()); };
    card.addEventListener('click', e => { if (performance.now() - tapT < 600) { e.preventDefault(); e.stopImmediatePropagation(); } }, true); // v0.5c: swallow the ghost click from the opening tap
    card.addEventListener('click', e => { if (e.target.closest('.phx')) return closeCard(); const g = e.target.closest('[data-go]'); if (g) return open(g.dataset.go);
      const x = e.target.closest('[data-xgo]'); if (x) { e.preventDefault(); xsecGo(x.dataset.xgo); } });
    card.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    keyInit(); apply();
    if (o.focus && BY[o.focus]) { card.hidden = false; centreOn(o.focus, true); open(o.focus, true); }
    return root;
  }
  function destroy() { alive = false; cancelAnimationFrame(anim); clearTimeout(keyT); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); pts.clear(); if (root) root.remove(); root = null; sel = null; }
  return { init, destroy, isOpen: () => alive, open: id => open(id), close: closeCard,
    debug: () => ({ events: EV.length, total: TOTAL, cam: { ...cam }, sel, order: EV.every((e, i) => !i || e.x >= EV[i - 1].x), labels: root.querySelectorAll('.tlbox').length, xs: EV.map(e => Math.round(e.x)) }) };
})();
window.VTIME = VTIME;
