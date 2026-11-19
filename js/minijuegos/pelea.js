// Minijuego final: SHITGPT FIGHTER. Pelea arcade de tres niveles, Tomás contra el Tralalero (LucIAno).
//  Nivel 1: Tralalero (tronco con bate) con golpe fuerte que se recarga. Poder: libro feminista (X).
//  Nivel 2: Tralalero 2.0, más rápido y con combos. Poder: tocar pasto → clones semitransparentes.
//  Nivel 3: FINAL BOSS (túnica azul, agave en la cabeza, seis manos con ojo). Solo recibe daño completo
//           durante sus GLITCH. Poder: agua radioactiva → vomitar ácido.
//  Siempre: ↑↑ doble salto (salta por encima del Tralalero), ESPACIO patada, C "pata del mameitor" (15 s).
// La vida de Tomás es la barra global de atención (Game.atencion); la vida del rival es propia.
// Contrato: Game.minijuegos.pelea(host) -> { done: Promise<boolean>, destroy() }.
(function () {
  'use strict';
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 384, H = 216, GY = 196;     // lienzo interno y línea del suelo
  const GRAV = 760, JUMP_V = 248, WALK = 100;
  const KICK_CD = 0.32, KICK_REACH = 20;
  const MAME_CD = 15, MAME_REACH = 30, MAME_DMG = 16;
  const MAX_CARGAS = 3;
  const INV_T = 0.9;

  // Al reintentar (la ventana llama otra vez a la fábrica) se sigue en el nivel alcanzado.
  let nivelGuardado = 1;

  const DEFAULTS = {
    titulo: 'SHITGPT FIGHTER',
    instrucciones: '← → mover · ↑ saltar (doble salto) · ESPACIO patada · X poder · C pata del mameitor',
    teclas: [
      ['← →', 'mover'],
      ['↑', 'saltar  ·  ↑ ↑ doble salto (por encima del Tralalero)'],
      ['ESPACIO', 'patada'],
      ['X', 'poder (recógelo del piso)'],
      ['C', 'la pata del mameitor (cada 15 s)'],
    ],
    tomas: 'TOMÁS',
    enemigos: ['TRALALERO', 'TRALALERO 2.0', 'TRALALERO DIVINO'],
    nivel: 'NIVEL',
    finalBoss: 'FINAL BOSS',
    subtitulos: ['El Tralalero todavía no tiene tanto poder.', 'Ahora pega más fuerte.', 'El Tralalero cambia de forma.'],
    fight: 'FIGHT!',
    ko: 'K.O.',
    gana: 'GANASTE',
    pierde: 'PERDISTE lol',
    empezar: '[ ESPACIO o clic para empezar ]',
    continuar: 'Continúas en el nivel',
    poderes: ['LIBRO FEMINISTA', 'TOCAR PASTO', 'AGUA RADIOACTIVA'],
    poderTips: [
      'Recoge los libros del piso y lánzalos con X: lastiman poco pero alejan al Tralalero.',
      'Recoge el pasto del piso y tócalo con X: los Tomases te ayudan a pelear.',
      'Tómate el agua radioactiva con X y vomita ácido. Pégale cuando le dé un GLITCH.',
    ],
    recoge: ['+1 LIBRO', '+1 PASTO', '+1 AGUA'],
    sinPoder: 'sin poder',
    mameitor: 'PATA DEL MAMEITOR',
    mameitorGrito: '¡LA PATA DEL MAMEITOR!',
    glitch: 'GLITCH',
    bloqueo: 'BLOCK',
  };

  // Dificultad por nivel (vida del rival, daño a Tomás, tiempos de ataque).
  const NIV = [null,
    { hp: 120, kick: 5, speed: 34, reach: 34, wind: 0.55, swing: 6, heavy: 15, heavyEvery: 8, charge: 1.1, recover: 0.95, combo: 0 },
    { hp: 170, kick: 5, speed: 50, reach: 36, wind: 0.38, swing: 8, heavy: 18, heavyEvery: 5.5, charge: 0.85, recover: 0.6, combo: 0.45 },
    { hp: 170, kick: 6 },
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sgn = (v) => (v < 0 ? -1 : 1);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- primitivas de píxel (sobre cualquier contexto) ----------
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function tl(g, x0, y0, x1, y1, c, th) {
    th = th || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor(th / 2);
    g.fillStyle = c;
    for (let n = 0; n < 500; n++) {
      g.fillRect(x0 - o, y0 - o, th, th);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function disc(g, cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    g.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6));
      g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }
  function ring(g, cx, cy, r, c) {
    g.fillStyle = c;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      const pts = [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]];
      for (const p of pts) g.fillRect(Math.round(cx) + p[0], Math.round(cy) + p[1], 1, 1);
      y++;
      if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  }
  function tri(g, ax, ay, bx, by, cx, cy, c) {
    const ys = [ay, by, cy];
    const y0 = Math.round(Math.min(...ys)), y1 = Math.round(Math.max(...ys));
    const ed = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]];
    g.fillStyle = c;
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      let lo = Infinity, hi = -Infinity;
      for (const e of ed) {
        const [x0, y0e, x1, y1e] = e;
        if ((yc >= y0e && yc <= y1e) || (yc >= y1e && yc <= y0e)) {
          const x = y1e === y0e ? x0 : x0 + (x1 - x0) * (yc - y0e) / (y1e - y0e);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
      if (lo <= hi) g.fillRect(Math.round(lo), y, Math.max(1, Math.round(hi) - Math.round(lo) + 1), 1);
    }
  }
  function drawMap(g, map, x, y, pal) {
    for (let j = 0; j < map.length; j++) {
      const row = map[j];
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]];
        if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); }
      }
    }
  }

  // ---------- iconos 16×16 (HUD y objetos del piso) ----------
  const ICONS = {
    pata: { pal: { o: '#0a070d', s: '#e8b892', H: '#ffe2c4', d: '#a8714c', v: '#8a3f9c', w: '#efeaf3', m: '#d9259a' }, map: [
      '................',
      '.oooooooo.......',
      'osHHHssssoo.....',
      'osHssssssssoo...',
      'ossssvsssssssoo.',
      'osssssvvsssssso.',
      '.oddssssssHsso..',
      '..ooddddssHsso..',
      '.......osssvso..',
      '......osHsssso..',
      '......osHssssso.',
      '......odssssso..',
      '.......oddsso...',
      '.......owwwwooo.',
      '.......owwwwwwwo',
      '.......ommmmmmmo',
    ] },
    libro: { pal: { o: '#0a070d', M: '#b81f86', m: '#6e0f4c', g: '#9dff3a', w: '#efeaf3', p: '#cfc8d8' }, map: [
      '................',
      '..ooooooooooo...',
      '..oMMMMMMMMMMo..',
      '..oMMMMgggMMMo..',
      '..oMMMgMMMgMMo..',
      '..oMMMgMMMgMMo..',
      '..oMMMMgggMMMo..',
      '..oMMMMMgMMMMo..',
      '..oMMMMgggMMMo..',
      '..oMMMMMgMMMMo..',
      '..oMMMMMMMMMMo..',
      '..omMMMMMMMMMo..',
      '..owwwwwwwwwwwo.',
      '..oppppppppppo..',
      '...oooooooooo...',
      '................',
    ] },
    pasto: { pal: { o: '#0a070d', g: '#9dff3a', G: '#4f9a12', d: '#3a2418', b: '#24160e', f: '#e3d34a' }, map: [
      '................',
      '................',
      '.........f......',
      '....g...ofo..g..',
      '....g....g...g..',
      '..g.gG..gG..gG..',
      '..gGgG.ggG..gGg.',
      '.ggGgGgGgGggGgG.',
      '.gGGgGGgGGgGGgG.',
      'gGGGGGGGGGGGGGGg',
      'GGGGGGGGGGGGGGGG',
      'dddddddddddddddd',
      'ddbddddbddddbddd',
      'dddddbddddbddddd',
      'bdddddddddddddbd',
      '................',
    ] },
    agua: { pal: { o: '#0a070d', c: '#cfe8f0', a: '#9dff3a', A: '#e6ff9e', d: '#4f9a12', w: '#ffffff', y: '#e3d34a' }, map: [
      '...cccccccccc...',
      '..c..........c..',
      '..caaaaaaaaaac..',
      '..caAaaayaawac..',
      '..caaaayyyaaac..',
      '...caaaayaaac...',
      '...caaayayaac...',
      '...cawayyyaac...',
      '...caaaaaaAac...',
      '....caaaaaac....',
      '....cadaawac....',
      '....caaaaaac....',
      '....cddddddc....',
      '.....cccccc.....',
      '................',
      '................',
    ] },
  };
  const POWER_ICON = [null, 'libro', 'pasto', 'agua'];
  const iconCache = {};
  function iconCanvas(name) {
    if (!iconCache[name]) {
      const c = mk(16, 16);
      drawMap(c.getContext('2d'), ICONS[name].map, 0, 0, ICONS[name].pal);
      iconCache[name] = c;
    }
    return iconCache[name];
  }

  // ---------- sonido (Web Audio, ligero) ----------
  let actx = null, noiseBuf = null;
  function ac() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    const a = ac(); if (!a) return;
    try {
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* sin audio */ }
  }
  function noise(dur, vol, freq, delay) {
    const a = ac(); if (!a) return;
    try {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = a.currentTime + (delay || 0);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = noiseBuf;
      f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(a.destination);
      s.start(t); s.stop(t + dur + 0.02);
    } catch (e) { /* sin audio */ }
  }
  const SFX = {
    kick() { noise(0.09, 0.12, 1500); tone(220, 0.08, 'square', 0.05, 90); },
    whiff() { noise(0.06, 0.03, 3000); },
    block() { tone(1400, 0.05, 'square', 0.03, 1800); noise(0.04, 0.04, 4000); },
    hurt() { noise(0.18, 0.14, 500); tone(110, 0.22, 'sawtooth', 0.07, 45); },
    jump() { tone(320, 0.08, 'square', 0.03, 640); },
    jump2() { tone(480, 0.09, 'square', 0.03, 960); },
    pick() { [660, 880, 1320].forEach((f, i) => tone(f, 0.07, 'square', 0.035, null, i * 0.05)); },
    empty() { tone(160, 0.12, 'square', 0.04, 120); },
    throw() { noise(0.1, 0.05, 2200); tone(500, 0.1, 'triangle', 0.04, 260); },
    grass() { noise(0.35, 0.05, 5000); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.04, null, 0.25 + i * 0.06)); },
    gulp() { [300, 260, 230].forEach((f, i) => tone(f, 0.07, 'sine', 0.06, f * 0.6, i * 0.13)); },
    vomit() { noise(1.2, 0.07, 700); tone(140, 1.1, 'sawtooth', 0.03, 90); },
    sizzle() { noise(0.05, 0.03, 6000); },
    mameUp() { tone(90, 0.25, 'sawtooth', 0.06, 260); },
    mame() { noise(0.35, 0.2, 300); tone(70, 0.45, 'square', 0.1, 30); tone(900, 0.2, 'square', 0.04, 200); },
    mameReady() { [784, 1046].forEach((f, i) => tone(f, 0.09, 'square', 0.035, null, i * 0.08)); },
    wind() { tone(140, 0.3, 'triangle', 0.04, 260); },
    charge() { tone(80, 0.9, 'sawtooth', 0.05, 320); },
    slam() { noise(0.25, 0.14, 250); tone(60, 0.3, 'square', 0.08, 35); },
    orb() { tone(900, 0.15, 'sine', 0.03, 300); },
    fight() { tone(180, 0.35, 'sawtooth', 0.06, 520); tone(880, 0.25, 'square', 0.04, 440, 0.25); },
    ko() { tone(220, 0.7, 'sawtooth', 0.07, 55); noise(0.4, 0.1, 400); },
    win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.045, null, i * 0.12)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.06, null, i * 0.22)); },
    dissolve() { noise(2.4, 0.06, 2500); tone(600, 2.4, 'sine', 0.03, 60); },
  };
  function gsound(name, arg) {
    try { if (Game.sound && Game.sound[name]) Game.sound[name](arg); } catch (e) { /* nada */ }
  }

  // ---------- fondos por nivel ("maquinaria divina", goth ácido) ----------
  const BGPAL = [null,
    { top: [6, 3, 10], bot: [40, 12, 56], glow: '#9dff3a', tower: '#120a1a', towerHi: '#241634', grid: '#3d6a1c', floor: '#0c0712', edge: '#9dff3a', led: ['#9dff3a', '#d9259a'] },
    { top: [9, 2, 10], bot: [70, 10, 58], glow: '#ff4fbf', tower: '#16060f', towerHi: '#30102a', grid: '#7a1a5e', floor: '#10050d', edge: '#d9259a', led: ['#ff4fbf', '#e3d34a'] },
    { top: [2, 1, 2], bot: [74, 8, 20], glow: '#e3d34a', tower: '#0d0405', towerHi: '#2a0a10', grid: '#7a5a12', floor: '#0a0304', edge: '#e3d34a', led: ['#ff2a4a', '#e3d34a'] },
  ];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function buildBG(lv) {
    const P = BGPAL[lv];
    const c = mk(W, H), g = c.getContext('2d');
    const rand = mulberry32(300 + lv * 17);
    // cielo en bandas con trama ordenada
    const img = g.createImageData(W, H);
    const steps = 10;
    for (let y = 0; y < H; y++) {
      const k = Math.pow(Math.min(1, y / GY), 1.4) * steps;
      const b = Math.floor(k), fr = k - b;
      for (let x = 0; x < W; x++) {
        const lvl = Math.min(steps, b + (BAYER[(y & 3) * 4 + (x & 3)] / 16 < fr ? 1 : 0)) / steps;
        const i = (y * W + x) * 4;
        img.data[i] = Math.round(lerp(P.top[0], P.bot[0], lvl));
        img.data[i + 1] = Math.round(lerp(P.top[1], P.bot[1], lvl));
        img.data[i + 2] = Math.round(lerp(P.top[2], P.bot[2], lvl));
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // estrellas / polvo
    for (let i = 0; i < 70; i++) px(g, rand() * W, rand() * 110, 1, 1, rand() < 0.7 ? 'rgba(220,210,240,0.35)' : P.glow);
    // aureola gigante de la santa-máquina, al fondo
    const hx = W / 2, hy = 86;
    g.globalAlpha = 0.28; ring(g, hx, hy, 64, P.glow); ring(g, hx, hy, 63, P.glow);
    g.globalAlpha = 0.16; ring(g, hx, hy, 54, P.glow);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      tl(g, hx + Math.cos(a) * 56, hy + Math.sin(a) * 56, hx + Math.cos(a) * 62, hy + Math.sin(a) * 62, P.glow, 1);
    }
    g.globalAlpha = 1;
    // silueta de la santa sin rostro (velo y óvalo liso)
    const sc = P.tower;
    tri(g, hx - 34, GY - 16, hx + 34, GY - 16, hx, hy - 30, sc);
    disc(g, hx, hy - 12, 15, sc);
    g.globalAlpha = 0.5; disc(g, hx, hy - 10, 9, P.towerHi); g.globalAlpha = 1;
    // torres de servidores / órganos de catedral
    const towers = [[8, 118, 28], [40, 96, 22], [66, 130, 18], [92, 104, 14], [276, 104, 14], [292, 128, 18], [314, 92, 24], [344, 114, 32]];
    const leds = [];
    for (const [x, top, w] of towers) {
      px(g, x, top, w, GY - top, P.tower);
      px(g, x, top, 1, GY - top, P.towerHi);
      px(g, x, top, w, 1, P.towerHi);
      tri(g, x, top, x + w, top, x + w / 2, top - w * 0.8, P.tower); // remate en punta
      for (let yy = top + 6; yy < GY - 10; yy += 7) {
        px(g, x + 3, yy, w - 6, 2, '#05030a');
        if (rand() < 0.75) leds.push({ x: x + w - 5, y: yy, c: P.led[rand() < 0.5 ? 0 : 1], ph: rand() * 10, sp: 2 + rand() * 6 });
      }
    }
    // cables colgando del techo
    for (let i = 0; i < 9; i++) {
      const x0 = rand() * W, x1 = x0 + rand() * 120 - 60, sag = 30 + rand() * 60;
      let lx = x0, ly = -2;
      for (let s = 1; s <= 24; s++) {
        const t = s / 24;
        const x = lerp(x0, x1, t), y = -2 + Math.sin(t * Math.PI) * sag;
        tl(g, lx, ly, x, y, '#05030a', 2);
        lx = x; ly = y;
      }
    }
    // piso: rejilla en perspectiva
    px(g, 0, GY, W, H - GY, P.floor);
    g.globalAlpha = 0.7;
    for (let n = 0; n < 6; n++) px(g, 0, GY + 1 + Math.round(n * n * 0.6 + n * 1.6), W, 1, P.grid);
    const vx = W / 2, vy = GY - 60;
    for (let i = -16; i <= 16; i++) {
      const bx = W / 2 + i * 34;
      const t0 = (GY - vy) / (H - vy);
      tl(g, lerp(vx, bx, t0), GY, bx, H, P.grid, 1);
    }
    g.globalAlpha = 1;
    px(g, 0, GY, W, 1, P.edge);
    px(g, 0, GY + 1, W, 1, '#05030a');
    return { canvas: c, leds };
  }

  // Capa fija: líneas de barrido y viñeta.
  let fxCache = null;
  function buildFX() {
    const c = mk(W, H), g = c.getContext('2d');
    for (let y = 0; y < H; y += 2) px(g, 0, y, W, 1, 'rgba(0,0,0,0.16)');
    const grd = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- cuerpo del FINAL BOSS (estático, en caché) ----------
  // Túnica larga de satén azul con franja roja→morada, hombreras blancas en punta, gemas en el cuello,
  // máscara lisa (sin rostro) con aureola y un agave en la cabeza. Ancla: centro del borde inferior.
  const BOSS_AX = 44, BOSS_AY = 132;
  let bossCache = null;
  function buildBoss() {
    const c = mk(88, 136), g = c.getContext('2d');
    g.translate(BOSS_AX, BOSS_AY);
    const BASE = '#2747a8', SHEEN = '#3d63c8', HI = '#7ea2ee', DARK = '#182c6e', EDGE = '#0e1a48';
    for (let yy = 0; yy <= 84; yy++) {
      const hw = Math.round(10 + ((84 - yy) / 84) * 9 + (yy < 8 ? (8 - yy) * 0.7 : 0));
      const k = yy / 84;
      const sr = Math.round(lerp(122, 216, k)), sg = Math.round(lerp(42, 40, k)), sb = Math.round(lerp(184, 60, k));
      for (let x = -hw; x <= hw; x++) {
        if (yy < 2 && ((x + yy * 2) % 3 === 0)) continue; // dobladillo deshilachado
        let col;
        if (Math.abs(x) <= 2) col = 'rgb(' + sr + ',' + sg + ',' + sb + ')';
        else if (Math.abs(x) >= hw - 1) col = EDGE;
        else {
          const f = Math.sin(x * 0.55 + yy * 0.07) + Math.sin(x * 0.21 - yy * 0.035) * 0.7;
          col = f > 1.25 ? HI : f > 0.35 ? SHEEN : f < -0.9 ? DARK : BASE;
        }
        g.fillStyle = col; g.fillRect(x, -yy, 1, 1);
      }
      if (Math.abs(yy % 12 - 6) < 1) { px(g, -3, -yy, 1, 1, '#ffe0f0'); } // costura brillante de la franja
    }
    // hombreras blancas en punta
    const PAD = '#ece8f0', PADS = '#a9a3b5';
    tri(g, -3, -84, -14, -77, -27, -97, PAD);
    tri(g, -14, -77, -27, -97, -12, -82, PADS);
    tri(g, 3, -84, 14, -77, 27, -97, PAD);
    tri(g, 14, -77, 27, -97, 12, -82, PADS);
    // cuello con gemas
    px(g, -8, -89, 17, 5, '#1d1030');
    px(g, -8, -89, 17, 1, '#3a2448');
    const gems = ['#ff2a4a', '#9dff3a', '#e3d34a', '#2affd0', '#d9259a'];
    gems.forEach((col, i) => { px(g, -7 + i * 3, -87, 2, 2, col); px(g, -7 + i * 3, -87, 1, 1, '#ffffff'); });
    // aureola
    ring(g, 0, -100, 15, '#e3d34a');
    g.globalAlpha = 0.45; ring(g, 0, -100, 17, '#e3d34a'); g.globalAlpha = 1;
    // máscara lisa
    for (let dy = -7; dy <= 6; dy++) {
      const hw = Math.round(Math.sqrt(1 - Math.pow(dy / 7.5, 2)) * 6);
      px(g, -hw, -96 + dy, hw * 2 + 1, 1, '#e9e3d8');
      px(g, hw - 1, -96 + dy, 2, 1, '#bcb3a6');
    }
    px(g, 1, -99, 1, 4, '#8e8578'); px(g, 2, -95, 1, 3, '#8e8578'); // grieta
    // agave
    const LEAF = '#5f9c86', RIB = '#9fd4b4', LEAFD = '#2c5a4a', TIP = '#c9d36a';
    const leaves = [[-160, 12], [-138, 17], [-114, 21], [-90, 25], [-66, 21], [-42, 17], [-20, 12]];
    for (const [deg, len] of leaves) {
      const a = deg * Math.PI / 180;
      const bx = 0, by = -103;
      const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
      const nx = -Math.sin(a) * 2.6, ny = Math.cos(a) * 2.6;
      tri(g, bx + nx, by + ny, bx - nx, by - ny, tx, ty, LEAF);
      tri(g, bx + nx, by + ny, bx, by, tx, ty, LEAFD);
      tl(g, bx, by, lerp(bx, tx, 0.8), lerp(by, ty, 0.8), RIB, 1);
      px(g, tx, ty, 1, 1, TIP);
      px(g, lerp(bx, tx, 0.5) + nx * 0.8, lerp(by, ty, 0.5) + ny * 0.8, 1, 1, TIP); // espinitas
    }
    px(g, -5, -104, 11, 3, LEAFD);
    bossCache = c;
    return c;
  }

  // Mano enguantada con un ojo en la palma (11×11, ancla en el centro).
  const HAND_MAP = [
    '.GG.GG.GG..',
    '.GG.GG.GG..',
    'GGGGGGGGG..',
    'GGGGGGGGGGG',
    'GGWWWWWGGGG',
    'GWWIIIWWGG.',
    'GWWIPIWWGG.',
    'GGWWWWWGGG.',
    '.GGGGGGGG..',
    '.CCCCCCC...',
    '.cCcCcCc...',
  ];
  const HAND_BLINK = HAND_MAP.map((r, j) => (j >= 4 && j <= 7 ? r.replace(/[WIP]/g, j === 6 ? 'L' : 'G') : r));

  Game.minijuegos.pelea = function (host) {
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.pelea) || {});
    if (!fxCache) fxCache = buildFX();
    if (!bossCache) buildBoss();
    const fxC = fxCache;

    // ---------- DOM ----------
    const root = el('div', 'mjp-root');
    const stage = el('div', 'mjp-stage');
    const canvas = mk(W, H); canvas.className = 'mjp-canvas';
    stage.appendChild(canvas);
    const hud = el('div', 'mjp-hud');
    stage.appendChild(hud);

    const sideL = el('div', 'mjp-side l');
    sideL.appendChild(el('div', 'mjp-name', T.tomas));
    const barL = el('div', 'mjp-bar'); const ghostL = el('i'); const fillL = el('b');
    barL.appendChild(ghostL); barL.appendChild(fillL); sideL.appendChild(barL);
    const sideR = el('div', 'mjp-side r');
    const nameR = el('div', 'mjp-name', '');
    sideR.appendChild(nameR);
    const barR = el('div', 'mjp-bar'); const ghostR = el('i'); const fillR = el('b');
    barR.appendChild(ghostR); barR.appendChild(fillR); sideR.appendChild(barR);
    const lvlBox = el('div', 'mjp-lvl'); const lvlTxt = el('span'); lvlBox.appendChild(lvlTxt);
    hud.appendChild(sideL); hud.appendChild(sideR); hud.appendChild(lvlBox);

    function slot(key, labTxt) {
      const s = el('div', 'mjp-slot');
      const k = el('div', 'mjp-key'); k.appendChild(el('span', '', key)); s.appendChild(k);
      const ic = mk(16, 16); s.appendChild(ic);
      const cd = el('div', 'mjp-cd'); s.appendChild(cd);
      const secs = el('span'); const secsBox = el('div', 'mjp-secs'); secsBox.appendChild(secs); s.appendChild(secsBox);
      const count = el('span'); const countBox = el('div', 'mjp-count'); countBox.appendChild(count); s.appendChild(countBox);
      const lab = el('span', '', labTxt); const labBox = el('div', 'mjp-lab'); labBox.appendChild(lab); s.appendChild(labBox);
      return { s, ic, icg: ic.getContext('2d'), cd, secs, count, lab };
    }
    const slots = el('div', 'mjp-slots');
    const sPow = slot('X', '');
    const sMame = slot('C', T.mameitor);
    sMame.icg.drawImage(iconCanvas('pata'), 0, 0);
    slots.appendChild(sPow.s); slots.appendChild(sMame.s);
    hud.appendChild(slots);

    const tip = el('div', 'mjp-tip'); const tipTxt = el('span'); tip.appendChild(tipTxt); tip.hidden = true;
    hud.appendChild(tip);
    const glitchLab = el('div', 'mjp-glitch'); glitchLab.appendChild(el('span', '', T.glitch)); glitchLab.hidden = true;
    hud.appendChild(glitchLab);
    const popLayer = el('div'); hud.appendChild(popLayer);
    const card = el('div', 'mjp-card'); const cardH = el('h2'); const cardP = el('p');
    card.appendChild(cardH); card.appendChild(cardP); card.hidden = true;
    hud.appendChild(card);
    const banner = el('div', 'mjp-banner'); banner.hidden = true;
    hud.appendChild(banner);
    const shout = el('div', 'mjp-banner grito'); shout.hidden = true;
    hud.appendChild(shout);

    const intro = el('div', 'mjp-intro');
    intro.setAttribute('data-cursor', 'hand');
    const win = el('div', 'mjp-win');
    const tb = el('div', 'mjp-tb'); tb.appendChild(el('span', '', 'SHITGPT_FIGHTER.EXE')); tb.appendChild(el('i'));
    const wb = el('div', 'mjp-wbody');
    wb.appendChild(el('h1', '', T.titulo));
    const cont = el('p', 'mjp-cont'); wb.appendChild(cont);
    const ul = el('ul', 'mjp-keys');
    for (const [k, txt] of T.teclas) {
      const li = el('li');
      for (const part of String(k).split(' ')) li.appendChild(el('kbd', '', part));
      li.appendChild(document.createTextNode(' ' + txt));
      ul.appendChild(li);
    }
    wb.appendChild(ul);
    wb.appendChild(el('div', 'mjp-cta', T.empezar));
    win.appendChild(tb); win.appendChild(wb); intro.appendChild(win);
    stage.appendChild(intro);

    root.appendChild(stage);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

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

    // capas auxiliares
    const elC = mk(W, H), elG = elC.getContext('2d');      // rival (para contorno, glitch y desintegración)
    const tC = mk(64, 64), tG = tC.getContext('2d');       // sprite de Tomás
    const cC = mk(64, 64), cG = cC.getContext('2d');       // sprite + contorno (para dibujarlo semitransparente)
    const tintC = mk(W, H), tintG = tintC.getContext('2d');
    function tinted(src, color, w, h) {
      tintG.globalCompositeOperation = 'source-over';
      tintG.clearRect(0, 0, w, h);
      tintG.drawImage(src, 0, 0);
      tintG.globalCompositeOperation = 'source-in';
      tintG.fillStyle = color; tintG.fillRect(0, 0, w, h);
      tintG.globalCompositeOperation = 'source-over';
      return tintC;
    }

    // ---------- estado ----------
    let level = clamp(nivelGuardado, 1, 3);
    let L = NIV[level];
    let bg = buildBG(level);
    let state = 'intro';   // intro | card | fight | ko | lose | win | dissolve | black | over
    let phaseT = 0, fightT = 0, clock = 0, shakeT = 0, shakeA = 0, hitStop = 0;
    let spawnT = 3;
    let tipQueue = [];
    let lastMameReady = false;
    const keys = { left: false, right: false };
    let attLocal = 100;
    const tom = {};
    let e = {};
    let pickups = [], books = [], acid = [], orbs = [], clones = [], parts = [], pops = [];
    let dis = null;   // desintegración final
    let won = false;

    function att() { return Game.atencion ? Game.atencion.value : attLocal; }
    function danar(n) { if (Game.atencion) Game.atencion.danar(n); else attLocal = Math.max(0, attLocal - n); }
    function curar(n) { if (Game.atencion) Game.atencion.curar(n); else attLocal = Math.min(100, attLocal + n); }
    function score(n) { try { if (Game.score) Game.score.add(n); } catch (er) { /* nada */ } }

    let resolveDone, settled = false;
    const done = new Promise((res) => { resolveDone = res; });
    function finish(v) {
      if (settled) return;
      settled = true;
      resolveDone(v);
    }

    function resetTom() {
      Object.assign(tom, {
        x: 86, y: 0, vy: 0, dir: 1, jumps: 0, kickT: 0, kickCd: 0, mameCd: MAME_CD, hurtT: 0, inv: 0,
        kbx: 0, walkPh: 0, moving: false, act: null, actT: 0, actE: 0, actHit: false, spit: 0, cargas: 0, ko: false,
      });
    }
    function resetEnemy() {
      L = NIV[level];
      if (level < 3) {
        e = { kind: 'log', x: 290, fy: 0, dir: -1, hp: L.hp, max: L.hp, ghost: L.hp, st: 'walk', t: 0, cd: 0.8, heavy: 0,
          kbx: 0, flash: 0, stagger: 0, walkPh: 0, hitDone: false, comboed: false, ko: false, koT: 0, hw: 11, h: 58 };
      } else {
        e = { kind: 'boss', x: 286, fy: 12, dir: -1, hp: L.hp, max: L.hp, ghost: L.hp, kbx: 0, flash: 0, stagger: 0,
          glitch: 0, nextGlitch: 5, atkCd: 2.2, ko: false, koT: 0, hw: 18, h: 100, hands: [] };
        for (let i = 0; i < 6; i++) e.hands.push({ i, x: e.x, y: GY - 70, st: 'orbit', t: 0, vy: 0, blink: rnd(0, 4), sweepDir: 1 });
      }
      nameR.textContent = T.enemigos[level - 1] || 'LucIAno';
      lvlTxt.textContent = level < 3 ? (T.nivel + ' ' + level + '/3') : T.finalBoss;
      lvlBox.classList.toggle('boss', level === 3);
    }
    function clearWorld() {
      pickups = []; books = []; acid = []; orbs = []; clones = []; parts = [];
      for (const p of pops) p.el.remove();
      pops = [];
    }

    function setupLevel() {
      L = NIV[level];
      bg = buildBG(level);
      resetTom();
      resetEnemy();
      clearWorld();
      sPow.ic.getContext('2d').clearRect(0, 0, 16, 16);
      sPow.icg.drawImage(iconCanvas(POWER_ICON[level]), 0, 0);
      sPow.lab.textContent = T.poderes[level - 1];
      spawnT = 2.5;
    }

    function showBanner(text, cls) {
      banner.className = 'mjp-banner' + (cls ? ' ' + cls : '');
      banner.textContent = text;
      banner.hidden = false;
      void banner.offsetWidth;
    }
    function hideBanner(fade) {
      if (banner.hidden) return;
      if (fade) banner.classList.add('sale'); else banner.hidden = true;
    }
    let shoutT = 0;
    function showShout(text) { shout.textContent = text; shout.hidden = false; shout.classList.remove('sale'); void shout.offsetWidth; shoutT = 1.0; }

    function pop(text, x, y, cls, life) {
      const p = el('div', 'mjp-pop' + (cls ? ' ' + cls : ''));
      p.appendChild(el('span', '', text));
      p.style.left = Math.round(x) + 'em';
      p.style.top = Math.round(y) + 'em';
      popLayer.appendChild(p);
      pops.push({ el: p, t: 0, life: life || 0.9 });
    }

    function burst(x, y, n, cols, sp, life, grav, sz) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = rnd(0.3, 1) * sp;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.2, life: rnd(0.6, 1) * life, max: life,
          col: cols[(Math.random() * cols.length) | 0], g: grav == null ? 300 : grav, sz: sz || 1 });
      }
    }
    function shake(t, a) { shakeT = Math.max(shakeT, t); shakeA = Math.max(shakeA, a); }

    // ---------- flujo ----------
    function start() {
      if (state !== 'intro') return;
      intro.hidden = true;
      beginCard();
    }
    function beginCard() {
      setupLevel();
      state = 'card'; phaseT = 0;
      card.hidden = false;
      card.classList.toggle('boss', level === 3);
      cardH.textContent = level === 3 ? T.finalBoss : T.nivel + ' ' + level;
      cardP.textContent = (level === 3 ? T.nivel + ' 3 · ' : '') + (T.subtitulos[level - 1] || '');
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      tone(level === 3 ? 70 : 110, 0.6, 'sawtooth', 0.05, level === 3 ? 40 : 220);
      if (level === 3) gsound('glitch');
    }
    function beginFight() {
      card.hidden = true;
      state = 'fight'; fightT = 0;
      showBanner(T.fight);
      SFX.fight();
      tipQueue = level === 1
        ? [[T.instrucciones, 7], [T.poderTips[0], 7]]
        : [[T.poderTips[level - 1], 7]];
      tip.hidden = true;
    }

    function enemyKO() {
      e.ko = true; e.koT = 0; e.hp = 0;
      hitStop = 0.18;
      orbs = []; acid = []; books = []; pickups = [];
      tom.act = null; tom.kickT = 0; tom.hurtT = 0; tom.inv = 0;
      score(500 * level + Math.round(att()) * 5);
      tip.hidden = true;
      phaseT = 0;
      if (level < 3) {
        state = 'ko';
        SFX.ko();
        showBanner(T.ko, 'ko');
        nivelGuardado = level + 1;
      } else {
        state = 'win';
        won = true;
        nivelGuardado = 1;
        score(2000);
        SFX.win();
        gsound('glitch');
        showBanner(T.gana, 'gana');
      }
    }

    function lose() {
      if (state !== 'fight') return;
      state = 'lose'; phaseT = 0;
      tom.ko = true; tom.act = null; tom.kickT = 0; tom.vy = Math.max(tom.vy, 0);
      clones = [];
      tip.hidden = true;
      nivelGuardado = level;
      SFX.hurt(); SFX.lose();
      shake(0.4, 4);
      showBanner(T.pierde, 'pierde');
    }

    // ---------- daño ----------
    function hurtTom(n, fromDir, big) {
      if (state !== 'fight' || tom.inv > 0 || tom.ko) return false;
      if (att() - n <= 0.5) { lose(); return true; }   // el golpe mortal: primero "PERDISTE lol"
      danar(n);
      tom.inv = INV_T; tom.hurtT = big ? 0.45 : 0.3;
      tom.kbx = fromDir * (big ? 260 : 170);
      if (tom.act && tom.act !== 'mame') tom.act = null;
      tom.kickT = 0;
      shake(big ? 0.3 : 0.18, big ? 4 : 2);
      SFX.hurt();
      burst(tom.x, GY - tom.y - 22, 10, ['#ffffff', '#ff4a6e', '#e3d34a'], 90, 0.35, 200);
      pop('-' + n, tom.x, GY - tom.y - 44, 'rojo', 0.8);
      if (big) gsound('glitch');
      return true;
    }

    function startGlitch() {
      if (e.kind !== 'boss' || e.ko) return;
      e.glitch = 1.9;
      for (const h of e.hands) { h.st = 'drop'; h.vy = rnd(-40, 10); }
      gsound('glitch');
      shake(0.15, 2);
      burst(e.x, GY - e.fy - 60, 14, ['#ff2a6a', '#2affd0', '#ffffff'], 80, 0.5, 0);
    }

    // o: { kb, x, y, pts, mame, acid, interrupt, quiet }
    function hitEnemy(dmg, o) {
      if (state !== 'fight' || e.ko) return;
      let mult = 1;
      if (e.kind === 'boss' && e.glitch <= 0) {
        if (o.mame) { mult = 0.5; startGlitch(); }
        else if (o.acid) { mult = 0.5; e.nextGlitch -= 0.25; }
        else {
          mult = 0.15;
          SFX.block();
          if (!o.quiet || Math.random() < 0.3) pop(T.bloqueo, o.x, o.y - 6, 'bloq', 0.6);
          burst(o.x, o.y, 5, ['#b9b4bf', '#ffffff'], 60, 0.2, 0);
        }
      }
      const d = dmg * mult;
      e.hp = Math.max(0, e.hp - d);
      e.flash = o.quiet ? Math.max(e.flash, 0.035) : 0.09;
      e.stagger = Math.max(e.stagger, o.mame ? 0.6 : 0.15);
      e.kbx += (o.kb || 0) * (e.kind === 'boss' ? 0.3 : 1);
      if (o.interrupt && e.kind === 'log' && (e.st === 'wind' || e.st === 'charge' || e.st === 'smash' || e.st === 'swing')) {
        if (e.st === 'charge' || e.st === 'smash') e.heavy = 0.5;
        e.st = 'recover'; e.t = 0.55;
      }
      if (mult >= 0.5) {
        score(Math.round((o.pts || 10) * mult));
        burst(o.x, o.y, o.mame ? 26 : 8, o.acid ? ['#9dff3a', '#e6ff9e'] : ['#ffffff', '#e3d34a', '#ff4fbf'], o.mame ? 200 : 110, o.mame ? 0.6 : 0.3, 150, o.mame ? 2 : 1);
        if (!o.quiet) pop(String(Math.round(d)), o.x, o.y - 8, o.acid ? 'verde' : '', 0.7);
      }
      if (e.hp <= 0) enemyKO();
    }

    // ---------- acciones de Tomás ----------
    function live() { return state === 'fight' && fightT > 0.25 && !tom.ko; }
    function canAct() { return live() && tom.hurtT <= 0 && !tom.act; }

    function frontDist(x) { return (x - tom.x) * tom.dir; }
    function enemyInHeight(feetY, top) {
      // feetY..top en "altura sobre el suelo"
      return feetY < e.fy + e.h && top > e.fy;
    }

    function doJump() {
      if (!live() || tom.hurtT > 0 || (tom.act && tom.act !== 'throw')) return;
      if (tom.y <= 0 && tom.jumps === 0) {
        tom.vy = JUMP_V; tom.y = 0.01; tom.jumps = 1;
        SFX.jump();
        burst(tom.x, GY - 1, 5, ['#b9b4bf'], 40, 0.25, 0);
      } else if (tom.jumps === 1) {
        tom.vy = JUMP_V * 0.96; tom.jumps = 2;
        SFX.jump2();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          parts.push({ x: tom.x, y: GY - tom.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 18, life: 0.3, max: 0.3, col: '#9dff3a', g: 0, sz: 1 });
        }
      }
    }
    function doKick() {
      if (!canAct() || tom.kickCd > 0) return;
      tom.kickT = 0.18; tom.kickCd = KICK_CD;
      const fd = frontDist(e.x);
      if (!e.ko && fd > -6 && fd < KICK_REACH + e.hw && enemyInHeight(tom.y + 10, tom.y + 22)) {
        SFX.kick();
        hitEnemy(L.kick, { kb: tom.dir * 90, x: tom.x + tom.dir * 16, y: GY - tom.y - 16, pts: 10 });
      } else SFX.whiff();
    }
    function doMame() {
      if (!canAct() || tom.mameCd > 0) return;
      tom.act = 'mame'; tom.actT = 0.5; tom.actE = 0; tom.actHit = false;
      tom.mameCd = MAME_CD;
      tom.kbx = tom.dir * 150;
      SFX.mameUp();
      showShout(T.mameitorGrito);
      sMame.s.classList.remove('flash');
    }
    function doPower() {
      if (!canAct()) return;
      if (tom.cargas <= 0) {
        SFX.empty();
        pop(T.sinPoder, tom.x, GY - tom.y - 46, 'bloq', 0.7);
        sPow.s.classList.remove('flash'); void sPow.s.offsetWidth; sPow.s.classList.add('flash');
        return;
      }
      tom.cargas--;
      tom.actE = 0;
      if (level === 1) {
        tom.act = 'throw'; tom.actT = 0.26;
        books.push({ x: tom.x + tom.dir * 10, y: GY - tom.y - 27, vx: tom.dir * 235, vy: -50, rot: 0, life: 2 });
        SFX.throw();
      } else if (level === 2) {
        tom.act = 'touch'; tom.actT = 0.5;
        SFX.grass();
        burst(tom.x + tom.dir * 8, GY - 2, 16, ['#9dff3a', '#4f9a12', '#e3d34a'], 70, 0.6, 120);
      } else {
        tom.act = 'drink'; tom.actT = 0.55;
        SFX.gulp();
      }
    }

    // ---------- actualización ----------
    function updTom(dt) {
      const lv = live();
      if (tom.kickT > 0) tom.kickT -= dt;
      if (tom.kickCd > 0) tom.kickCd -= dt;
      if (tom.inv > 0) tom.inv -= dt;
      if (tom.hurtT > 0) tom.hurtT -= dt;
      if (lv && tom.mameCd > 0) tom.mameCd = Math.max(0, tom.mameCd - dt);

      if (tom.act) {
        tom.actT -= dt; tom.actE += dt;
        if (tom.act === 'mame') {
          if (!tom.actHit && tom.actE >= 0.12) {
            tom.actHit = true;
            const fd = frontDist(e.x);
            SFX.mame();
            shake(0.35, 5);
            burst(tom.x + tom.dir * 26, GY - tom.y - 18, 12, ['#ffffff', '#e3d34a'], 160, 0.25, 0, 2);
            if (!e.ko && fd > -8 && fd < MAME_REACH + e.hw && enemyInHeight(tom.y + 8, tom.y + 26)) {
              hitStop = 0.1;
              hitEnemy(MAME_DMG, { kb: tom.dir * 330, x: tom.x + tom.dir * 26, y: GY - tom.y - 18, pts: 80, mame: true, interrupt: true });
            }
          }
        } else if (tom.act === 'vomit') {
          tom.spit -= dt;
          while (tom.spit <= 0) {
            tom.spit += 0.03;
            acid.push({ x: tom.x + tom.dir * 8, y: GY - tom.y - 31, vx: tom.dir * rnd(190, 300), vy: rnd(-75, 10), life: 1.6 });
          }
        }
        if (tom.actT <= 0) {
          const a = tom.act;
          tom.act = null;
          if (a === 'touch') {
            // dos Tomases atacan de frente y uno se va por detrás del Tralalero
            const sd = sgn(e.x - tom.x);
            [[-16, sd, 0], [16, -sd, 0], [4, sd, 9]].forEach(([off, side, gap], i) => clones.push({ x: clamp(tom.x + off, 12, W - 12),
              dir: tom.dir, t: 0, life: 7, cd: 0.3 + i * 0.17, punchT: 0, walkPh: i, side, gap }));
            gsound('message', false);
            burst(tom.x, GY - 20, 20, ['#9dff3a', '#e6ff9e'], 90, 0.5, 0);
          } else if (a === 'drink') {
            tom.act = 'vomit'; tom.actT = 1.35; tom.actE = 0; tom.spit = 0;
            SFX.vomit();
          }
        }
      }

      let mv = 0;
      if (lv && tom.hurtT <= 0 && (!tom.act || tom.act === 'throw')) mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      tom.moving = mv !== 0;
      if (tom.moving) tom.walkPh += dt * 13;
      tom.x += (mv * WALK + tom.kbx) * dt;
      tom.kbx *= Math.pow(0.004, dt);
      if (Math.abs(tom.kbx) < 3) tom.kbx = 0;
      if (tom.y > 0 || tom.vy > 0) {
        tom.vy -= GRAV * dt;
        tom.y += tom.vy * dt;
        if (tom.y <= 0) {
          tom.y = 0; tom.vy = 0; tom.jumps = 0;
          burst(tom.x, GY - 1, 4, ['#6c6575'], 30, 0.2, 0);
        }
      }
      if (!tom.ko && tom.kickT <= 0 && (!tom.act || tom.act === 'touch')) tom.dir = e.x >= tom.x ? 1 : -1;
      tom.x = clamp(tom.x, 10, W - 10);

      // el tronco es sólido: hay que saltarlo con doble salto
      if (e.kind === 'log' && !e.ko && tom.y < e.h - 6 && Math.abs(tom.x - e.x) < 15) {
        const side = tom.x === e.x ? -e.dir : sgn(tom.x - e.x);
        tom.x = e.x + side * 15;
        if (tom.x < 10 || tom.x > W - 10) { tom.x = clamp(tom.x, 10, W - 10); e.x = tom.x - side * 15; }
      }

      // objetos del piso
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        if (lv && Math.abs(tom.x - p.x) < 11 && tom.y < 16) {
          pickups.splice(i, 1);
          tom.cargas = Math.min(MAX_CARGAS, tom.cargas + 1);
          curar(3);
          score(25);
          SFX.pick();
          pop(T.recoge[level - 1], p.x, GY - 22, 'verde', 1);
          burst(p.x, GY - 6, 10, ['#9dff3a', '#e3d34a', '#ffffff'], 60, 0.4, 0);
          sPow.s.classList.remove('flash'); void sPow.s.offsetWidth; sPow.s.classList.add('flash');
        }
      }
    }

    function updLog(dt) {
      if (e.flash > 0) e.flash -= dt;
      if (e.stagger > 0) e.stagger -= dt;
      if (e.cd > 0) e.cd -= dt;
      e.x += e.kbx * dt;
      e.kbx *= Math.pow(0.003, dt);
      if (Math.abs(e.kbx) < 3) e.kbx = 0;
      e.x = clamp(e.x, 16, W - 16);
      if (!live()) return;
      if (e.st === 'walk') e.heavy = Math.min(1, e.heavy + dt / L.heavyEvery);
      const dx = tom.x - e.x, dist = Math.abs(dx);
      const fd = dx * e.dir;
      switch (e.st) {
        case 'walk':
          e.dir = dx >= 0 ? 1 : -1;
          if (e.stagger <= 0 && dist > L.reach - 8) { e.x += e.dir * L.speed * dt; e.walkPh += dt * 7; }
          if (e.cd <= 0 && e.stagger <= 0 && dist <= L.reach + 2 && tom.y < 44) {
            if (e.heavy >= 1) { e.st = 'charge'; e.t = L.charge; e.heavy = 0; SFX.charge(); }
            else { e.st = 'wind'; e.t = L.wind; SFX.wind(); }
          }
          break;
        case 'wind':
          e.t -= dt;
          if (e.t <= 0) { e.st = 'swing'; e.t = 0.14; e.hitDone = false; tone(700, 0.1, 'sawtooth', 0.025, 200); }
          break;
        case 'swing':
          if (!e.hitDone && fd > -4 && fd <= L.reach + 4 && tom.y < 20) { e.hitDone = true; hurtTom(L.swing, e.dir); }
          e.t -= dt;
          if (e.t <= 0) {
            if (!e.comboed && Math.random() < L.combo) { e.st = 'wind'; e.t = L.wind * 0.7; e.comboed = true; }
            else { e.st = 'recover'; e.t = L.recover; e.comboed = false; }
          }
          break;
        case 'charge':
          e.t -= dt;
          if (Math.random() < 0.5) parts.push({ x: e.x + rnd(-14, 14), y: GY - rnd(10, 70), vx: 0, vy: -40, life: 0.4, max: 0.4, col: '#ff4fbf', g: 0, sz: 1 });
          if (e.t <= 0) { e.st = 'smash'; e.t = 0.26; e.hitDone = false; tone(500, 0.2, 'sawtooth', 0.05, 90); }
          break;
        case 'smash':
          e.x += e.dir * 250 * dt;
          if (!e.hitDone && fd > -8 && fd < 26 && tom.y < 30) {
            e.hitDone = true;
            if (hurtTom(L.heavy, e.dir, true)) burst(tom.x, GY - 24, 16, ['#ff4fbf', '#ffffff'], 140, 0.4, 100, 2);
          }
          e.t -= dt;
          if (e.t <= 0) { e.st = 'recover'; e.t = L.recover + 0.5; shake(0.15, 2); }
          break;
        case 'recover':
          e.t -= dt;
          if (e.t <= 0) { e.st = 'walk'; e.cd = 0.25; }
          break;
      }
      e.x = clamp(e.x, 16, W - 16);
    }

    function freeHands() { return e.hands.filter((h) => h.st === 'orbit'); }
    function bossAttack() {
      const free = freeHands();
      if (!free.length) return;
      const r = Math.random();
      const lowHp = e.hp < e.max * 0.5;
      if (r < 0.42) {
        const n = lowHp ? 2 : 1;
        free.sort(() => Math.random() - 0.5).slice(0, n).forEach((h, k) => { h.st = 'hover'; h.t = 0.8 + k * 0.4; });
      } else if (r < 0.72) {
        const h = free[(Math.random() * free.length) | 0];
        h.st = 'sweepPrep'; h.t = 0.75; h.sweepDir = tom.x >= e.x ? 1 : -1;
        h.sx = clamp(e.x - h.sweepDir * 10, 8, W - 8);
      } else {
        free.sort(() => Math.random() - 0.5).slice(0, lowHp ? 4 : 3).forEach((h, k) => { h.st = 'aim'; h.t = 0.55 + k * 0.18; });
      }
      e.atkCd = lerp(1.25, 2.3, e.hp / e.max);
    }
    function updBoss(dt) {
      if (e.flash > 0) e.flash -= dt;
      if (e.stagger > 0) e.stagger -= dt;
      e.fy = 12 + Math.sin(clock * 1.6) * 3;
      e.x += e.kbx * dt;
      e.kbx *= Math.pow(0.003, dt);
      if (Math.abs(e.kbx) < 3) e.kbx = 0;
      const lv = live();
      if (lv) {
        if (e.glitch > 0) {
          e.glitch -= dt;
          if (Math.random() < 0.15) gsound('tick');
          if (e.glitch <= 0) {
            e.glitch = 0;
            e.nextGlitch = rnd(4.6, 6.4);
            for (const h of e.hands) if (h.st === 'drop') h.st = 'orbit';
            e.atkCd = Math.max(e.atkCd, 0.9);
          }
        } else {
          e.nextGlitch -= dt;
          if (e.nextGlitch <= 0) startGlitch();
          // mantenerse a distancia de Tomás
          const away = sgn(e.x - tom.x);
          const target = clamp(tom.x + away * 92, 40, W - 40);
          const sp = Math.abs(tom.x - e.x) < 34 ? 48 : 26;
          if (Math.abs(target - e.x) > 2) e.x += sgn(target - e.x) * sp * dt;
          e.atkCd -= dt;
          if (e.atkCd <= 0) bossAttack();
        }
      }
      e.x = clamp(e.x, 26, W - 26);
      e.dir = tom.x >= e.x ? 1 : -1;

      const cx = e.x, cy = GY - e.fy - 56;
      for (const h of e.hands) {
        h.blink -= dt;
        if (h.blink < -0.12) h.blink = rnd(1.5, 4.5);
        let tx, ty, k = Math.min(1, dt * 7);
        switch (h.st) {
          case 'orbit': {
            const a = h.i * Math.PI / 3 + clock * 0.7;
            tx = cx + Math.cos(a) * 46; ty = cy + Math.sin(a) * 32;
            break;
          }
          case 'hover':
            h.t -= dt;
            if (h.t > 0.28) h.tx = tom.x;
            tx = clamp(h.tx == null ? tom.x : h.tx, 8, W - 8); ty = GY - 80; k = Math.min(1, dt * 9);
            if (lv && h.t <= 0) { h.st = 'slam'; h.vy = 60; }
            break;
          case 'slam':
            h.vy += 1600 * dt; h.y += h.vy * dt; tx = h.x; ty = h.y; k = 0;
            if (h.y >= GY - 6) {
              h.y = GY - 6; h.st = 'ground'; h.t = 0.5;
              SFX.slam(); shake(0.2, 3);
              burst(h.x, GY - 2, 14, ['#b9b4bf', '#efeaf3', '#e3d34a'], 110, 0.4, 250);
              if (Math.abs(tom.x - h.x) < 13 && tom.y < 26) hurtTom(11, sgn(tom.x - h.x), true);
            }
            break;
          case 'ground':
            h.t -= dt; tx = h.x; ty = GY - 6; k = 0;
            if (h.t <= 0) h.st = 'orbit';
            break;
          case 'sweepPrep':
            h.t -= dt; tx = h.sx; ty = GY - 6; k = Math.min(1, dt * 10);
            if (lv && h.t <= 0) { h.st = 'sweep'; tone(300, 0.4, 'sawtooth', 0.03, 900); }
            break;
          case 'sweep':
            h.x += h.sweepDir * 245 * dt; tx = h.x; ty = GY - 6; k = 1;
            if (Math.random() < 0.6) parts.push({ x: h.x - h.sweepDir * 5, y: GY - 2, vx: -h.sweepDir * 30, vy: -20, life: 0.3, max: 0.3, col: '#b9b4bf', g: 100, sz: 1 });
            if (Math.abs(tom.x - h.x) < 9 && tom.y < 13) hurtTom(9, h.sweepDir);
            if (h.x < -12 || h.x > W + 12) { h.st = 'orbit'; h.y = GY - 120; }
            break;
          case 'aim':
            h.t -= dt; k = Math.min(1, dt * 5);
            {
              const a = h.i * Math.PI / 3 + clock * 0.7;
              tx = cx + Math.cos(a) * 46; ty = cy + Math.sin(a) * 32 - 6;
            }
            if (lv && h.t <= 0) {
              const ax = tom.x - h.x, ay = (GY - tom.y - 20) - h.y, d = Math.hypot(ax, ay) || 1;
              orbs.push({ x: h.x, y: h.y, vx: ax / d * 125, vy: ay / d * 125, life: 3.2 });
              SFX.orb();
              h.st = 'orbit';
            }
            break;
          case 'drop':
            h.vy += GRAV * dt; h.y += h.vy * dt;
            if (h.y >= GY - 6) { h.y = GY - 6; h.vy = 0; }
            tx = h.x + (Math.random() - 0.5) * 2; ty = h.y; k = 1;
            break;
          default:
            tx = h.x; ty = h.y; k = 0;
        }
        if (k > 0) { h.x += (tx - h.x) * k; h.y += (ty - h.y) * k; }
      }
    }

    function updCommon(dt) {
      // proyectiles: libros
      for (let i = books.length - 1; i >= 0; i--) {
        const b = books[i];
        b.vy += 220 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 14; b.life -= dt;
        const hy = GY - b.y;
        if (!e.ko && Math.abs(b.x - e.x) < e.hw + 3 && hy > e.fy && hy < e.fy + e.h) {
          hitEnemy(4, { kb: sgn(b.vx) * 210, x: b.x, y: b.y, pts: 30, interrupt: true });
          SFX.kick();
          burst(b.x, b.y, 10, ['#efeaf3', '#b81f86', '#9dff3a'], 90, 0.4, 200);
          books.splice(i, 1);
          continue;
        }
        if (b.y > GY - 2 || b.x < -10 || b.x > W + 10 || b.life <= 0) {
          burst(b.x, Math.min(b.y, GY - 2), 6, ['#efeaf3', '#b81f86'], 50, 0.3, 200);
          books.splice(i, 1);
        }
      }
      // ácido
      for (let i = acid.length - 1; i >= 0; i--) {
        const a = acid[i];
        a.vy += 300 * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        const hy = GY - a.y;
        if (!e.ko && Math.abs(a.x - e.x) < e.hw + 2 && hy > e.fy && hy < e.fy + e.h) {
          hitEnemy(1.4, { acid: true, x: a.x, y: a.y, pts: 6, quiet: true });
          if (Math.random() < 0.4) SFX.sizzle();
          parts.push({ x: a.x, y: a.y, vx: rnd(-20, 20), vy: rnd(-40, -10), life: 0.4, max: 0.4, col: '#e6ff9e', g: 0, sz: 1 });
          acid.splice(i, 1);
          continue;
        }
        if (a.y >= GY - 1) {
          parts.push({ x: a.x, y: GY - 1, vx: rnd(-25, 25), vy: rnd(-30, -5), life: 0.5, max: 0.5, col: '#9dff3a', g: 150, sz: 1 });
          acid.splice(i, 1);
        } else if (a.life <= 0 || a.x < -10 || a.x > W + 10) acid.splice(i, 1);
      }
      // orbes del jefe
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
        if (Math.random() < 0.5) parts.push({ x: o.x, y: o.y, vx: 0, vy: 0, life: 0.25, max: 0.25, col: '#d9259a', g: 0, sz: 1 });
        if (Math.hypot(o.x - tom.x, o.y - (GY - tom.y - 20)) < 10) { hurtTom(6, sgn(o.vx)); orbs.splice(i, 1); continue; }
        if (o.life <= 0 || o.y > GY || o.x < -10 || o.x > W + 10) orbs.splice(i, 1);
      }
      // clones
      for (let i = clones.length - 1; i >= 0; i--) {
        const c = clones[i];
        c.t += dt;
        if (c.punchT > 0) c.punchT -= dt;
        if (c.t >= c.life || e.ko) { burst(c.x, GY - 20, 8, ['#9dff3a'], 50, 0.4, 0); clones.splice(i, 1); continue; }
        const tx = clamp(e.x - c.side * (17 + c.gap), 8, W - 8);
        c.moving = false;
        if (Math.abs(tx - c.x) > 2) { c.x += sgn(tx - c.x) * Math.min(80 * dt, Math.abs(tx - c.x)); c.walkPh += dt * 13; c.moving = true; }
        c.dir = c.moving ? sgn(tx - c.x) : (e.x >= c.x ? 1 : -1);
        if (!c.moving && live()) {
          c.cd -= dt;
          if (c.cd <= 0) {
            c.cd = 0.5; c.punchT = 0.16;
            noise(0.05, 0.05, 1800);
            hitEnemy(0.9, { kb: c.dir * 25, x: c.x + c.dir * 14, y: GY - 16, pts: 5, quiet: true });
          }
        }
      }
      // objetos del piso: aparecen con el tiempo, más rápido con poca atención
      if (live()) {
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = lerp(3.5, 9, clamp(att() / 100, 0, 1));
          if (pickups.length < 2 && tom.cargas + pickups.length <= MAX_CARGAS) {
            let x = 0;
            for (let n = 0; n < 12; n++) {
              x = rnd(24, W - 24);
              if (Math.abs(x - e.x) > 40 && Math.abs(x - tom.x) > 24) break;
            }
            pickups.push({ x, t: 0, life: 13, seed: Math.random() * 6 });
            burst(x, GY - 6, 8, ['#e3d34a', '#ffffff'], 50, 0.4, 0);
          }
        }
      }
      for (let i = pickups.length - 1; i >= 0; i--) { pickups[i].t += dt; if (pickups[i].t >= pickups[i].life) pickups.splice(i, 1); }
    }

    function updParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.g > 0 && p.y > GY) { p.y = GY; p.vy *= -0.3; p.vx *= 0.6; }
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t += dt;
        if (pops[i].t >= pops[i].life) { pops[i].el.remove(); pops.splice(i, 1); }
      }
    }

    function update(dt) {
      clock += dt;
      if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeA = 0; }
      if (shoutT > 0) { shoutT -= dt; if (shoutT <= 0.3 && !shout.classList.contains('sale')) shout.classList.add('sale'); if (shoutT <= 0) shout.hidden = true; }
      updParts(dt);
      if (hitStop > 0) { hitStop -= dt; return; }

      if (state === 'card') {
        phaseT += dt;
        if (phaseT >= 1.7) beginFight();
      } else if (state === 'fight') {
        fightT += dt;
        if (fightT > 0.8) hideBanner(true);
        if (fightT > 1.4 && !banner.hidden && banner.classList.contains('sale')) banner.hidden = true;
        // avisos
        if (tipQueue.length) {
          const [txt, dur] = tipQueue[0];
          if (tip.hidden) { tipTxt.textContent = txt; tip.classList.toggle('largo', txt.length > 80); tip.hidden = false; tipQueue[0][2] = fightT; }
          if (fightT - tipQueue[0][2] >= dur) { tipQueue.shift(); tip.hidden = true; }
        }
        updTom(dt);
        if (state === 'fight') { if (e.kind === 'log') updLog(dt); else updBoss(dt); }
        if (state === 'fight') updCommon(dt);
      } else if (state === 'ko') {
        phaseT += dt; e.koT += dt;
        updTomPassive(dt);
        if (phaseT >= 2.6) {
          hideBanner(false);
          curar(20);
          level = Math.min(3, level + 1);
          beginCard();
        }
      } else if (state === 'win') {
        phaseT += dt; e.koT += dt;
        updTomPassive(dt);
        if (Math.random() < 0.08) gsound('tick');
        if (phaseT >= 2.2) startDissolve();
      } else if (state === 'dissolve') {
        phaseT += dt;
        updTomPassive(dt);
        if (phaseT > 0.9) hideBanner(true);
        if (phaseT >= 3.0) { state = 'black'; phaseT = 0; banner.hidden = true; }
      } else if (state === 'black') {
        phaseT += dt;
        if (phaseT >= 0.9) { state = 'over'; finish(true); }
      } else if (state === 'lose') {
        phaseT += dt;
        updTomPassive(dt);
        if (phaseT >= 2.1) {
          state = 'over';
          finish(false);
          if (att() > 0) danar(1000);
        }
      }
      // barras fantasma
      e.ghost = e.ghost > e.hp ? Math.max(e.hp, e.ghost - (e.max * 0.5) * dt) : e.hp;
    }
    function updTomPassive(dt) {
      if (tom.y > 0 || tom.vy > 0) {
        tom.vy -= GRAV * dt; tom.y += tom.vy * dt;
        if (tom.y <= 0) { tom.y = 0; tom.vy = 0; }
      }
      tom.x += tom.kbx * dt; tom.kbx *= Math.pow(0.004, dt);
      tom.x = clamp(tom.x, 10, W - 10);
      if (e.kind === 'boss') {
        for (const h of e.hands) { if (h.y < GY - 6) { h.vy = (h.vy || 0) + GRAV * dt; h.y = Math.min(GY - 6, h.y + h.vy * dt); } }
      }
    }

    // ---------- desintegración del FINAL BOSS ----------
    function startDissolve() {
      state = 'dissolve'; phaseT = 0;
      drawEnemyLayer();
      const data = elG.getImageData(0, 0, W, H).data;
      const xs = [], ys = [], cols = [];
      let minY = H, maxY = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (data[i + 3] > 40) { xs.push(x); ys.push(y); cols.push(data[i], data[i + 1], data[i + 2]); if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
      }
      const n = xs.length;
      dis = { n, x: new Float32Array(xs), y: new Float32Array(ys), ox: new Float32Array(xs), oy: new Float32Array(ys),
        vx: new Float32Array(n), vy: new Float32Array(n), delay: new Float32Array(n), col: new Uint8Array(cols),
        img: ctx.createImageData(W, H), cv: mk(W, H) };
      const span = Math.max(1, maxY - minY);
      for (let i = 0; i < n; i++) {
        dis.delay[i] = ((dis.y[i] - minY) / span) * 1.5 + Math.random() * 0.45;
        dis.vx[i] = rnd(-28, 28) + 18;
        dis.vy[i] = rnd(-55, -12);
      }
      SFX.dissolve();
      gsound('glitch');
    }
    function drawDissolve() {
      if (!dis) return;
      const d = dis.img.data;
      d.fill(0);
      const t = phaseT;
      for (let i = 0; i < dis.n; i++) {
        let x = dis.ox[i], y = dis.oy[i], a = 255;
        let r = dis.col[i * 3], g = dis.col[i * 3 + 1], b = dis.col[i * 3 + 2];
        const age = t - dis.delay[i];
        if (age > 0) {
          x += dis.vx[i] * age + Math.sin(age * 9 + i) * 3 * age;
          y += dis.vy[i] * age - 20 * age * age;
          a = Math.round(255 * Math.max(0, 1 - age / 1.1));
          const k = Math.min(1, age * 2.5);
          const tc = (i & 1) ? [157, 255, 58] : [217, 37, 154];
          r = lerp(r, tc[0], k); g = lerp(g, tc[1], k); b = lerp(b, tc[2], k);
          if (a <= 0) continue;
        } else if (age > -0.15 && Math.random() < 0.3) { r = 255; g = 255; b = 255; }
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= W || yi >= H) continue;
        const j = (yi * W + xi) * 4;
        d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a;
      }
      dis.cv.getContext('2d').putImageData(dis.img, 0, 0);
      ctx.drawImage(dis.cv, 0, 0);
    }

    // ---------- dibujo: Tomás ----------
    const TC = {
      sk: '#e8b892', skd: '#b47e5a', skh: '#ffe2c4', hair: '#170c1d', hairl: '#4a2e5a', hood: '#4b2468', hoodd: '#2c1240',
      hoodl: '#7a45a0', print: '#9dff3a', jean: '#2b3456', jeand: '#1a1f37', shoe: '#ece6d6', shoed: '#8d8679', sole: '#d9259a',
      eye: '#120a16', mouth: '#7a2a3a', vein: '#8a3f9c', glass: '#cfe8f0', acid: '#9dff3a',
    };
    function drawTomPose(g, pose, ph, actE) {
      const C = TC;
      if (pose === 'ko') {
        px(g, -15, -7, 12, 6, C.hood); px(g, -15, -7, 12, 2, C.hoodd);
        tl(g, -3, -3, 9, -3, C.jean, 3); tl(g, -3, -4, 8, -7, C.jean, 3);
        px(g, 10, -6, 2, 5, C.shoe); px(g, 9, -10, 2, 5, C.shoe);
        tl(g, -11, -6, -7, -12, C.hood, 2); px(g, -8, -14, 3, 3, C.sk);
        px(g, -25, -9, 9, 8, C.sk); px(g, -27, -10, 3, 9, C.hair); px(g, -25, -10, 7, 2, C.hair);
        px(g, -21, -7, 1, 1, C.eye); px(g, -19, -7, 1, 1, C.eye); px(g, -20, -6, 1, 1, C.eye); px(g, -21, -5, 1, 1, C.eye); px(g, -19, -5, 1, 1, C.eye);
        px(g, -18, -3, 2, 1, C.mouth);
        return;
      }
      let hipY = -15, lean = 0, hdx = 0, hdy = 0;
      let bk = [-2, -8, -3, -3], fr = [3, -8, 4, -3];          // rodilla x,y · tobillo x,y
      let aB = [1, 6, 5, 3], aF = [4, 5, 7, 1];               // codo x,y · mano x,y (relativos al hombro)
      let face = 'normal', glass = false, megaLeg = false, kickShoe = false;
      switch (pose) {
        case 'idle': if (Math.sin(ph * 2.2) > 0) hdy = 1; break;
        case 'walk': {
          const s = Math.round(Math.sin(ph) * 4);
          fr = [3 + s / 2, -8, 3 + s, s > 1 ? -4 : -3];
          bk = [(-3 - s) / 2, -8, -3 - s, s < -1 ? -4 : -3];
          aF = [3, 5, 7, 1 + (s > 0 ? 1 : 0)];
          break;
        }
        case 'jump': fr = [6, -12, 5, -6]; bk = [-1, -9, -4, -5]; aF = [4, -2, 6, -6]; aB = [-3, -1, -5, -5]; break;
        case 'kick': fr = [8, -16, 16, -16]; bk = [-3, -8, -4, -3]; aF = [-2, 4, -5, 2]; aB = [4, 3, 7, 0]; lean = -2; kickShoe = true; break;
        case 'hurt': lean = -3; hdx = -1; fr = [3, -8, 4, -3]; bk = [-4, -8, -6, -3]; aF = [-3, -3, -6, -6]; aB = [-4, 0, -8, -2]; face = 'hurt'; break;
        case 'throw': aF = [6, 0, 11, -1]; aB = [-2, 5, -4, 7]; lean = 1; break;
        case 'touch': hipY = -9; lean = 3; fr = [6, -6, 5, -3]; bk = [-3, -5, -6, -3]; aF = [5, 6, 8, 12]; aB = [3, 6, 6, 10]; face = 'calm'; break;
        case 'drink': aF = [5, 4, 4, -6]; aB = [1, 6, 4, 4]; hdx = -1; hdy = -1; glass = true; face = 'drink'; break;
        case 'vomit': lean = 2; hdx = 2; hdy = 1; aF = [3, 5, 2, 9]; aB = [2, 5, 1, 9]; face = 'vomit'; bk = [-3, -8, -5, -3]; break;
        case 'win': aF = [2, -5, 3, -11]; aB = [-3, 2, -5, -3]; face = 'happy'; break;
        case 'mame':
          lean = -3; aF = [-3, 3, -7, 0]; aB = [3, 2, 6, -2]; face = 'angry';
          if (actE < 0.12) { fr = [7, -21, 3, -13]; } else { megaLeg = true; }
          bk = [-3, -8, -5, -3];
          break;
      }
      const sx = lean, sy = hipY - 11;
      // brazo de atrás
      tl(g, sx - 2, sy, sx - 2 + aB[0], sy + aB[1], C.hoodd, 3);
      tl(g, sx - 2 + aB[0], sy + aB[1], sx - 2 + aB[2], sy + aB[3], C.hoodd, 2);
      px(g, sx - 3 + aB[2], sy - 1 + aB[3], 3, 3, C.skd);
      // pierna de atrás
      tl(g, 0, hipY, bk[0], bk[1], C.jeand, 3); tl(g, bk[0], bk[1], bk[2], bk[3], C.jeand, 3);
      px(g, bk[2] - 2, bk[3] + 1, 6, 2, C.shoed); px(g, bk[2] - 2, bk[3] + 2, 6, 1, C.sole);
      // torso (sudadera)
      px(g, lean - 4, hipY - 12, 9, 13, C.hood);
      px(g, lean - 4, hipY - 12, 2, 13, C.hoodd);
      px(g, lean + 3, hipY - 11, 1, 10, C.hoodl);
      px(g, lean - 4, hipY, 9, 1, C.hoodd);
      px(g, lean - 6, hipY - 13, 4, 4, C.hoodd);                   // capucha
      px(g, lean, hipY - 9, 3, 2, C.print); px(g, lean, hipY - 7, 1, 1, C.print); px(g, lean + 2, hipY - 7, 1, 1, C.print);
      px(g, lean - 1, hipY - 3, 5, 1, C.hoodd);                    // bolsillo
      // pierna de adelante
      if (megaLeg) {
        // LA PATA DEL MAMEITOR: pierna descomunal y musculosa
        px(g, -3, hipY - 3, 7, 5, C.jean); px(g, -3, hipY + 2, 1, 1, C.jean); px(g, 2, hipY + 2, 1, 1, C.jean);
        tl(g, 2, hipY, 11, hipY - 2, C.sk, 7);
        disc(g, 6, hipY - 2, 4, C.sk);
        tl(g, 11, hipY - 2, 22, hipY - 4, C.sk, 5);
        disc(g, 16, hipY + 1, 3, C.sk);
        px(g, 4, hipY - 5, 5, 1, C.skh); px(g, 12, hipY - 5, 4, 1, C.skh); px(g, 10, hipY - 3, 2, 2, C.skh);
        px(g, 4, hipY + 3, 7, 1, C.skd); px(g, 13, hipY + 3, 6, 1, C.skd);
        px(g, 6, hipY - 2, 1, 1, C.vein); px(g, 7, hipY - 1, 2, 1, C.vein); px(g, 9, hipY, 1, 1, C.vein); px(g, 15, hipY - 3, 2, 1, C.vein); px(g, 17, hipY - 2, 1, 1, C.vein);
        px(g, 22, hipY - 9, 5, 10, C.shoe); px(g, 27, hipY - 9, 1, 10, C.sole); px(g, 22, hipY - 9, 5, 1, C.shoed);
      } else {
        tl(g, 0, hipY, fr[0], fr[1], C.jean, 3); tl(g, fr[0], fr[1], fr[2], fr[3], C.jean, 3);
        px(g, fr[0] - 1, fr[1] - 1, 1, 1, C.jeand);
        if (kickShoe) { px(g, fr[2] + 1, fr[3] - 3, 3, 6, C.shoe); px(g, fr[2] + 4, fr[3] - 3, 1, 6, C.sole); }
        else { px(g, fr[2] - 2, fr[3] + 1, 6, 2, C.shoe); px(g, fr[2] - 2, fr[3] + 2, 6, 1, C.sole); }
      }
      // cabeza
      const hx = lean + hdx, ht = hipY - 24 + hdy;
      px(g, hx - 1, hipY - 14, 3, 2, C.skd);                       // cuello
      px(g, hx - 4, ht, 9, 10, C.sk);
      px(g, hx + 5, ht + 5, 1, 2, C.sk);                           // nariz
      px(g, hx - 4, ht + 9, 9, 1, C.skd);
      px(g, hx - 2, ht + 4, 2, 3, C.skd);                          // oreja
      px(g, hx - 5, ht - 2, 10, 4, C.hair);                        // pelo rizado
      px(g, hx - 6, ht, 3, 7, C.hair);
      px(g, hx - 4, ht - 3, 3, 1, C.hair); px(g, hx, ht - 3, 3, 1, C.hair);
      px(g, hx + 4, ht - 1, 2, 3, C.hair); px(g, hx + 3, ht + 2, 2, 1, C.hair);
      px(g, hx - 3, ht - 2, 1, 1, C.hairl); px(g, hx + 1, ht - 2, 1, 1, C.hairl); px(g, hx - 5, ht + 2, 1, 1, C.hairl); px(g, hx + 4, ht, 1, 1, C.hairl);
      if (face === 'hurt') {
        px(g, hx + 1, ht + 4, 3, 1, C.eye); px(g, hx + 2, ht + 7, 2, 2, C.mouth);
      } else if (face === 'vomit') {
        px(g, hx + 1, ht + 4, 3, 1, C.eye); px(g, hx + 2, ht + 6, 3, 3, C.acid);
      } else {
        px(g, hx + 2, ht + 4, 1, 2, C.eye);
        px(g, hx + 1, ht + (face === 'angry' ? 3 : 2), 3, 1, C.hair);
        if (face === 'angry') px(g, hx + 3, ht + 4, 1, 1, C.hair);
        if (face === 'happy') { px(g, hx + 2, ht + 7, 3, 1, C.mouth); px(g, hx + 1, ht + 6, 1, 1, C.mouth); }
        else if (face === 'angry') px(g, hx + 2, ht + 7, 3, 2, C.mouth);
        else if (face !== 'drink') px(g, hx + 2, ht + 7, 2, 1, C.mouth);
      }
      // brazo de adelante
      tl(g, sx + 1, sy, sx + 1 + aF[0], sy + aF[1], C.hood, 3);
      tl(g, sx + 1 + aF[0], sy + aF[1], sx + 1 + aF[2], sy + aF[3], C.hood, 2);
      px(g, sx + aF[2], sy - 1 + aF[3], 3, 3, C.sk);
      if (glass) {
        const gx = sx + 1 + aF[2], gy = sy + aF[3];
        px(g, gx, gy - 5, 4, 6, C.glass);
        px(g, gx + 1, gy - 4 + Math.min(3, Math.floor(actE * 7)), 2, 4 - Math.min(3, Math.floor(actE * 7)), C.acid);
      }
    }
    function tomPoseOf() {
      if (tom.ko) return 'ko';
      if (state === 'win' || state === 'dissolve' || state === 'black' || state === 'ko') return tom.y > 0 ? 'jump' : 'win';
      if (tom.hurtT > 0) return 'hurt';
      if (tom.act) return tom.act;
      if (tom.kickT > 0) return 'kick';
      if (tom.y > 0) return 'jump';
      if (tom.moving) return 'walk';
      return 'idle';
    }
    function drawTomSprite(pose, ph, actE, x, y, dir, alpha, ghost) {
      tG.clearRect(0, 0, 64, 64);
      tG.save(); tG.translate(32, 60); drawTomPose(tG, pose, ph, actE); tG.restore();
      cG.clearRect(0, 0, 64, 64);
      const t = tinted(tC, ghost ? '#9dff3a' : '#05030a', 64, 64);
      cG.drawImage(t, 0, 0, 64, 64, -1, 0, 64, 64);
      cG.drawImage(t, 0, 0, 64, 64, 1, 0, 64, 64);
      cG.drawImage(t, 0, 0, 64, 64, 0, -1, 64, 64);
      cG.drawImage(t, 0, 0, 64, 64, 0, 1, 64, 64);
      cG.drawImage(tC, 0, 0);
      if (ghost) { // tinte verde ácido de clon
        cG.globalCompositeOperation = 'source-atop';
        cG.globalAlpha = 0.3; cG.fillStyle = '#9dff3a'; cG.fillRect(0, 0, 64, 64);
        cG.globalAlpha = 1; cG.globalCompositeOperation = 'source-over';
      }
      ctx.save();
      ctx.translate(Math.round(x), GY - Math.round(y));
      ctx.scale(dir, 1);
      ctx.globalAlpha = alpha;
      ctx.drawImage(cC, -32, -60);
      ctx.restore();
    }

    // ---------- dibujo: Tralalero (tronco con bate) ----------
    function drawLog(g) {
      const lv2 = level === 2;
      const fl = false;
      const C = (c) => (fl ? '#ffffff' : c);
      const OUT = C(lv2 ? '#1a0810' : '#2a1206'), BODY = C(lv2 ? '#5e3a44' : '#9a5a2e'), LIGHT = C(lv2 ? '#80525e' : '#c07a45'),
        DARK = C(lv2 ? '#3a1e28' : '#6e3a18'), END = C(lv2 ? '#a07078' : '#d9a66a'), TWIG = lv2 ? '#2a1014' : '#3b2414';
      g.save();
      g.translate(Math.round(e.x), GY);
      g.scale(e.dir, 1);
      if (e.ko) {
        const k = Math.min(1, e.koT / 0.45);
        g.translate(-2, 0);
        g.rotate(-k * Math.PI / 2 * 0.98);
      }
      const walking = e.st === 'walk' && e.stagger <= 0 && !e.ko;
      const bob = walking ? (Math.sin(e.walkPh) > 0 ? 1 : 0) : 0;
      const shk = e.st === 'charge' ? Math.round(Math.sin(clock * 60)) : 0;
      g.translate(shk, 0);
      const top = -60 + bob, bottom = -14;
      const Lx = -11, Wd = 22;
      // piernas finas
      const s = walking ? Math.round(Math.sin(e.walkPh) * 3) : 0;
      tl(g, -5, bottom, -6 + s, -1, OUT, 2); tl(g, 5, bottom, 6 - s, -1, OUT, 2);
      px(g, -8 + s, -2, 5, 2, OUT); px(g, 4 - s, -2, 5, 2, OUT);
      px(g, -8 + s, -1, 5, 1, lv2 ? '#d9259a' : '#ece6d6'); px(g, 4 - s, -1, 5, 1, lv2 ? '#d9259a' : '#ece6d6');
      // ramitas en la cabeza
      tl(g, -2, top, -5, top - 9, TWIG, 1); tl(g, -5, top - 9, -9, top - 12, TWIG, 1); tl(g, -4, top - 6, -1, top - 12, TWIG, 1);
      tl(g, 4, top, 6, top - 8, TWIG, 1); tl(g, 6, top - 8, 9, top - 10, TWIG, 1);
      px(g, -10, top - 13, 2, 1, lv2 ? '#ff4fbf' : '#9dff3a'); px(g, -1, top - 13, 1, 2, lv2 ? '#ff4fbf' : '#9dff3a'); px(g, 9, top - 11, 2, 1, lv2 ? '#e3d34a' : '#9dff3a');
      // cuerpo de tronco
      px(g, Lx + 2, top, Wd - 4, bottom - top + 1, OUT);
      px(g, Lx + 1, top + 1, Wd - 2, bottom - top - 1, OUT);
      px(g, Lx, top + 3, Wd, bottom - top - 5, OUT);
      px(g, Lx + 2, top + 1, Wd - 4, bottom - top - 1, BODY);
      px(g, Lx + 1, top + 3, Wd - 2, bottom - top - 5, BODY);
      px(g, Lx + 1, top + 3, 3, bottom - top - 5, DARK);
      px(g, Lx + Wd - 4, top + 3, 2, bottom - top - 5, LIGHT);
      g.fillStyle = DARK;
      for (const gr of [[4, 0.0], [8, 1.3], [13, 2.1], [17, 0.7]]) {
        for (let yy = top + 8; yy < bottom - 1; yy++) {
          const gx = Lx + gr[0] + Math.round(Math.sin(yy * 0.35 + gr[1]) * 1.2);
          if ((yy + gr[0]) % 7 !== 0) g.fillRect(gx, yy, 1, 1);
        }
      }
      if (lv2) { // grietas que brillan
        tl(g, -6, top + 24, -2, top + 30, '#d9259a', 1); tl(g, -2, top + 30, -4, top + 36, '#d9259a', 1);
        tl(g, 3, top + 38, 6, top + 43, '#e3d34a', 1);
      }
      disc(g, Lx + 7, top + 36, 2, DARK);
      px(g, Lx + 2, top, Wd - 4, 5, OUT);
      px(g, Lx + 3, top + 1, Wd - 6, 3, END);
      px(g, Lx + 6, top + 2, Wd - 12, 1, C(lv2 ? '#6e4450' : '#c48a4e'));
      // cara (mira hacia +x)
      const fy = top + 14, fx = 4;
      if (e.ko) {
        for (const ex of [fx - 4, fx + 3]) { px(g, ex - 1, fy, 1, 1, '#000'); px(g, ex + 1, fy, 1, 1, '#000'); px(g, ex, fy + 1, 1, 1, '#000'); px(g, ex - 1, fy + 2, 1, 1, '#000'); px(g, ex + 1, fy + 2, 1, 1, '#000'); }
        px(g, fx - 3, fy + 7, 7, 1, '#2a0e04');
      } else {
        const eyeW = lv2 ? '#ff2a4a' : '#ffffff';
        px(g, fx - 6, fy, 4, 3, eyeW); px(g, fx + 1, fy, 4, 3, eyeW);
        px(g, fx - 4, fy + 1, 2, 2, '#000'); px(g, fx + 3, fy + 1, 2, 2, '#000');
        tl(g, fx - 7, fy - 3, fx - 2, fy - 1, '#000', 1); tl(g, fx + 6, fy - 3, fx + 1, fy - 1, '#000', 1);
        const angry = e.st === 'wind' || e.st === 'swing' || e.st === 'charge' || e.st === 'smash';
        px(g, fx - 4, fy + 7, 7, angry ? 3 : 2, '#2a0e04');
        if (angry) { px(g, fx - 3, fy + 7, 1, 1, '#fff'); px(g, fx + 1, fy + 7, 1, 1, '#fff'); }
      }
      // brazo y bate. Ángulo: 0 = hacia Tomás (+x), positivo = arriba.
      let ang;
      if (e.ko) ang = -20;
      else if (e.st === 'wind') ang = lerp(70, 150, 1 - e.t / (e.comboed ? L.wind * 0.7 : L.wind));
      else if (e.st === 'swing') ang = lerp(150, -15, 1 - e.t / 0.14);
      else if (e.st === 'charge') ang = 165 + Math.sin(clock * 50) * 4;
      else if (e.st === 'smash') ang = lerp(165, -35, Math.min(1, (0.26 - e.t) / 0.12));
      else if (e.st === 'recover') ang = e.t > 0.4 ? -15 : lerp(70, -15, e.t / 0.4);
      else ang = 70 + Math.sin(clock * 3) * 4;
      const a = ang * Math.PI / 180;
      const shx = 9, shy = top + 30, hx = shx + 6, hy = shy - 1;
      tl(g, shx, shy, hx, hy, OUT, 2);
      const dx = Math.cos(a), dy = -Math.sin(a);
      const heavyGlow = e.st === 'charge' || e.st === 'smash' || (e.heavy >= 1 && !e.ko);
      if (heavyGlow) {
        g.globalAlpha = 0.5 + Math.sin(clock * 30) * 0.3;
        tl(g, hx + dx * 8, hy + dy * 8, hx + dx * 27, hy + dy * 27, '#ff4fbf', 8);
        g.globalAlpha = 1;
      }
      tl(g, hx, hy, hx + dx * 9, hy + dy * 9, '#5a3414', 2);
      tl(g, hx + dx * 8, hy + dy * 8, hx + dx * 26, hy + dy * 26, lv2 ? '#3a2a30' : '#8a5424', 4);
      tl(g, hx + dx * 10, hy + dy * 10, hx + dx * 25, hy + dy * 25, lv2 ? '#6a5058' : '#a8703a', 1);
      if (lv2) for (let k = 12; k <= 24; k += 4) px(g, hx + dx * k - 1, hy + dy * k - 1, 1, 1, '#b9b4bf'); // clavos
      px(g, hx - 1, hy - 1, 3, 3, BODY);
      if (e.st === 'swing' || e.st === 'smash') {
        g.globalAlpha = 0.5;
        for (let k = 0; k < 4; k++) {
          const aa = (ang + 18 + k * 14) * Math.PI / 180;
          tl(g, hx + Math.cos(aa) * 22, hy - Math.sin(aa) * 22, hx + Math.cos(aa) * 29, hy - Math.sin(aa) * 29, '#efeaf3', 1);
        }
        g.globalAlpha = 1;
      }
      g.restore();
      if (!e.ko) {
        // medidor del golpe fuerte (se recarga)
        const mx = Math.round(e.x) - 10, my = GY + top - 18;
        px(g, mx - 1, my - 1, 22, 5, '#000');
        px(g, mx, my, Math.round(20 * e.heavy), 3, e.heavy >= 1 ? (Math.sin(clock * 20) > 0 ? '#ff4fbf' : '#e3d34a') : '#8c1f74');
        if (e.st === 'wind' || e.st === 'charge') {
          if (Math.sin(clock * 30) > -0.3) {
            const n = e.st === 'charge' ? 2 : 1;
            for (let i = 0; i < n; i++) { px(g, Math.round(e.x) - n * 2 + i * 4, my - 10, 2, 5, '#ff2a4a'); px(g, Math.round(e.x) - n * 2 + i * 4, my - 4, 2, 2, '#ff2a4a'); }
          }
        }
      }
    }

    // ---------- dibujo: FINAL BOSS ----------
    function drawHand(g, h) {
      const aiming = h.st === 'aim' || h.st === 'hover' || h.st === 'sweepPrep';
      const map = h.blink < 0 && !aiming ? HAND_BLINK : HAND_MAP;
      const pal = { G: '#efeaf3', W: '#ffffff', I: aiming ? '#ff2a4a' : (e.glitch > 0 ? '#2affd0' : '#9dff3a'), P: '#05030a',
        C: '#cfc8d8', c: '#8a829a', L: '#5a4a66' };
      drawMap(g, map, Math.round(h.x) - 5, Math.round(h.y) - 5, pal);
      if (aiming && Math.sin(clock * 40) > 0) { g.globalAlpha = 0.6; ring(g, h.x, h.y, 7, '#ff2a4a'); g.globalAlpha = 1; }
    }
    function drawBoss(g) {
      const bx = Math.round(e.x), by = GY - Math.round(e.fy);
      // manos de atrás (las de arriba en la órbita)
      const behind = e.hands.filter((h) => h.y < by - 56 && h.st === 'orbit');
      for (const h of behind) drawHand(g, h);
      g.drawImage(bossCache, bx - BOSS_AX, by - BOSS_AY);
      // ojos rojos cuando ataca
      if (e.hands.some((h) => h.st !== 'orbit' && h.st !== 'drop' && h.st !== 'ground')) {
        px(g, bx - 3, by - 98, 2, 1, '#ff2a4a'); px(g, bx + 2, by - 98, 2, 1, '#ff2a4a');
      }
      for (const h of e.hands) if (behind.indexOf(h) < 0) drawHand(g, h);
    }
    function drawEnemyLayer() {
      elG.clearRect(0, 0, W, H);
      if (e.kind === 'log') drawLog(elG); else drawBoss(elG);
    }
    function compositeEnemy() {
      if (state === 'dissolve' || state === 'black' || (state === 'over' && won)) return;
      drawEnemyLayer();
      const glitching = e.kind === 'boss' && (e.glitch > 0 || state === 'win');
      let t = tinted(elC, '#05030a', W, H);
      ctx.drawImage(t, -1, 0); ctx.drawImage(t, 1, 0); ctx.drawImage(t, 0, -1); ctx.drawImage(t, 0, 1);
      if (glitching) {
        const j = Math.round(rnd(-2, 2));
        ctx.globalAlpha = 0.6;
        ctx.drawImage(tinted(elC, '#ff2a6a', W, H), -3 + j, 0);
        ctx.drawImage(tinted(elC, '#2affd0', W, H), 3 - j, 0);
        ctx.globalAlpha = 1;
        for (let y = 0; y < H; y += 5) {
          const off = Math.random() < 0.25 ? Math.round(rnd(-9, 9)) : 0;
          if (Math.random() < 0.05) continue; // franjas que desaparecen
          ctx.drawImage(elC, 0, y, W, 5, off, y, W, 5);
        }
      } else ctx.drawImage(elC, 0, 0);
      if (e.flash > 0) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(tinted(elC, '#ffffff', W, H), 0, 0);
        ctx.globalAlpha = 1;
      }
    }

    // ---------- dibujo general ----------
    function drawPickup(p) {
      if (p.life - p.t < 3 && Math.floor(p.t * 8) % 2) return;
      const bob = Math.round(Math.sin(clock * 3 + p.seed) * 1.5);
      const x = Math.round(p.x), y = GY - 17 + bob;
      ctx.globalAlpha = 0.35 + Math.sin(clock * 6 + p.seed) * 0.15;
      px(ctx, x - 9, GY - 1, 18, 2, '#e3d34a');
      ctx.globalAlpha = 1;
      const ic = iconCanvas(POWER_ICON[level]);
      const t = tinted(ic, '#05030a', 16, 16);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(t, 0, 0, 16, 16, x - 8 + ox, y + oy, 16, 16);
      ctx.drawImage(ic, x - 8, y);
      if (Math.floor(clock * 3 + p.seed) % 3 === 0) px(ctx, x - 6 + ((clock * 20) | 0) % 12, y + 2, 1, 1, '#ffffff');
    }
    function drawBook(b) {
      const x = Math.round(b.x), y = Math.round(b.y);
      const f = Math.floor(b.rot) % 4;
      if (f % 2 === 0) { px(ctx, x - 4, y - 3, 8, 6, '#05030a'); px(ctx, x - 3, y - 2, 6, 4, '#b81f86'); px(ctx, x - 3, y + 1, 6, 1, '#efeaf3'); px(ctx, x, y - 1, 1, 1, '#9dff3a'); }
      else { px(ctx, x - 3, y - 4, 6, 8, '#05030a'); px(ctx, x - 2, y - 3, 4, 6, '#b81f86'); px(ctx, x + 1, y - 3, 1, 6, '#efeaf3'); px(ctx, x - 1, y, 1, 1, '#9dff3a'); }
    }

    function draw() {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (shakeT > 0) ctx.translate(Math.round((Math.random() - 0.5) * shakeA * 2), Math.round((Math.random() - 0.5) * shakeA * 1.5));
      ctx.drawImage(bg.canvas, 0, 0);
      for (const l of bg.leds) if (Math.sin(clock * l.sp + l.ph) > 0) px(ctx, l.x, l.y, 2, 2, l.c);

      for (const p of pickups) drawPickup(p);
      // sombras
      ctx.globalAlpha = 0.45;
      px(ctx, tom.x - 7 + Math.min(4, tom.y / 12), GY, 14 - Math.min(8, tom.y / 8), 2, '#000');
      if (!won || state === 'win') {
        if (e.kind === 'log' && !e.ko) px(ctx, e.x - 12, GY, 24, 2, '#000');
        if (e.kind === 'boss') px(ctx, e.x - 20, GY, 40, 2, '#000');
      }
      ctx.globalAlpha = 1;
      // avisos en el piso (manos del jefe)
      if (e.kind === 'boss' && state === 'fight') {
        for (const h of e.hands) {
          if ((h.st === 'hover' && Math.sin(clock * 30) > 0)) px(ctx, h.x - 12, GY + 1, 25, 2, '#ff2a4a');
          if (h.st === 'sweepPrep' && Math.sin(clock * 30) > 0) {
            for (let k = 0; k < 6; k++) px(ctx, h.x + h.sweepDir * (10 + k * 12), GY - 3, 6, 1, '#ff2a4a');
          }
        }
      }

      compositeEnemy();
      if (state === 'dissolve') drawDissolve();

      for (const c of clones) {
        const fade = Math.min(1, c.t / 0.3, (c.life - c.t) / 0.5);
        drawTomSprite(c.punchT > 0 ? 'kick' : (c.moving ? 'walk' : 'idle'), c.walkPh, 0, c.x, 0, c.dir, 0.5 * fade, true);
      }
      if (!(tom.inv > 0 && Math.floor(tom.inv * 14) % 2 && !tom.ko)) {
        drawTomSprite(tomPoseOf(), tom.act ? tom.actE : (tom.moving ? tom.walkPh : clock), tom.actE, tom.x, tom.y, tom.dir, 1, false);
      }
      if (tom.act === 'mame' && tom.actE >= 0.12 && tom.actE < 0.3) {
        ctx.globalAlpha = 0.7;
        for (let k = 0; k < 5; k++) tl(ctx, tom.x + tom.dir * (30 + k * 2), GY - tom.y - 26 + k * 4, tom.x + tom.dir * (44 + k * 3), GY - tom.y - 28 + k * 5, '#ffffff', 1);
        ctx.globalAlpha = 1;
      }

      for (const b of books) drawBook(b);
      for (const a of acid) { px(ctx, a.x - 1, a.y - 1, 2, 2, '#9dff3a'); px(ctx, a.x, a.y - 1, 1, 1, '#e6ff9e'); }
      for (const o of orbs) {
        disc(ctx, o.x, o.y, 3, Math.sin(clock * 40) > 0 ? '#d9259a' : '#ff4fbf');
        px(ctx, o.x - 1, o.y - 1, 2, 2, '#ffffff');
      }
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
        px(ctx, p.x, p.y, p.sz, p.sz, p.col);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // glitch de pantalla en el nivel 3
      if (level === 3 && (e.glitch > 0 || state === 'win') && Math.random() < 0.35) {
        const y = (Math.random() * H) | 0, h = 2 + ((Math.random() * 10) | 0);
        ctx.drawImage(canvas, 0, y, W, h, Math.round(rnd(-8, 8)), y, W, h);
      }
      ctx.drawImage(fxC, 0, 0);

      if (state === 'black') { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, phaseT / 0.8) + ')'; ctx.fillRect(0, 0, W, H); }
      if (state === 'over' && won) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      drawHUD();
    }

    // HUD en DOM (solo se toca lo que cambia)
    const hudCache = {};
    function setStyle(elm, key, prop, val) {
      if (hudCache[key] === val) return;
      hudCache[key] = val;
      elm.style[prop] = val;
    }
    function setText(elm, key, val) {
      if (hudCache[key] === val) return;
      hudCache[key] = val;
      elm.textContent = val;
    }
    function setClass(elm, key, cls, on) {
      if (hudCache[key] === on) return;
      hudCache[key] = on;
      elm.classList.toggle(cls, on);
    }
    let ghostAtt = 100;
    function drawHUD() {
      const v = clamp(att(), 0, 100);
      ghostAtt = ghostAtt > v ? Math.max(v, ghostAtt - 0.6) : v;
      setStyle(fillL, 'fl', 'width', v.toFixed(1) + '%');
      setStyle(ghostL, 'gl', 'width', ghostAtt.toFixed(1) + '%');
      setClass(sideL, 'baja', 'baja', v <= 30);
      const hpk = e.max ? e.hp / e.max * 100 : 0;
      setStyle(fillR, 'fr', 'width', hpk.toFixed(1) + '%');
      setStyle(ghostR, 'gr', 'width', (e.max ? e.ghost / e.max * 100 : 0).toFixed(1) + '%');
      // poder
      setText(sPow.count, 'pc', '×' + tom.cargas);
      setClass(sPow.s, 'pv', 'vacio', tom.cargas <= 0);
      // pata del mameitor
      const ready = tom.mameCd <= 0;
      setClass(sMame.s, 'mr', 'listo', ready);
      setClass(sMame.s, 'mv', 'vacio', !ready);
      setStyle(sMame.cd, 'mcd', 'height', ready ? '0' : Math.round(tom.mameCd / MAME_CD * 22) + 'em');
      setText(sMame.secs, 'ms', ready ? '' : String(Math.ceil(tom.mameCd)));
      if (ready && !lastMameReady && state === 'fight') SFX.mameReady();
      lastMameReady = ready;
      // etiqueta GLITCH
      const gOn = e.kind === 'boss' && e.glitch > 0 && state === 'fight';
      if (glitchLab.hidden === gOn) glitchLab.hidden = !gOn;
      if (gOn) {
        glitchLab.style.left = Math.round(e.x) + 'em';
        glitchLab.style.top = Math.round(GY - e.fy - 76) + 'em';
      }
    }

    // ---------- bucle ----------
    let raf = 0, last = -1, destroyed = false;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      if (last < 0) last = now;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      update(dt);
      draw();
    }
    setupLevel();
    if (level > 1) cont.textContent = '(' + T.continuar + ' ' + level + (level === 3 ? ' — ' + T.finalBoss : '') + ')';
    else cont.hidden = true;
    raf = requestAnimationFrame(frame);

    // ---------- entrada ----------
    function onKeyDown(ev) {
      const c = ev.code;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(c) >= 0) ev.preventDefault();
      if (state === 'intro') {
        if ((c === 'Space' || c === 'Enter') && !ev.repeat) start();
        return;
      }
      if (c === 'ArrowLeft' || c === 'KeyA') keys.left = true;
      else if (c === 'ArrowRight' || c === 'KeyD') keys.right = true;
      if (ev.repeat) return;
      if (c === 'ArrowUp' || c === 'KeyW') doJump();
      else if (c === 'Space') doKick();
      else if (c === 'KeyX' || c === 'KeyZ') doPower();
      else if (c === 'KeyC' || c === 'ShiftLeft' || c === 'ShiftRight') doMame();
    }
    function onKeyUp(ev) {
      const c = ev.code;
      if (c === 'ArrowLeft' || c === 'KeyA') keys.left = false;
      else if (c === 'ArrowRight' || c === 'KeyD') keys.right = false;
    }
    function onBlur() { keys.left = keys.right = false; }
    function onDown(ev) { if (ev.button === 0 && state === 'intro') start(); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    stage.addEventListener('mousedown', onDown);

    // Gancho para pruebas.
    const debug = {
      setLevel(n) { level = clamp(n | 0, 1, 3); nivelGuardado = level; intro.hidden = true; hideBanner(false); tip.hidden = true; beginCard(); },
      killEnemy() { if (state === 'fight' && !e.ko) { e.hp = 0.01; e.glitch = Math.max(e.glitch || 0, 0.5); hitEnemy(100, { x: e.x, y: GY - 40, quiet: true }); } },
      setHp(v) { e.hp = v; },
      giveCharges(n) { tom.cargas = clamp(n == null ? 3 : n, 0, MAX_CARGAS); },
      readyMame() { tom.mameCd = 0; },
      glitchNow() { if (e.kind === 'boss') startGlitch(); },
      spawnPickup() { spawnT = 0; },
      info() {
        return { state, level, att: att(), tom: { x: tom.x, y: tom.y, dir: tom.dir, jumps: tom.jumps, cargas: tom.cargas, mameCd: tom.mameCd, act: tom.act },
          enemy: { kind: e.kind, x: e.x, hp: e.hp, st: e.st, glitch: e.glitch, heavy: e.heavy }, clones: clones.length, pickups: pickups.map((q) => Math.round(q.x)),
          books: books.length, acid: acid.length, orbs: orbs.length, settled };
      },
    };
    window.__peleaDebug = debug;

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
        if (window.__peleaDebug === debug) delete window.__peleaDebug;
        dis = null;
        root.remove();
      },
    };
  };
})();
