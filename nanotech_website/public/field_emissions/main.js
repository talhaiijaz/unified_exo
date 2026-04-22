/* ---------------------------------------------------------------
   E‑Beam Lite — Main JS (Pyodide + unified sizing)
----------------------------------------------------------------*/
const SIZE = 50; let CELL = 10;  // cell size is computed from target px
let grid = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
let brush = 1, erasing = false;

// Stage 3 bridge helpers:
// Expose current matrix + params so the host app can optionally forward runs to a remote backend.
function readParamNum(id, def){
  const el = document.getElementById(id);
  if (!el || el.value === '') return def;
  const n = Number(el.value);
  return Number.isFinite(n) ? n : def;
}
window.__fieldEmissionsGetGrid = () => grid.map(row => row.slice());
window.__fieldEmissionsGetParams = () => ({
  beam_current: readParamNum('beam_current', 0.5),
  min_spot_radius_nm: readParamNum('min_spot_radius_nm', 500),
  cnt_rows: readParamNum('cnt_rows', 5),
  cnt_cols: readParamNum('cnt_cols', 4),
  cnt_spacing_x_nm: readParamNum('cnt_spacing_x_nm', 10000),
  cnt_spacing_y_nm: readParamNum('cnt_spacing_y_nm', 10000),
  wafer_w_nm: readParamNum('wafer_w_nm', 100000),
  wafer_h_nm: readParamNum('wafer_h_nm', 100000),
  required_dose: readParamNum('required_dose', 100),
  motor_min_step_nm: readParamNum('motor_min_step_nm', 50),
  motor_max_velocity_nm_s: readParamNum('motor_max_velocity_nm_s', 100000),
});

/* ---------- Status logging ---------- */
function logStatus(msg){
  const sp = document.getElementById('status');
  if (sp) {
    sp.textContent += (sp.textContent ? '\n' : '') + msg;
    sp.scrollTop = sp.scrollHeight;
  }
  console.log('[EBeam]', msg);
}

