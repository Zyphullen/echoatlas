'use strict';
/* v0.7 UNIVERSE: a zoomable 3D tour through real images, one stop per scale (Earth → Sun → our sky → a spiral galaxy → a deep field → the oldest light).
   Raw WebGL 1, no libraries, no network. Pictures come from UNI_IMG (index.html: universe/*.webp next to the page; TEST file: inline).
   Drag to turn or look around, wheel / pinch / + − to zoom; zooming past a stop's limits moves to the next scale. #universe=1 · #u=<stop id> */
const VUNI = (() => {
  const K = ['#3dff8a', '#ffa53d', '#ff4d5e'], CN = { k: 'known', t: 'we think', u: 'unknown' }, CC = { k: K[0], t: K[1], u: K[2] };
  // per kind: camera distance range (globe / disc / panel / shell) or field of view range (sky, seen from inside)
  const LIM = { globe: [1.35, 7, 3.2], disc: [0.9, 6.5, 2.6], panel: [0.75, 6, 2.4], shell: [1.25, 6, 3.2], sky: [28, 100, 75] };
  let root, cv, gl, prog, alive = false, opts = {}, i0 = 0, cur = null, dist = 3, yaw = 0, pitch = 0, fade = 1, fadeDir = 0, raf = 0, last = 0, spin = true;
  let sphere, quad, tex = {}, ptrs = new Map(), pinch0 = 0, drag = null, card, cardOn = false, glOK = true, onKey, onResize, nextIdx = -1, enterFrom = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const imgURL = k => { const u = (typeof UNI_IMG !== 'undefined' && UNI_IMG[k]) || ('universe/' + k + '.webp'); if (!u.startsWith('inline:')) return u;
    const el = document.getElementById(u.slice(7)); if (!el) return ''; if (el._url) return el._url; const b = atob(el.textContent.trim()), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return el._url = URL.createObjectURL(new Blob([a], { type: 'image/webp' })); };

  /* ---------- tiny matrix helpers (column-major, like WebGL) ---------- */
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), r = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * r, -1, 0, 0, 2 * f * n * r, 0]; }
  function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
  function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
  function trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }

  /* ---------- GL setup ---------- */
  const VS = `attribute vec3 p;attribute vec2 t;uniform mat4 M;varying vec2 v;varying vec3 q;void main(){v=t;q=p;gl_Position=M*vec4(p,1.0);}`;
  // mode 0 sphere (equirectangular, u flipped for sky maps), 1 round photo (soft circular edge), 2 square photo (soft edges)
  const FS = `precision mediump float;varying vec2 v;varying vec3 q;uniform sampler2D T;uniform float A,mode,flip,shade;uniform vec3 L;
    void main(){vec4 c;float a=A;
      if(mode<0.5){float lon=atan(q.x,q.z),lat=asin(clamp(q.y,-1.0,1.0));float u=0.5+lon/6.2831853;if(flip>0.5)u=1.0-u;c=texture2D(T,vec2(u,0.5-lat/3.1415927));
        if(shade>0.5){float d=max(dot(normalize(q),L),0.0);c.rgb*=0.55+0.6*d;}}
      else{c=texture2D(T,v);vec2 w=v*2.0-1.0;if(mode<1.5){a*=smoothstep(1.0,0.86,length(w));}else{a*=smoothstep(1.0,0.9,max(abs(w.x),abs(w.y)));}}
      gl_FragColor=vec4(c.rgb,c.a*a);}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; }
  function mesh(pos, uv, idx) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const u = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, u); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const e = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); return { b, u, e, n: idx.length }; }
  function setup() {
    gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false }) || cv.getContext('experimental-webgl');
    if (!gl) return false;
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
    const P = [], U = [], I = [], NX = 72, NY = 36;   // unit sphere
    for (let y = 0; y <= NY; y++) for (let x = 0; x <= NX; x++) { const lat = Math.PI / 2 - y / NY * Math.PI, lon = x / NX * 2 * Math.PI - Math.PI; P.push(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)); U.push(x / NX, y / NY); }
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const a = y * (NX + 1) + x, b = a + NX + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    sphere = mesh(P, U, I); quad = mesh([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3]);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }
  function texture(k) {
    if (tex[k]) return tex[k].ok ? tex[k].t : null;
    const src = imgURL(k); if (!src) return null; // TEST file still reading its inline pictures: try again next frame
    const t = gl.createTexture(), im = new Image(); tex[k] = { t, ok: false, img: im };
    im.onload = () => { if (!alive || !gl) return; gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); } catch (e) { tex[k].err = true; return; }
      const pot = (im.width & (im.width - 1)) === 0 && (im.height & (im.height - 1)) === 0;
      if (pot) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, pot ? gl.REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex[k].ok = true; root.classList.remove('loading'); };
    im.onerror = () => { tex[k].err = true; };
    im.src = src; return null;
  }
  function draw(m, M, A, mode, flip, shadeOn) {
    const pl = gl.getAttribLocation(prog, 'p'), tl = gl.getAttribLocation(prog, 't');
    gl.bindBuffer(gl.ARRAY_BUFFER, m.b); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.u); gl.enableVertexAttribArray(tl); gl.vertexAttribPointer(tl, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.e);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'M'), false, new Float32Array(M)); gl.uniform1f(gl.getUniformLocation(prog, 'A'), A);
    gl.uniform1f(gl.getUniformLocation(prog, 'mode'), mode); gl.uniform1f(gl.getUniformLocation(prog, 'flip'), flip); gl.uniform1f(gl.getUniformLocation(prog, 'shade'), shadeOn);
    gl.uniform3f(gl.getUniformLocation(prog, 'L'), -0.55, 0.35, 0.76); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
  }

  /* ---------- frame ---------- */
  function frame(now) {
    raf = 0; if (!alive) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (fadeDir) { fade += fadeDir * dt * 3.2; if (fadeDir < 0 && fade <= 0) { fade = 0; fadeDir = 1; select(nextIdx, enterFrom); } else if (fade >= 1) { fade = 1; fadeDir = 0; } }
    if (spin && !drag && cur && cur.kind !== 'sky') yaw += dt * (cur.kind === 'globe' ? 0.12 : 0.05);
    render(); if (fadeDir || spin || drag) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };
  function render() {
    if (!gl) return; const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const t = texture(cur.img); if (!t) return; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(prog, 'T'), 0);
    const asp = w / Math.max(1, h), narrow = asp < 0.8 ? 1.25 : 1;
    if (cur.kind === 'sky') {   // inside the ball: zoom changes the field of view
      const P = persp(dist * Math.PI / 180 * narrow, asp, 0.05, 10), V = mul(rotX(pitch), rotY(yaw));
      gl.disable(gl.CULL_FACE); draw(sphere, mul(P, mul(V, [3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1])), fade, 0, 1, 0); return;
    }
    const P = persp(0.75 * narrow, asp, 0.05, 50), V = mul(trans(0, 0, -dist), mul(rotX(pitch), rotY(yaw)));
    if (cur.kind === 'globe') { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); draw(sphere, mul(P, V), fade, 0, 0, 1); gl.disable(gl.CULL_FACE); }
    else if (cur.kind === 'shell') { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); draw(sphere, mul(P, V), fade * 0.55, 0, 1, 0); gl.cullFace(gl.BACK); draw(sphere, mul(P, V), fade * 0.82, 0, 1, 0); gl.disable(gl.CULL_FACE); }
    else draw(quad, mul(P, V), fade, cur.kind === 'disc' ? 1 : 2, 0, 0);
  }

  /* ---------- stops, card, caption ---------- */
  function select(i, from) {
    i0 = Math.max(0, Math.min(UNI.length - 1, i)); cur = UNI[i0]; const L = LIM[cur.kind];
    dist = from > 0 ? L[1] * 0.92 : from < 0 ? L[0] * 1.08 : L[2]; yaw = cur.kind === 'sky' ? Math.PI : cur.kind === 'globe' ? -0.4 : 0; pitch = cur.kind === 'disc' || cur.kind === 'panel' ? -0.25 : cur.kind === 'globe' ? 0.25 : 0; spin = true;
    texture(cur.img); if (!(tex[cur.img] && tex[cur.img].ok)) root.classList.add('loading');
    if (UNI[i0 + 1]) texture(UNI[i0 + 1].img);   // warm the next picture
    root.querySelectorAll('.ustop').forEach((b, k) => { b.classList.toggle('on', k === i0); b.setAttribute('aria-current', k === i0 ? 'step' : 'false'); });
    const n = cur; root.querySelector('.ucap').innerHTML = `<b><i class="ud" style="background:${CC[n.s]}"></i>${esc(n.name)}</b><span class="usz">${esc(n.size)}</span><span class="ucr">📷 ${esc(n.credit)}</span>`;
    root.querySelector('.uhint').textContent = n.kind === 'sky' ? 'Drag to look around · zoom in and out · zoom out further for the next scale' : 'Drag to turn · zoom in and out · zoom out for the next scale';
    paintCard(); hashSet(); if (!glOK) fallback(); kick();
  }
  function go(i, from) { if (i < 0 || i >= UNI.length || i === i0 && !from) return; if (!glOK) return select(i, from); nextIdx = i; enterFrom = from || 0; fadeDir = -1; kick(); }
  function paintCard() {
    const n = cur, srcs = n.src.map(k => SRC[k]).filter(Boolean);
    const chips = typeof xsecChipsHTML === 'function' ? xsecChipsHTML([...n.rel, ...(typeof xsecBack === 'function' ? xsecBack('uni', n.id) : [])]) : '';
    card.innerHTML = `<button class="ux" aria-label="Close">✕</button><div class="ukick" style="color:${CC[n.s]}"><i class="ud" style="background:${CC[n.s]}"></i>${CN[n.s]} · stop ${i0 + 1} of ${UNI.length}</div>
      <h3 id="uTitle">${esc(n.name)}</h3><p class="usub">${esc(n.sub)}</p><p>${esc(n.a)}</p>${n.b.map(([h, t]) => `<h4>${esc(h)}</h4><p>${esc(t)}</p>`).join('')}
      <p class="ucredit">📷 Image: ${esc(n.credit)}</p><h4>Sources</h4><ol class="usrc">${srcs.map(s => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ol>${chips}`;
  }
  function openCard(on) { cardOn = on; card.hidden = !on; root.classList.toggle('carded', on); root.querySelector('.uinfo').setAttribute('aria-expanded', on); if (on) card.scrollTop = 0; }
  function hashSet() { if (!alive) return; const h = i0 === 0 && !opts._moved ? '#universe=1' : '#u=' + encodeURIComponent(cur.id); if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h); }
  function fallback() { const f = root.querySelector('.ufall'); f.hidden = false; f.innerHTML = `<img src="${imgURL(cur.img)}" alt="${esc(cur.name)}"><p>3D needs WebGL, which is off in this browser. Here is the real picture.</p>`; }

  /* ---------- input ---------- */
  function zoomBy(f) { const L = LIM[cur.kind]; let d = dist * f; opts._moved = 1;
    if (d > L[1] * 1.02) { if (i0 < UNI.length - 1 && !fadeDir) go(i0 + 1, -1); d = L[1]; } else if (d < L[0] * 0.98) { if (i0 > 0 && !fadeDir) go(i0 - 1, 1); d = L[0]; }
    dist = Math.max(L[0], Math.min(L[1], d)); spin = false; kick(); }
  function onWheel(e) { e.preventDefault(); zoomBy(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004)); }
  function onDown(e) { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); spin = false;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; } else drag = { x: e.clientX, y: e.clientY }; root.classList.add('moving'); kick(); }
  function onMove(e) { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) zoomBy(pinch0 / d); pinch0 = d; return; }
    if (!drag) return; const k = cur.kind === 'sky' ? dist / 75 * 0.006 : 0.008; yaw += (e.clientX - drag.x) * k; pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - drag.y) * k)); drag = { x: e.clientX, y: e.clientY }; opts._moved = 1; kick(); }
  function onUp(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (!ptrs.size) { drag = null; root.classList.remove('moving'); } }

  function init(host = document.body, o = {}) {
    if (alive) destroy(); opts = o; alive = true;
    root = document.createElement('div'); root.id = 'vcosmos'; root.className = 'loading'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Universe: a 3D tour through real images');
    root.innerHTML = `<div class="vcbar"><button class="vback" aria-label="Back">← Back</button><b class="vtit">🔭 Universe <small>real images · ${UNI.length} scales · drag and zoom</small></b><button class="uinfo" aria-expanded="false" aria-label="About this picture">ⓘ About</button></div>
      <canvas class="ucv" aria-label="3D view of the current picture"></canvas><div class="ufall" hidden></div><div class="uload" aria-hidden="true">Loading the real picture…</div>
      <nav class="ustops" aria-label="Scales">${UNI.map((n, k) => `<button class="ustop" data-i="${k}" title="${esc(n.name)}"><b>${k + 1}</b><span>${esc(n.name.split(':')[0].replace(/ \(.*\)/, ''))}</span></button>`).join('')}</nav>
      <div class="vzm uzm"><button data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button data-z="out" aria-label="Zoom out" title="Zoom out">−</button><button data-z="prev" aria-label="Smaller scale" title="Smaller scale">‹</button><button data-z="next" aria-label="Bigger scale" title="Bigger scale">›</button></div>
      <div class="ucap" aria-live="polite"></div><div class="uhint"></div><p class="uhonest">Real photos and real sky maps, shown flat or wrapped on a ball. Sizes are on the scale line, not drawn to scale with each other.</p>
      <aside class="ucard" hidden aria-labelledby="uTitle"></aside>`;
    host.appendChild(root); cv = root.querySelector('.ucv'); card = root.querySelector('.ucard');
    try { glOK = setup(); } catch (e) { glOK = false; }
    if (glOK) { const mine = root; cv.addEventListener('webglcontextlost', e => { e.preventDefault(); if (!alive || root !== mine) return; glOK = false; fallback(); }); } // destroy() drops the context on purpose: ignore that one
    root.querySelector('.vback').onclick = () => { const c = opts.onClose; destroy(); c && c(); };
    root.querySelector('.uinfo').onclick = () => openCard(!cardOn);
    root.querySelector('.ustops').onclick = e => { const b = e.target.closest('.ustop'); if (b) { opts._moved = 1; go(+b.dataset.i, 0); } };
    root.querySelector('.uzm').onclick = e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z; opts._moved = 1;
      if (z === 'in') zoomBy(1 / 1.35); else if (z === 'out') zoomBy(1.35); else if (z === 'prev') go(i0 - 1, 1); else go(i0 + 1, -1); };
    card.addEventListener('click', e => { if (e.target.closest('.ux')) return openCard(false); const x = e.target.closest('[data-xgo]'); if (x) { e.preventDefault(); xsecGo(x.dataset.xgo); } });
    card.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('wheel', onWheel, { passive: false });
    onKey = e => { if (!alive || e.target.closest && e.target.closest('input,textarea')) return; if (document.getElementById('xmenu') && document.getElementById('xmenu').classList.contains('on')) return;
      if (e.key === '+' || e.key === '=') zoomBy(1 / 1.25); else if (e.key === '-') zoomBy(1.25); else if (e.key === 'ArrowRight') go(i0 + 1, -1); else if (e.key === 'ArrowLeft') go(i0 - 1, 1);
      else if (e.key === 'Escape' && cardOn) { openCard(false); e.stopPropagation(); } };
    addEventListener('keydown', onKey); onResize = () => kick(); addEventListener('resize', onResize);
    const f = o.focus && UNI_BY_ID[o.focus] ? UNI.indexOf(UNI_BY_ID[o.focus]) : 0; if (o.focus) opts._moved = 1;
    select(f, 0); if (o.focus) openCard(true);
    return root;
  }
  function destroy() { alive = false; cancelAnimationFrame(raf); raf = 0; if (onKey) removeEventListener('keydown', onKey); if (onResize) removeEventListener('resize', onResize);
    try { const x = gl && gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); } catch (e) {} gl = null; tex = {}; ptrs.clear(); if (root) root.remove(); root = null; }
  return { init, destroy, isOpen: () => alive, go: i => go(i, 0), get state() { return cur ? { stop: cur.id, i: i0, kind: cur.kind, dist: +dist.toFixed(3), yaw: +yaw.toFixed(3), pitch: +pitch.toFixed(3), gl: glOK, loaded: !!(tex[cur.img] && tex[cur.img].ok), fading: !!fadeDir, card: cardOn } : null; },
    zoom: f => zoomBy(f), open: id => { const n = UNI_BY_ID[id]; if (n) { go(UNI.indexOf(n), 0); openCard(true); } } };
})();
window.VUNI = VUNI;
