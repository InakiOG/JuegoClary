// Minijuego "Ribera de Chapala": pescar en un lago contaminado junto a un centro de datos.
// Los peces mutantes muerden el anzuelo; hay que sacar el único pez dorado y sano (aparece a los 5 s).
// Contrato: Game.minijuegos.pesca(host) -> { done: Promise<boolean>, destroy() }.
// done se resuelve con true al sacar el pez sano (o con false si se llama a destroy() antes).
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 320, H = 180;              // resolución interna (pixel art)
  const HORIZON = 64;                  // línea del horizonte
  const SURFACE = 88;                  // superficie del agua (corte lateral)
  const BX0 = 6, BX1 = 314, BY0 = 97, BY1 = 170; // zona del anzuelo
  const GOLD_DELAY = 5;                // segundos hasta que aparece el pez sano
  const BITE_TIME = 1.2;               // duración de una mordida

  const DEFAULTS = {
    titulo: 'RIBERA DE CHAPALA',
    instrucciones: 'Mueve el anzuelo con el ratón. Haz clic para sacar el pez que lo muerda. Busca un pez sano.',
    malo: 'Este pez no se ve muy bien, seguiré buscando uno saludable.',
    gana: '¡Por fin, un pez sano!',
    empezar: '[ clic para empezar ]',
  };

  const CSS = `
.mj-pesca-root{position:absolute;inset:0;overflow:hidden;background:#000;user-select:none;-webkit-user-select:none;}
.mj-pesca-stage{position:absolute;left:0;top:0;overflow:hidden;font-family:"Lucida Console",Consolas,monospace;color:#e8e4cc;}
.mj-pesca-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:crisp-edges;image-rendering:pixelated;}
.mj-pesca-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(8,10,6,.72);padding:0 12%;box-sizing:border-box;}
.mj-pesca-title{font-size:13em;letter-spacing:.12em;color:#ffd45a;text-shadow:.08em .08em 0 #5a3a00;margin-bottom:.55em;}
.mj-pesca-ins{font-size:6.4em;line-height:1.45;max-width:100%;}
.mj-pesca-go{font-size:6.4em;margin-top:1.6em;color:#bfe88a;animation:mj-pesca-blink 1.1s steps(2,start) infinite;}
.mj-pesca-msg{position:absolute;left:6%;right:6%;top:5%;text-align:center;font-size:7em;font-style:italic;color:#ff3b4f;background:rgba(0,0,0,.62);padding:.35em .6em;box-sizing:border-box;text-shadow:.1em .1em 0 #000;pointer-events:none;transition:opacity .25s;opacity:0;}
.mj-pesca-msg.on{opacity:1;}
.mj-pesca-win{font-size:11em;color:#ffd45a;text-shadow:.08em .08em 0 #5a3a00;animation:mj-pesca-pop .35s ease-out;}
@keyframes mj-pesca-blink{to{visibility:hidden;}}
[class^="mj-pesca-"][hidden]{display:none!important;}
@keyframes mj-pesca-pop{from{transform:scale(.6);opacity:0;}to{transform:scale(1);opacity:1;}}
`;
  function injectCSS() {
    if (document.getElementById('mj-pesca-style')) return;
    const s = document.createElement('style');
    s.id = 'mj-pesca-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

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

  // --- fuente 3x5 para el letrero ---
  const FONT = {
    S: ['111', '100', '111', '001', '111'],
    H: ['101', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111'],
    T: ['111', '010', '010', '010', '010'],
    G: ['111', '100', '101', '101', '111'],
    P: ['111', '101', '111', '100', '100'],
    ' ': ['000', '000', '000', '000', '000'],
  };

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
  const PAL_A1 = { o: '#1e1424', b: '#7a4a8a', w: '#e8e8c0', k: '#c01010', x: '#e8e0d0', r: '#401018', t: '#e8e0d0', s: '#b0d040' };
  const PAL_A2 = { o: '#1a140c', b: '#6a5030', w: '#e8e8a0', k: '#101010', x: '#d8d0b8', r: '#3a1010', t: '#f0e8c8', s: '#9ad040' };
  const PAL_B1 = { o: '#141a0c', b: '#5a6a2a', w: '#f0f080', k: '#202020', x: '#d8d0b8', r: '#3a1414', s: '#9a4030' };
  const PAL_B2 = { o: '#18141e', b: '#6a5a7a', w: '#e0ffb0', k: '#a01010', x: '#e0d8c8', r: '#301020', s: '#a0c040' };
  const PAL_G = { o: '#6a3c00', y: '#f0c020', h: '#fff4a8', k: '#111111' };

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
      for (const [dx, dy] of [[1, 2], [3, 2], [2, 1], [2, 3], [1, 1], [3, 3], [1, 3], [3, 1]]) g.drawImage(sil, dx, dy);
      return c;
    }
    const rev = rows.map((r) => r.split('').reverse().join(''));
    return { w, h, mouthY, L: paint(rows), R: paint(rev), gL: glowColor ? glow(rows) : null, gR: glowColor ? glow(rev) : null };
  }

  Game.minijuegos.pesca = function (host) {
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.pesca) || {});
    injectCSS();

    // --- DOM ---
    const root = el('div', 'mj-pesca-root');
    const stage = el('div', 'mj-pesca-stage');
    const canvas = el('canvas', 'mj-pesca-canvas');
    canvas.width = W; canvas.height = H;
    const msgEl = el('div', 'mj-pesca-msg');
    const ov = el('div', 'mj-pesca-ov');
    ov.setAttribute('data-cursor', 'hand');
    ov.appendChild(el('div', 'mj-pesca-title', T.titulo));
    ov.appendChild(el('div', 'mj-pesca-ins', T.instrucciones));
    ov.appendChild(el('div', 'mj-pesca-go', T.empezar));
    stage.appendChild(canvas); stage.appendChild(msgEl); stage.appendChild(ov);
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
    fit();

    // --- audio propio (pitidos) ---
    let actx = null;
    function beep(f0, f1, dur, type, gain, delay) {
      try {
        if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
        if (actx.state === 'suspended') actx.resume();
        const t = actx.currentTime + (delay || 0);
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(gain || 0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + dur + 0.02);
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
      const SKY = ['#2a2720', '#36322a', '#433d31', '#504837', '#5e553e', '#6c6146', '#7a6e50'].map(hex);
      const FAR = ['#2f4a26', '#3e5a2a', '#5a7a2a', '#8a8a2a', '#5a4a6a', '#463a52'].map(hex);
      const DEEP = ['#8a9a30', '#5f8a30', '#40703a', '#2f5a3a', '#3a3e5e', '#4a2e52', '#2e2232', '#1e1a16'].map(hex);
      const MUD = hex('#2a2214'), MUD2 = hex('#3a2e1a');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const b = BAYER[(y & 3) * 4 + (x & 3)];
        let c;
        if (y < HORIZON) {
          const t = y / HORIZON + (fbm(x / 50, y / 10, 3) - 0.5) * 0.35;
          c = SKY[clamp(Math.floor(t * SKY.length + (b - 0.5)), 0, SKY.length - 1)];
          // sol enfermo tras el smog
          const ds = Math.hypot(x - 262, y - 22);
          if (ds < 8) c = hex(ds < 6 ? '#c8b878' : '#a89860');
          else if (ds < 13 && b < 0.5) c = hex('#8a7a56');
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
          const bottom = 171 + Math.round(fbm(x / 18, 5, 61) * 7);
          if (y >= bottom) c = (hash(x, y, 9) < 0.25) ? MUD2 : MUD;
        }
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const F = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

      // cerros al fondo
      for (let x = 0; x < W; x++) {
        const top = 47 + Math.round(fbm(x / 34, 1, 5) * 12);
        F(x, top, 1, HORIZON - top, '#3d382e');
        const top2 = 55 + Math.round(fbm(x / 20, 2, 6) * 7);
        F(x, top2, 1, HORIZON - top2, '#332f27');
      }
      // orilla izquierda
      F(0, 58, 132, 6, '#2e2a20');
      for (let x = 0; x < 136; x++) { const e = 62 + Math.round(vnoise(x / 6, 3, 8) * 3); F(x, e, 1, 3, '#3a3426'); }
      for (let x = 2; x < 130; x += 3) if (hash(x, 1, 2) < 0.6) F(x, 57 - (hash(x, 2, 2) * 2 | 0), 1, 2, '#5a5434'); // pasto seco

      // centro de datos
      F(14, 28, 92, 34, '#80858c');
      F(14, 28, 92, 2, '#5c6066');
      for (let y = 32; y < 60; y += 4) F(14, y, 92, 1, '#70757c');
      for (let x = 20; x < 100; x += 10) { F(x, 34, 6, 3, '#3a3e44'); F(x, 34, 6, 1, '#2a2d32'); } // ventilas
      for (let x = 18; x < 102; x += 7) for (let y = 41; y < 52; y += 3) F(x, y, 4, 1, '#5a5f66');
      F(54, 50, 10, 12, '#4a4e54'); F(55, 51, 8, 11, '#3a3d42');  // puerta
      F(106, 34, 6, 28, '#6a6f76'); F(111, 34, 1, 28, '#55595f');   // anexo
      // chimenea
      F(100, 14, 5, 14, '#6a6f76'); F(100, 14, 5, 1, '#4a4e54'); F(104, 14, 1, 14, '#55595f');
      // unidades de aire en el techo
      F(16, 24, 8, 4, '#9aa0a8'); F(17, 25, 6, 1, '#6a6f76');
      // letrero "SHIT GPT"
      F(28, 25, 2, 4, '#4a4e54'); F(92, 25, 2, 4, '#4a4e54');
      F(25, 9, 72, 16, '#2a2a2e');
      F(26, 10, 70, 14, '#ece6d6');
      const txt = 'SHIT GPT';
      for (let k = 0; k < txt.length; k++) {
        const glyph = FONT[txt[k]];
        for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++)
          if (glyph[j][i] === '1') F(30 + k * 8 + i * 2, 12 + j * 2, 2, 2, '#b4161c');
      }
      // tubo de desagüe hacia el lago
      F(106, 57, 18, 3, '#5a5040'); F(106, 57, 18, 1, '#7a6e58'); F(122, 56, 3, 5, '#4a4030');
      // cerca de malla ciclónica
      F(4, 45, 124, 1, '#8a8e94');
      for (let x = 4; x < 128; x += 2) F(x, 43 + (x & 2 ? 1 : 0), 1, 1, '#6a6e74'); // alambre de púas
      for (let y = 46; y < 63; y++) for (let x = 4; x < 128; x++)
        if (((x + y) & 3) === 0 || ((x - y + 400) & 3) === 0) { g.fillStyle = 'rgba(178,182,188,0.75)'; g.fillRect(x, y, 1, 1); }
      for (let x = 4; x < 130; x += 20) F(x, 43, 2, 21, '#5c6066');

      // basura flotando
      F(60, 79, 6, 8, '#b8a020'); F(60, 79, 6, 1, '#7a6a10'); F(60, 83, 6, 1, '#7a6a10'); F(62, 81, 2, 2, '#202020'); // barril
      F(250, 84, 6, 2, '#6a9aa0'); F(256, 84, 2, 1, '#4a7a80');                                                    // botella
      F(205, 74, 8, 2, '#202020'); F(206, 73, 6, 1, '#2a2a2a');                                                    // llanta
      // basura en el fondo
      discOn(g, 40, 174, 4, '#1a1a1a'); discOn(g, 40, 174, 2, '#2e2a20');                                          // llanta
      F(150, 172, 5, 3, '#8a2a2a'); F(151, 171, 3, 1, '#aa3a3a');                                                  // lata
      F(270, 170, 3, 6, '#6a9aa0');                                                                                // botella
      for (const x of [90, 205, 300]) for (let k = 0; k < 6; k++) F(x + (k & 1), 170 - k * 2, 1, 2, '#3a5a20');      // algas muertas
    })();

    // --- peces ---
    const GLOW = '#7dff4a';
    const SPR = {
      A1: makeSprite(FISH_A, PAL_A1, 4, GLOW), A2: makeSprite(FISH_A, PAL_A2, 4, GLOW),
      B1: makeSprite(FISH_B, PAL_B1, 4, GLOW), B2: makeSprite(FISH_B, PAL_B2, 4, GLOW),
      G: makeSprite(FISH_G, PAL_G, 3, null),
    };
    const rand = (a, b) => a + Math.random() * (b - a);
    function newFish(spr, golden) {
      const f = {
        spr, golden, cx: rand(BX0 + 20, BX1 - 20), cy: rand(BY0 + 8, BY1 - 8),
        heading: Math.random() < 0.5 ? 0 : Math.PI, dir: 1,
        base: golden ? 40 : rand(14, 22), tx: 0, ty: 0, retarget: 0, cooldown: 0,
        st: 'swim', interest: Math.random() < 0.5, interestT: rand(2, 5), phase: Math.random() * 6.28,
        fly: null,
      };
      f.dir = Math.cos(f.heading) >= 0 ? 1 : -1;
      pickTarget(f);
      return f;
    }
    function pickTarget(f) {
      f.tx = rand(BX0 + 14, BX1 - 14);
      f.ty = rand(BY0 + 6, BY1 - 6);
      f.retarget = rand(3, 7);
    }
    function mouth(f) {
      const x0 = Math.round(f.cx - f.spr.w / 2), y0 = Math.round(f.cy - f.spr.h / 2);
      return { x: f.dir < 0 ? x0 : x0 + f.spr.w - 1, y: y0 + f.spr.mouthY };
    }
    // Coloca el pez para que su boca quede en (mx, my).
    function placeMouth(f, mx, my) {
      f.cx = f.dir < 0 ? mx + f.spr.w / 2 : mx - f.spr.w / 2 + 1;
      f.cy = my - f.spr.mouthY + f.spr.h / 2;
    }
    const fish = [newFish(SPR.A1), newFish(SPR.B1), newFish(SPR.A2), newFish(SPR.B2), newFish(SPR.A1)];
    let gold = null;

    // --- estado ---
    let state = 'intro';          // intro | play | reel | won
    let playT = 0, t = 0;
    const hook = { x: 232, y: 128 };
    let hookSpeed = 0, lastHX = hook.x, lastHY = hook.y;
    let bite = null;              // { f, t }
    let reel = null;              // { f, t, sx, sy }
    const parts = [];
    const timers = [];
    let alive = true, raf = 0, last = 0;
    let resolveDone;
    const done = new Promise((res) => { resolveDone = res; });
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };

    function boatBob() { return Math.round(Math.sin(t * 1.6) * 1.1); }
    function rodTip() { return { x: 230, y: 34 + boatBob() }; }
    const HAND = { x: 194, y: 70 }; // donde cae el pez al sacarlo

    function splash(x, y, n, up) {
      for (let i = 0; i < n; i++) parts.push({
        x, y, vx: rand(-30, 30), vy: up ? rand(-60, -25) : rand(-20, -5), g: up ? 140 : -30,
        life: rand(0.35, 0.7), c: up ? (Math.random() < 0.5 ? '#c8e090' : '#e8f0c0') : '#b8d890',
      });
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
      hook.x = clamp(p.x, BX0, BX1);
      hook.y = clamp(p.y, BY0, BY1);
    }
    function onDown(e) {
      if (e.button !== 0 || state === 'intro' || state === 'won') return;
      onMove(e);
      if (state !== 'play') return;
      if (bite) {
        const f = bite.f;
        bite = null;
        f.st = 'reel';
        reel = { f, t: 0, sx: f.cx, sy: f.cy };
        state = 'reel';
        splash(f.cx, SURFACE, 10, true);
        beep(300, 900, 0.18, 'square', 0.05);
      } else {
        for (let i = 0; i < 4; i++) parts.push({ x: hook.x + rand(-2, 2), y: hook.y, vx: rand(-4, 4), vy: rand(-25, -12), g: -10, life: rand(0.5, 0.9), c: '#b8d890' });
        snd('tick');
      }
    }
    function onStart(e) {
      if (state !== 'intro') return;
      e.stopPropagation();
      ov.hidden = true;
      ov.innerHTML = '';
      state = 'play';
      playT = 0;
      beep(440, 660, 0.12, 'square', 0.04);
    }
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mousedown', onDown);
    ov.addEventListener('click', onStart);

    function showMsg(text) {
      msgEl.textContent = text;
      msgEl.classList.add('on');
      if (showMsg.id) clearTimeout(showMsg.id);
      showMsg.id = later(() => msgEl.classList.remove('on'), 3000);
    }

    // --- lógica ---
    function steer(f, tx, ty, spd, turn, dt) {
      const want = Math.atan2((ty - f.cy) * 1.6, tx - f.cx);
      let diff = want - f.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      f.heading += clamp(diff, -turn * dt, turn * dt);
      f.cx += Math.cos(f.heading) * spd * dt;
      f.cy += Math.sin(f.heading) * spd * 0.55 * dt;
      const c = Math.cos(f.heading);
      if (c > 0.2) f.dir = 1; else if (c < -0.2) f.dir = -1;
      const hw = f.spr.w / 2, hh = f.spr.h / 2;
      f.cx = clamp(f.cx, BX0 - 30 + hw, BX1 + 30 - hw);
      f.cy = clamp(f.cy, BY0 + hh - 4, BY1 - hh + 4);
    }

    function updateFish(f, dt) {
      if (f.st === 'thrown') {
        const fl = f.fly;
        fl.t += dt / 0.7;
        if (fl.t >= 1) {
          f.st = 'swim'; f.cx = fl.x1; f.cy = fl.y1; f.cooldown = 2.5; f.fly = null; pickTarget(f);
        } else {
          const k = fl.t;
          f.cx = fl.x0 + (fl.x1 - fl.x0) * k;
          f.cy = fl.y0 + (fl.y1 - fl.y0) * k - Math.sin(Math.PI * k) * 40;
          if (!fl.splashed && f.cy > SURFACE && k > 0.5) { fl.splashed = true; splash(f.cx, SURFACE, 12, true); }
        }
        return;
      }
      if (f.st !== 'swim') return;
      f.cooldown -= dt;
      f.retarget -= dt;
      f.interestT -= dt;
      if (f.interestT <= 0) { f.interest = Math.random() < (f.golden ? 0.55 : 0.45); f.interestT = rand(2.5, 5); }
      if (f.retarget <= 0 || Math.hypot(f.tx - f.cx, f.ty - f.cy) < 6) pickTarget(f);

      let tx = f.tx, ty = f.ty, spd = f.base, turn = f.golden ? 4 : 2.2;
      const m = mouth(f);
      const dx = hook.x - m.x, dy = hook.y - m.y, d = Math.hypot(dx, dy);
      if (state === 'play' && f.cooldown <= 0 && !bite) {
        if (f.golden) {
          if (hookSpeed > 80 && d < 40) {             // el anzuelo se mueve mucho: huye
            tx = clamp(f.cx - dx * 3, BX0, BX1); ty = clamp(f.cy - dy * 3, BY0, BY1); spd *= 1.5; turn = 6;
          } else if (f.interest && d < 60) {          // anzuelo quieto: se acerca con curiosidad
            tx = f.cx + dx; ty = f.cy + dy; spd *= 0.75;
          }
        } else if (f.interest && d < 48 && hookSpeed < 150) {
          tx = f.cx + dx; ty = f.cy + dy; spd *= 0.9;
        }
      }
      steer(f, tx, ty, spd, turn, dt);

      if (state === 'play' && !bite && f.cooldown <= 0) {
        const m2 = mouth(f);
        if (Math.hypot(hook.x - m2.x, hook.y - m2.y) < 4.5) {
          bite = { f, t: 0 };
          f.st = 'bite';
          beep(880, 660, 0.06, 'square', 0.04); beep(880, 660, 0.06, 'square', 0.04, 0.09);
        }
      }
    }

    function update(dt) {
      t += dt;
      hookSpeed += ((Math.hypot(hook.x - lastHX, hook.y - lastHY) / Math.max(dt, 0.001)) - hookSpeed) * Math.min(1, dt * 8);
      lastHX = hook.x; lastHY = hook.y;
      if (state !== 'intro') playT += dt;

      if (!gold && state !== 'intro' && playT >= GOLD_DELAY) {
        gold = newFish(SPR.G, true);
        const left = Math.random() < 0.5;
        gold.cx = left ? BX0 - 8 : BX1 + 8;
        gold.cy = rand(BY0 + 15, BY1 - 15);
        gold.heading = left ? 0 : Math.PI;
        gold.dir = left ? 1 : -1;
        gold.tx = left ? rand(80, 160) : rand(160, 240);
        gold.ty = gold.cy;
        fish.push(gold);
      }

      for (const f of fish) updateFish(f, dt);

      if (bite) {
        bite.t += dt;
        placeMouth(bite.f, hook.x, hook.y);
        if (bite.t >= BITE_TIME) {        // se suelta
          bite.f.st = 'swim'; bite.f.cooldown = 2; pickTarget(bite.f);
          bite = null;
        }
      }

      if (reel) {
        reel.t += dt / 0.6;
        const f = reel.f, k = Math.min(1, reel.t);
        f.cx = reel.sx + (HAND.x - reel.sx) * k;
        f.cy = reel.sy + (HAND.y - reel.sy) * k - Math.sin(Math.PI * k) * 30;
        if (reel.t >= 1) {
          reel = null;
          if (f.golden) {
            state = 'won';
            f.st = 'caught';
            ov.innerHTML = '';
            ov.appendChild(el('div', 'mj-pesca-win', T.gana));
            ov.style.background = 'rgba(8,10,6,.35)';
            ov.hidden = false;
            [523, 659, 784, 1047].forEach((fq, i) => beep(fq, fq, 0.14, 'square', 0.045, i * 0.11));
            snd('message', true);
            later(() => { resolveDone(true); }, 1500);
          } else {
            state = 'play';
            showMsg(T.malo);
            snd('glitch');
            beep(220, 90, 0.3, 'sawtooth', 0.04);
            f.st = 'thrown';
            f.fly = { t: 0, x0: f.cx, y0: f.cy, x1: rand(BX0 + 20, BX1 - 20), y1: rand(BY0 + 25, BY1 - 10) };
            if (Math.abs(f.fly.x1 - HAND.x) < 40) f.fly.x1 = f.fly.x1 < HAND.x ? HAND.x - 70 : HAND.x + 70;
          }
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
      if (Math.random() < dt * 1.5) parts.push({ x: rand(10, 310), y: 170, vx: 0, vy: -rand(10, 20), g: -6, life: 4, c: '#9ac060' });
    }

    // --- dibujo ---
    function drawFish(f) {
      const s = f.spr;
      let x0 = Math.round(f.cx - s.w / 2), y0 = Math.round(f.cy - s.h / 2);
      if (f.st === 'bite') { x0 += Math.round(rand(-1, 1)); y0 += Math.round(rand(-1, 1)); }
      if (f.st === 'swim') y0 += Math.round(Math.sin(t * 3 + f.phase) * 0.6);
      const img = f.dir < 0 ? s.L : s.R;
      if (s.gL) {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 4 + f.phase);
        ctx.drawImage(f.dir < 0 ? s.gL : s.gR, x0 - 2, y0 - 2);
      }
      ctx.globalAlpha = f.st === 'swim' || f.st === 'bite' ? 0.92 : 1;
      ctx.drawImage(img, x0, y0);
      ctx.globalAlpha = 1;
      if (f.golden && (Math.floor(t * 3 + f.phase) % 3 === 0)) { // destello
        R(x0 + 4, y0 - 1, 1, 1, '#fffbe0'); R(x0 + 3, y0, 3, 1, 'rgba(255,250,210,.6)');
      }
    }

    function drawBoat() {
      const by = boatBob();
      // pescador
      R(161, 55 + by, 11, 6, '#d8b860'); R(161, 59 + by, 11, 1, '#8a5a2a');         // copa del sombrero + cinta
      R(163, 54 + by, 7, 1, '#c8a850');
      R(155, 61 + by, 23, 1, '#e8c870'); R(156, 62 + by, 21, 1, '#a88a40');           // ala
      R(163, 63 + by, 8, 5, '#d0985e'); R(169, 64 + by, 1, 1, '#2a1a10'); R(171, 65 + by, 1, 1, '#c08850'); // cara
      R(163, 63 + by, 8, 1, '#8a5a30');                                                // sombra del ala
      R(160, 68 + by, 13, 15, '#e8782a'); R(160, 68 + by, 2, 15, '#c25a1a');           // camisa
      R(164, 69 + by, 1, 1, '#fff2d0'); R(164, 72 + by, 1, 1, '#fff2d0');             // botones
      R(171, 70 + by, 6, 3, '#e8782a'); R(176, 72 + by, 5, 3, '#d86a22');               // brazo
      R(180, 71 + by, 3, 4, '#d0985e');                                                // manos
      // caña
      lineOn(ctx, 178, 77 + by, 230, 34 + by, '#3a2614');
      lineOn(ctx, 181, 75 + by, 196, 63 + by, '#5a3e22');
      R(181, 74 + by, 3, 3, '#8a8e94'); R(182, 75 + by, 1, 1, '#4a4e54');              // carrete
      // cubeta
      R(186, 76 + by, 7, 7, '#7a8088'); R(186, 76 + by, 7, 1, '#a0a6ae');
      // casco
      for (let r = 0; r <= 10; r++) {
        const y = 82 + r + by, l = 143 + Math.round(r * 0.9), rr = 199 - Math.round(r * 0.9);
        let c = r === 0 ? '#a06e3c' : (r === 3 || r === 7) ? '#5a3418' : '#7a4a24';
        if (y > SURFACE) c = r === 7 ? '#3a3018' : '#4e4426';
        R(l, y, rr - l, 1, c);
      }
      R(143, 81 + by, 3, 2, '#a06e3c'); R(196, 81 + by, 3, 2, '#a06e3c');
      // línea de flotación
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
        ctx.fillStyle = y > SURFACE ? 'rgba(220,220,200,.55)' : '#dcdcc8';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }

    function drawHook(x, y) {
      x = Math.round(x); y = Math.round(y);
      R(x, y - 3, 1, 4, '#c8ccd2'); R(x + 1, y, 1, 1, '#c8ccd2'); R(x + 2, y - 1, 1, 1, '#c8ccd2');
      R(x - 1, y - 4, 3, 1, '#8a2020'); // plomada/carnada
    }

    function drawBang(x, y) {
      x = Math.round(x); y = Math.round(y) + Math.round(Math.sin(t * 14));
      R(x - 1, y - 1, 3, 7, '#2a0a0a');
      R(x - 1, y + 5, 3, 3, '#2a0a0a');
      R(x, y, 1, 4, '#ffe040'); R(x, y + 6, 1, 1, '#ffe040');
    }

    function render() {
      ctx.drawImage(bg, 0, 0);
      // luces y humo del centro de datos
      if (Math.floor(t * 1.2) % 2 === 0) { R(15, 23, 1, 1, '#ff3030'); R(103, 12, 1, 1, '#ff3030'); }
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.22 + i / 6) % 1;
        ctx.globalAlpha = 0.45 * (1 - ph);
        discOn(ctx, 102 + ph * 34, 12 - ph * 12, Math.round(1 + ph * 4), '#8a8478');
      }
      ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) { // lodo verde que sale del tubo
        const yy = 60 + ((Math.floor(t * 12) + k * 2) % 6);
        R(124, yy, 1, 1, '#7ad040');
      }
      // brillos en el agua lejana
      for (let i = 0; i < 7; i++) {
        const y = HORIZON + 3 + (i * 7) % 22, x = ((i * 53 + t * (6 + i)) % (W + 20)) - 10;
        R(x, y, 4 + (i & 1) * 3, 1, 'rgba(230,240,180,.35)');
      }
      // superficie
      for (let x = 0; x < W; x++) {
        const y = SURFACE + Math.round(Math.sin(x * 0.21 + t * 2.2) * 0.6);
        R(x, y, 1, 1, (x + Math.floor(t * 4)) % 5 === 0 ? '#d8f0b0' : 'rgba(190,220,140,.55)');
      }

      for (const f of fish) if (f.st === 'swim' || f.st === 'bite') drawFish(f);
      drawBoat();

      const tip = rodTip();
      if (reel) {
        const m = mouth(reel.f);
        drawLine(tip.x, tip.y, m.x, m.y);
      } else if (state === 'won' && gold) {
        // el pez sano cuelga de la caña
        gold.dir = -1;
        placeMouth(gold, tip.x, tip.y + 14 + Math.round(Math.sin(t * 5)));
        lineOn(ctx, tip.x, tip.y, tip.x, tip.y + 14, '#dcdcc8');
      } else {
        drawLine(tip.x, tip.y, hook.x, hook.y);
        drawHook(hook.x, hook.y);
      }
      for (const f of fish) if (f.st === 'reel' || f.st === 'thrown' || f.st === 'caught') drawFish(f);
      if (bite) drawBang(hook.x, hook.y - 14);
      if (state === 'won' && gold) {
        for (let i = 0; i < 6; i++) {
          const a = t * 2 + i * 1.047, r = 10 + Math.sin(t * 3 + i) * 2;
          R(gold.cx + Math.cos(a) * r, gold.cy + Math.sin(a) * r * 0.7, 1, 1, i & 1 ? '#fff4a8' : '#ffd45a');
        }
      }
      for (const p of parts) R(p.x, p.y, 1, 1, p.c);
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
        root.removeEventListener('mousedown', onDown);
        ov.removeEventListener('click', onStart);
        if (actx) { try { actx.close(); } catch (e) { /* nada */ } }
        root.remove();
        resolveDone(false); // no-op si ya se resolvió con true
      },
    };
  };
})();