/* ---------- HiDPI helper ---------- */
function setupHiDPICanvas(cvs, ctx, logicalW, logicalH){
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const needW = Math.floor(logicalW * dpr);
  const needH = Math.floor(logicalH * dpr);
  if (cvs.width !== needW || cvs.height !== needH){
    cvs.width  = needW;
    cvs.height = needH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

/* ---------- Unified sizing: painter & playback identical ---------- */
function setCanvasSizePX(targetPx){
  CELL = Math.max(6, Math.round(targetPx / SIZE));
  const dim = CELL * SIZE; // logical size used for drawing
  for (const id of ['grid','sim']){
    const el = document.getElementById(id);
    if (!el) continue;
      const AR_W = 16;      // <-- change these numbers
      const AR_H = 12;       // <-- change these numbers
      const w = dim;
      const h = Math.round(dim * (AR_H / AR_W));
      el.style.width  = w + 'px';
      el.style.height = h + 'px';
  }
  window.dispatchEvent(new Event('redraw-painter'));
  if (typeof renderFrame === 'function' && window.EB && EB.frames){
    renderFrame(Math.min(EB.frameIndex||0, (EB.frames?.length||1)-1));
  }
}

function setCanvasTarget(){
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const headerH = (document.querySelector('header')?.offsetHeight || 60);
  const footerH = (document.querySelector('footer')?.offsetHeight || 30);
  const availableH = Math.max(300, vh - headerH - footerH - 40);

  const twoCol = window.matchMedia('(min-width: 1101px)').matches;
  const rightColMin = 420;
  const gap = 24;

  let maxByWidth = twoCol ? Math.floor((vw - rightColMin - gap*3)) : Math.floor(vw - gap*2);
  maxByWidth = Math.max(480, Math.min(900, maxByWidth));
  let maxByHeight = Math.max(420, Math.min(800, Math.floor((availableH - (twoCol?140:220)) / 2)));

  let target = Math.min(maxByWidth, maxByHeight);
  target = Math.max(twoCol ? 620 : 560, target);
  target = Math.min(760, target);

  setCanvasSizePX(target);
}

/* ---------- Painter grid ---------- */
(function initPainter(){
  const cvs = document.getElementById('grid');
  if (!cvs) { logStatus('Painter: #grid not found'); return; }
  const ctx = cvs.getContext('2d');

  function drawGrid(){
    const logical = SIZE * CELL;
    setupHiDPICanvas(cvs, ctx, logical, logical);
    // background
    ctx.clearRect(0,0,logical,logical);
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0,0,logical,logical);
    // filled cells
    ctx.fillStyle = '#111827';
    for (let y=0;y<SIZE;y++){
      for (let x=0;x<SIZE;x++){
        if (grid[y][x]) ctx.fillRect(x*CELL, y*CELL, CELL, CELL);
      }
    }
    // grid lines
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    for(let i=0;i<=SIZE;i++){
      const p = i*CELL + 0.5;
      ctx.beginPath(); ctx.moveTo(p,0); ctx.lineTo(p,logical); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,p); ctx.lineTo(logical,p); ctx.stroke();
    }
  }

  function canvasXY(e){
    const r = cvs.getBoundingClientRect();
    const scaleX = (SIZE*CELL) / r.width;
    const scaleY = (SIZE*CELL) / r.height;
    const x = Math.floor(((e.clientX - r.left) * scaleX) / CELL);
    const y = Math.floor(((e.clientY - r.top) * scaleY) / CELL);
    return {x, y};
  }

  function paintAt(x,y,val){
    const half = Math.floor(brush/2);
    for(let j=-half;j<=half;j++){
      for(let i=-half;i<=half;i++){
        const xx=x+i, yy=y+j;
        if(xx>=0&&xx<SIZE&&yy>=0&&yy<SIZE) grid[yy][xx]=val;
      }
    }
  }

  let pointerDown = false;
  function onDown(e){
    pointerDown = true;
    cvs.setPointerCapture && cvs.setPointerCapture(e.pointerId || 0);
    const {x,y} = canvasXY(e);
    paintAt(x,y, erasing?0:1);
    drawGrid();
  }
  function onMove(e){
    if (!pointerDown) return;
    const {x,y} = canvasXY(e);
    paintAt(x,y, erasing?0:1);
    drawGrid();
  }
  function onUp(){
    pointerDown = false;
    try{ cvs.releasePointerCapture && cvs.releasePointerCapture(); }catch(_){}
  }

  cvs.addEventListener('pointerdown', onDown);
  cvs.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  cvs.addEventListener('pointerleave', onUp);
  window.addEventListener('blur', onUp);
  window.addEventListener('redraw-painter', drawGrid);
  window.addEventListener('resize', drawGrid);

  const brushInput = document.getElementById('brush');
  const eraserBtn  = document.getElementById('eraser');
  const clearBtn   = document.getElementById('clear');
  if (brushInput) brushInput.addEventListener('input', e => brush = +e.target.value);
  if (eraserBtn)  eraserBtn.addEventListener('click', () => { erasing = !erasing; eraserBtn.classList.toggle('active', erasing); });
  if (clearBtn)   clearBtn.addEventListener('click', () => { grid = Array.from({length:SIZE},()=>Array(SIZE).fill(0)); drawGrid(); });

  logStatus('Painter: initialized');
  drawGrid();
})();

