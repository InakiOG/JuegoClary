// Minijuego "Silicon Valley" (Juego Pipí): la maquila húmeda y oxidada, con los escritorios
// acomodados en un laberinto tipo Pac-Man. El jugador (el jefe) se mueve con flechas/WASD:
// recoge las botellas de pipí de quien levanta la gota amarilla y se las da como "agua" a quien
// levanta la gota azul. Cada pedido tiene paciencia; si se agota, se pierde atención (la vida).
// Sobrevivir 60 s = ganar. Las peticiones salen más rápido y más lejos conforme avanza el turno.
// Contrato: Game.minijuegos.maquila(host, opts) -> { done: Promise<boolean>, destroy() }.
// opts.dificultad: 'facil' | 'intermedio' | 'dificil' (por defecto 'intermedio', la que usa la historia).
// done se resuelve con true al sobrevivir el minuto; si la atención llega a 0, el host lo destruye.
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  // --- laberinto ---
  const TS = 16;                   // tamaño de casilla (píxeles internos)
  const COLS = 24, ROWS = 13;
  const TOP = 24;                  // franja de pared arriba
  const W = COLS * TS, H = TOP + ROWS * TS;  // 384 × 232 (resolución interna, pixel art)
  // Bandas de escritorios (2 filas de alto). 'S-' = puesto de trabajo (2×2 casillas),
  // '#' = garrafón vacío (1×2), '.' = pasillo. Las filas 0, 3, 6, 9 y 12 son pasillo.
  const BANDS = [
    [1, '.S-S-S-.S-S-.#.S-S-S-.S-'],
    [4, '..S-S-.S-S-S-S-.S-S-.#..'],
    [7, 'S-.S-S-S-.#.S-S-.S-S-S-.'],
    [10, '.S-S-.S-S-S-..S-S-S-.S-.'],
  ];

  // --- reglas ---
  const CAPACIDAD = 3;             // botellas que caben en las manos
  const ALCANCE = 14;              // distancia (px) del jefe al puesto para atenderlo

  // --- dificultad ---
  // 'intermedio' es el ajuste original (el de la historia): no cambiar sus valores.
  // Los pares [a, b] van del inicio (a) al final (b) del turno.
  //   duracion: s del turno · vel: px internos/s del jefe
  //   spawn: s entre peticiones · maxActivas: peticiones a la vez
  //   paciencia: s base de cada pedido (+0.2 s por casilla de distancia) · pacSed: s extra si es sed
  //   lejos: distancia mínima (casillas) a la que salen las peticiones
  //   danoPis / danoSed: atención perdida al agotarse un pedido · curaDar / curaRecoger: atención ganada
  const DIFICULTAD = {
    facil: {
      duracion: 50, vel: 88, spawn: [2.7, 1.4], maxActivas: [2, 5], paciencia: [10, 7.5], pacSed: 3.5,
      lejos: [2, 11], danoPis: 10, danoSed: 13, curaDar: 4, curaRecoger: 2,
    },
    intermedio: {
      duracion: 60, vel: 82, spawn: [2.4, 1.15], maxActivas: [2, 6], paciencia: [8.5, 6], pacSed: 2.5,
      lejos: [2, 15], danoPis: 10, danoSed: 14, curaDar: 3, curaRecoger: 1,
    },
    dificil: {
      duracion: 75, vel: 82, spawn: [2.0, 0.95], maxActivas: [3, 7], paciencia: [7, 5], pacSed: 2,
      lejos: [3, 16], danoPis: 14, danoSed: 18, curaDar: 2, curaRecoger: 1,
    },
  };
  function textoDuracion(s) { // 45 -> "45 segundos", 60 -> "1 minuto", 75 -> "1 minuto y 15 segundos"
    const m = Math.floor(s / 60), r = s % 60;
    const ms = m ? m + (m === 1 ? ' minuto' : ' minutos') : '';
    const rs = r ? r + ' segundos' : '';
    return ms && rs ? ms + ' y ' + rs : ms || rs;
  }

  const DEFAULTS = {
    titulo: 'SILICON VALLEY',
    instrucciones: 'Eres el jefe. Muévete con las flechas o WASD por el laberinto de escritorios. Pasa junto a quien tenga la gota amarilla para recoger su botella de pipí y llévasela a quien tenga la gota azul (sed). Nadie se levanta del escritorio. Aguanta 1 minuto.',
    empezar: '[ pulsa una flecha para empezar ]',
    gana: 'Turno terminado. Todos siguen trabajando.',
    inventario: 'Botellas',
    puntos: 'Puntos',
    lleno: 'Ya no te caben más botellas',
    sinBotellas: 'No traes botellas de pipí',
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const rand = (a, b) => a + Math.random() * (b - a);

  // --- sonidos mínimos (Web Audio, contexto perezoso y compartido) ---
  let actx = null;
  function beep(freq, dur, type, vol, slideTo, delay) {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime + (delay || 0);
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) { /* sin audio */ }
  }
  function oof() {
    try { if (Game.sound && Game.sound.oof) Game.sound.oof(rand(0.95, 1.35)); } catch (e) { /* */ }
  }

  // --- sprites (mapas de caracteres) ---
  const DROP = [
    '..o..',
    '..#..',
    '.o#o.',
    'o#h#o',
    'o#h##',
    'o###o',
    '.ooo.',
  ];
  const BOTTLE = [
    '.c.',
    '.c.',
    '###',
    '#h#',
    '#h#',
    '###',
  ];
  const ZMAP = ['####', '..#.', '.#..', '####'];
  const PEE_PAL = { '#': '#e6d23a', 'o': '#9a8418', 'h': '#fff6b0' };
  const SED_PAL = { '#': '#46b4e8', 'o': '#1d5a8a', 'h': '#d8f4ff' };
  const BOT_PAL = { '#': '#e6d23a', 'h': '#fff2a0', 'c': '#c8c0d0' };

  const SHIRTS = ['#7a3048', '#3b4a7a', '#4f6a3a', '#7a6a2e', '#5e3270', '#2e6a66', '#8a4a2a', '#4a4650', '#943c62', '#2a3e5e'];
  const HAIRS = ['#1a1410', '#3a2414', '#5a3a1a', '#0e0e12', '#7a5a30', '#2a2420', '#8a8a80', '#3a1a3a'];
  const SKINS = ['#c89a72', '#a87452', '#e0b48c', '#8a5a3a', '#d8a880'];

  const DIRS = {
    up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
  };
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  };

  Game.minijuegos.maquila = function (host, opts) {
    const dif = (opts && DIFICULTAD[opts.dificultad]) ? opts.dificultad : 'intermedio';
    const D = DIFICULTAD[dif];
    const DURACION = D.duracion, VEL = D.vel;
    const DANO_PIS = D.danoPis, DANO_SED = D.danoSed, CURA_DAR = D.curaDar, CURA_RECOGER = D.curaRecoger;
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.maquila) || {});
    if (dif !== 'intermedio') T.instrucciones = T.instrucciones.replace(/Aguanta 1 minuto/, 'Aguanta ' + textoDuracion(DURACION));

    // --- mapa de colisiones y puestos ---
    const solid = [];
    for (let r = 0; r < ROWS; r++) solid.push(new Array(COLS).fill(false));
    const workers = [];
    const coolers = [];
    for (const [r, row] of BANDS) {
      for (let c = 0; c < COLS; c++) {
        const ch = row[c];
        if (ch === 'S' || ch === '-' || ch === '#') { solid[r][c] = true; solid[r + 1][c] = true; }
        if (ch === '#') coolers.push({ c, r });
        if (ch === 'S') {
          workers.push({
            c, r, x: c * TS, y: TOP + r * TS,
            shirt: SHIRTS[(r * 3 + c * 7) % SHIRTS.length],
            hair: HAIRS[Math.floor(Math.random() * HAIRS.length)],
            skin: SKINS[Math.floor(Math.random() * SKINS.length)],
            style: Math.floor(Math.random() * 3),
            ph: Math.random() * 10,
            need: null, needT: 0, needMax: 1, warned: false,
            cool: 0, faint: 0, puddle: 0, fx: null, fxT: 0,
          });
        }
      }
    }
    const isFree = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && !solid[r][c];

    // --- DOM ---
    const root = el('div', 'mj-maq-root');
    const stage = el('div', 'mj-maq-stage');
    const canvas = el('canvas', 'mj-maq-canvas');
    canvas.width = W; canvas.height = H;
    stage.appendChild(canvas);

    const timerEl = el('div', 'mj-maq-timer', Math.floor(DURACION / 60) + ':' + String(DURACION % 60).padStart(2, '0'));
    const invEl = el('div', 'mj-maq-inv');
    invEl.appendChild(el('span', 'mj-maq-lbl', T.inventario));
    const slots = [];
    for (let i = 0; i < CAPACIDAD; i++) { const s = el('span', 'mj-maq-bot'); invEl.appendChild(s); slots.push(s); }
    const scoreEl = el('div', 'mj-maq-score');
    scoreEl.appendChild(el('span', 'mj-maq-lbl', T.puntos));
    const scoreNum = el('b', '', '0');
    scoreEl.appendChild(scoreNum);
    const hintEl = el('div', 'mj-maq-hint');
    hintEl.hidden = true;
    const ov = el('div', 'mj-maq-ov');
    stage.appendChild(timerEl); stage.appendChild(invEl); stage.appendChild(scoreEl);
    stage.appendChild(hintEl); stage.appendChild(ov);
    root.appendChild(stage);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function showOverlay(parts) {
      ov.innerHTML = '';
      const box = el('div', 'mj-maq-box');
      for (const p of parts) box.appendChild(el(p[0], p[1] || '', p[2]));
      ov.appendChild(box);
      ov.hidden = false;
    }

    // --- encaje en el host (letterbox) ---
    function fit() {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / W, h / H);
      const sw = Math.max(1, Math.floor(W * s)), sh = Math.max(1, Math.floor(H * s));
      stage.style.width = sw + 'px';
      stage.style.height = sh + 'px';
      stage.style.left = Math.floor((w - sw) / 2) + 'px';
      stage.style.top = Math.floor((h - sh) / 2) + 'px';
      stage.style.fontSize = (sw / W) + 'px'; // 1em = 1 píxel interno
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(host); }
    window.addEventListener('resize', fit);
    fit();

    // --- dibujo básico ---
    function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }
    function sprite(map, x, y, pal) {
      for (let j = 0; j < map.length; j++) {
        const row = map[j];
        for (let i = 0; i < row.length; i++) {
          const c = pal[row[i]];
          if (c) { ctx.fillStyle = c; ctx.fillRect((x + i) | 0, (y + j) | 0, 1, 1); }
        }
      }
    }
    function disc(cx, cy, r, c) {
      ctx.fillStyle = c;
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
        ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
      }
    }

    // --- fondo estático (pre-renderizado): pared, suelo, charcos y garrafones ---
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function buildBG() {
      const g = bg.getContext('2d');
      const rnd = mulberry32(1337);
      const pick = (a) => a[Math.floor(rnd() * a.length)];
      const F = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
      // pared
      F(0, 0, W, TOP - 2, '#403c2c');
      for (let i = 0; i < 110; i++) F(rnd() * W, rnd() * (TOP - 4), 3 + rnd() * 22, 1 + rnd() * 6, pick(['#36321f', '#4a4632', '#3a3426', '#514c34', '#3e3424', '#3a2c34']));
      // ventanucos con barrotes
      for (const wx of [58, 212, 310]) {
        F(wx, 8, 26, 11, '#1a1e1c'); F(wx + 1, 9, 24, 9, '#3e4c42');
        for (let x = wx + 3; x < wx + 25; x += 4) F(x, 9, 1, 9, '#22221c');
      }
      // manchas de humedad
      for (let i = 0; i < 10; i++) {
        const x = rnd() * W, w = 10 + rnd() * 30;
        for (let k = 0; k < 6; k++) F(x + rnd() * w - w / 2, 5 + rnd() * 13, 4 + rnd() * 10, 2 + rnd() * 4, 'rgba(26,30,16,0.35)');
      }
      // tubería
      F(0, 2, W, 4, '#2c281e'); F(0, 2, W, 1, '#5a4630'); F(0, 5, W, 1, '#1a1812');
      for (let x = 20; x < W; x += 48) F(x, 1, 3, 6, '#3a2c1c');
      // chorretones de óxido
      for (let i = 0; i < 22; i++) {
        const x = Math.floor(rnd() * W), len = 5 + Math.floor(rnd() * 14);
        for (let y = 0; y < len; y++) F(x + (rnd() < 0.12 ? 1 : 0), 6 + y, 1 + (y < len * 0.4 ? 1 : 0), 1, y < len * 0.5 ? '#7a3e1c' : '#5e3a20');
      }
      // zócalo
      F(0, TOP - 3, W, 3, '#221e18'); F(0, TOP - 3, W, 1, '#3a3222');
      // suelo (las juntas coinciden con las casillas del laberinto)
      F(0, TOP, W, H - TOP, '#332f28');
      for (let r = 0; r < ROWS; r++) {
        const y = TOP + r * TS;
        F(0, y, W, 1, '#2a2620');
        for (let x = (r % 2) * 8; x < W; x += TS) F(x, y, 1, TS, '#2a2620');
      }
      for (let i = 0; i < 90; i++) F(rnd() * W, TOP + 1 + rnd() * (H - TOP - 2), 2 + rnd() * 14, 1 + rnd() * 4, pick(['#2a2720', '#2e2a22', '#3a372e', '#312d28', '#30283a']));
      // charcos
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W, y = TOP + 8 + rnd() * (H - TOP - 12), w = 8 + rnd() * 16;
        F(x, y, w, 3, '#2a3436'); F(x + 2, y - 1, w - 4, 1, '#2a3436'); F(x + 3, y + 1, w * 0.4, 1, '#44545a');
      }
      // garrafones vacíos (obstáculos)
      for (const k of coolers) {
        const x = k.c * TS, y = TOP + k.r * TS;
        F(x + 2, y + 29, 12, 2, 'rgba(0,0,0,0.45)');
        F(x + 3, y + 14, 10, 16, '#58546a'); F(x + 3, y + 14, 10, 1, '#78748a'); F(x + 11, y + 15, 2, 15, '#3e3a4c');
        F(x + 5, y + 19, 6, 3, '#26222e'); F(x + 6, y + 20, 1, 1, '#c03a6a'); F(x + 9, y + 20, 1, 1, '#7ad04a');
        F(x + 4, y + 2, 8, 12, '#3c4a46'); F(x + 5, y + 3, 6, 3, '#506660'); F(x + 5, y + 9, 6, 4, '#4a5a32');
        F(x + 6, y + 1, 4, 2, '#24302c'); F(x + 5, y + 4, 1, 8, 'rgba(255,255,255,0.15)');
      }
      // viñeta
      const vg = g.createRadialGradient(W * 0.5, H * 0.4, 50, W * 0.5, H * 0.5, 260);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(10,0,14,0.55)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    })();

    // --- estado ---
    let state = 'intro';       // intro | play | won | over
    let elapsed = 0, inv = 0, score = 0, spawnT = 0.8, endT = 0, hintT = 0;
    let lastSec = -1, lastInv = -1, lastScore = -1;
    let clock = 0;
    let lamp = 1, lampTimer = 3, flickT = 0;
    const drips = [];
    let dripTimer = 0.5;
    const floats = [];
    // el jefe empieza en el centro del pasillo de en medio
    const boss = { x: 11 * TS + TS / 2, y: TOP + 6 * TS + TS / 2, face: 'down', walk: 0, moving: false };
    const held = [];           // direcciones pulsadas (la última manda)
    const near = new Set();    // puestos al alcance en el cuadro anterior (para avisos)

    let resolveDone;
    let settled = false;
    const done = new Promise((res) => { resolveDone = res; });
    function finish(v) { if (!settled) { settled = true; resolveDone(v); } }

    const at = () => (Game.atencion || null);

    function startRound() {
      state = 'play';
      ov.hidden = true;
      beep(440, 0.08, 'square', 0.05, 660);
    }

    function win() {
      state = 'won';
      endT = 0;
      timerEl.classList.remove('mj-maq-urge');
      for (const w of workers) { w.need = null; }
      [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 'square', 0.05, null, i * 0.11));
      showOverlay([['p', 'mj-maq-big', T.gana], ['p', 'mj-maq-sub', T.puntos + ': ' + score]]);
    }

    function updateHUD() {
      const sec = Math.max(0, Math.ceil(DURACION - elapsed));
      if (sec !== lastSec) {
        lastSec = sec;
        timerEl.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
        timerEl.classList.toggle('mj-maq-urge', state === 'play' && sec <= 10);
        if (state === 'play' && sec <= 10 && sec > 0 && elapsed > 0) beep(1200, 0.03, 'square', 0.03);
      }
      if (inv !== lastInv) {
        lastInv = inv;
        slots.forEach((s, i) => s.classList.toggle('mj-maq-full', i < inv));
      }
      if (score !== lastScore) { lastScore = score; scoreNum.textContent = String(score); }
    }

    function hint(text) {
      hintEl.textContent = text;
      hintEl.hidden = false;
      hintT = 1.4;
    }

    function floatText(text, x, y, cls) {
      const f = el('div', 'mj-maq-float ' + (cls || ''), text);
      f.style.left = x + 'em';
      f.style.top = y + 'em';
      stage.appendChild(f);
      floats.push({ el: f, t: 0 });
    }

    // --- distancias por el laberinto (BFS desde la casilla del jefe) ---
    function bfs() {
      const d = [];
      for (let r = 0; r < ROWS; r++) d.push(new Array(COLS).fill(Infinity));
      const c0 = Math.floor(boss.x / TS), r0 = Math.floor((boss.y - TOP) / TS);
      if (!isFree(c0, r0)) return d;
      const q = [[c0, r0]];
      d[r0][c0] = 0;
      for (let i = 0; i < q.length; i++) {
        const [c, r] = q[i];
        for (const k in DIRS) {
          const nc = c + DIRS[k].dx, nr = r + DIRS[k].dy;
          if (isFree(nc, nr) && d[nr][nc] === Infinity) { d[nr][nc] = d[r][c] + 1; q.push([nc, nr]); }
        }
      }
      return d;
    }
    function workerDist(w, d) {
      let best = Infinity;
      const cells = [[w.c - 1, w.r], [w.c - 1, w.r + 1], [w.c + 2, w.r], [w.c + 2, w.r + 1],
        [w.c, w.r - 1], [w.c + 1, w.r - 1], [w.c, w.r + 2], [w.c + 1, w.r + 2]];
      for (const [c, r] of cells) if (isFree(c, r)) best = Math.min(best, d[r][c]);
      return best;
    }

    function spawnNeed(p) {
      let pee = 0, thirst = 0;
      for (const w of workers) { if (w.need === 'pee') pee++; else if (w.need === 'thirst') thirst++; }
      // Justo: solo hay sed si las botellas en mano (o por recoger) superan a los sedientos.
      // y nunca más pipí de la que cabe en las manos: si no, el jugador quedaría atascado.
      const canThirst = elapsed > 4 && inv + pee > thirst;
      const mustThirst = inv + pee >= CAPACIDAD + thirst;
      const kind = mustThirst || (canThirst && Math.random() < 0.5) ? 'thirst' : 'pee';
      const d = bfs();
      const free = [];
      for (const w of workers) {
        if (w.need || w.cool > 0 || w.faint > 0) continue;
        const dist = workerDist(w, d);
        if (dist < Infinity) free.push({ w, dist });
      }
      if (!free.length) return false;
      // cada vez más lejos del jefe
      const minD = lerp(D.lejos[0], D.lejos[1], p);
      let cand = free.filter((o) => o.dist >= minD);
      if (!cand.length) {
        free.sort((a, b) => b.dist - a.dist);
        cand = free.slice(0, Math.max(1, Math.ceil(free.length / 4)));
      }
      const { w, dist } = cand[Math.floor(Math.random() * cand.length)];
      w.need = kind;
      // paciencia base + tiempo de ir caminando (0.2 s/casilla); la sed da un poco más
      w.needMax = lerp(D.paciencia[0], D.paciencia[1], p) + dist * 0.2 + (kind === 'thirst' ? D.pacSed : 0);
      w.needT = w.needMax;
      w.warned = false;
      beep(kind === 'pee' ? 880 : 620, 0.05, 'sine', 0.04, kind === 'pee' ? 1100 : 820);
      return true;
    }

    // --- movimiento por casillas con giros asistidos ---
    function tryMove(dir, step) {
      const D = DIRS[dir];
      const tc = Math.floor(boss.x / TS), tr = Math.floor((boss.y - TOP) / TS);
      const cx = tc * TS + TS / 2, cy = TOP + tr * TS + TS / 2;
      if (D.dx) {
        const ahead = isFree(tc + D.dx, tr);
        if (!ahead && (cx - boss.x) * D.dx <= 0.01) return false;
        const off = cy - boss.y;
        if (Math.abs(off) > 0.01) boss.y += Math.sign(off) * Math.min(Math.abs(off), step);
        let nx = boss.x + D.dx * step;
        if (!ahead && (nx - cx) * D.dx > 0) nx = cx;
        boss.x = Math.max(TS / 2, Math.min(W - TS / 2, nx));
      } else {
        const ahead = isFree(tc, tr + D.dy);
        if (!ahead && (cy - boss.y) * D.dy <= 0.01) return false;
        const off = cx - boss.x;
        if (Math.abs(off) > 0.01) boss.x += Math.sign(off) * Math.min(Math.abs(off), step);
        let ny = boss.y + D.dy * step;
        if (!ahead && (ny - cy) * D.dy > 0) ny = cy;
        boss.y = Math.max(TOP + TS / 2, Math.min(H - TS / 2, ny));
      }
      boss.face = dir;
      return true;
    }

    function inReach(w) {
      const nx = Math.max(w.x, Math.min(w.x + 2 * TS, boss.x));
      const ny = Math.max(w.y, Math.min(w.y + 2 * TS, boss.y));
      return Math.hypot(boss.x - nx, boss.y - ny) <= ALCANCE;
    }

    function serve(w) {
      const frac = Math.max(0, w.needT / w.needMax);
      if (w.need === 'pee') {
        if (inv >= CAPACIDAD) { if (!near.has(w)) { hint(T.lleno); beep(140, 0.15, 'sawtooth', 0.05); } return; }
        inv++;
        const pts = 50 + Math.round(frac * 50);
        score += pts;
        w.need = null; w.cool = 2;
        w.fx = 'take'; w.fxT = 0.8;
        if (Game.score && Game.score.add) Game.score.add(pts);
        if (at()) at().curar(CURA_RECOGER);
        floatText('+' + pts, w.x + 16, w.y - 4, 'mj-maq-fpee');
        beep(660, 0.08, 'square', 0.05, 990);
      } else if (w.need === 'thirst') {
        if (inv <= 0) { if (!near.has(w)) { hint(T.sinBotellas); beep(140, 0.15, 'sawtooth', 0.05); } return; }
        inv--;
        const pts = 100 + Math.round(frac * 100);
        score += pts;
        w.need = null; w.cool = 2.5;
        w.fx = 'drink'; w.fxT = 1;
        if (Game.score && Game.score.add) Game.score.add(pts);
        if (at()) at().curar(CURA_DAR);
        floatText('+' + pts, w.x + 16, w.y - 4, 'mj-maq-fsed');
        beep(520, 0.12, 'triangle', 0.07, 800);
      }
    }

    function expire(w) {
      if (w.need === 'pee') {
        w.puddle = 6; w.cool = 3.5;
        if (at()) at().danar(DANO_PIS);
      } else {
        w.faint = 4; w.cool = 5;
        if (at()) at().danar(DANO_SED);
      }
      w.need = null;
      oof();
      floatText('×', w.x + 16, w.y - 4, 'mj-maq-fbad');
    }

    function update(dt) {
      clock += dt;

      // lámpara parpadeante
      lampTimer -= dt;
      if (lampTimer <= 0) { flickT = rand(0.15, 0.5); lampTimer = rand(2, 6); }
      if (flickT > 0) {
        flickT -= dt;
        lamp = Math.sin(clock * 70) > 0.1 ? 1 : 0.35;
      } else {
        lamp = 0.93 + Math.sin(clock * 13) * 0.04 + Math.random() * 0.03;
      }

      // goteras
      dripTimer -= dt;
      if (dripTimer <= 0) {
        dripTimer = rand(0.3, 1.1);
        drips.push({ x: Math.floor(rand(4, W - 4)), y: 6, vy: 10, ty: rand(TOP + 4, H - 4), splash: 0 });
      }
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        if (d.splash > 0) { d.splash -= dt; if (d.splash <= 0) drips.splice(i, 1); continue; }
        d.vy += 260 * dt;
        d.y += d.vy * dt;
        if (d.y >= d.ty) { d.y = d.ty; d.splash = 0.18; }
      }

      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].t += dt;
        if (floats[i].t > 0.9) { floats[i].el.remove(); floats.splice(i, 1); }
      }
      for (const w of workers) {
        if (w.fxT > 0) { w.fxT -= dt; if (w.fxT <= 0) w.fx = null; }
        if (w.faint > 0) w.faint -= dt;
        if (w.puddle > 0) w.puddle -= dt;
        if (w.cool > 0) w.cool -= dt;
      }
      if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintEl.hidden = true; }

      if (state === 'play') {
        elapsed += dt;
        const p = Math.min(1, elapsed / DURACION);

        // jefe
        boss.moving = false;
        const step = VEL * dt;
        for (let i = held.length - 1; i >= 0; i--) {
          if (tryMove(held[i], step)) { boss.moving = true; break; }
        }
        if (boss.moving) boss.walk += dt;

        // atender a los que están al alcance
        const nowNear = new Set();
        for (const w of workers) {
          if (!inReach(w)) continue;
          if (w.need) serve(w);
          nowNear.add(w);
        }
        near.clear();
        nowNear.forEach((w) => near.add(w));

        // paciencia
        for (const w of workers) {
          if (!w.need) continue;
          w.needT -= dt;
          if (!w.warned && w.needT < w.needMax * 0.3) {
            w.warned = true;
            beep(w.need === 'thirst' ? 300 : 420, 0.08, 'square', 0.035);
          }
          if (w.needT <= 0) expire(w);
        }

        if (elapsed >= DURACION) {
          elapsed = DURACION;
          updateHUD();
          win();
          return;
        }

        // nuevas peticiones: cada vez más seguido y más a la vez
        let active = 0;
        for (const w of workers) if (w.need) active++;
        spawnT -= dt;
        if (spawnT <= 0) {
          const maxActive = Math.round(lerp(D.maxActivas[0], D.maxActivas[1], p));
          if (active < maxActive && spawnNeed(p)) spawnT = lerp(D.spawn[0], D.spawn[1], p) * rand(0.8, 1.2);
          else spawnT = 0.3;
        }
        updateHUD();
      } else if (state === 'won') {
        endT += dt;
        if (endT >= 2.2) { state = 'over'; finish(true); }
      }
    }

    // --- render ---
    // Puesto de trabajo (32×32): escritorio con monitor arriba, trabajador de espaldas abajo.
    function drawWorker(w) {
      const t = clock;
      const x = w.x - 6, y = w.y + 3;          // mismo dibujo del set original, más compacto
      const sx = w.x, sy = w.y;
      R(sx + 4, sy + 30, 24, 1, 'rgba(0,0,0,0.4)');
      if (w.puddle > 0) {
        const a = Math.min(1, w.puddle / 2) * 0.8;
        R(sx + 6, sy + 29, 20, 3, 'rgba(214,196,52,' + a.toFixed(2) + ')');
        R(sx + 9, sy + 30, 6, 1, 'rgba(255,246,170,' + a.toFixed(2) + ')');
      }
      // mesa
      R(sx + 1, y + 8, 30, 6, '#57462f');
      R(sx + 1, y + 8, 30, 1, '#6e5a40');
      R(sx + 1, y + 13, 30, 1, '#3a2f20');
      R(sx + 2, y + 14, 2, 9, '#2a2218');
      R(sx + 28, y + 14, 2, 9, '#2a2218');
      R(sx + 25, y + 9, 3, 2, '#7a3e1c');
      // monitor
      R(x + 13, y - 1, 18, 10, '#6a6660');
      R(x + 13, y - 1, 18, 1, '#827e78');
      R(x + 13, y + 8, 18, 1, '#48443e');
      R(x + 20, y + 9, 4, 1, '#48443e');
      const on = !(w.faint > 0);
      const glowA = 0.85 + 0.15 * Math.sin(t * 9 + w.ph);
      R(x + 15, y + 1, 14, 6, on ? 'rgba(146,232,132,' + glowA.toFixed(2) + ')' : '#22322a');
      if (on) {
        for (let i = 0; i < 3; i++) {
          const len = 2 + (Math.floor(t * 5 + w.ph * 3 + i * 3) % 9);
          R(x + 16, y + 2 + i * 2, len, 1, '#2e6a34');
        }
      }
      R(x + 11, y + 9, 22, 2, 'rgba(150,232,130,0.12)');
      // teclado
      R(x + 15, y + 10, 14, 2, '#9a978a');
      R(x + 15, y + 11, 14, 1, '#6b685d');

      if (w.faint > 0) {
        // desplomado sobre la mesa
        R(x + 15, y + 13, 14, 9, w.shirt);
        R(x + 10, y + 9, 9, 2, w.shirt);
        R(x + 25, y + 9, 9, 2, w.shirt);
        R(x + 17, y + 5, 10, 3, w.hair);
        R(x + 17, y + 8, 10, 4, w.skin);
        R(x + 17, y + 8, 2, 4, w.hair);
        sprite(['#.#', '.#.', '#.#'], x + 21, y + 8, { '#': '#1a0a0a' });
        R(x + 15, y + 20, 14, 5, '#2b2b2e');
        R(x + 15, y + 20, 14, 1, '#3e3e44');
        const zy = (t * 7) % 12;
        sprite(ZMAP, x + 30, y + 2 - zy, { '#': 'rgba(200,220,255,' + (1 - zy / 12).toFixed(2) + ')' });
        return;
      }

      let dx = 0;
      if (w.need === 'pee') dx = Math.sin(t * 22 + w.ph) > 0 ? 1 : 0; // se retuerce
      const thirsty = w.need === 'thirst';
      const a = Math.sin(t * (thirsty ? 3 : 15) + w.ph) > 0;
      R(x + 14 + dx, y + 12 + (a ? 0 : 1), 3, 6, w.shirt);
      R(x + 15 + dx, y + 11 + (a ? 0 : 1), 2, 1, w.skin);
      R(x + 27 + dx, y + 12 + (a ? 1 : 0), 3, 6, w.shirt);
      R(x + 27 + dx, y + 11 + (a ? 1 : 0), 2, 1, w.skin);
      R(x + 15 + dx, y + 16, 14, 9, w.shirt);
      R(x + 27 + dx, y + 17, 2, 8, 'rgba(0,0,0,0.25)');
      R(x + 15 + dx, y + 16, 14, 1, 'rgba(255,255,255,0.12)');
      if (thirsty) R(x + 18 + dx, y + 18, 3, 3, 'rgba(0,0,0,0.18)');
      const hy = y + 10 + (thirsty ? 1 : 0);
      R(x + 20 + dx, y + 15, 4, 2, w.skin);
      R(x + 17 + dx, hy + 2, 1, 2, w.skin);
      R(x + 26 + dx, hy + 2, 1, 2, w.skin);
      R(x + 18 + dx, hy, 8, 6, w.hair);
      R(x + 17 + dx, hy + 1, 10, 2, w.hair);
      R(x + 19 + dx, hy, 3, 1, 'rgba(255,255,255,0.12)');
      if (w.style === 1) R(x + 21 + dx, hy + 6, 2, 4, w.hair);
      else if (w.style === 2) R(x + 20 + dx, hy + 1, 4, 2, w.skin);
      // silla
      R(x + 15, y + 21, 14, 5, '#2b2b2e');
      R(x + 15, y + 21, 14, 1, '#3e3e44');
    }

    function drawNeed(w) {
      const cx = w.x + 26, frac = Math.max(0, w.needT / w.needMax);
      const urgent = frac < 0.3;
      const cy = w.y + 1 + (urgent && Math.sin(clock * 20) > 0 ? -1 : 0);
      disc(cx, cy, 7, 'rgba(8,0,12,0.72)');
      const ringC = urgent ? (Math.sin(clock * 16) > 0 ? '#ff3a6a' : '#ffb0c8') : (w.need === 'pee' ? '#e6d23a' : '#7ad8ff');
      ctx.fillStyle = ringC;
      const N = 56;
      for (let k = 0; k < N; k++) {
        if (k / N > frac) break;
        const ang = -Math.PI / 2 + (k / N) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(ang) * 7), Math.round(cy + Math.sin(ang) * 7), 1, 1);
      }
      sprite(DROP, cx - 2, cy - 3, w.need === 'pee' ? PEE_PAL : SED_PAL);
    }

    function drawFx(w) {
      const k = 1 - w.fxT / (w.fx === 'take' ? 0.8 : 1);
      ctx.globalAlpha = Math.max(0, 1 - k);
      if (w.fx === 'take') {
        sprite(BOTTLE, w.x + 24, w.y - 2 - k * 10, BOT_PAL);
      } else {
        sprite(BOTTLE, w.x + 15, w.y + 4 - k * 6, BOT_PAL);
        sprite(['.#.', '###', '.#.'], w.x + 21, w.y - k * 8, { '#': '#9cff6a' });
      }
      ctx.globalAlpha = 1;
    }

    // El jefe (Tomás): abrigo largo, sombrero y ojos rojos; pies en (x, y + 6).
    function drawBoss() {
      const bx = Math.round(boss.x), fy = Math.round(boss.y) + 7;
      const step = boss.moving ? (Math.floor(boss.walk * 10) % 2) : 0;
      const bob = boss.moving ? step : (Math.sin(clock * 2) > 0 ? 1 : 0);
      const face = boss.face;
      // aro bajo los pies (estilo Habbo) para encontrarlo rápido
      ctx.fillStyle = 'rgba(160,255,80,' + (0.45 + 0.2 * Math.sin(clock * 6)).toFixed(2) + ')';
      ctx.fillRect(bx - 4, fy - 1, 8, 1); ctx.fillRect(bx - 4, fy + 2, 8, 1);
      ctx.fillRect(bx - 6, fy, 2, 2); ctx.fillRect(bx + 4, fy, 2, 2);
      R(bx - 4, fy, 8, 2, 'rgba(0,0,0,0.55)');
      // piernas
      R(bx - 3, fy - 5 - (step ? 1 : 0), 2, 5 + (step ? 1 : 0) - 0, '#0e0b0e');
      R(bx + 1, fy - 5 - (step ? 0 : 1), 2, 5 + (step ? 0 : 1), '#0e0b0e');
      // abrigo
      for (let i = 0; i < 12; i++) {
        const w2 = Math.round(lerp(7, 10, i / 11));
        R(bx - Math.floor(w2 / 2), fy - 16 + bob + i, w2, 1, i % 5 === 0 ? '#1e1622' : '#160f1a');
      }
      R(bx - 5, fy - 5 + bob, 1, 1, '#9a2a6a'); R(bx + 4, fy - 5 + bob, 1, 1, '#9a2a6a'); // forro magenta
      if (face !== 'up') R(bx, fy - 16 + bob, 1, 11, '#0c080e');
      // botellas en la mano
      if (inv > 0) {
        const hx = face === 'left' ? bx - 7 : bx + 5;
        sprite(['c', '#', '#'], hx, fy - 9 + bob, BOT_PAL);
        if (inv > 1) sprite(['c', '#', '#'], hx + (face === 'left' ? -2 : 2), fy - 8 + bob, BOT_PAL);
        if (inv > 2) sprite(['c', '#', '#'], hx + (face === 'left' ? -4 : 4), fy - 9 + bob, BOT_PAL);
      }
      // cabeza y sombrero
      R(bx - 3, fy - 21 + bob, 6, 5, '#1c161c');
      R(bx - 5, fy - 22 + bob, 10, 1, '#0a080a');
      R(bx - 3, fy - 27 + bob, 6, 5, '#0a080a');
      R(bx - 3, fy - 23 + bob, 6, 1, '#6a1a3a');
      const blink = (clock % 4) < 0.12;
      if (!blink && face !== 'up') {
        if (face === 'left') R(bx - 3, fy - 19 + bob, 2, 1, '#e03a3a');
        else if (face === 'right') R(bx + 1, fy - 19 + bob, 2, 1, '#e03a3a');
        else { R(bx - 2, fy - 19 + bob, 1, 1, '#e03a3a'); R(bx + 1, fy - 19 + bob, 1, 1, '#e03a3a'); }
      }
    }

    function draw() {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg, 0, 0);

      // lámpara
      const lx = W / 2;
      R(lx, 0, 1, 9, '#151512');
      R(lx - 5, 9, 11, 3, '#2c2a24'); R(lx - 4, 9, 9, 1, '#46423a');
      R(lx - 1, 12, 3, 2, lamp > 0.6 ? '#fff4c0' : '#6a6450');
      if (lamp > 0.6) {
        ctx.globalAlpha = 0.06 * lamp;
        ctx.fillStyle = '#ffe9a0';
        for (let i = 0; i < 72; i++) ctx.fillRect(lx - i * 1.9, 14 + i * 3, i * 3.8 + 3, 3);
        ctx.globalAlpha = 1;
      }

      // puestos ordenados por altura; el jefe se dibuja delante de los de su fila y de arriba
      let bossDrawn = false;
      for (const w of workers) {
        if (!bossDrawn && w.y > boss.y) { drawBoss(); bossDrawn = true; }
        drawWorker(w);
      }
      if (!bossDrawn) drawBoss();

      for (const d of drips) {
        if (d.splash > 0) {
          R(d.x - 2, d.y, 1, 1, '#8aa8b0'); R(d.x + 2, d.y, 1, 1, '#8aa8b0'); R(d.x - 1, d.y - 1, 1, 1, '#8aa8b0'); R(d.x + 1, d.y - 1, 1, 1, '#8aa8b0');
        } else {
          R(d.x, d.y, 1, 2, '#8aa8b0');
        }
      }

      const dark = (1 - lamp) * 0.5 + 0.05;
      R(0, 0, W, H, 'rgba(6,0,10,' + dark.toFixed(3) + ')');

      for (const w of workers) {
        if (w.need) drawNeed(w);
        if (w.fx) drawFx(w);
      }
    }

    // --- bucle ---
    let raf = 0, last = performance.now(), destroyed = false;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      update(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);

    // --- entrada ---
    function onKeyDown(e) {
      const dir = KEYMAP[e.code] || KEYMAP[e.key];
      if (state === 'intro' && (dir || e.code === 'Space' || e.code === 'Enter')) { startRound(); }
      if (!dir) return;
      if (e.key && e.key.startsWith('Arrow')) e.preventDefault();
      const i = held.indexOf(dir);
      if (i >= 0) held.splice(i, 1);
      held.push(dir);
    }
    function onKeyUp(e) {
      const dir = KEYMAP[e.code] || KEYMAP[e.key];
      if (!dir) return;
      const i = held.indexOf(dir);
      if (i >= 0) held.splice(i, 1);
    }
    function onBlur() { held.length = 0; }
    function onDown(e) {
      if (e.button !== 0) return;
      if (state === 'intro') startRound();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    stage.addEventListener('mousedown', onDown);

    // estado para pruebas automáticas (sin variables globales)
    root._maq = { workers, boss, solid, get inv() { return inv; }, get state() { return state; }, TS, TOP };

    // pantalla inicial
    updateHUD();
    showOverlay([['h1', '', T.titulo], ['p', '', T.instrucciones], ['div', 'mj-maq-cta', T.empezar]]);

    return {
      done,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', fit);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        stage.removeEventListener('mousedown', onDown);
        root.remove();
      },
    };
  };
})();
