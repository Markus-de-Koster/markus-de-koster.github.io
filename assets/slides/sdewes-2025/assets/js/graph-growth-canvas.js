// Lightweight vanilla JS port of GraphGrowthCanvas.tsx (no build step).
export function attachGraphGrowthCanvas(host, { theme = "light" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "absolute inset-0 w-full h-full";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let raf = 0, running = true;

  const ro = new ResizeObserver(() => {
    const r = host.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  });
  ro.observe(host);

  let nodes = [], edges = [], nextId = 0;
  const modes = [
    { name: "tree", attach: "leaf", tieProb: 0,    colorP: [[.80,.15,.05],[.10,.80,.10],[.05,.20,.75]] },
    { name: "hub",  attach: "hub",  tieProb: 0.12, colorP: [[.75,.20,.05],[.20,.70,.10],[.10,.20,.70]] },
    { name: "mesh", attach: "preferential", tieProb: 0.25, colorP: [[.70,.25,.05],[.25,.70,.05],[.05,.25,.70]] },
  ];
  let modeIndex = 0, addedInCycle = 0, lastAdd = 0, fading = 0;
  const ADD_INTERVAL = 900, HOLD_AFTER = 1200;
  let lastTime = performance.now();
  const hues = [210, 24, 330];
  const colorOf = (c, a = theme === "dark" ? 0.95 : 0.9) => `hsla(${hues[c]},70%,55%,${a})`;
  const edgeColor = theme === "dark" ? "rgba(200,200,200,0.35)" : "rgba(120,120,120,0.55)";

  const center = () => {
    const r = host.getBoundingClientRect();
    return { cx: r.width/2, cy: r.height/2 };
  };

  function link(a,b){ edges.push({ s:a.id, t:b.id }); a.degree++; b.degree++; }
  const eligible = () => nodes.filter(n => n.degree < 3);

  function pickNodeForAttachment(kind){
    const pool = eligible(); if (!pool.length) return null;
    if (kind === "leaf") {
      const leaves = pool.filter(n => n.degree <= 1);
      return (leaves.length ? leaves : pool)[Math.floor(Math.random()* (leaves.length?leaves.length:pool.length))];
    }
    if (kind === "hub") {
      const {cx,cy} = center();
      const w = pool.map(n => (n.degree + 1) + 200 / (10 + Math.hypot(n.x-cx, n.y-cy)));
      let r = Math.random() * w.reduce((a,b)=>a+b,0);
      for (let i=0;i<w.length;i++){ if ((r -= w[i]) <= 0) return pool[i]; }
      return pool[pool.length-1];
    }
    const w = pool.map(n => n.degree + 1);
    let r = Math.random() * w.reduce((a,b)=>a+b,0);
    for (let i=0;i<w.length;i++){ if ((r -= w[i]) <= 0) return pool[i]; }
    return pool[pool.length-1];
  }
  function sampleColor(prev){
    const P = modes[modeIndex].colorP[prev]; const r = Math.random();
    let acc = 0; for (let i=0;i<3;i++){ acc += P[i]; if (r<=acc) return i; } return 0;
  }
  function maybeAddTie(p){
    if (Math.random()>p || nodes.length<4) return;
    const pool = eligible(); if (pool.length<2) return;
    for (let tries=0; tries<6; tries++){
      const a = pool[Math.floor(Math.random()*pool.length)];
      const b = pool[Math.floor(Math.random()*pool.length)];
      if (a===b) continue;
      if (edges.some(e => (e.s===a.id&&e.t===b.id)||(e.s===b.id&&e.t===a.id))) continue;
      link(a,b); return;
    }
  }
  function addNode(){
    const mode = modes[modeIndex];
    const parent = pickNodeForAttachment(mode.attach);
    if (!parent){ addedInCycle = 10; return; }
    const ang = Math.random()*Math.PI*2, R = 26 + Math.random()*18;
    const nx = parent.x + Math.cos(ang)*R, ny = parent.y + Math.sin(ang)*R;
    const n = { id: nextId++, x:nx, y:ny, vx:0, vy:0, color: sampleColor(parent.color), degree:0 };
    nodes.push(n); link(parent,n); maybeAddTie(mode.tieProb); addedInCycle++;
  }

  const K_REP=2300, K_SPR=0.06, LEN=38, DAMP=0.85, CTR=0.015;
  function stepPhysics(dt){
    for(let i=0;i<nodes.length;i++){ const a=nodes[i];
      for(let j=i+1;j<nodes.length;j++){ const b=nodes[j];
        let dx=a.x-b.x, dy=a.y-b.y; let d2=dx*dx+dy*dy+0.01; const inv=Math.sqrt(d2);
        const f=K_REP/d2; dx/=inv; dy/=inv; a.vx+=dx*f*dt; a.vy+=dy*f*dt; b.vx-=dx*f*dt; b.vy-=dy*f*dt; } }
    for(const e of edges){ const a=nodes[e.s], b=nodes[e.t]; let dx=b.x-a.x, dy=b.y-a.y; const d=Math.max(1,Math.hypot(dx,dy));
      const f=(d-LEN)*K_SPR*dt; dx/=d; dy/=d; a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f; }
    const {cx,cy}=center(); for(const n of nodes){ n.vx+=(cx-n.x)*CTR*dt; n.vy+=(cy-n.y)*CTR*dt; n.vx*=DAMP; n.vy*=DAMP; n.x+=n.vx*dt*0.06; n.y+=n.vy*dt*0.06; }
  }
  function draw(){
    const r = host.getBoundingClientRect(), W=r.width, H=r.height;
    if (theme==="dark"){ ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H); }
    else { const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#fbfbff"); g.addColorStop(1,"#f4f6ff"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
    ctx.lineWidth=1.2; ctx.strokeStyle=edgeColor; ctx.beginPath();
    for(const e of edges){ const a=nodes[e.s], b=nodes[e.t]; ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); } ctx.stroke();
    for(const n of nodes){ ctx.beginPath(); ctx.fillStyle=colorOf(n.color); ctx.arc(n.x,n.y,4.5,0,Math.PI*2); ctx.fill(); }
    if (fading>0){ ctx.fillStyle = theme==="dark" ? `rgba(0,0,0,${fading})` : `rgba(255,255,255,${fading})`; ctx.fillRect(0,0,W,H); }
  }
  function resetGraph(){
    nodes=[]; edges=[]; nextId=0; addedInCycle=0; fading=0;
    const {cx,cy}=center();
    const seed={id:nextId++, x:cx, y:cy, vx:0, vy:0, color:0, degree:0};
    const n1={id:nextId++, x:cx+20, y:cy+10, vx:0, vy:0, color:1, degree:0};
    const n2={id:nextId++, x:cx-20, y:cy-10, vx:0, vy:0, color:2, degree:0};
    nodes.push(seed,n1,n2); link(seed,n1); link(seed,n2); lastAdd=performance.now();
  }
  function animate(now){
    if(!running) return;
    const dt = Math.min(32, now-lastTime)/16.6667; lastTime = now;
    if (addedInCycle < 10) { if (now-lastAdd > ADD_INTERVAL) { addNode(); lastAdd = now; } }
    else { const el = now-lastAdd; if (el>HOLD_AFTER) { fading = Math.min(1,(el-HOLD_AFTER)/600); if (fading>=1){ modeIndex=(modeIndex+1)%modes.length; resetGraph(); } } }
    stepPhysics(dt); draw(); raf = requestAnimationFrame(animate);
  }
  resetGraph(); lastTime = performance.now(); raf = requestAnimationFrame(animate);
  return () => { running=false; cancelAnimationFrame(raf); ro.disconnect(); host.removeChild(canvas); };
}