/* ---------- Pyodide boot ---------- */
let py = null;
async function bootPyodide(){
  if (py) return py;
  if (typeof loadPyodide === 'undefined'){ logStatus('ERROR: pyodide.js not loaded'); return null; }
  try{
    py = await loadPyodide({ indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/' });
    logStatus('Pyodide ready (0.26.0)');
    await py.loadPackage('numpy');
    logStatus('Loaded package: numpy');
    const resp = await fetch('ebeam_pyodide.py', {cache:'no-cache'});
    if (!resp.ok) throw new Error('missing ebeam_pyodide.py');
    const text = await resp.text();
    py.FS.writeFile('ebeam_pyodide.py', text);
    await py.runPythonAsync('import ebeam_pyodide');
    logStatus('Loaded ebeam_pyodide.py');
  }catch(err){
    logStatus('BOOT ERROR: '+err.message);
    console.error(err);
    return null;
  }
  return py;
}

/* ---------- Playback rendering ---------- */
function renderFrame(i){
  const sim = document.getElementById('sim');
  if (!sim) return;
  const sctx = sim.getContext('2d');
  // size internal buffer for HiDPI
  const logical = SIZE * CELL;
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  if (sim.width !== Math.floor(logical * dpr) || sim.height !== Math.floor(logical * dpr)){
    sim.width = Math.floor(logical * dpr);
    sim.height = Math.floor(logical * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sctx.clearRect(0,0,logical,logical);
  if (!window.EB || !EB.frames) return;
  const frame = EB.frames[i];
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++){
    const v = frame[r][c];
    if (v>0){
      sctx.fillStyle = `hsl(200, 80%, ${Math.min(95, v/255*80+15)}%)`;
      sctx.fillRect(c*CELL, r*CELL, CELL, CELL);
    }
  }
}

/* ---------- Debugger (minimal) ---------- */
const EB = { frames: null, derived: null, frameIndex: 0 };
window.EB = EB;

/* ---------- Run Experiment (client-side sim) ---------- */
(function(){
  const form = document.getElementById('params');
  const sim = document.getElementById('sim');
  if (!form || !sim) return;

  function valNum(idOrName, def=0){
    const byId = document.getElementById(idOrName);
    if (byId && byId.value !== '') return Number(byId.value);
    const byName = form.querySelector(`[name="${idOrName}"]`);
    if (byName && byName.value !== '') return Number(byName.value);
    return def;
  }

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    logStatus('Starting physical simulation...');
    const pyodide = await bootPyodide();
    if (!pyodide){ logStatus('Pyodide not available.'); return; }

    // Read inputs
    const beam_current_uA      = valNum('beam_current', 0.5);           // μA (fixed)
    const min_spot_radius_nm   = valNum('min_spot_radius_nm', 500);     // nm
    const cnt_rows             = valNum('cnt_rows', 5);
    const cnt_cols             = valNum('cnt_cols', 4);
    const cnt_spacing_x_nm     = valNum('cnt_spacing_x_nm', 10000);     // nm
    const cnt_spacing_y_nm     = valNum('cnt_spacing_y_nm', 10000);     // nm
    const wafer_w_nm           = valNum('wafer_w_nm', 100000);          // nm
    const wafer_h_nm           = valNum('wafer_h_nm', 100000);          // nm
    const required_dose_uC_cm2 = valNum('required_dose', 100);          // μC/cm^2
    const motor_min_step_nm    = valNum('motor_min_step_nm', 50);       // nm
    const motor_max_vel_nm_s   = valNum('motor_max_velocity_nm_s', 100000); // nm/s

    // Provide variables to Python directly
    pyodide.globals.set('mask_js', grid);
    pyodide.globals.set('beam_current_uA', beam_current_uA);
    pyodide.globals.set('min_spot_radius_nm', min_spot_radius_nm);
    pyodide.globals.set('cnt_grid_rows', cnt_rows);
    pyodide.globals.set('cnt_grid_cols', cnt_cols);
    pyodide.globals.set('cnt_spacing_nm_x', cnt_spacing_x_nm);
    pyodide.globals.set('cnt_spacing_nm_y', cnt_spacing_y_nm);
    pyodide.globals.set('wafer_w_nm', wafer_w_nm);
    pyodide.globals.set('wafer_h_nm', wafer_h_nm);
    pyodide.globals.set('required_dose_uC_cm2', required_dose_uC_cm2);
    pyodide.globals.set('motor_min_step_nm', motor_min_step_nm);
    pyodide.globals.set('motor_max_velocity_nm_s', motor_max_vel_nm_s);

    const code = `
from ebeam_pyodide import ebeam_simulate_phys
frames, derived, debug = ebeam_simulate_phys(
    mask_js,
    beam_current_uA,
    min_spot_radius_nm,
    cnt_grid_rows, cnt_grid_cols,
    cnt_spacing_nm_x, cnt_spacing_nm_y,
    wafer_w_nm, wafer_h_nm,
    required_dose_uC_cm2,
    motor_min_step_nm,
    motor_max_velocity_nm_s,
    passes=3, tolerance=0.10
)`;
    try{
      await pyodide.runPythonAsync(code);
    }catch(err){
      logStatus('Sim error: '+err.message);
      console.error(err);
      return;
    }
    EB.frames = pyodide.globals.get('frames').toJs();
    EB.derived = pyodide.globals.get('derived').toJs();
    EB.frameIndex = 0;

    // Render frames
    renderFrame(0);
    const out = document.getElementById('derived');
    if (out){ out.textContent = JSON.stringify(EB.derived, null, 2); }
    logStatus('Simulation complete. Serial: ' + (EB.derived.serial_time_s?.toFixed?.(3) ?? '') + ' s, ' +
              'Parallel ('+EB.derived.parallel_factor+'x): ' + (EB.derived.parallel_time_s?.toFixed?.(3) ?? '') + ' s');
    // simple autoplay
    const spd = (document.getElementById('speed') ? +document.getElementById('speed').value : 5);
    const delay = Math.max(10, 110 - spd*10);
    (async ()=>{
      for (let i=1;i<EB.frames.length;i++){
        await new Promise(r=>setTimeout(r, delay));
        EB.frameIndex = i; renderFrame(i);
      }
    })();
  });
})();

/* ---------- Boot ---------- */
window.addEventListener('load', ()=>{ setCanvasTarget(); bootPyodide(); }, {once:true});
window.addEventListener('resize', setCanvasTarget);

/* ---------- Manual & Emitters placeholders (guarded) ---------- */
(function manual(){
  const vs = document.getElementById('voltageScene');
  if (!vs || !window.THREE) return;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50); cam.position.set(0,1.5,4);
  const rend = new THREE.WebGLRenderer({canvas:vs, antialias:true, alpha:true});
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,2,32), new THREE.MeshPhongMaterial({color:0xcccccc}));
  scene.add(cyl);
  const light = new THREE.PointLight(0xffffff,1); light.position.set(3,5,4); scene.add(light);
  vs.onclick = ()=>cyl.material.color.set(cyl.material.color.getHex()===0xcccccc?0x00baff:0xcccccc);
  function render(){ requestAnimationFrame(render); cyl.rotation.y += 0.005; rend.render(scene, cam); }
  function resize(){ cam.aspect = vs.clientWidth / vs.clientHeight; cam.updateProjectionMatrix(); rend.setSize(vs.clientWidth, vs.clientHeight, false); }
  window.addEventListener('resize', resize);
  resize(); render();
})();

