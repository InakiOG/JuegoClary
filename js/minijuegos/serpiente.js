// Minijuego "Plan México": una serpiente con la bandera de EE. UU. se come los 32 estados del mapa.
// Estilo slither.io: la cabeza sigue al ratón con giro limitado; no se puede perder.
// Contrato: Game.minijuegos.serpiente(host) -> { done: Promise<boolean>, destroy() }.
// done se resuelve con true al comerse los 32 estados (o con false si se llama a destroy() antes).
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 384, H = 216;                    // resolución interna (pixel art)
  const LAT_MAX = 34.5, LAT_MIN = 13.5;
  const KY = H / (LAT_MAX - LAT_MIN);
  const KX = KY * Math.cos(23.5 * Math.PI / 180);
  const LON_MIN = -101.6 - (W / 2) / KX;
  const px = (lon) => (lon - LON_MIN) * KX;
  const py = (lat) => (LAT_MAX - lat) * KY;

  const SPEED = 54;          // px internos por segundo
  const TURN = 4.2;          // rad/s
  const SPACING = 3;         // distancia entre segmentos
  const START_SEGS = 12, GROW = 2;
  const EAT_RADIUS = 7;      // radio alrededor del centro de cada estado (ayuda con los estados pequeños)

  const DEFAULTS = {
    titulo: 'PLAN MÉXICO',
    instrucciones: 'Guía a la serpiente con el ratón. Cómete todos los estados del mapa.',
    gana: 'Te comiste todo el mapa.',
    contador: 'Estados',
    empezar: '[ clic para empezar ]',
  };

  const CSS = `
.mj-serp-root{position:absolute;inset:0;overflow:hidden;background:#000;user-select:none;-webkit-user-select:none;}
.mj-serp-stage{position:absolute;left:0;top:0;overflow:hidden;font-family:"Lucida Console",Consolas,monospace;color:#f4f0e0;}
.mj-serp-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:crisp-edges;image-rendering:pixelated;}
.mj-serp-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(6,12,30,.72);padding:0 12%;box-sizing:border-box;}
.mj-serp-title{font-size:15em;letter-spacing:.12em;color:#ffffff;text-shadow:.07em .07em 0 #b22234,.14em .14em 0 #1c2a6e;margin-bottom:.55em;}
.mj-serp-ins{font-size:7.2em;line-height:1.45;}
.mj-serp-go{font-size:7.2em;margin-top:1.6em;color:#ffe27a;animation:mj-serp-blink 1.1s steps(2,start) infinite;}
.mj-serp-win{font-size:12em;color:#fff;text-shadow:.08em .08em 0 #b22234;animation:mj-serp-pop .35s ease-out;}
.mj-serp-count{position:absolute;left:2.5%;top:3%;font-size:8em;color:#fff;background:rgba(20,30,70,.7);padding:.2em .5em;text-shadow:.1em .1em 0 #000;pointer-events:none;}
.mj-serp-hover{position:absolute;right:2.5%;bottom:3%;font-size:7em;color:#fff;background:rgba(20,30,70,.7);padding:.2em .5em;pointer-events:none;}
.mj-serp-hover:empty{display:none;}
.mj-serp-lbl{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;letter-spacing:.15em;}
.mj-serp-sea{font-size:6em;font-style:italic;color:rgba(230,240,255,.6);}
.mj-serp-land{font-size:6em;color:rgba(90,70,40,.6);}
@keyframes mj-serp-blink{to{visibility:hidden;}}
[class^="mj-serp-"][hidden]{display:none!important;}
@keyframes mj-serp-pop{from{transform:scale(.6);opacity:0;}to{transform:scale(1);opacity:1;}}
`;
  function injectCSS() {
    if (document.getElementById('mj-serp-style')) return;
    const s = document.createElement('style');
    s.id = 'mj-serp-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

  // ---------- geografía aproximada (lon, lat) ----------
  // México continental (sin la península de Baja California).
  const MAINLAND = [
    [-114.72, 32.72], [-114.81, 32.49], [-111.07, 31.33], [-108.21, 31.33], [-108.21, 31.78], [-106.5, 31.78],
    [-105.0, 30.7], [-104.5, 29.6], [-103.3, 29.0], [-102.4, 29.8], [-101.4, 29.8], [-100.5, 28.3], [-99.5, 27.5],
    [-99.1, 26.5], [-98.2, 26.05], [-97.15, 25.95],
    // golfo de México
    [-97.5, 25.0], [-97.7, 24.0], [-97.8, 22.5], [-97.3, 21.0], [-96.8, 20.0], [-96.1, 19.2], [-95.0, 18.6],
    [-94.4, 18.15], [-93.0, 18.4], [-91.8, 18.6], [-91.0, 19.0], [-90.5, 19.9], [-90.4, 21.0], [-89.6, 21.3],
    [-88.2, 21.6], [-87.0, 21.55], [-86.75, 21.1], [-87.4, 20.2], [-87.6, 19.4], [-87.85, 18.6],
    // frontera con Belice y Guatemala
    [-88.3, 18.48], [-89.15, 17.95], [-89.15, 17.82], [-90.98, 17.82], [-90.98, 17.25], [-91.44, 17.25],
    [-90.44, 16.08], [-91.73, 16.07], [-92.2, 15.25], [-92.23, 14.53],
    // Pacífico
    [-93.9, 16.1], [-94.8, 16.2], [-95.2, 16.0], [-96.5, 15.65], [-98.0, 16.2], [-99.9, 16.85], [-101.5, 17.6],
    [-102.2, 17.95], [-103.5, 18.5], [-104.3, 19.1], [-105.3, 20.4], [-105.5, 21.5], [-105.7, 22.5], [-106.4, 23.2],
    [-107.5, 24.5], [-108.5, 25.5], [-109.4, 26.5], [-110.0, 27.5], [-111.0, 27.9], [-112.2, 29.0], [-112.8, 30.0],
    [-113.1, 31.2], [-114.1, 31.5], [-114.8, 31.9],
  ];
  const PENINSULA = [
    [-117.12, 32.53], [-114.72, 32.72], [-114.8, 31.9], [-114.6, 31.0], [-114.4, 30.0], [-113.5, 29.0], [-112.8, 28.0],
    [-112.2, 27.0], [-111.5, 26.0], [-110.7, 24.6], [-110.3, 24.2], [-109.5, 23.2], [-109.9, 22.9], [-110.3, 23.5],
    [-111.5, 24.5], [-112.1, 25.5], [-112.5, 26.4], [-114.0, 27.2], [-114.3, 27.8], [-114.1, 28.2], [-115.0, 29.3],
    [-115.8, 30.4], [-116.6, 31.8],
  ];
  const USA = [
    [-125, 36], [-79, 36], [-79, 32], [-80.6, 32], [-81.2, 30], [-80.1, 26.5], [-80.4, 25.2], [-81.2, 25.2],
    [-81.8, 26.6], [-82.7, 28], [-82.8, 29.2], [-84.0, 30.1], [-85.4, 29.7], [-86.5, 30.4], [-88.0, 30.4],
    [-89.6, 30.2], [-89.4, 29.2], [-90.5, 29.1], [-91.8, 29.5], [-93.8, 29.7], [-94.8, 29.3], [-96.6, 28.2],
    [-97.4, 27.4], [-97.4, 26.0], [-97.15, 25.95], [-98.2, 26.05], [-99.1, 26.5], [-99.5, 27.5], [-100.5, 28.3],
    [-101.4, 29.8], [-102.4, 29.8], [-103.3, 29.0], [-104.5, 29.6], [-105.0, 30.7], [-106.5, 31.78], [-108.21, 31.78],
    [-108.21, 31.33], [-111.07, 31.33], [-114.81, 32.49], [-114.72, 32.72], [-117.12, 32.53], [-117.3, 33.1],
    [-118.4, 33.9], [-119.5, 34.4], [-120.6, 34.5], [-121.5, 36],
  ];
  const CENTRAL = [
    [-88.3, 18.48], [-88.1, 18.0], [-88.3, 17.2], [-88.2, 16.6], [-88.9, 15.9], [-88.2, 15.7], [-86.0, 15.9],
    [-84.0, 15.9], [-83.2, 15.0], [-83.5, 12.5], [-87.5, 12.5], [-89.0, 13.4], [-90.6, 13.9], [-91.4, 14.0],
    [-92.23, 14.53], [-92.2, 15.25], [-91.73, 16.07], [-90.44, 16.08], [-91.44, 17.25], [-90.98, 17.25],
    [-90.98, 17.82], [-89.15, 17.82], [-89.15, 17.95],
  ];
  const CUBA = [
    [-84.95, 21.86], [-84.0, 22.6], [-82.0, 23.15], [-79.5, 23.1], [-79.5, 22.3], [-81.8, 22.2], [-83.2, 22.0], [-84.4, 21.6],
  ];

  // 32 estados: nombre, puntos semilla (el primero es el "centro"), y si está en la península.
  const STATES = [
    ['Baja California', [[-115.6, 31.0], [-114.0, 29.3]], true],
    ['Baja California Sur', [[-111.8, 25.6], [-113.6, 27.3], [-110.2, 23.6]], true],
    ['Sonora', [[-110.8, 29.6], [-109.3, 27.4]]],
    ['Chihuahua', [[-106.2, 28.8], [-106.8, 26.9]]],
    ['Coahuila', [[-102.0, 27.5], [-101.3, 25.8]]],
    ['Nuevo León', [[-99.9, 25.7], [-100.2, 24.2]]],
    ['Tamaulipas', [[-98.6, 24.0], [-98.9, 26.3], [-98.2, 22.6]]],
    ['Sinaloa', [[-107.6, 25.2], [-108.6, 26.0], [-106.2, 23.5]]],
    ['Durango', [[-104.7, 24.9]]],
    ['Zacatecas', [[-102.8, 23.4], [-102.5, 24.6]]],
    ['San Luis Potosí', [[-100.6, 22.6], [-99.2, 21.9]]],
    ['Nayarit', [[-104.8, 21.8]]],
    ['Aguascalientes', [[-102.35, 21.95]]],
    ['Jalisco', [[-103.6, 20.3], [-104.7, 19.9], [-102.3, 21.1]]],
    ['Guanajuato', [[-101.1, 20.9]]],
    ['Querétaro', [[-99.9, 20.85]]],
    ['Hidalgo', [[-98.8, 20.45]]],
    ['Colima', [[-103.95, 19.15]]],
    ['Michoacán', [[-101.8, 19.2], [-102.8, 18.6]]],
    ['Estado de México', [[-99.75, 19.5], [-98.9, 19.75]]],
    ['Ciudad de México', [[-99.13, 19.3]]],
    ['Morelos', [[-99.05, 18.8]]],
    ['Tlaxcala', [[-98.2, 19.42]]],
    ['Puebla', [[-97.9, 18.7], [-97.7, 19.95]]],
    ['Veracruz', [[-96.7, 19.4], [-97.7, 21.3], [-95.3, 18.0], [-96.3, 18.5]]],
    ['Guerrero', [[-100.0, 17.6], [-101.3, 18.0], [-98.8, 17.3]]],
    ['Oaxaca', [[-96.6, 16.9], [-95.2, 16.6], [-97.7, 16.8]]],
    ['Chiapas', [[-92.6, 16.4]]],
    ['Tabasco', [[-92.7, 18.0]]],
    ['Campeche', [[-90.3, 19.0], [-90.0, 20.1]]],
    ['Yucatán', [[-89.0, 20.8]]],
    ['Quintana Roo', [[-88.1, 19.4], [-87.3, 20.9]]],
  ];
  const N = STATES.length;

  const PASTEL = ['#f4e27a', '#9ed88a', '#a7a3e0', '#f6b26b', '#ee8a84', '#cdeaa0'].map(hex);
  const SEA = hex('#3f78c8'), SEA_GRID = hex('#4b86d4'), SHORE = hex('#86b8ec');
  const USA_C = hex('#e8dcc0'), FOREIGN_C = hex('#d6cfb8');
  const EAT_R = hex('#9a5a5a'), EAT_W = hex('#b8b0a8');

  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const proj = (poly) => poly.map(([lo, la]) => [px(lo), py(la)]);

  // ---------- rasterización del mapa (una sola vez, compartida entre partidas) ----------
  let MAP = null;
  function buildMap() {
    if (MAP) return MAP;
    const pm = proj(MAINLAND), pp = proj(PENINSULA), pu = proj(USA), pc = proj(CENTRAL), pb = proj(CUBA);
    const seeds = [];
    STATES.forEach(([, pts, pen], s) => pts.forEach(([lo, la]) => seeds.push({ s, x: px(lo), y: py(la), pen: !!pen })));
    const id = new Int16Array(W * H).fill(-1);   // -1 mar, -2 EE. UU., -3 otro país, >=0 estado
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      let pen = null;
      if (inPoly(cx, cy, pp)) pen = true;
      else if (inPoly(cx, cy, pm)) pen = false;
      let v = -1;
      if (pen !== null) {
        let best = 1e9;
        for (const sd of seeds) {
          if (sd.pen !== pen) continue;
          const d = (sd.x - cx) * (sd.x - cx) + (sd.y - cy) * (sd.y - cy);
          if (d < best) { best = d; v = sd.s; }
        }
      } else if (inPoly(cx, cy, pu)) v = -2;
      else if (inPoly(cx, cy, pc) || inPoly(cx, cy, pb)) v = -3;
      id[y * W + x] = v;
    }
    // Garantiza que cada estado tenga píxeles bajo su centro.
    STATES.forEach(([, pts], s) => {
      const cx = Math.floor(px(pts[0][0])), cy = Math.floor(py(pts[0][1]));
      if (id[cy * W + cx] !== s) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) id[(cy + dy) * W + cx + dx] = s;
    });

    // listas de píxeles, vecinos y bordes
    const lists = Array.from({ length: N }, () => []);
    const adj = Array.from({ length: N }, () => new Set());
    const border = new Uint8Array(W * H);   // 1 = borde entre regiones de tierra / costa
    const shore = new Uint8Array(W * H);    // mar junto a tierra
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, a = id[i];
      if (a >= 0) lists[a].push(i);
      const nb = [x + 1 < W ? id[i + 1] : a, y + 1 < H ? id[i + W] : a, x > 0 ? id[i - 1] : a, y > 0 ? id[i - W] : a];
      if (a === -1) { if (nb.some((b) => b !== -1)) shore[i] = 1; continue; }
      if (nb.some((b) => b === -1)) border[i] = 1;                         // costa
      if (nb[0] !== a && nb[0] !== -1) { border[i] = 1; if (a >= 0 && nb[0] >= 0) { adj[a].add(nb[0]); adj[nb[0]].add(a); } }
      if (nb[1] !== a && nb[1] !== -1) { border[i] = 1; if (a >= 0 && nb[1] >= 0) { adj[a].add(nb[1]); adj[nb[1]].add(a); } }
    }
    // coloreado voraz (6 colores pastel, vecinos distintos)
    const color = new Int8Array(N).fill(-1);
    const order = [...Array(N).keys()].sort((p, q) => adj[q].size - adj[p].size);
    for (const s of order) {
      const used = new Set([...adj[s]].map((b) => color[b]));
      let c = -1;
      for (let k = 0; k < PASTEL.length; k++) { const cc = (s * 2 + k) % PASTEL.length; if (!used.has(cc)) { c = cc; break; } }
      color[s] = c < 0 ? s % PASTEL.length : c;
    }
    const centers = STATES.map(([, pts]) => ({ x: px(pts[0][0]), y: py(pts[0][1]) }));
    MAP = { id, lists: lists.map((l) => Int32Array.from(l)), border, shore, color, centers };
    return MAP;
  }

  // ---------- discos pixelados precalculados ----------
  const SPANS = [];
  for (let r = 0; r <= 6; r++) {
    const s = [];
    for (let dy = -r; dy <= r; dy++) s.push([dy, Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy))]);
    SPANS.push(s);
  }

  Game.minijuegos.serpiente = function (host) {
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.serpiente) || {});
    injectCSS();

    // --- DOM ---
    const root = el('div', 'mj-serp-root');
    const stage = el('div', 'mj-serp-stage');
    const canvas = el('canvas', 'mj-serp-canvas');
    canvas.width = W; canvas.height = H;
    stage.appendChild(canvas);
    const label = (text, cls, lon, lat) => {
      const l = el('div', 'mj-serp-lbl ' + cls, text);
      l.style.left = (px(lon) / W * 100) + '%';
      l.style.top = (py(lat) / H * 100) + '%';
      stage.appendChild(l);
    };
    label('ESTADOS UNIDOS', 'mj-serp-land', -96.5, 33.2);
    label('OCÉANO PACÍFICO', 'mj-serp-sea', -112.5, 18.5);
    label('GOLFO DE MÉXICO', 'mj-serp-sea', -92.5, 24.8);
    const countEl = el('div', 'mj-serp-count');
    const hoverEl = el('div', 'mj-serp-hover');
    const ov = el('div', 'mj-serp-ov');
    ov.setAttribute('data-cursor', 'hand');
    ov.appendChild(el('div', 'mj-serp-title', T.titulo));
    ov.appendChild(el('div', 'mj-serp-ins', T.instrucciones));
    ov.appendChild(el('div', 'mj-serp-go', T.empezar));
    stage.appendChild(countEl); stage.appendChild(hoverEl); stage.appendChild(ov);
    root.appendChild(stage);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function fit() {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      let s = Math.min(w / W, h / H);
      const fs = Math.floor(s);
      if (fs >= 1 && fs / s > 0.9) s = fs;
      const sw = Math.max(1, Math.round(W * s)), sh = Math.max(1, Math.round(H * s));
      stage.style.width = sw + 'px';
      stage.style.height = sh + 'px';
      stage.style.left = Math.floor((w - sw) / 2) + 'px';
      stage.style.top = Math.floor((h - sh) / 2) + 'px';
      stage.style.fontSize = (sw / W) + 'px'; // 1em = 1 píxel interno
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(host); }
    fit();

    // --- audio propio ---
    let actx = null;
    function beep(f0, f1, dur, type, gain, delay) {
      try {
        if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
        if (actx.state === 'suspended') actx.resume();
        const t0 = actx.currentTime + (delay || 0);
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        g.gain.setValueAtTime(gain || 0.05, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(actx.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch (e) { /* sin audio */ }
    }
    const snd = (name, arg) => { try { if (Game.sound && Game.sound[name]) Game.sound[name](arg); } catch (e) { /* nada */ } };

    // --- mapa (offscreen; se repinta solo cuando cambia un estado) ---
    const M = buildMap();
    const mapC = document.createElement('canvas');
    mapC.width = W; mapC.height = H;
    const mctx = mapC.getContext('2d');
    const img = mctx.createImageData(W, H), d = img.data;
    const eaten = new Uint8Array(N);
    let eatenCount = 0;
    const gridX = new Set(), gridY = new Set();
    for (let lo = -120; lo <= -80; lo += 5) gridX.add(Math.round(px(lo)));
    for (let la = 15; la <= 35; la += 5) gridY.add(Math.round(py(la)));

    function put(i, c, k) { d[i * 4] = c[0] * k; d[i * 4 + 1] = c[1] * k; d[i * 4 + 2] = c[2] * k; d[i * 4 + 3] = 255; }
    function pixelColor(i, mode) {
      const v = M.id[i], k = M.border[i] ? 0.66 : 1;
      if (v === -1) {
        const x = i % W, y = (i / W) | 0;
        put(i, M.shore[i] ? SHORE : (gridX.has(x) || gridY.has(y)) ? SEA_GRID : SEA, 1);
      } else if (v === -2) put(i, USA_C, k);
      else if (v === -3) put(i, FOREIGN_C, k);
      else if (mode === 'flash') put(i, [255, 255, 255], 1);
      else if (eaten[v]) { const y = (i / W) | 0; put(i, (y >> 1) & 1 ? EAT_W : EAT_R, k); }
      else put(i, PASTEL[M.color[v]], k);
    }
    for (let i = 0; i < W * H; i++) pixelColor(i);
    let dirty = true;
    function paintState(s, mode) {
      const l = M.lists[s];
      for (let j = 0; j < l.length; j++) pixelColor(l[j], mode);
      dirty = true;
    }

    // --- serpiente ---
    let state = 'intro';    // intro | play | won
    let t = 0;
    const head = { x: px(-104.5), y: 9, a: 0 };
    let target = null;       // punto del ratón (coords internas)
    let segs = START_SEGS, segTarget = START_SEGS;
    let trail = [];
    for (let k = 40; k >= 0; k--) trail.push({ x: head.x - k * 1.5, y: head.y });
    const flashes = [];      // { s, t }
    const parts = [];
    const timers = [];
    let alive = true, raf = 0, last = 0;
    let resolveDone;
    const done = new Promise((res) => { resolveDone = res; });
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };

    function updateCount() { countEl.textContent = T.contador + ': ' + eatenCount + '/' + N; }
    updateCount();

    // --- entrada ---
    function toGame(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    function onMove(e) {
      const p = toGame(e);
      if (!p) return;
      target = { x: clamp(p.x, 0, W - 1), y: clamp(p.y, 0, H - 1) };
      const inside = p.x >= 0 && p.y >= 0 && p.x < W && p.y < H;
      const v = inside ? M.id[(p.y | 0) * W + (p.x | 0)] : -1;
      const name = v >= 0 ? STATES[v][0] : '';
      if (hoverEl.textContent !== name) hoverEl.textContent = name;
    }
    function onStart(e) {
      if (state !== 'intro') return;
      e.stopPropagation();
      ov.hidden = true;
      ov.innerHTML = '';
      state = 'play';
      beep(330, 660, 0.12, 'square', 0.04);
    }
    root.addEventListener('mousemove', onMove);
    ov.addEventListener('click', onStart);

    // --- lógica ---
    function eat(s) {
      if (eaten[s]) return;
      eaten[s] = 1;
      eatenCount++;
      updateCount();
      segTarget += GROW;
      paintState(s, 'flash');
      flashes.push({ s, t: 0.12 });
      const c = PASTEL[M.color[s]];
      const col = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40;
        parts.push({ x: head.x, y: head.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, c: k & 1 ? '#ffffff' : col });
      }
      beep(520 + eatenCount * 12, 260, 0.08, 'square', 0.045);
      beep(700 + eatenCount * 12, 900, 0.06, 'square', 0.035, 0.07);
      if (eatenCount === N) {
        state = 'won';
        later(() => {
          ov.innerHTML = '';
          ov.style.background = 'rgba(6,12,30,.4)';
          ov.appendChild(el('div', 'mj-serp-win', T.gana));
          ov.hidden = false;
          [392, 523, 659, 784].forEach((fq, i) => beep(fq, fq, 0.15, 'square', 0.045, i * 0.12));
          snd('message', true);
          later(() => resolveDone(true), 1500);
        }, 250);
      }
    }

    function update(dt) {
      t += dt;
      for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].t -= dt;
        if (flashes[i].t <= 0) { paintState(flashes[i].s); flashes.splice(i, 1); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      }
      if (state === 'intro') return;

      // gira hacia el ratón con velocidad angular limitada
      if (target) {
        const dx = target.x - head.x, dy = target.y - head.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          let diff = Math.atan2(dy, dx) - head.a;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          // gira más cerrado cerca del cursor para no quedarse dando vueltas alrededor
          const turn = TURN * (1 + 3 * Math.max(0, 1 - dist / 32));
          head.a += clamp(diff, -turn * dt, turn * dt);
        }
      }
      head.x += Math.cos(head.a) * SPEED * dt;
      head.y += Math.sin(head.a) * SPEED * dt;
      // se queda dentro del lienzo: si toca un borde, desliza y gira hacia dentro
      if (head.x < 5 || head.x > W - 5) { head.x = clamp(head.x, 5, W - 5); head.a = Math.PI - head.a; }
      if (head.y < 5 || head.y > H - 5) { head.y = clamp(head.y, 5, H - 5); head.a = -head.a; }

      const lp = trail[trail.length - 1];
      if (Math.hypot(head.x - lp.x, head.y - lp.y) >= 1) trail.push({ x: head.x, y: head.y });
      if (segs < segTarget) segs = Math.min(segTarget, segs + dt * 20);
      // recorta la cola sobrante
      const need = Math.ceil(segs) * SPACING + 6;
      let acc = 0, cut = 0;
      for (let i = trail.length - 1; i > 0; i--) {
        acc += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
        if (acc > need) { cut = i - 1; break; }
      }
      if (cut > 0) trail = trail.slice(cut);

      if (state !== 'play') return;
      // comer: contacto de la cabeza con píxeles del estado o cercanía a su centro
      const hx = Math.round(head.x), hy = Math.round(head.y);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy > 9) continue;
        const x = hx + dx, y = hy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const v = M.id[y * W + x];
        if (v >= 0 && !eaten[v]) eat(v);
      }
      for (let s = 0; s < N; s++) {
        if (eaten[s]) continue;
        const c = M.centers[s];
        if (Math.hypot(c.x - head.x, c.y - head.y) < EAT_RADIUS) eat(s);
      }
    }

    // --- dibujo ---
    function disc(cx, cy, r, c) {
      ctx.fillStyle = c;
      cx = Math.round(cx); cy = Math.round(cy);
      const sp = SPANS[r];
      for (let k = 0; k < sp.length; k++) ctx.fillRect(cx - sp[k][1], cy + sp[k][0], sp[k][1] * 2 + 1, 1);
    }
    function bodyPoints() {
      const pts = [{ x: head.x, y: head.y }];
      const n = Math.ceil(segs);
      let want = SPACING, acc = 0;
      for (let i = trail.length - 1; i > 0 && pts.length <= n; i--) {
        const a = trail[i], b = trail[i - 1];
        const L = Math.hypot(a.x - b.x, a.y - b.y);
        while (acc + L >= want && pts.length <= n) {
          const k = (want - acc) / L;
          pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
          want += SPACING;
        }
        acc += L;
      }
      return pts;
    }
    function drawSnake() {
      const pts = bodyPoints();
      const n = pts.length;
      const rad = (i) => (i === 0 ? 4 : (i > n - 5 ? 2 : 3));
      for (let i = n - 1; i >= 0; i--) disc(pts[i].x, pts[i].y, rad(i) + 1, '#141428');
      for (let i = n - 1; i >= 1; i--) disc(pts[i].x, pts[i].y, rad(i), Math.floor((i - 1) / 2) % 2 === 0 ? '#d8283c' : '#f6f6f6');
      // cabeza: azul con estrellitas
      const hx = Math.round(head.x), hy = Math.round(head.y);
      disc(hx, hy, 4, '#2c3a8c');
      ctx.fillStyle = '#ffffff';
      for (const [sx, sy] of [[-2, -2], [1, -3], [-3, 1], [0, 0], [2, 2], [-1, 3]]) ctx.fillRect(hx + sx, hy + sy, 1, 1);
      // ojos mirando hacia adelante
      const fx = Math.cos(head.a), fy = Math.sin(head.a);
      for (const sgn of [-1, 1]) {
        const ex = Math.round(head.x + fx * 2 - fy * 2 * sgn), ey = Math.round(head.y + fy * 2 + fx * 2 * sgn);
        ctx.fillStyle = '#fff8d0'; ctx.fillRect(ex, ey, 1, 1);
        ctx.fillStyle = '#000'; ctx.fillRect(Math.round(ex + fx), Math.round(ey + fy), 1, 1);
      }
    }
    function render() {
      if (dirty) { mctx.putImageData(img, 0, 0); dirty = false; }
      ctx.drawImage(mapC, 0, 0);
      // marcadores de los estados que faltan
      const pulse = 0.55 + 0.45 * Math.sin(t * 5);
      for (let s = 0; s < N; s++) {
        if (eaten[s]) continue;
        const c = M.centers[s], x = Math.floor(c.x), y = Math.floor(c.y);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#3a2a40';
        ctx.fillRect(x, y, 1, 1);
      }
      drawSnake();
      for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    }

    function frame(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      update(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    return {
      done,
      destroy() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        if (ro) ro.disconnect();
        root.removeEventListener('mousemove', onMove);
        ov.removeEventListener('click', onStart);
        if (actx) { try { actx.close(); } catch (e) { /* nada */ } }
        root.remove();
        resolveDone(false); // no-op si ya se resolvió con true
      },
    };
  };
})();
