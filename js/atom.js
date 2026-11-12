'use strict';
/* v13 Atom Sandbox: accessible, preset-driven teaching toy, NOT a quantum or nuclear physics engine.
   Unknown combinations are not faked; supported reactions are curated examples. */
const VATOM = (() => {
  let root, cv, cx, alive = false, raf = 0, opts = {}, paused = false;
  let Z = 1, A = 2, field = 75, cloud = true, t = 0, last = 0, clock = 0;
  let particles = [], photons = [], flashes = [], nextId = 0, reactions = 0, hits = 0, lastReaction = null;
  let dragging = null, toastTimer = 0;
  const rm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const element = z => z > 0 ? (ELS[z - 1] || [])[2] || `Element ${z}` : 'Neutron';
  const name = q => q.Z === 0 ? 'Free neutron' : q.Z === 1 ? ['','Hydrogen-1','Deuterium','Tritium'][q.A] || `Hydrogen-${q.A}` : `${element(q.Z)}-${q.A}`;
  const shells = z => {
    const caps = [2,8,8,18,18,32,21], row = z <= 2 ? 0 : z <= 10 ? 1 : z <= 18 ? 2 : z <= 36 ? 3 : z <= 54 ? 4 : z <= 86 ? 5 : 6;
    let left = z, out = [];
    for (let i=0;i<=row;i++) { const n = Math.min(caps[i],left); out.push(n); left-=n; }
    return out;
  };
  function add(z,a,x=.4,y=.5,charge=0) {
    if (typeof z === 'object') [z,a] = z;
    z=+z; a=Math.max(1,+a); if(z===0) a=1;
    const q={id:++nextId,Z:z,A:a,x,y,energy:.25,charge:z?charge:0,emit:Math.random()*.5};
    particles.push(q); return q;
  }
  function reset(z=1,a=2) {
    Z=z;A=a;particles=[];photons=[];flashes=[];reactions=0;hits=0;field=75;paused=false;t=0;
    if (root) {root.querySelector('.vaPause').textContent='Ⅱ Pause';update();}
  }
  function glow(x,y,r,col,a=1) {
    const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(240,255,255,${a})`);g.addColorStop(.17,col);g.addColorStop(1,'transparent');
    cx.fillStyle=g;cx.beginPath();cx.arc(x,y,r,0,7);cx.fill();
  }
  // v0.5: a bigger stage draws bigger atoms (radii, text and reach scale together; 1 = the v0.4 size on a small stage)
  let K=1,KT=1;function scaleFor(W,H){K=Math.max(1,Math.min(1.9,Math.min(W,H)/420));KT=Math.pow(K,.55);}
  function ring(x,y,r,col,a=.5,w=1) {
    cx.save();cx.globalAlpha=a;cx.strokeStyle=col;cx.lineWidth=w;cx.shadowColor=col;cx.shadowBlur=5;cx.beginPath();cx.arc(x,y,r,0,7);cx.stroke();cx.restore();
  }
  function text(s,x,y,size=11,col='#e8f7ff') {cx.font=`500 ${(size*KT).toFixed(1)}px system-ui,sans-serif`;cx.fillStyle=col;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(s,x,y);}
  function pair(p,x,y,d=5,col='#ffd36b') {d*=K;glow(x,y,d*3,col);cx.fillStyle=col;cx.beginPath();cx.arc(x,y,d,0,7);cx.fill();}
  function nucleus(q,X,Y) {
    if(q.Z===0) {pair(q,X,Y,7,'#a9b9d1');text('n',X,Y,10,'#061220');return;}
    const R=Math.min(27,10+Math.sqrt(q.A)*1.8)*K;glow(X,Y,R*3,'#4ff3e3',.8);ring(X,Y,R,'#93fff0',.68,1.3);
    for(let i=0;i<Math.min(36,q.A);i++){
      const a=i*2.39996+(q.charge===0?t*.045:0),rr=Math.sqrt(i/Math.min(36,q.A))*R*.72,xx=X+Math.cos(a)*rr,yy=Y+Math.sin(a)*rr*.8;
      pair(q,xx,yy,q.A<6?4.3:3.6,i<Math.min(q.Z,36)?'#ffd36b':'#f68bb9');
    }
    if(q.Z>2)text(`${q.Z}p · ${q.A-q.Z}n`,X,Y,9,'#fff');
  }
  function draw(q) {
    const W=cv.clientWidth,H=cv.clientHeight,X=q.x*W,Y=q.y*H,sc=q.Z?shells(q.Z):[],outer=(40+sc.length*11)*K;
    if(q.Z && q.charge<q.Z) for(let i=0;i<sc.length;i++) ring(X,Y,(40+i*11)*K,'#4ff3e3',.35);
    else if(q.Z) ring(X,Y,55*K,'#ffd36b',.27,1.5);
    const shown=Math.max(0,q.Z-q.charge);
    for(let i=0,k=0;i<sc.length;i++) for(let j=0;j<sc[i] && k<shown;j++,k++){
      const r=(40+i*11)*K,a=k/Math.max(1,sc[i])*Math.PI*2+t*(.55+i*.10)*(i%2?1:-1),x=X+Math.cos(a)*r,y=Y+Math.sin(a)*r;
      glow(x,y,9*K,'#4ff3e3');cx.fillStyle='#d6fffa';cx.beginPath();cx.arc(x,y,2*Math.sqrt(K),0,7);cx.fill();
    }
    if(q.energy>.1)ring(X,Y,outer+7,'#ffd36b',Math.min(.8,q.energy),1.5+q.energy);
    nucleus(q,X,Y);text(name(q),X,Y+outer+16*KT,11.5,'#eefcff');
    text(q.Z===0?'neutral · no electron shell':q.charge===0?'neutral atom':`${q.charge}+ nucleus · ${shown} shell e⁻ shown`,X,Y+outer+30*KT,9.8,'#8cb7cc');
  }
  function drawBack(W,H) {
    const g=cx.createRadialGradient(W*.48,H*.44,0,W*.48,H*.44,W*.75);g.addColorStop(0,'#08233c');g.addColorStop(.45,'#061225');g.addColorStop(1,'#040713');cx.fillStyle=g;cx.fillRect(0,0,W,H);
    let seed=12;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);for(let i=0;i<120;i++){cx.fillStyle=`rgba(175,229,255,${.13+rnd()*.35})`;cx.fillRect(rnd()*W,rnd()*H,rnd()<.08?2:1,1);}
    ring(W*.5,H*.48,Math.min(W,H)*.41,'#4ff3e3',.06,1);
  }
  function drawFrame() {
    const W=cv.clientWidth,H=cv.clientHeight;scaleFor(W,H);drawBack(W,H);
    for(const q of particles){if(q.Z&&q.charge<q.Z&&cloud){const X=q.x*W,Y=q.y*H,r=(75+shells(q.Z).length*10)*K;const g=cx.createRadialGradient(X,Y,1,X,Y,r);g.addColorStop(0,'#4ff3e322');g.addColorStop(1,'transparent');cx.fillStyle=g;cx.fillRect(X-r,Y-r,2*r,2*r);}draw(q);}
    for(const p of photons){const x=p.x*W,y=p.y*H;glow(x,y,16*K,'#ffd36b');text('γ',x,y-13*K,10,'#ffe19b');}
    for(const f of flashes){const x=f.x*W,y=f.y*H;glow(x,y,(45+f.age*140)*K,'#ffd36b',1-f.age);ring(x,y,(15+f.age*190)*K,'#ffd36b',1-f.age,2.4);}
    text('Drag nuclei together · tap a particle for energy',W/2,H-17,11,'#74a8bf');
  }
  function toast(a,b) {
    if(!root)return;const el=root.querySelector('.vappop');el.innerHTML=`<b>${esc(a)}</b><span>${esc(b)}</span>`;el.classList.add('on');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>root&&root.querySelector('.vappop').classList.remove('on'),5700);
  }
  function gamma(q) {if(photons.length>70)return;photons.push({x:.055,y:.22+Math.random()*.65,tx:q.x,ty:q.y,target:q,age:0,free:false});}
  function inject(q) {q.energy=Math.min(1.3,q.energy+field/140+.15);for(let i=0;i<3;i++){photons.push({x:q.x+(Math.random()-.5)*.03,y:q.y+(Math.random()-.5)*.03,age:0,free:true,vx:(Math.random()-.5)*.26,vy:(Math.random()-.5)*.26});}update();}
  function reaction(a,b) {
    const key=[a,b].map(q=>`${q.Z}:${q.A}`).sort().join('+');
    const R={
      '1:1+1:1':{name:'Deuterium-2',parts:[[1,2]],note:'Simplified p + p branch; the emitted positron and neutrino are not drawn.'},
      '1:1+1:2':{name:'Helium-3',parts:[[2,3]],note:'Photons are schematic; no gamma-ray energy ledger is calculated.'},
      '1:1+1:3':{name:'Helium-4',parts:[[2,4]],note:'Photons are schematic; no gamma-ray energy ledger is calculated.'},
      '1:2+1:2':{name:'Helium-3 + free neutron',parts:[[2,3],[0,1]],note:'One D + D branch is shown; the real reaction has other branches.'},
      '1:2+1:3':{name:'Helium-4 + free neutron',parts:[[2,4],[0,1]]},
      '1:2+2:3':{name:'Helium-4 + free proton',parts:[[2,4],[1,1]]},
      '1:1+2:3':{name:'Helium-4',parts:[[2,4]],note:'Photons are schematic; no gamma-ray energy ledger is calculated.'},
      '1:2+3:7':{name:'Two helium-4 nuclei',parts:[[2,4],[2,4]],note:'Simplified lithium-7 + deuteron example; products carry kinetic energy in reality.'},
      '2:4+6:12':{name:'Oxygen-16',parts:[[8,16]],note:'The real alpha-capture needs much higher temperature than this toy suggests.'},
      '1:1+6:13':{name:'Nitrogen-14',parts:[[7,14]]}
    }[key];
    if(!R){
      hits++;
      const W=cv.clientWidth,H=cv.clientHeight;let dx=(a.x-b.x)*W,dy=(a.y-b.y)*H;
      let d=Math.hypot(dx,dy);if(d<1){const ang=(a.id+b.id)*.7;dx=Math.cos(ang);dy=Math.sin(ang);d=1;} // happens when a user drops one nucleus onto the other
      const nx=dx/d,ny=dy/d,midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,half=(80*K/(W+H))/2;
      a.x=Math.max(.08,Math.min(.92,midX+nx*half));a.y=Math.max(.1,Math.min(.8,midY+ny*half));
      b.x=Math.max(.08,Math.min(.92,midX-nx*half));b.y=Math.max(.1,Math.min(.8,midY-ny*half));
      a.energy=b.energy=Math.min(.3,(a.energy+b.energy)/2);
      update();toast('No reaction in this small model','The nuclei bounce apart; no particles vanish or appear. Try D + T on the Golden path.');return;
    }
    const input=[a,b].map(q=>({Z:q.Z,A:q.A,name:name(q)}));
    const x=(a.x+b.x)/2,y=(a.y+b.y)/2;particles=particles.filter(q=>q!==a&&q!==b);flashes.push({x,y,age:0});
    reactions++;lastReaction={key,input,output:R.parts.map(([Z,A])=>({Z,A}))};
    const off=[[0,0],[.08,0],[-.055,.04],[-.055,-.04]];
    R.parts.forEach(([z,m],i)=>add(z,m,x+off[i][0],y+off[i][1],z?Math.max(0,z-1):0));
    toast('✦ New particles formed',`${input.map(q=>q.name).join(' + ')} → ${R.name}. ${key==='1:2+1:3'?'The real reaction releases 17.6 MeV; product paths are artistic, not an energy calculation.':R.note||'Curated branch, not a yield or energy calculation; emitted photons are not an energy ledger.'}`);update();
  }
  function step(dt) {
    for(const q of particles){
      q.energy=Math.max(0,q.energy-dt*.013);
      if(q.Z && field>=65){q.emit-=dt;if(q.emit<=0 && particles.length<24){gamma(q);q.emit=.38+Math.random()*.70;}}
      if(q.energy>.25){q.x+=(Math.random()-.5)*dt*q.energy*.018;q.y+=(Math.random()-.5)*dt*q.energy*.018;}
      q.x=Math.max(.11,Math.min(.89,q.x));q.y=Math.max(.12,Math.min(.78,q.y));
    }
    for(const p of photons){
      p.age+=dt;
      if(p.free){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.age>2)p.dead=true;continue;}
      const q=particles.includes(p.target)?p.target:null;if(q){p.tx=q.x;p.ty=q.y;}
      const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);p.x+=dx*dt*2.0;p.y+=dy*dt*2.0;
      if(d<.02){if(q)q.energy=Math.min(1.2,q.energy+field/230);p.dead=true;}
    }
    photons=photons.filter(p=>!p.dead&&p.x>-.1&&p.x<1.1&&p.y>-.1&&p.y<1.1);
    for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
      const a=particles[i],b=particles[j];if(!a.Z||!b.Z)continue;
      if(Math.hypot((a.x-b.x)*cv.clientWidth,(a.y-b.y)*cv.clientHeight)<76*K && field>=65 && a.energy+b.energy>=.72){reaction(a,b);i=-1;break;}
    }
    for(const f of flashes)f.age+=dt*1.5;flashes=flashes.filter(f=>f.age<1);
  }
  function frame(now) {
    if(!alive)return;raf=requestAnimationFrame(frame);const dt=Math.min(.035,(now-(last||now))/1000);last=now;if(!paused){t+=rm()?0:dt;clock+=dt;step(dt);}
    const d=Math.min(2,devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}cx.setTransform(d,0,0,d,0,0);drawFrame();
  }
  function update() {
    if(!root)return;
    root.querySelector('#vaZ').value=Math.max(1,Z);root.querySelector('#vaA').value=A;root.querySelector('#vaField').value=field;
    root.querySelector('.vamass').textContent=Z?`${name({Z,A})} · ${ELS[Z-1][1]}`:'Free neutron';
    root.querySelector('.vavalues').textContent=Z?`${Z} ${Z===1?'proton':'protons'} · ${A-Z} ${A-Z===1?'neutron':'neutrons'} · ${A-Z<0?'not a physical isotope':'mass number '+A}`:'One neutral teaching particle';
    root.querySelector('#vaA').min=Z;
    { const f=root.querySelector('.vaFix'), card=Z?name({Z,A}):'Free neutron', id=Z?ELS[Z-1][1]+'-'+A:'n'; // v0.3: Suggest a fix + share link, same as every other card
      if(f&&f.dataset.k!==id){f.dataset.k=id;f.innerHTML=copyBtnHTML(SITE+'#atom=1')+fixBtnHTML('Atom Sandbox','Atom Sandbox: '+card,'atom/'+id,SITE+'#atom=1');} }
    const D=particles.filter(q=>q.Z===1&&q.A===2),T=particles.filter(q=>q.Z===1&&q.A===3);
    root.querySelector('.vapath').textContent=D.length&&T.length?'✦ Ready: drag D onto T → ⁴He + n.':'Golden path: D + T → ⁴He + n (a teaching example, not a rate or energy calculation).';
    root.querySelector('.vaheat').textContent=`Energy ${field}% · ${field<65?'below reaction threshold':'reactions available'} · preset control, not temperature`;
    root.querySelectorAll('.vaPreset').forEach(b=>b.classList.toggle('on',+b.dataset.z===Z&&+b.dataset.a===A));
  }
  function setIsotope(z,a,clear=false) {Z=z;A=Math.max(z,a);if(clear){particles=[];photons=[];flashes=[];}update();}
  function golden() {reset(1,2);const nar=(cv&&cv.clientWidth||innerWidth)<520; // v0.5: on a narrow (phone) stage the pair sits on a diagonal so the two atoms and their names do not overlap
    const a=add(1,2,nar?.3:.37,nar?.36:.42,1),b=add(1,3,nar?.7:.63,nar?.62:.42,1);a.energy=b.energy=1;update();toast('Your Golden path is ready','Drag one bright nucleus onto the other → helium-4 and a neutron.');}
  function position(e) {const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,w:r.width,h:r.height};}
  function bind() {
    cv.addEventListener('pointerdown',e=>{
      const p=position(e);const near=particles.map(q=>({q,d:Math.hypot((q.x-p.x)*p.w,(q.y-p.y)*p.h)})).sort((a,b)=>a.d-b.d)[0];
      if(near&&near.d<70*K){dragging={q:near.q,dx:near.q.x-p.x,dy:near.q.y-p.y,moved:false};cv.setPointerCapture(e.pointerId);inject(near.q);}
      else {const q=add(Z,Math.max(Z,A),Math.max(.1,Math.min(.9,p.x)),Math.max(.15,Math.min(.75,p.y)));inject(q);toast('Particle dropped','Tap it for more energy, or drag it into another nucleus.');}
    });
    cv.addEventListener('pointermove',e=>{if(!dragging)return;const p=position(e);dragging.q.x=Math.max(.06,Math.min(.94,p.x+dragging.dx));dragging.q.y=Math.max(.1,Math.min(.82,p.y+dragging.dy));dragging.moved=true;});
    const end=()=>dragging=null;cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
    root.querySelector('.vback').onclick=close;
    root.querySelector('#vaZ').oninput=e=>{const old=Z;Z=+e.target.value;A=Math.max(Z,A+Z-old);update();};
    root.querySelector('#vaA').oninput=e=>{A=Math.max(Z,+e.target.value);update();};
    root.querySelector('#vaField').oninput=e=>{field=+e.target.value;update();};
    root.querySelector('.vaAdd').onclick=()=>{const q=add(Z,A,.27+Math.random()*.46,.24+Math.random()*.42,1);inject(q);};
    root.querySelector('.vaFree').onclick=()=>add(Z,A,.27+Math.random()*.46,.24+Math.random()*.42);
    root.querySelector('.vaPath').onclick=golden;
    root.querySelector('.vaClear').onclick=()=>{particles=[];photons=[];flashes=[];toast('Free play','Choose an isotope below, then click the arena to drop it.');update();};
    root.querySelector('.vaPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ Play':'Ⅱ Pause';};
    root.querySelector('.vaCloud').onchange=e=>cloud=e.target.checked;
    root.querySelectorAll('.vaPreset').forEach(b=>b.onclick=()=>setIsotope(+b.dataset.z,+b.dataset.a));
  }
  function init(host=document.body,o={}) {
    if(alive)destroy();opts=o;alive=true;paused=false;
    root=document.createElement('div');root.id='vatom';root.role='dialog';root.setAttribute('aria-label','Atom Sandbox');
    root.innerHTML=`<div class="vcbar"><button class="vback" aria-label="Back to the map">← Back</button><b class="vtit">${atomSVG()} Atom Sandbox <small>build · collide · discover · v0.7</small></b><button class="vaPause buttonlike">Ⅱ Pause</button></div>
    <div class="vaIntro"><b>Play with particles. Find a path from hydrogen to stars.</b><span>Familiar shell pictures + curated reaction examples. Not a quantum or nuclear physics engine.</span></div>
    <div class="vaBody"><div class="vaStage"><canvas aria-label="Particle arena. Click to drop a particle; drag nuclei together to react."></canvas><div class="vappop" role="status"></div><div class="vaLegend"><i class="vp"></i>protons <i class="vn"></i>neutrons <i class="ve"></i>electron symbols <i class="vg"></i>photons</div></div>
    <aside class="vaSide"><h3>Build a particle</h3><label>Element<input id="vaZ" type="range" min="1" max="18" step="1" aria-label="Element by proton count"></label><div class="vamass"></div><label>Mass number<input id="vaA" type="range" min="1" max="48" step="1" aria-label="Total protons and neutrons"></label><div class="vavalues"></div><label>Energy / incoming photons<input id="vaField" type="range" min="0" max="100" step="1" aria-label="Teaching energy control"></label><div class="vaheat"></div><div class="vaBt"><button class="vaAdd">+ Bare nucleus</button><button class="vaFree">+ Neutral atom</button></div><div class="vaPre"><button class="vaPreset" data-z="1" data-a="1" title="Hydrogen-1">H</button><button class="vaPreset" data-z="1" data-a="2" title="Deuterium">D</button><button class="vaPreset" data-z="1" data-a="3" title="Tritium">T</button><button class="vaPreset" data-z="2" data-a="4" title="Helium-4">He</button><button class="vaPreset" data-z="3" data-a="7" title="Lithium-7">Li</button><button class="vaPreset" data-z="6" data-a="12" title="Carbon-12">C</button></div><button class="vaPath">✦ Golden path: hydrogen → helium</button><label class="vaCloud"><input type="checkbox" checked> Show electron-cloud tint</label><div class="vapath"></div><button class="vaClear">↺ Clear / free play</button><div class="vaFix pact"></div><details><summary>How to play + what is real</summary><p>Pick an isotope and click the sky to drop it. Tap a particle for energy, or turn on incoming photons (a schematic control). Choose + Neutral atom for shell-electron symbols. Drag bright nuclei together above 65% energy.</p><p><b>Golden path:</b> deuterium (D) + tritium (T) → helium-4 + a free neutron. Proton and neutron totals are conserved in the curated examples. The real reaction releases 17.6 MeV and leaves helium-4 + neutron. Product paths and photons here are artistic, not physical trajectories or an energy calculation. Other combinations are only shown if they are in the small curated reaction table.</p><p>Electron symbols and orbital rings are enlarged teaching icons, not real trajectories. Nuclear positions are artistic. Proton/neutron colours are schematic. Any isotope is selectable for free play, including unstable or impossible combinations; stability and decay are not simulated. The bar is not a real temperature.</p><p>sources: <a href="${SRC.bohr[1]}" target="_blank" rel="noopener">${SRC.bohr[0]}</a> · <a href="${SRC.bbn[1]}" target="_blank" rel="noopener">${SRC.bbn[0]}</a> · <a href="${SRC.pdg[1]}" target="_blank" rel="noopener">${SRC.pdg[0]}</a></p></details></aside></div>`;
    host.appendChild(root);cv=root.querySelector('canvas');cx=cv.getContext('2d');reset();bind();golden();raf=requestAnimationFrame(frame);focusQuiet(root.querySelector('.vback'));
  }
  function destroy(){alive=false;cancelAnimationFrame(raf);raf=0;dragging=null;clearTimeout(toastTimer);if(root)root.remove();root=null;dragging=null;}
  function close(){destroy();opts.onClose&&opts.onClose();}
  return {init,destroy,isOpen:()=>alive,golden,move:(i,x,y)=>{if(particles[i]){particles[i].x=x;particles[i].y=y;particles[i].energy=1;}},debug:()=>({Z,A,field,paused,reactions,hits,lastReaction,photons:photons.length,particles:particles.map(q=>({Z:q.Z,A:q.A,x:q.x,y:q.y,charge:q.charge,energy:q.energy}))})};
})();