(function emitters(){
  const ecvs = document.getElementById('emitterScene');
  if (!ecvs || !window.THREE) return;
  const S = new THREE.Scene(); S.add(new THREE.AmbientLight(0x404040));
  const sun = new THREE.DirectionalLight(0xffffff,1.2); sun.position.set(4,8,4); S.add(sun);
  const cam = new THREE.PerspectiveCamera(45, ecvs.width/ecvs.height, 0.1, 30); cam.position.set(0,3,9);
  const ren = new THREE.WebGLRenderer({canvas:ecvs, antialias:true, alpha:true}); ren.setSize(ecvs.width, ecvs.height, false);
  const OFF=0x555555, ON=0x00c853, state=[0,0,0,0,0], meshes=[];
  const start=-2*2.6;
  for(let i=0;i<5;i++){
    const m=new THREE.MeshPhongMaterial({color:OFF});
    const c=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,2.2,32),m);
    c.position.set(start+i*2.6,1.1,0); S.add(c); meshes.push(c);
  }
  ren.render(S,cam);
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  ecvs.addEventListener('click', e=>{
    const r=ecvs.getBoundingClientRect();
    ptr.x=(e.clientX-r.left)/r.width*2-1; ptr.y=-(e.clientY-r.top)/r.height*2+1;
    ray.setFromCamera(ptr,cam);
    const hit=ray.intersectObjects(meshes,false)[0]; if(!hit) return;
    const idx=meshes.indexOf(hit.object); state[idx]^=1;
    hit.object.material.color.set(state[idx]?ON:OFF); hit.object.material.needsUpdate=true;
    ren.render(S,cam);
  });
})();
