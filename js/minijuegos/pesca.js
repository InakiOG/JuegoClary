// Minijuego "Ribera de Chapala": pescar en un lago contaminado junto a un centro de datos.
// Dinámica tipo "Ice Fishing" (Club Penguin): el anzuelo sigue al ratón; si toca un pez lo engancha.
// Hay 3 peces dorados sanos en toda la partida: engánchalos y súbelos a la superficie para guardarlos.
// Los peces con baba verde fosforescente y la basura que se hunde (o flota) son "fallas": cada una
// quita 25 de atención; a la cuarta (más de tres) se vacía la atención y el host lanza GAME OVER.
// Contrato: Game.minijuegos.pesca(host) -> { done: Promise<boolean>, destroy() }.
// done -> true al guardar los 3 peces sanos; false si se pierde (o si se llama a destroy() antes).
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 320, H = 192;              // resolución interna (pixel art)
  const HORIZON = 64;                  // línea del horizonte
  const SURFACE = 88;                  // superficie del agua (corte lateral)
  const BOTTOM = H - 12;               // fondo de lodo (aprox.)
  const HX0 = 6, HX1 = W - 6, HY0 = SURFACE - 3, HY1 = BOTTOM - 3; // zona del anzuelo
  const BANK_Y = SURFACE + 2;          // subir el pez hasta aquí lo saca del agua
  const GOLD_TOTAL = 3;                // peces sanos en toda la partida
  const MAX_FALLAS = 3;                // a la cuarta se pierde
  const DANO = 25;                     // atención por falla
  const HOOK_SPEED = 230, HOOK_SPEED_FULL = 125; // px internos/s (vacío / con pez)
  const INVULN = 2.4;                  // s sin fallas tras una
  const PTS_SANO = 1000, PTS_ESQUIVA = 10;

  const DEFAULTS = {
    titulo: 'RIBERA DE CHAPALA',
    instrucciones: 'Mueve el anzuelo con el ratón. Engancha los <b>3 peces dorados sanos</b> y súbelos a la superficie. ' +
      'Esquiva los peces con <i>baba verde</i> y la basura: si atrapas más de tres, pierdes.',
    empezar: '[ clic para empezar ]',
    malo: [
      'Este pez no se ve muy bien, seguiré buscando uno saludable.',
      'Puaj, baba verde fosforescente. Ese no.',
      'Ese pez brilla en la oscuridad... no gracias.',
      'Tiene tres ojos. Seguiré buscando uno sano.',
    ],
    basura: {
      lona: '¿Una lona de VOTA LEMUS? Hasta en el lago hay campaña.',
      coca: 'Una lata de Coca-Cola. El lago ya sabe a refresco.',
      hershey: 'Una envoltura de Hershey\'s. Ni el chocolate se salva.',
      bacardi: 'Una botella de Bacardi. Alguien hizo fiesta en la orilla.',
      cuervo: 'José Cuervo flotando en el agua. Qué asco.',
      dron: '¿Un dron? ¿Quién nos está vigilando?',
      camara: 'Una cámara de vigilancia... hasta debajo del agua.',
      tarjeta: 'Una tarjeta de Al Estilo Jalisco. Ni para eso sirve.',
    },
    escapa: '¡Se me soltó el pez sano!',
    sano: '¡Un pez sano!',
    gana: '¡Tres peces sanos!',
    ganaSub: 'Por fin algo que se puede comer.',
    hudScore: 'SCORE',
    hudSanos: 'SANOS',
    hudFallas: 'FALLAS',
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const pick = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);

  // --- ruido determinista para el agua contaminada ---
  function hash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s) {
    return vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function hsl(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);

  // --- fuente pixel 3x5 (letreros y etiquetas de la basura) ---
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', '-': '000000111000000', ' ': '000000000000000',
  };
  function textW(str) {
    let w = 0;
    for (const ch of str) w += ch === "'" ? 2 : 4;
    return w - 1;
  }
  function textOn(g, str, x, y, color, s) {
    s = s || 1;
    g.fillStyle = color;
    for (const ch0 of str) {
      if (ch0 === "'") { g.fillRect(x, y, s, 2 * s); x += 2 * s; continue; }
      const ch = ch0.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const glyph = FONT[ch] || FONT[' '];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++)
        if (glyph[j * 3 + i] === '1') g.fillRect(x + i * s, y + j * s, s, s);
      x += 4 * s;
    }
  }

  // --- sprites de peces (miran a la izquierda; la boca está en la columna 0) ---
  const FISH_A = [ // tres ojos, costillas al aire
    '......oooooo........',
    '....oowkbwkboo...oo.',
    '..oobbbbbbbbbbo.obo.',
    '.obwkbbxbxbxbbbboboo',
    'orrbbbbxbxbxbbbbbbo.',
    'ottbbbbxbxbxbbbboboo',
    '.obbbbbbbbbbbbbo.obo',
    '..oobbsbbbsbbbo..oo.',
    '....oobbbbbboo......',
    '......oooooo........',
  ];
  const FISH_B = [ // mitad esqueleto
    '....oooooooo............',
    '..oobbbbbbbboooo....oo..',
    '.obwkbbbbbbbbbbxo..oxo..',
    'obbbbbbsbbbbbbx.xxxxxo..',
    'orrrbbbbbbbsbbxxxxxxxxo.',
    'obbbbbbbbbbbbbx.xxxxxo..',
    '.obbbsbbbbbbbbbxo..oxo..',
    '..oobbbbbbbboooo....oo..',
    '....oooooooo............',
  ];
  const FISH_G = [ // pez sano (más pequeño)
    '...oooo..oo',
    '.ooyyyyooyo',
    'okyyhyyyyyo',
    'oyyyyyyyyyo',
    '.ooyyyyooyo',
    '...oooo..oo',
  ];
  const FISH_D = [ // señuelo: parece dorado, pero escurre baba
    '...oooo..oo.',
    '.ooyysyooyo.',
    'okyyhyyysyo.',
    'oyysyyyyyyoo',
    '.ooyyyysoyo.',
    '...ossoo.oo.',
    '....s..s....',
  ];
  const PAL_A1 = { o: '#1e1424', b: '#7a4a8a', w: '#e8e8c0', k: '#c01010', x: '#e8e0d0', r: '#401018', t: '#e8e0d0', s: '#b0ff40' };
  const PAL_A2 = { o: '#1a140c', b: '#6a5030', w: '#e8e8a0', k: '#101010', x: '#d8d0b8', r: '#3a1010', t: '#f0e8c8', s: '#9aff40' };
  const PAL_B1 = { o: '#141a0c', b: '#5a6a2a', w: '#f0f080', k: '#202020', x: '#d8d0b8', r: '#3a1414', s: '#9aff50' };
  const PAL_B2 = { o: '#18141e', b: '#6a5a7a', w: '#e0ffb0', k: '#a01010', x: '#e0d8c8', r: '#301020', s: '#a0ff40' };
  const PAL_G = { o: '#6a3c00', y: '#f0c020', h: '#fff4a8', k: '#111111' };
  const PAL_D = { o: '#3a4a10', y: '#b8b030', h: '#e8f080', k: '#c01010', s: '#7dff4a' };
  const GLOW = '#7dff4a';

  function makeSprite(rows, pal, mouthY, glowColor) {
    const w = Math.max.apply(null, rows.map((r) => r.length)), h = rows.length;
    rows = rows.map((r) => r.padEnd(w, '.'));
    function paint(rs, color) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const col = color || pal[rs[j][i]];
        if (rs[j][i] !== '.' && col) { g.fillStyle = col; g.fillRect(i, j, 1, 1); }
      }
      return c;
    }
    function glow(rs) {
      const sil = paint(rs, glowColor);
      const c = document.createElement('canvas');
      c.width = w + 4; c.height = h + 4;
      const g = c.getContext('2d');
      for (const [dx, dy] of [[1, 2], [3, 2], [2, 1], [2, 3], [1, 1], [3, 3], [1, 3], [3, 1], [0, 2], [4, 2]]) g.drawImage(sil, dx, dy);
      return c;
    }
    const rev = rows.map((r) => r.split('').reverse().join(''));
    return { w, h, mouthY, L: paint(rows), R: paint(rev), gL: glowColor ? glow(rows) : null, gR: glowColor ? glow(rev) : null };
  }

  // --- basura (sprites dibujados a mano en lienzos pequeños) ---
  function makeTrash(kind) {
    const S = {
      lona: [29, 17], coca: [17, 20], hershey: [41, 11], bacardi: [40, 11],
      cuervo: [38, 14], dron: [28, 11], camara: [22, 13], tarjeta: [39, 17],
    }[kind];
    const c = document.createElement('canvas');
    c.width = S[0]; c.height = S[1];
    const g = c.getContext('2d');
    const F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const ctr = (str, y, col, x0, x1) => textOn(g, str, Math.round(((x0 || 0) + (x1 || S[0])) / 2 - textW(str) / 2), y, col);
    switch (kind) {
      case 'lona': // lona de campaña, rota de una esquina
        F(0, 0, 29, 17, '#e0702a'); F(0, 0, 29, 1, '#f09050'); F(0, 16, 29, 1, '#9a4010');
        F(1, 1, 27, 15, '#e8762c');
        F(2, 2, 25, 7, '#f4ecd8');
        ctr('VOTA', 3, '#c02a6a');
        ctr('LEMUS', 10, '#fff4e0');
        for (const [x, y] of [[1, 1], [26, 1], [1, 14]]) F(x, y, 2, 2, '#3a3040');
        F(25, 13, 4, 4, 'rgba(0,0,0,0)'); g.clearRect(25, 13, 4, 4); g.clearRect(27, 11, 2, 2); F(24, 14, 1, 2, '#9a4010');
        break;
      case 'coca': // lata de refresco abollada
        F(1, 0, 15, 2, '#b8bcc4'); F(3, 0, 11, 1, '#e0e4ea');
        F(0, 2, 17, 16, '#c8102e'); F(0, 2, 2, 16, '#8a0a1e'); F(14, 2, 3, 16, '#e83a50');
        F(1, 18, 15, 2, '#9aa0a8');
        textOn(g, 'COCA', 1, 3, '#ffffff');
        F(0, 9, 17, 1, '#ffffff'); F(4, 10, 9, 1, '#ffffff');
        textOn(g, 'COLA', 1, 12, '#ffffff');
        F(6, 6, 2, 3, '#7a0614'); // abolladura
        break;
      case 'hershey': // envoltura de chocolate con extremos plateados
        for (let y = 0; y < 11; y++) { F(0, y, 4 - (y & 1), 1, '#c8ccd2'); F(37 + (y & 1), y, 4 - (y & 1), 1, '#c8ccd2'); }
        F(3, 1, 35, 9, '#4a2616'); F(3, 1, 35, 1, '#6a3a22'); F(3, 9, 35, 1, '#2a140a');
        ctr("HERSHEY'S", 3, '#e8e0d0', 3, 38);
        break;
      case 'bacardi': // botella de ron acostada (cuello a la izquierda)
        F(0, 4, 3, 3, '#c01818');
        F(3, 4, 7, 3, '#8aa098'); F(10, 2, 3, 7, '#8aa098');
        F(13, 0, 27, 11, '#8aa098'); F(13, 0, 27, 1, '#c8e0d8'); F(13, 10, 27, 1, '#4a5a54');
        F(14, 1, 25, 9, '#ece4cc');
        textOn(g, 'BACARDI', 13, 2, '#b01818');
        F(24, 8, 4, 1, '#1a1a1a'); F(23, 7, 1, 1, '#1a1a1a'); F(28, 7, 1, 1, '#1a1a1a'); // murciélago
        break;
      case 'cuervo': // botella de tequila acostada
        F(0, 5, 4, 4, '#1a1a1a');
        F(4, 5, 6, 4, '#c08a20'); F(10, 3, 3, 8, '#c08a20');
        F(13, 0, 25, 14, '#c08a20'); F(13, 0, 25, 1, '#f0c050'); F(13, 13, 25, 1, '#6a4a10');
        F(13, 1, 25, 12, '#efe4c4'); F(13, 1, 25, 1, '#2a2a2a'); F(13, 12, 25, 1, '#2a2a2a');
        ctr('JOSE', 2, '#2a2a2a', 13, 38);
        ctr('CUERVO', 7, '#8a1010', 13, 38);
        break;
      case 'dron': // dron con cuatro hélices y cámara
        F(9, 3, 10, 4, '#3a3a44'); F(9, 3, 10, 1, '#6a6a7a'); F(11, 7, 6, 2, '#2a2a30');
        F(13, 9, 2, 2, '#101014'); // cámara
        F(2, 3, 7, 1, '#5a5a66'); F(19, 3, 7, 1, '#5a5a66');
        F(3, 1, 1, 2, '#5a5a66'); F(24, 1, 1, 2, '#5a5a66');
        F(0, 0, 8, 1, '#a0a4b0'); F(20, 0, 8, 1, '#a0a4b0');
        F(1, 7, 1, 2, '#3a3a44'); F(26, 7, 1, 2, '#3a3a44'); F(1, 9, 3, 1, '#3a3a44'); F(24, 9, 3, 1, '#3a3a44');
        break;
      case 'camara': // cámara de vigilancia con soporte
        F(0, 0, 3, 13, '#6a6e76'); F(3, 5, 4, 2, '#6a6e76');
        F(6, 2, 13, 8, '#d8dce2'); F(6, 2, 13, 1, '#f4f6f8'); F(6, 9, 13, 1, '#8a8e96');
        F(5, 1, 15, 1, '#a0a4ac');
        F(18, 3, 4, 6, '#2a2a30'); F(19, 4, 2, 4, '#4a6aa0'); F(20, 5, 1, 1, '#c0e0ff');
        F(8, 4, 1, 1, '#ff2020');
        break;
      case 'tarjeta': // tarjeta de programa social
        F(0, 0, 39, 17, '#d23a8a'); F(0, 0, 39, 1, '#f070b0'); F(0, 16, 39, 1, '#7a1a4a');
        F(1, 1, 37, 15, '#c8307e');
        ctr('AL ESTILO', 2, '#fff0f8');
        F(2, 9, 6, 5, '#d8b040'); F(3, 10, 4, 1, '#8a6a10'); F(4, 12, 2, 1, '#8a6a10'); // chip
        textOn(g, 'JALISCO', 10, 9, '#ffe060');
        break;
    }
    return { kind, c, w: S[0], h: S[1] };
  }
  const TRASH_KINDS = ['lona', 'coca', 'hershey', 'bacardi', 'cuervo', 'dron', 'camara', 'tarjeta'];

  Game.minijuegos.pesca = function (host) {
    const G = (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.pesca) || {};
    const T = Object.assign({}, DEFAULTS, G);
    T.basura = Object.assign({}, DEFAULTS.basura, G.basura || {});

    // --- sprites ---
    const SPR = {
      A1: makeSprite(FISH_A, PAL_A1, 4, GLOW), A2: makeSprite(FISH_A, PAL_A2, 4, GLOW),
      B1: makeSprite(FISH_B, PAL_B1, 4, GLOW), B2: makeSprite(FISH_B, PAL_B2, 4, GLOW),
      D: makeSprite(FISH_D, PAL_D, 3, GLOW),
      G: makeSprite(FISH_G, PAL_G, 3, null),
    };
    const RAD_SPR = [SPR.A1, SPR.A2, SPR.B1, SPR.B2];
    const TRASH = {};
    for (const k of TRASH_KINDS) TRASH[k] = makeTrash(k);

    // --- DOM ---
    const root = el('div', 'mj-pesca-root');
    const stage = el('div', 'mj-pesca-stage');
    const canvas = el('canvas', 'mj-pesca-canvas');
    canvas.width = W; canvas.height = H;
    const flash = el('div', 'mj-pesca-flash');
    const hud = el('div', 'mj-pesca-hud');
    hud.hidden = true;
    const boxScore = el('div', 'mj-pesca-box');
    boxScore.appendChild(el('span', 'mj-pesca-lbl', T.hudScore));
    const scoreEl = el('span', 'mj-pesca-score', '000000');
    boxScore.appendChild(scoreEl);
    const boxSanos = el('div', 'mj-pesca-box');
    boxSanos.appendChild(el('span', 'mj-pesca-lbl', T.hudSanos));
    const fishIcons = [];
    const goldURL = SPR.G.R.toDataURL();
    for (let i = 0; i < GOLD_TOTAL; i++) {
      const s = el('span', 'mj-pesca-fish');
      s.style.backgroundImage = `url(${goldURL})`;
      boxSanos.appendChild(s); fishIcons.push(s);
    }
    const boxFallas = el('div', 'mj-pesca-box');
    boxFallas.appendChild(el('span', 'mj-pesca-lbl', T.hudFallas));
    const xIcons = [];
    for (let i = 0; i < MAX_FALLAS; i++) { const s = el('span', 'mj-pesca-x', '✕'); boxFallas.appendChild(s); xIcons.push(s); }
    hud.appendChild(boxScore); hud.appendChild(boxSanos); hud.appendChild(boxFallas);
    const msgEl = el('div', 'mj-pesca-msg');
    const ov = el('div', 'mj-pesca-ov');
    ov.setAttribute('data-cursor', 'hand');
    ov.appendChild(el('div', 'mj-pesca-title', T.titulo));
    const ins = el('div', 'mj-pesca-ins');
    ins.innerHTML = T.instrucciones;
    ov.appendChild(ins);
    ov.appendChild(el('div', 'mj-pesca-go', T.empezar));
    stage.appendChild(canvas); stage.appendChild(flash); stage.appendChild(hud); stage.appendChild(msgEl); stage.appendChild(ov);
    root.appendChild(stage);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // --- encaje en el host (letterbox, escala entera si casi cabe) ---
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
    window.addEventListener('resize', fit);
    fit();

    // --- audio propio (pitidos) ---
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

    // --- dibujo básico ---
    function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }
    function discOn(g, cx, cy, r, c) {
      g.fillStyle = c;
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt((r + 0.5) * (r + 0.5) - dy * dy));
        g.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
      }
    }
    function lineOn(g, x0, y0, x1, y1, c) {
      g.fillStyle = c;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
    }

    // --- fondo estático (se calcula una sola vez) ---
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function buildBG() {
      const g = bg.getContext('2d');
      const img = g.createImageData(W, H), d = img.data;
      const SKY = ['#1e1826', '#2a2030', '#362a38', '#43333e', '#504040', '#5e4c44', '#6c5a4a'].map(hex);
      const FAR = ['#2f4a26', '#3e5a2a', '#5a7a2a', '#8a8a2a', '#5a4a6a', '#463a52'].map(hex);
      const DEEP = ['#8a9a30', '#5f8a30', '#40703a', '#2f5a3a', '#3a3e5e', '#4a2e52', '#2e2232', '#1a1420'].map(hex);
      const MUD = hex('#241c14'), MUD2 = hex('#342818');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const b = BAYER[(y & 3) * 4 + (x & 3)];
        let c;
        if (y < HORIZON) {
          const t = y / HORIZON + (fbm(x / 50, y / 10, 3) - 0.5) * 0.35;
          c = SKY[clamp(Math.floor(t * SKY.length + (b - 0.5)), 0, SKY.length - 1)];
          const ds = Math.hypot(x - 262, y - 22); // sol enfermo tras el smog
          if (ds < 8) c = hex(ds < 6 ? '#c8c070' : '#a89a58');
          else if (ds < 13 && b < 0.5) c = hex('#7a6a50');
        } else if (y < SURFACE) {
          const n = fbm(x / 55, y / 2.6, 11), n2 = fbm(x / 28 + 9, y / 2.2, 21);
          const t = clamp(n * 1.7 - 0.35, 0, 0.999);
          c = FAR[clamp(Math.floor(t * FAR.length + (b - 0.5) * 0.9), 0, FAR.length - 1)];
          if (n2 > 0.63) c = hsl(((n2 - 0.63) * 2600 + x * 1.7) % 360, 0.5, 0.42 + (b - 0.5) * 0.08);
          const k = 0.78 + 0.22 * (y - HORIZON) / (SURFACE - HORIZON);
          c = [c[0] * k, c[1] * k, c[2] * k];
        } else {
          const depth = (y - SURFACE) / (H - SURFACE);
          const n = fbm(x / 45, y / 15, 31), n3 = fbm(x / 22 + 40, y / 11, 41), n2 = fbm(x / 26, y / 6, 51);
          const v = clamp(n * 0.85 + depth * 0.62 - 0.2, 0, 0.999);
          c = DEEP[clamp(Math.floor(v * DEEP.length + (b - 0.5) * 0.9), 0, DEEP.length - 1)];
          if (n3 > 0.7 && b < (n3 - 0.6) * 3) c = hex('#a8a030');          // manchas amarillas tóxicas
          else if (n3 < 0.26 && b < (0.36 - n3) * 3) c = hex('#5a3a6a');   // manchas moradas
          if (y < SURFACE + 9 && n2 > 0.66) c = hsl(((n2 - 0.66) * 3000 + x * 2) % 360, 0.45, 0.36);
          const bottom = BOTTOM + 1 + Math.round(fbm(x / 18, 5, 61) * 7);
          if (y >= bottom) c = (hash(x, y, 9) < 0.25) ? MUD2 : MUD;
          // oscurece un poco el agua para que destaquen peces y basura
          c = [c[0] * 0.78, c[1] * 0.78, c[2] * 0.78];
        }
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const F = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

      for (let x = 0; x < W; x++) { // cerros al fondo
        const top = 47 + Math.round(fbm(x / 34, 1, 5) * 12);
        F(x, top, 1, HORIZON - top, '#2e2a2e');
        const top2 = 55 + Math.round(fbm(x / 20, 2, 6) * 7);
        F(x, top2, 1, HORIZON - top2, '#262228');
      }
      // orilla izquierda
      F(0, 58, 132, 6, '#2e2a20');
      for (let x = 0; x < 136; x++) { const e = 62 + Math.round(vnoise(x / 6, 3, 8) * 3); F(x, e, 1, 3, '#3a3426'); }
      for (let x = 2; x < 130; x += 3) if (hash(x, 1, 2) < 0.6) F(x, 57 - (hash(x, 2, 2) * 2 | 0), 1, 2, '#5a5434');

      // centro de datos
      F(14, 28, 92, 34, '#80858c');
      F(14, 28, 92, 2, '#5c6066');
      for (let y = 32; y < 60; y += 4) F(14, y, 92, 1, '#70757c');
      for (let x = 20; x < 100; x += 10) { F(x, 34, 6, 3, '#3a3e44'); F(x, 34, 6, 1, '#2a2d32'); }
      for (let x = 18; x < 102; x += 7) for (let y = 41; y < 52; y += 3) F(x, y, 4, 1, '#5a5f66');
      F(54, 50, 10, 12, '#4a4e54'); F(55, 51, 8, 11, '#3a3d42');
      F(106, 34, 6, 28, '#6a6f76'); F(111, 34, 1, 28, '#55595f');
      F(100, 14, 5, 14, '#6a6f76'); F(100, 14, 5, 1, '#4a4e54'); F(104, 14, 1, 14, '#55595f');
      F(16, 24, 8, 4, '#9aa0a8'); F(17, 25, 6, 1, '#6a6f76');
      // letrero "SHIT GPT"
      F(28, 25, 2, 4, '#4a4e54'); F(92, 25, 2, 4, '#4a4e54');
      F(25, 9, 72, 16, '#2a2a2e');
      F(26, 10, 70, 14, '#ece6d6');
      textOn(g, 'SHIT GPT', 30, 12, '#b4161c', 2);
      // tubo de desagüe hacia el lago
      F(106, 57, 18, 3, '#5a5040'); F(106, 57, 18, 1, '#7a6e58'); F(122, 56, 3, 5, '#4a4030');
      // cerca de malla ciclónica
      F(4, 45, 124, 1, '#8a8e94');
      for (let x = 4; x < 128; x += 2) F(x, 43 + (x & 2 ? 1 : 0), 1, 1, '#6a6e74');
      for (let y = 46; y < 63; y++) for (let x = 4; x < 128; x++)
        if (((x + y) & 3) === 0 || ((x - y + 400) & 3) === 0) { g.fillStyle = 'rgba(178,182,188,0.75)'; g.fillRect(x, y, 1, 1); }
      for (let x = 4; x < 130; x += 20) F(x, 43, 2, 21, '#5c6066');

      // basura lejana flotando
      F(60, 79, 6, 8, '#b8a020'); F(60, 79, 6, 1, '#7a6a10'); F(60, 83, 6, 1, '#7a6a10'); F(62, 81, 2, 2, '#202020');
      F(250, 84, 6, 2, '#6a9aa0'); F(256, 84, 2, 1, '#4a7a80');
      F(205, 74, 8, 2, '#202020'); F(206, 73, 6, 1, '#2a2a2a');
      // basura en el fondo
      const by = BOTTOM - 6;
      discOn(g, 40, by + 4, 4, '#1a1a1a'); discOn(g, 40, by + 4, 2, '#2e2a20');
      F(150, by + 2, 5, 3, '#8a2a2a'); F(151, by + 1, 3, 1, '#aa3a3a');
      F(270, by, 3, 6, '#6a9aa0');
      for (const x of [90, 205, 300]) for (let k = 0; k < 6; k++) F(x + (k & 1), by - k * 2, 1, 2, '#3a5a20');
    })();

    // --- estado ---
    let state = 'intro';          // intro | play | won
    let playT = 0, t = 0;
    const hook = { x: 232, y: 110 };
    const mouse = { x: 232, y: 110 };
    let carried = null;           // pez dorado enganchado
    let reel = null;              // { f, t, sx, sy } el pez sube a la lancha
    let invuln = 0;
    let fallas = 0, sanos = 0, pts = 0;
    let goldT = rand(5, 7);       // segundos hasta el siguiente pez sano
    let gold = null;              // pez sano en el agua (uno a la vez)
    let trashT = 2.2;
    let lastKind = null;
    const fish = [], trash = [], parts = [];
    const timers = [];
    let alive = true, raf = 0, last = 0, finished = false;
    let resolveDone;
    const done = new Promise((res) => { resolveDone = res; });
    const finish = (v) => { if (finished) return; finished = true; resolveDone(v); };
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };

    function boatBob() { return Math.round(Math.sin(t * 1.6) * 1.1); }
    function rodTip() { return { x: 230, y: 34 + boatBob() }; }
    const HAND = { x: 189, y: 74 };  // la cubeta de la lancha

    function splash(x, y, n, up, col) {
      for (let i = 0; i < n; i++) parts.push({
        x, y, vx: rand(-30, 30), vy: up ? rand(-60, -25) : rand(-20, -5), g: up ? 140 : -30,
        life: rand(0.35, 0.7), c: col || (up ? (Math.random() < 0.5 ? '#c8e090' : '#e8f0c0') : '#b8d890'),
      });
    }
    function slime(x, y, n) {
      for (let i = 0; i < n; i++) parts.push({
        x: x + rand(-4, 4), y: y + rand(-3, 3), vx: rand(-40, 40), vy: rand(-40, 10), g: 40,
        life: rand(0.5, 1), c: Math.random() < 0.6 ? '#7dff4a' : '#c8ff5a', slime: true,
      });
    }

    // --- HUD ---
    function addPts(n) {
      pts += n;
      try { if (Game.score) Game.score.add(n); } catch (e) { /* nada */ }
      scoreEl.textContent = String(pts).padStart(6, '0');
    }
    function updHud() {
      fishIcons.forEach((s, i) => s.classList.toggle('on', i < sanos));
      xIcons.forEach((s, i) => s.classList.toggle('on', i < fallas));
    }
    function showMsg(text, ok) {
      msgEl.textContent = text;
      msgEl.classList.toggle('ok', !!ok);
      msgEl.classList.add('on');
      if (showMsg.id) clearTimeout(showMsg.id);
      showMsg.id = later(() => msgEl.classList.remove('on'), 2800);
    }

    // --- peces ---
    const LANES = [];
    for (let y = SURFACE + 14; y <= BOTTOM - 6; y += 11) LANES.push(y);
    function spawnFish(kind, side) {
      const spr = kind === 'gold' ? SPR.G : kind === 'decoy' ? SPR.D : RAD_SPR[Math.floor(Math.random() * RAD_SPR.length)];
      const left = side != null ? side : Math.random() < 0.5;
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      const spd = kind === 'gold' ? rand(30, 40) : kind === 'decoy' ? rand(24, 34) : rand(12, 28);
      const f = {
        spr, kind, st: 'swim',
        cx: left ? -spr.w : W + spr.w, cy: lane, baseY: lane, ty: lane,
        vx: left ? spd : -spd, dir: left ? 1 : -1,
        amp: rand(1, 3), phase: Math.random() * 6.28, dripT: rand(0.3, 1.2), turned: false,
      };
      fish.push(f);
      return f;
    }
    // la pecera arranca con algunos peces ya nadando
    for (let i = 0; i < 6; i++) { const f = spawnFish('rad'); f.cx = rand(20, W - 20); }
    function fishBox(f) {
      const x0 = Math.round(f.cx - f.spr.w / 2), y0 = Math.round(f.cy - f.spr.h / 2);
      return { x0, y0, x1: x0 + f.spr.w, y1: y0 + f.spr.h };
    }
    function mouth(f) {
      const b = fishBox(f);
      return { x: f.dir < 0 ? b.x0 : b.x1 - 1, y: b.y0 + f.spr.mouthY };
    }
    function placeMouth(f, mx, my) {
      f.cx = f.dir < 0 ? mx + f.spr.w / 2 : mx - f.spr.w / 2 + 1;
      f.cy = my - f.spr.mouthY + f.spr.h / 2;
    }

    // --- basura ---
    function spawnTrash() {
      let kind;
      do { kind = TRASH_KINDS[Math.floor(Math.random() * TRASH_KINDS.length)]; } while (kind === lastKind);
      lastKind = kind;
      const s = TRASH[kind];
      const floater = (kind === 'lona' || (kind === 'hershey' && Math.random() < 0.5)) && !trash.some((o) => o.float);
      if (kind === 'lona' && !floater) return spawnTrash(); // solo una lona flotando a la vez
      let o;
      if (floater) { // flota en la superficie y estorba al sacar el pez
        const left = Math.random() < 0.5;
        o = { s, x: left ? -s.w : W, y: SURFACE - 4, vx: (left ? 1 : -1) * rand(10, 16), vy: 0, float: true, phase: Math.random() * 6 };
      } else {
        let x = rand(8, W - 8 - s.w);
        if (Math.abs(x + s.w / 2 - hook.x) < 22) x = clamp(x + (x + s.w / 2 < hook.x ? -40 : 40), 8, W - 8 - s.w);
        o = { s, x, y: SURFACE - s.h + 2, vx: 0, vy: rand(9, 15) + Math.min(6, playT / 20), float: false, phase: Math.random() * 6, entered: false };
        splash(x + s.w / 2, SURFACE, 8, true);
      }
      o.sway = rand(4, 9);
      trash.push(o);
    }
    function trashBox(o) {
      const x = Math.round(o.x + (o.float ? 0 : Math.sin(t * 1.3 + o.phase) * o.sway * 0.3)), y = Math.round(o.y);
      return { x0: x, y0: y, x1: x + o.s.w, y1: y + o.s.h, x, y };
    }

    // --- entrada ---
    function toGame(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    function onMove(e) {
      const p = toGame(e);
      if (!p) return;
      mouse.x = clamp(p.x, HX0, HX1);
      mouse.y = clamp(p.y, HY0, HY1);
    }
    function onStart(e) {
      if (state !== 'intro') return;
      e.stopPropagation();
      ov.hidden = true;
      ov.innerHTML = '';
      hud.hidden = false;
      state = 'play';
      playT = 0;
      onMove(e);
      beep(440, 660, 0.12, 'square', 0.04);
    }
    root.addEventListener('mousemove', onMove);
    ov.addEventListener('click', onStart);

    // --- fallas ---
    function falla(text, x, y) {
      fallas++;
      invuln = INVULN;
      updHud();
      showMsg(carried ? text + ' ' + T.escapa : text);
      flash.classList.add('on');
      later(() => flash.classList.remove('on'), 90);
      snd('oof');
      beep(220, 70, 0.35, 'sawtooth', 0.04);
      slime(x, y, 14);
      if (carried) { // el pez sano se suelta y huye
        const f = carried;
        carried = null;
        f.st = 'flee';
        f.vx = (f.cx < W / 2 ? -1 : 1) * 95;
        f.dir = Math.sign(f.vx);
      }
      try { if (Game.atencion) Game.atencion.danar(DANO); } catch (e) { /* nada */ }
      if (fallas > MAX_FALLAS) {
        // a la cuarta se pierde; normalmente la atención ya llegó a 0 y el host se encarga
        state = 'lost';
        later(() => {
          const v = Game.atencion ? Game.atencion.value : 0;
          if (v > 0) finish(false);
        }, 400);
      }
    }

    function banked(f) {
      sanos++;
      updHud();
      addPts(PTS_SANO);
      showMsg(T.sano, true);
      [659, 880, 1175].forEach((fq, i) => beep(fq, fq, 0.1, 'square', 0.045, i * 0.08));
      for (let i = 0; i < 12; i++) parts.push({ x: HAND.x + rand(-3, 3), y: HAND.y, vx: rand(-40, 40), vy: rand(-70, -30), g: 120, life: rand(0.5, 0.9), c: i & 1 ? '#fff4a8' : '#ffd45a' });
      if (sanos >= GOLD_TOTAL) {
        state = 'won';
        f.st = 'caught';
        gold = f;
        carried = null;
        const bonus = Math.max(0, Math.round((150 - playT) * 5)) + (MAX_FALLAS - fallas) * 250;
        addPts(bonus);
        msgEl.classList.remove('on');
        ov.innerHTML = '';
        ov.appendChild(el('div', 'mj-pesca-win', T.gana));
        ov.appendChild(el('div', 'mj-pesca-winsub', T.ganaSub));
        ov.style.background = 'rgba(8,4,12,.4)';
        ov.removeAttribute('data-cursor');
        ov.hidden = false;
        [523, 659, 784, 1047].forEach((fq, i) => beep(fq, fq, 0.14, 'square', 0.045, i * 0.11));
        snd('message', true);
        later(() => finish(true), 2200);
      } else {
        const i = fish.indexOf(f);
        if (i >= 0) fish.splice(i, 1);
        gold = null;
        goldT = rand(4, 7);
      }
    }

    // --- lógica ---
    function update(dt) {
      t += dt;
      if (state === 'intro') { // los peces nadan detrás de la portada
        for (const f of fish) { f.cx += f.vx * dt; if (f.cx < -40) f.cx = W + 30; if (f.cx > W + 40) f.cx = -30; f.cy = f.baseY + Math.sin(t * 1.3 + f.phase) * f.amp; }
        return;
      }
      playT += dt;
      const playing = state === 'play';
      if (invuln > 0) invuln -= dt;

      // anzuelo: sigue al ratón con velocidad limitada
      if (!reel && state !== 'won') {
        const sp = (carried ? HOOK_SPEED_FULL : HOOK_SPEED) * dt;
        const dx = mouse.x - hook.x, dy = mouse.y - hook.y, d = Math.hypot(dx, dy);
        if (d <= sp) { hook.x = mouse.x; hook.y = mouse.y; } else { hook.x += dx / d * sp; hook.y += dy / d * sp; }
      }

      // aparecen peces
      const radCount = fish.filter((f) => f.kind !== 'gold' && f.st === 'swim').length;
      const want = 7 + Math.min(3, Math.floor(playT / 30));
      if (radCount < want && Math.random() < dt * 2) spawnFish(Math.random() < 0.18 ? 'decoy' : 'rad');
      if (!gold && sanos < GOLD_TOTAL && playing) {
        goldT -= dt;
        if (goldT <= 0) gold = spawnFish('gold');
      }

      // aparece basura
      trashT -= dt;
      if (trashT <= 0 && playing) {
        if (trash.length < 5) spawnTrash();
        const k = Math.min(1, playT / 90);
        trashT = rand(2.2 - k * 0.9, 3.4 - k * 1.3);
      }

      // peces
      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i];
        if (f.st === 'swim' || f.st === 'flee') {
          if (f.kind === 'gold' && f.st === 'swim') { // el sano cambia de carril y a veces se da la vuelta
            if (Math.abs(f.baseY - f.ty) < 0.5 && Math.random() < dt * 0.5) f.ty = LANES[Math.floor(Math.random() * LANES.length)];
            f.baseY += clamp(f.ty - f.baseY, -14 * dt, 14 * dt);
            if (!f.turned && f.cx > 60 && f.cx < W - 60 && Math.random() < dt * 0.12) { f.turned = true; f.vx = -f.vx; f.dir = -f.dir; }
          }
          f.cx += f.vx * dt;
          f.cy = f.baseY + Math.sin(t * 1.3 + f.phase) * f.amp;
          if (f.kind !== 'gold') {
            f.dripT -= dt;
            if (f.dripT <= 0) { f.dripT = rand(0.4, 1.2); const b = fishBox(f); parts.push({ x: rand(b.x0 + 2, b.x1 - 2), y: b.y1, vx: 0, vy: 6, g: 10, life: rand(0.8, 1.4), c: '#7dff4a', slime: true }); }
          }
          if (f.cx < -40 || f.cx > W + 40) {
            fish.splice(i, 1);
            if (f === gold) { gold = null; goldT = rand(2.5, 4); }
            continue;
          }
          // contacto con el anzuelo
          if (playing && f.st === 'swim' && !reel && (f.kind === 'gold' ? !carried : invuln <= 0)) {
            const b = fishBox(f);
            if (hook.x >= b.x0 - 1 && hook.x <= b.x1 && hook.y >= b.y0 && hook.y <= b.y1) {
              if (f.kind === 'gold') { // el sano se engancha (aunque el anzuelo esté parpadeando)
                carried = f; f.st = 'hooked'; f.wig = 0;
                beep(880, 660, 0.06, 'square', 0.04); beep(880, 660, 0.06, 'square', 0.04, 0.09);
              } else {
                f.st = 'flee'; f.vx = (f.vx > 0 ? 1 : -1) * 90;
                falla(pick(T.malo), hook.x, hook.y);
              }
            }
          }
        }
      }

      // pez enganchado: cuelga del anzuelo; al llegar a la superficie se saca
      if (carried) {
        const f = carried;
        f.wig += dt;
        if (f.wig > 0.22) { f.wig = 0; f.dir = -f.dir; }
        placeMouth(f, hook.x, hook.y + 1);
        if (hook.y <= BANK_Y && playing) {
          carried = null;
          f.st = 'reel';
          reel = { f, t: 0, sx: f.cx, sy: f.cy };
          splash(f.cx, SURFACE, 10, true);
          beep(300, 900, 0.18, 'square', 0.05);
        }
      }
      if (reel) {
        reel.t += dt / 0.6;
        const f = reel.f, k = Math.min(1, reel.t);
        f.cx = reel.sx + (HAND.x - reel.sx) * k;
        f.cy = reel.sy + (HAND.y - reel.sy) * k - Math.sin(Math.PI * k) * 30;
        if (reel.t >= 1) { reel = null; banked(f); }
      }

      // basura
      for (let i = trash.length - 1; i >= 0; i--) {
        const o = trash[i];
        if (o.float) { o.x += o.vx * dt; o.y = SURFACE - o.s.h * 0.55 + Math.sin(t * 2.4 + o.phase); }
        else o.y += o.vy * dt;
        const b = trashBox(o);
        if (o.float ? (b.x1 < -2 || b.x0 > W + 2) : b.y0 > BOTTOM + 4) {
          trash.splice(i, 1);
          if (playing) addPts(PTS_ESQUIVA);
          continue;
        }
        if (!playing || reel || invuln > 0) continue;
        let hit = hook.x >= b.x0 - 1 && hook.x <= b.x1 && hook.y >= b.y0 - 1 && hook.y <= b.y1 + 2;
        if (!hit && carried) {
          const fb = fishBox(carried);
          hit = fb.x0 < b.x1 && fb.x1 > b.x0 && fb.y0 < b.y1 && fb.y1 > b.y0;
        }
        if (hit) {
          trash.splice(i, 1);
          splash(b.x0 + o.s.w / 2, b.y0 + o.s.h / 2, 10, false, '#e8e0c8');
          falla(T.basura[o.s.kind] || pick(T.malo), hook.x, hook.y);
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.g < 0 && p.y < SURFACE + 1) p.life = 0; // las burbujas revientan en la superficie
      }
      if (Math.random() < dt * 1.5) parts.push({ x: rand(10, W - 10), y: BOTTOM - 2, vx: 0, vy: -rand(10, 20), g: -6, life: 5, c: '#9ac060' });
    }

    // --- dibujo ---
    function drawFish(f) {
      const s = f.spr;
      let x0 = Math.round(f.cx - s.w / 2), y0 = Math.round(f.cy - s.h / 2);
      if (f.st === 'hooked') { x0 += Math.round(rand(-0.6, 0.6)); }
      const img = f.dir < 0 ? s.L : s.R;
      if (s.gL) {
        ctx.globalAlpha = 0.3 + 0.22 * Math.sin(t * 4 + f.phase);
        ctx.drawImage(f.dir < 0 ? s.gL : s.gR, x0 - 2, y0 - 2);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(img, x0, y0);
      if (f.kind === 'gold') { // destellos: el sano brilla limpio, sin baba
        const k = Math.floor(t * 4 + f.phase) % 4;
        if (k === 0) { R(x0 + 4, y0 - 2, 1, 1, '#fffbe0'); R(x0 + 3, y0 - 1, 3, 1, 'rgba(255,250,210,.7)'); }
        if (k === 2) { R(x0 + s.w - 3, y0 + s.h, 1, 1, '#fff4a8'); }
      }
    }

    function drawTrash(o) {
      const b = trashBox(o);
      const y = b.y;
      ctx.drawImage(o.s.c, b.x, y);
      if (o.s.kind === 'dron') {
        const spin = Math.floor(t * 20) & 1;
        R(b.x + (spin ? 0 : 2), y, 6, 1, '#d8dce6'); R(b.x + 20 + (spin ? 2 : 0), y, 6, 1, '#d8dce6');
        if (Math.floor(t * 3) & 1) R(b.x + 18, y + 4, 1, 1, '#ff2020');
      }
      if (o.s.kind === 'camara' && (Math.floor(t * 2) & 1)) R(b.x + 8, y + 4, 1, 1, '#ff8080');
    }

    function drawBoat() {
      const by = boatBob();
      // pescador
      R(161, 55 + by, 11, 6, '#2a2232'); R(161, 59 + by, 11, 1, '#7a2a6a');
      R(163, 54 + by, 7, 1, '#342a3c');
      R(155, 61 + by, 23, 1, '#3a3044'); R(156, 62 + by, 21, 1, '#1e1824');
      R(163, 63 + by, 8, 5, '#d0985e'); R(169, 64 + by, 1, 1, '#2a1a10'); R(171, 65 + by, 1, 1, '#c08850');
      R(163, 63 + by, 8, 1, '#8a5a30');
      R(160, 68 + by, 13, 15, '#3a2a4a'); R(160, 68 + by, 2, 15, '#24182e');
      R(164, 69 + by, 1, 1, '#c8ff5a'); R(164, 72 + by, 1, 1, '#c8ff5a');
      R(171, 70 + by, 6, 3, '#3a2a4a'); R(176, 72 + by, 5, 3, '#2e2240');
      R(180, 71 + by, 3, 4, '#d0985e');
      // caña
      lineOn(ctx, 178, 77 + by, 230, 34 + by, '#3a2614');
      lineOn(ctx, 181, 75 + by, 196, 63 + by, '#5a3e22');
      R(181, 74 + by, 3, 3, '#8a8e94'); R(182, 75 + by, 1, 1, '#4a4e54');
      // cubeta con los peces sanos
      R(186, 76 + by, 7, 7, '#7a8088'); R(186, 76 + by, 7, 1, '#a0a6ae');
      for (let i = 0; i < sanos; i++) R(187 + i * 2, 75 + by, 1, 1, '#ffd45a');
      // casco
      for (let r = 0; r <= 10; r++) {
        const y = 82 + r + by, l = 143 + Math.round(r * 0.9), rr = 199 - Math.round(r * 0.9);
        let c = r === 0 ? '#a06e3c' : (r === 3 || r === 7) ? '#5a3418' : '#7a4a24';
        if (y > SURFACE) c = r === 7 ? '#3a3018' : '#4e4426';
        R(l, y, rr - l, 1, c);
      }
      R(143, 81 + by, 3, 2, '#a06e3c'); R(196, 81 + by, 3, 2, '#a06e3c');
      for (let x = 140; x < 203; x++) if (((x + Math.floor(t * 6)) & 3) === 0) R(x, SURFACE, 1, 1, '#d8f0b0');
    }

    function drawLine(tx, ty, hx, hy) {
      const mx = (tx + hx) / 2, my = (ty + hy) / 2 + 10;
      const n = Math.ceil(Math.hypot(hx - tx, hy - ty)) + 2;
      let entered = false;
      for (let i = 0; i <= n; i++) {
        const k = i / n, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
        const x = a * tx + b * mx + c * hx, y = a * ty + b * my + c * hy;
        if (!entered && y >= SURFACE) {
          entered = true;
          const r = Math.floor(t * 5) % 3;
          R(Math.round(x) - 2 - r, SURFACE, 1, 1, '#e8f0c0'); R(Math.round(x) + 2 + r, SURFACE, 1, 1, '#e8f0c0');
        }
        ctx.fillStyle = y > SURFACE ? 'rgba(220,220,200,.6)' : '#dcdcc8';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }

    function drawHook(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (invuln > 0 && (Math.floor(t * 12) & 1)) return; // parpadea tras una falla
      R(x, y - 3, 1, 4, '#e0e4ea'); R(x + 1, y, 1, 1, '#e0e4ea'); R(x + 2, y - 1, 1, 1, '#e0e4ea');
      R(x - 1, y - 5, 3, 2, '#c02a6a'); // carnada
      if (!carried) R(x - 1, y + 1, 1, 1, '#ff5ad0');
    }

    function render() {
      ctx.drawImage(bg, 0, 0);
      if (Math.floor(t * 1.2) % 2 === 0) { R(15, 23, 1, 1, '#ff3030'); R(103, 12, 1, 1, '#ff3030'); }
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.22 + i / 6) % 1;
        ctx.globalAlpha = 0.45 * (1 - ph);
        discOn(ctx, 102 + ph * 34, 12 - ph * 12, Math.round(1 + ph * 4), '#6a6070');
      }
      ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) {
        const yy = 60 + ((Math.floor(t * 12) + k * 2) % 6);
        R(124, yy, 1, 1, '#7dff4a');
      }
      for (let i = 0; i < 7; i++) {
        const y = HORIZON + 3 + (i * 7) % 22, x = ((i * 53 + t * (6 + i)) % (W + 20)) - 10;
        R(x, y, 4 + (i & 1) * 3, 1, 'rgba(200,255,120,.25)');
      }
      for (let x = 0; x < W; x++) {
        const y = SURFACE + Math.round(Math.sin(x * 0.21 + t * 2.2) * 0.6);
        R(x, y, 1, 1, (x + Math.floor(t * 4)) % 5 === 0 ? '#d8f0b0' : 'rgba(190,220,140,.55)');
      }

      for (const f of fish) if (f.st === 'swim' || f.st === 'flee') drawFish(f);
      for (const o of trash) if (!o.float) drawTrash(o);
      drawBoat();
      for (const o of trash) if (o.float) drawTrash(o);

      const tip = rodTip();
      if (reel) {
        const m = mouth(reel.f);
        drawLine(tip.x, tip.y, m.x, m.y);
      } else if (state === 'won' && gold) {
        gold.dir = -1;
        placeMouth(gold, tip.x, tip.y + 14 + Math.round(Math.sin(t * 5)));
        lineOn(ctx, tip.x, tip.y, tip.x, tip.y + 14, '#dcdcc8');
      } else {
        drawLine(tip.x, tip.y, hook.x, hook.y);
        drawHook(hook.x, hook.y);
      }
      for (const f of fish) if (f.st === 'hooked' || f.st === 'reel' || f.st === 'caught') drawFish(f);
      if (state === 'won' && gold) {
        for (let i = 0; i < 6; i++) {
          const a = t * 2 + i * 1.047, r = 10 + Math.sin(t * 3 + i) * 2;
          R(gold.cx + Math.cos(a) * r, gold.cy + Math.sin(a) * r * 0.7, 1, 1, i & 1 ? '#fff4a8' : '#ffd45a');
        }
      }
      for (const p of parts) R(p.x, p.y, 1, p.slime ? 2 : 1, p.c);
    }

    function frame(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 0;
      last = ts;
      update(dt);
      render();
    }
    updHud();
    raf = requestAnimationFrame(frame);

    return {
      done,
      destroy() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', fit);
        root.removeEventListener('mousemove', onMove);
        ov.removeEventListener('click', onStart);
        if (actx) { try { actx.close(); } catch (e) { /* nada */ } }
        root.remove();
        finish(false); // no-op si ya se resolvió
      },
    };
  };
})();
