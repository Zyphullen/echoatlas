'use strict';
/* v0.7 OPEN QUESTIONS: browse the gaps. Lists every red (unknown) and orange (we think) card that is already in the site's data,
   across From Nothing to Us, Big Bang to Today, Physics, Biology and Maths, with its rival ideas and the tests that could decide it
   (both already in the data, rivals.js). Nothing new is written here; each entry opens the real card. #gaps=1 */
const VGAPS = (() => {
  const CC = { u: '#ff4d5e', t: '#ffa53d' }, CN = { u: 'unknown', t: 'we think' };
  const SEC = [['fntu', 'From Nothing to Us', '✦', '#ffd36b'], ['tl', 'Big Bang to Today', '⏳', '#e79cff'], ['ph', 'Physics', '⚛', '#e79cff'], ['bio', 'Biology', '🌿', '#5cf0a0'], ['maths', 'Maths', '∑', '#4ff3e3']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let root, alive = false, opts = {}, fCol = 'all', fSec = 'all', onKey, list = [];
  const S = (k, map) => { const r = (map || SRC)[k]; return r ? { t: r[0], u: r[1] } : null; };
  function gather() {
    const L = [], push = (kind, id, s, name, sub, sum, srcs, extra) => { if (s !== 'u' && s !== 't') return; L.push({ kind, id, s, name, sub, sum, srcs: srcs.filter(Boolean), ...(extra || {}) }); };
    for (const n of N) push('fntu', n.id, n.s, n.name, n.line, (n.info || []).join(' '), (n.src || []).map(k => S(k)),
      { riv: (typeof RIV !== 'undefined' && RIV[n.id] || []).map(([t, s, x, k]) => ({ t, s, x, srcs: String(k || '').split(',').filter(Boolean).map(q => S(q)).filter(Boolean) })),
        tests: (typeof TESTS !== 'undefined' && TESTS[n.id] || []).map(([t, k]) => ({ t, src: k ? S(k) : null })) });
    for (const e of TL) push('tl', e.id, e.s, e.name, e.when, e.a, (e.src || []).map(k => S(k)));
    for (const n of PHYS) push('ph', n.id, n.s, n.name, n.sub, n.a, (n.src || []).map(k => S(k)));
    if (typeof BIO !== 'undefined') for (const n of BIO) push('bio', n.id, n.s, n.name, n.sub, n.a, (n.src || []).map(k => S(k)));
    if (typeof MATH !== 'undefined') for (const n of MATH) push('maths', n.id, n.s, n.name, n.sub, n.summ, (n.sources || []).map(k => S(k, typeof MATH_SRC !== 'undefined' ? MATH_SRC : SRC)));
    return L;
  }
  function item(q) {
    const sec = SEC.find(x => x[0] === q.kind), t = typeof xsecTarget === 'function' ? xsecTarget(q.kind, q.id) : null;
    const src = q.srcs.slice(0, 3).map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('') + (q.srcs.length > 3 ? `<li class="gmore">+ ${q.srcs.length - 3} more on the card</li>` : '');
    const riv = q.riv && q.riv.length ? `<details class="griv"><summary>Rival ideas (${q.riv.length})</summary><ul>${q.riv.map(r => `<li><i class="gd" style="background:${CC[r.s] || '#3dff8a'}" title="${esc(CN[r.s] || 'known')}"></i><b>${esc(r.t)}</b> ${esc(r.x)}</li>`).join('')}</ul></details>` : '';
    const tst = q.tests && q.tests.length ? `<details class="gtst"><summary>Tests that could decide it (${q.tests.length})</summary><ul>${q.tests.map(x => `<li>${esc(x.t)}${x.src ? ` <a href="${esc(x.src.u)}" target="_blank" rel="noopener">source</a>` : ''}</li>`).join('')}</ul></details>` : '';
    return `<article class="gq" style="--c:${CC[q.s]}" data-kind="${q.kind}" data-s="${q.s}"><div class="gtop"><span class="gcol"><i class="gd" style="background:${CC[q.s]}"></i>${CN[q.s]}</span><span class="gsec" style="--k:${sec[3]}">${sec[2]} ${esc(sec[1])}</span></div>
      <h3>${esc(q.name)}</h3>${q.sub ? `<p class="gsub">${esc(q.sub)}</p>` : ''}<p>${esc(q.sum)}</p>${riv}${tst}
      ${src ? `<div class="gsrc"><h4>Sources</h4><ol>${src}</ol></div>` : ''}${t ? `<button class="gopen" data-xgo="${esc(t.hash)}">Open the card ↗</button>` : ''}</article>`;
  }
  function paint() {
    const vis = list.filter(q => (fCol === 'all' || q.s === fCol) && (fSec === 'all' || q.kind === fSec));
    const nu = list.filter(q => q.s === 'u').length, nt = list.filter(q => q.s === 't').length;
    root.querySelector('.gcount').innerHTML = `<b>${vis.length}</b> shown · ${list.length} in the atlas: <span style="color:${CC.u}">${nu} red (unknown)</span> and <span style="color:${CC.t}">${nt} orange (we think)</span>`;
    root.querySelector('.glist').innerHTML = vis.map(item).join('') || '<p class="gnone">Nothing matches these filters.</p>';
    root.querySelectorAll('[data-fc]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fc === fCol)); root.querySelectorAll('[data-fs]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fs === fSec));
    const h = '#gaps=1' + (fCol !== 'all' ? '&c=' + fCol : '') + (fSec !== 'all' ? '&in=' + fSec : ''); if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
  }
  function init(host = document.body, o = {}) {
    if (alive) destroy(); opts = o; alive = true; list = gather();
    const hp = new URLSearchParams(location.hash.slice(1)); fCol = ['u', 't'].includes(hp.get('c')) ? hp.get('c') : 'all'; fSec = SEC.some(s => s[0] === hp.get('in')) ? hp.get('in') : 'all';
    root = document.createElement('div'); root.id = 'vgaps'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Open questions: the gaps in what we know');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back">← Back</button><b class="vtit">❓ Open questions <small>the gaps in what we know · red and orange cards</small></b></div>
      <div class="gwrap"><p class="gintro">Every card in Echo Atlas has a colour. These are the <b style="color:${CC.u}">red</b> ones (nobody knows yet) and the <b style="color:${CC.t}">orange</b> ones (a leading idea, not settled), with the rival ideas and the tests that could decide them. Tap a card to open it where it lives.</p>
      <div class="gfil" role="toolbar" aria-label="Filters"><span class="glab">Colour</span><button data-fc="all">All</button><button data-fc="u"><i class="gd" style="background:${CC.u}"></i>Red · unknown</button><button data-fc="t"><i class="gd" style="background:${CC.t}"></i>Orange · we think</button></div>
      <div class="gfil" role="toolbar" aria-label="Sections"><span class="glab">Section</span><button data-fs="all">All</button>${SEC.map(s => `<button data-fs="${s[0]}">${s[2]} ${esc(s[1])}</button>`).join('')}</div>
      <p class="gcount" aria-live="polite"></p><div class="glist"></div></div>`;
    host.appendChild(root);
    root.querySelector('.vback').onclick = () => { const c = opts.onClose; destroy(); c && c(); };
    root.addEventListener('click', e => { const c = e.target.closest('[data-fc]'), s = e.target.closest('[data-fs]'), x = e.target.closest('[data-xgo]');
      if (c) { fCol = c.dataset.fc; paint(); } else if (s) { fSec = s.dataset.fs; paint(); } else if (x) { e.preventDefault(); const h = x.dataset.xgo; xsecGo(h); } });
    root.querySelector('.gwrap').addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    paint(); return root;
  }
  function destroy() { alive = false; if (root) root.remove(); root = null; }
  return { init, destroy, isOpen: () => alive, get state() { return { total: list.length, red: list.filter(q => q.s === 'u').length, orange: list.filter(q => q.s === 't').length, shown: root ? root.querySelectorAll('.gq').length : 0, col: fCol, sec: fSec }; } };
})();
window.VGAPS = VGAPS;
