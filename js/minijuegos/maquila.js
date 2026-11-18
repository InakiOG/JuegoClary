// Minijuego "Silicon Valley": el jugador es el jefe de una maquila húmeda y oxidada.
// 20 trabajadores teclean sin parar; hay que atender sus necesidades (gota amarilla = baño,
// gota azul = sed) durante 60 s sin que nadie se desmaye.
// Contrato: Game.minijuegos.maquila(host) -> { done: Promise<boolean>, destroy() }.
// done solo se resuelve (con true) al sobrevivir el minuto; al perder se reintenta dentro del juego.
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 320, H = 180;          // resolución interna (pixel art)
  const DURACION = 60;             // segundos del turno
  const PEE_TIME = 6;              // segundos para atender la gota amarilla
  const THIRST_TIME = 7;           // segundos para atender la gota azul
  const SOLO_PIS = 5;              // primeros segundos: solo gotas amarillas

  const DEFAULTS = {
    titulo: 'SILICON VALLEY',
    instrucciones: 'Eres el jefe. Mantén a todos trabajando durante 1 minuto. Si alguien necesita ir al baño (gota amarilla), haz clic para darle una botella. Si alguien tiene sed (gota azul), haz clic para darle una botella llena. Nadie se levanta del escritorio.',
    desmayo: 'Un trabajador se desmayó por deshidratación.',
    reintentar: '[ clic para volver a intentar ]',
    gana: 'Turno terminado. Todos siguen despiertos.',
    inventario: 'Botellas llenas',
    empezar: '[ clic para empezar ]',
    sinBotellas: 'No tienes botellas llenas',
  };

  const CSS = `
.mj-maq-root{position:absolute;inset:0;overflow:hidden;background:#0b0a08;user-select:none;-webkit-user-select:none;}
.mj-maq-stage{position:absolute;left:0;top:0;overflow:hidden;font-family:"Lucida Console",Consolas,monospace;color:#e8e0c8;}
.mj-maq-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:crisp-edges;image-rendering:pixelated;}
.mj-maq-timer{position:absolute;top:0.6%;left:50%;transform:translateX(-50%);font-size:11em;color:#ffdf6b;text-shadow:0 0 .25em #000,.08em .08em 0 #000;pointer-events:none;letter-spacing:.05em;}
.mj-maq-timer.mj-maq-urge{color:#ff6b5a;}
.mj-maq-inv{position:absolute;top:2%;left:1.5%;font-size:5.5em;background:rgba(0,0,0,.6);padding:.25em .55em;display:flex;align-items:center;gap:.5em;pointer-events:none;border:1px solid rgba(242,212,58,.35);}
.mj-maq-bot{position:relative;display:inline-block;width:.55em;height:1.05em;background:#f2d43a;border-radius:.18em .18em .08em .08em;box-shadow:inset -.12em 0 0 rgba(0,0,0,.25);margin-top:.2em;}
.mj-maq-bot::before{content:"";position:absolute;left:.12em;top:-.3em;width:.31em;height:.3em;background:#d8d8d8;}
.mj-maq-inv b{color:#f2d43a;font-weight:normal;}
.mj-maq-inv.mj-maq-pop{border-color:#f2d43a;}
.mj-maq-hint{position:absolute;top:13%;left:50%;transform:translateX(-50%);font-size:6em;background:rgba(110,10,10,.88);color:#fff;padding:.3em .7em;white-space:nowrap;pointer-events:none;border:1px solid #ff8a7a;}
.mj-maq-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(6,6,3,.8);padding:0 9%;box-sizing:border-box;}
.mj-maq-ov h1{margin:0 0 .5em;font-size:17em;font-weight:bold;color:#c9d86a;letter-spacing:.08em;text-shadow:.07em .07em 0 #3a2a10;}
.mj-maq-ov p{margin:0 0 1.2em;font-size:6em;line-height:1.55;color:#e8e0c8;}
.mj-maq-ov .mj-maq-big{font-size:9em;line-height:1.4;color:#ffdf6b;}
.mj-maq-ov .mj-maq-bad{color:#ff7a6a;}
.mj-maq-cta{font-size:7em;color:#9fe0a0;animation:mj-maq-blink 1s steps(2,start) infinite;}
@keyframes mj-maq-blink{to{visibility:hidden;}}
[class^="mj-maq-"][hidden]{display:none!important;}
`;

  function injectCSS() {
    if (document.getElementById('mj-maq-style')) return;
    const s = document.createElement('style');
    s.id = 'mj-maq-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

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

  // --- sonidos mínimos (Web Audio, contexto perezoso) ---
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

  const SHIRTS = ['#8a3b3b', '#3b5a8a', '#4f7a3a', '#8a7a3a', '#6a3b7a', '#3a7a74', '#9a5a2a', '#5a5a5a', '#a04a6a', '#2f4a6a'];
  const HAIRS = ['#1a1410', '#3a2414', '#5a3a1a', '#0e0e12', '#7a5a30', '#2a2420', '#8a8a80'];
  const SKINS = ['#c89a72', '#a87452', '#e0b48c', '#8a5a3a', '#d8a880'];

  Game.minijuegos.maquila = function (host) {
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.maquila) || {});
    injectCSS();

    // --- DOM ---
    const root = el('div', 'mj-maq-root');
    const stage = el('div', 'mj-maq-stage');
    const canvas = el('canvas', 'mj-maq-canvas');
    canvas.width = W; canvas.height = H;
    stage.appendChild(canvas);
    const timerEl = el('div', 'mj-maq-timer', '1:00');
    const invEl = el('div', 'mj-maq-inv');
    const invBot = el('span', 'mj-maq-bot');
    const invTxt = el('span');
    invEl.appendChild(invBot); invEl.appendChild(invTxt);
    const hintEl = el('div', 'mj-maq-hint', T.sinBotellas);
    hintEl.hidden = true;
    const ov = el('div', 'mj-maq-ov');
    stage.appendChild(timerEl); stage.appendChild(invEl); stage.appendChild(hintEl); stage.appendChild(ov);
    root.appendChild(stage);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function showOverlay(parts) {
      ov.innerHTML = '';
      for (const p of parts) ov.appendChild(el(p[0], p[1] || '', p[2]));
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

    // --- fondo estático (pre-renderizado) ---
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function buildBG() {
      const g = bg.getContext('2d');
      const rnd = mulberry32(1337);
      const pick = (a) => a[Math.floor(rnd() * a.length)];
      const F = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
      // pared
      F(0, 0, W, 31, '#4a4930');
      for (let i = 0; i < 90; i++) F(rnd() * W, rnd() * 29, 3 + rnd() * 22, 1 + rnd() * 7, pick(['#3e3e26', '#55533a', '#43402a', '#5c5b3b', '#4a4228']));
      // ventanuco con barrotes
      F(58, 9, 28, 13, '#1e2420'); F(59, 10, 26, 11, '#4e5c50');
      for (let x = 61; x < 85; x += 4) F(x, 10, 1, 11, '#262620');
      F(212, 10, 22, 11, '#1e2420'); F(213, 11, 20, 9, '#47554a');
      for (let x = 215; x < 233; x += 4) F(x, 11, 1, 9, '#262620');
      // manchas de humedad grandes
      for (let i = 0; i < 8; i++) {
        const x = rnd() * W, w = 10 + rnd() * 30;
        for (let k = 0; k < 6; k++) F(x + rnd() * w - w / 2, 5 + rnd() * 18, 4 + rnd() * 10, 2 + rnd() * 5, 'rgba(30,34,18,0.35)');
      }
      // tubería
      F(0, 2, W, 4, '#2c281e'); F(0, 2, W, 1, '#5a4630'); F(0, 5, W, 1, '#1a1812');
      for (let x = 20; x < W; x += 48) F(x, 1, 3, 6, '#3a2c1c');
      // chorretones de óxido
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rnd() * W), len = 6 + Math.floor(rnd() * 22);
        for (let y = 0; y < len; y++) F(x + (rnd() < 0.12 ? 1 : 0), 6 + y, 1 + (y < len * 0.4 ? 1 : 0), 1, y < len * 0.5 ? '#7a3e1c' : '#5e3a20');
      }
      // zócalo
      F(0, 28, W, 3, '#26221a'); F(0, 28, W, 1, '#3a3222');
      // suelo
      F(0, 31, W, H - 31, '#37332a');
      for (let y = 31, row = 0; y < H; y += 12, row++) {
        F(0, y, W, 1, '#2e2a22');
        for (let x = (row % 2) * 10; x < W; x += 20) F(x, y, 1, 12, '#2e2a22');
      }
      for (let i = 0; i < 70; i++) F(rnd() * W, 32 + rnd() * (H - 32), 2 + rnd() * 14, 1 + rnd() * 4, pick(['#2c2922', '#302c24', '#3d3a30', '#33302a']));
      // charcos
      for (let i = 0; i < 7; i++) {
        const x = rnd() * W, y = 40 + rnd() * (H - 45), w = 8 + rnd() * 18;
        F(x, y, w, 3, '#2f3a3a'); F(x + 2, y - 1, w - 4, 1, '#2f3a3a'); F(x + 3, y + 1, w * 0.4, 1, '#48585a');
      }
      // viñeta
      const vg = g.createRadialGradient(W * 0.5, H * 0.35, 40, W * 0.5, H * 0.5, 230);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    })();

    // --- trabajadores ---
    const workers = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        workers.push({
          x: 30 + c * 56, y: 40 + r * 27,
          shirt: SHIRTS[(r * 4 + c * 3 + r) % SHIRTS.length],
          hair: HAIRS[Math.floor(Math.random() * HAIRS.length)],
          skin: SKINS[Math.floor(Math.random() * SKINS.length)],
          style: Math.floor(Math.random() * 3),
          ph: Math.random() * 10,
          need: null, needT: 0, needMax: 1, warned: false,
          away: 0, cool: 0, faint: false, fx: null, fxT: 0,
        });
      }
    }

    // --- estado de la partida ---
    let state = 'intro';       // intro | play | lost | won | over
    let elapsed = 0, inv = 0, peeTimer = 0, thirstTimer = 0, endT = 0, hintT = 0, popT = 0;
    let lastSec = -1, lastInv = -1;
    let clock = 0;             // tiempo para animaciones
    let lamp = 1, lampTimer = 3, flickT = 0;
    const drips = [];
    let dripTimer = 0.5;

    function resetRound() {
      elapsed = 0; inv = 0; endT = 0; hintT = 0;
      peeTimer = 0.8; thirstTimer = 1.2;
      for (const w of workers) {
        w.need = null; w.needT = 0; w.away = 0; w.cool = 0; w.faint = false; w.fx = null; w.fxT = 0; w.warned = false;
      }
      lastSec = -1; lastInv = -1;
      hintEl.hidden = true;
      updateHUD();
    }

    let resolveDone;
    let settled = false;
    const done = new Promise((res) => { resolveDone = res; });
    function finish(v) {
      if (settled) return;
      settled = true;
      resolveDone(v);
    }

    function startRound() {
      resetRound();
      state = 'play';
      ov.hidden = true;
      beep(440, 0.08, 'square', 0.05, 660);
    }

    function lose() {
      state = 'lost';
      endT = 0;
      beep(320, 0.7, 'sawtooth', 0.06, 50);
      showOverlay([['p', 'mj-maq-big mj-maq-bad', T.desmayo], ['div', 'mj-maq-cta', T.reintentar]]);
    }

    function win() {
      state = 'won';
      endT = 0;
      [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 'square', 0.05, null, i * 0.11));
      showOverlay([['p', 'mj-maq-big', T.gana]]);
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
        invTxt.innerHTML = '';
        invTxt.appendChild(document.createTextNode(T.inventario + ': '));
        invTxt.appendChild(el('b', '', String(inv)));
      }
    }

    function counts() {
      let pee = 0, thirst = 0;
      for (const w of workers) {
        if (w.need === 'pee') pee++;
        else if (w.need === 'thirst') thirst++;
      }
      return { pee, thirst };
    }

    function spawnNeed(kind) {
      const free = workers.filter((w) => !w.need && w.away <= 0 && !w.faint && w.cool <= 0);
      if (!free.length) return false;
      const w = free[Math.floor(Math.random() * free.length)];
      w.need = kind;
      w.needMax = kind === 'pee' ? PEE_TIME : THIRST_TIME;
      w.needT = w.needMax;
      w.warned = false;
      beep(kind === 'pee' ? 880 : 620, 0.05, 'sine', 0.04, kind === 'pee' ? 1100 : 820);
      return true;
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
        drips.push({ x: Math.floor(rand(4, W - 4)), y: 6, vy: 10, ty: rand(36, H - 4), splash: 0 });
      }
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        if (d.splash > 0) {
          d.splash -= dt;
          if (d.splash <= 0) drips.splice(i, 1);
          continue;
        }
        d.vy += 260 * dt;
        d.y += d.vy * dt;
        if (d.y >= d.ty) { d.y = d.ty; d.splash = 0.18; }
      }

      for (const w of workers) {
        if (w.fxT > 0) { w.fxT -= dt; if (w.fxT <= 0) w.fx = null; }
      }
      if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintEl.hidden = true; }
      if (popT > 0) { popT -= dt; if (popT <= 0) invEl.classList.remove('mj-maq-pop'); }

      if (state === 'play') {
        elapsed += dt;
        const p = Math.min(1, elapsed / DURACION);

        for (const w of workers) {
          if (w.cool > 0) w.cool -= dt;
          if (w.away > 0) w.away -= dt;
          if (!w.need) continue;
          w.needT -= dt;
          if (!w.warned && w.needT < w.needMax * 0.3) {
            w.warned = true;
            if (w.need === 'thirst') beep(300, 0.08, 'square', 0.035);
          }
          if (w.needT <= 0) {
            if (w.need === 'pee') {
              // se levanta y se va un rato: oportunidad perdida
              w.need = null;
              w.away = rand(3, 4.5);
              w.cool = w.away + 1;
            } else {
              w.need = null;
              w.faint = true;
              lose();
              return;
            }
          }
        }

        if (elapsed >= DURACION) {
          elapsed = DURACION;
          updateHUD();
          win();
          return;
        }

        const c = counts();
        const maxPee = Math.round(lerp(3, 6, p));
        const maxThirst = Math.round(lerp(2, 4, p));

        peeTimer -= dt;
        if (peeTimer <= 0) {
          if (c.pee < maxPee && spawnNeed('pee')) { peeTimer = rand(lerp(2.4, 1.2, p), lerp(3.4, 1.9, p)); c.pee++; }
          else peeTimer = 0.3;
        }
        if (elapsed >= SOLO_PIS) {
          thirstTimer -= dt;
          if (thirstTimer <= 0) {
            // Justo: solo hay sed si las botellas disponibles (o por conseguir) superan a los sedientos.
            if (c.thirst < maxThirst && inv + c.pee > c.thirst && spawnNeed('thirst')) {
              thirstTimer = rand(lerp(3.6, 1.8, p), lerp(4.8, 2.7, p));
            } else thirstTimer = 0.4;
          }
        }
        updateHUD();
      } else if (state === 'lost') {
        endT += dt;
      } else if (state === 'won') {
        endT += dt;
        if (endT >= 2) { state = 'over'; finish(true); }
      }
    }

    // --- render ---
    function drawWorker(w) {
      const x = w.x, y = w.y, t = clock;
      // sombra
      R(x + 10, y + 26, 24, 1, 'rgba(0,0,0,0.35)');
      // mesa
      R(x + 4, y + 8, 36, 6, '#5b4a33');
      R(x + 4, y + 8, 36, 1, '#6e5a40');
      R(x + 4, y + 13, 36, 1, '#3a2f20');
      R(x + 5, y + 14, 2, 9, '#2a2218');
      R(x + 37, y + 14, 2, 9, '#2a2218');
      R(x + 33, y + 9, 3, 2, '#7a3e1c'); // mancha de óxido
      // monitor
      R(x + 13, y - 1, 18, 10, '#6d6a5c');
      R(x + 13, y - 1, 18, 1, '#828070');
      R(x + 13, y + 8, 18, 1, '#4a483e');
      R(x + 20, y + 9, 4, 1, '#4a483e');
      const on = !w.faint;
      const glowA = 0.85 + 0.15 * Math.sin(t * 9 + w.ph);
      R(x + 15, y + 1, 14, 6, on ? 'rgba(110,224,196,' + glowA.toFixed(2) + ')' : '#24423e');
      if (on && w.away <= 0) {
        for (let i = 0; i < 3; i++) {
          const len = 2 + (Math.floor(t * 5 + w.ph * 3 + i * 3) % 9);
          R(x + 16, y + 2 + i * 2, len, 1, '#2d7a68');
        }
      }
      R(x + 11, y + 9, 22, 2, 'rgba(120,230,200,0.12)');
      // teclado
      R(x + 15, y + 10, 14, 2, '#9a978a');
      R(x + 15, y + 11, 14, 1, '#6b685d');

      if (w.away > 0) {
        // silla vacía
        R(x + 15, y + 19, 14, 6, '#2b2b2e');
        R(x + 15, y + 19, 14, 1, '#3e3e44');
        R(x + 16, y + 25, 2, 1, '#1a1a1c'); R(x + 26, y + 25, 2, 1, '#1a1a1c');
        return;
      }

      if (w.faint) {
        // desplomado sobre la mesa
        R(x + 15, y + 13, 14, 9, w.shirt);
        R(x + 10, y + 9, 9, 2, w.shirt);
        R(x + 25, y + 9, 9, 2, w.shirt);
        R(x + 9, y + 9, 2, 2, w.skin); R(x + 33, y + 9, 2, 2, w.skin);
        R(x + 17, y + 5, 10, 3, w.hair);
        R(x + 17, y + 8, 10, 4, w.skin);
        R(x + 17, y + 8, 2, 4, w.hair);
        sprite(['#.#', '.#.', '#.#'], x + 21, y + 8, { '#': '#1a0a0a' });
        R(x + 25, y + 11, 2, 1, '#6a2a2a');
        R(x + 15, y + 20, 14, 5, '#2b2b2e');
        R(x + 15, y + 20, 14, 1, '#3e3e44');
        const zy = (t * 7) % 12;
        sprite(ZMAP, x + 30, y + 2 - zy, { '#': 'rgba(200,220,255,' + (1 - zy / 12).toFixed(2) + ')' });
        sprite(ZMAP, x + 35, y - 3 - ((zy + 6) % 12) * 0.8, { '#': 'rgba(200,220,255,0.6)' });
        return;
      }

      let dx = 0;
      if (w.need === 'pee') dx = Math.sin(t * 22 + w.ph) > 0 ? 1 : 0; // se retuerce
      const thirsty = w.need === 'thirst';
      const a = Math.sin(t * (thirsty ? 3 : 15) + w.ph) > 0;
      // brazos y manos sobre el teclado
      R(x + 14 + dx, y + 12 + (a ? 0 : 1), 3, 6, w.shirt);
      R(x + 15 + dx, y + 11 + (a ? 0 : 1), 2, 1, w.skin);
      R(x + 27 + dx, y + 12 + (a ? 1 : 0), 3, 6, w.shirt);
      R(x + 27 + dx, y + 11 + (a ? 1 : 0), 2, 1, w.skin);
      // torso
      R(x + 15 + dx, y + 16, 14, 9, w.shirt);
      R(x + 27 + dx, y + 17, 2, 8, 'rgba(0,0,0,0.25)');
      R(x + 15 + dx, y + 16, 14, 1, 'rgba(255,255,255,0.12)');
      if (thirsty) R(x + 18 + dx, y + 18, 3, 3, 'rgba(0,0,0,0.18)'); // sudor
      // cuello y cabeza (de espaldas)
      const hy = y + 10 + (thirsty ? 1 : 0);
      R(x + 20 + dx, y + 15, 4, 2, w.skin);
      R(x + 17 + dx, hy + 2, 1, 2, w.skin);
      R(x + 26 + dx, hy + 2, 1, 2, w.skin);
      R(x + 18 + dx, hy, 8, 6, w.hair);
      R(x + 17 + dx, hy + 1, 10, 2, w.hair);
      R(x + 19 + dx, hy, 3, 1, 'rgba(255,255,255,0.12)');
      if (w.style === 1) R(x + 21 + dx, hy + 6, 2, 4, w.hair);          // coleta
      else if (w.style === 2) R(x + 20 + dx, hy + 1, 4, 2, w.skin);     // coronilla
      // silla
      R(x + 15, y + 21, 14, 5, '#2b2b2e');
      R(x + 15, y + 21, 14, 1, '#3e3e44');
    }

    function drawNeed(w) {
      const cx = w.x + 38, frac = Math.max(0, w.needT / w.needMax);
      const urgent = frac < 0.3;
      const cy = w.y - 3 + (urgent && Math.sin(clock * 20) > 0 ? -1 : 0);
      disc(cx, cy, 7, 'rgba(0,0,0,0.65)');
      const ringC = urgent ? (Math.sin(clock * 16) > 0 ? '#ff4a3a' : '#ffb0a0') : '#f4f0e0';
      ctx.fillStyle = ringC;
      const N = 56;
      for (let k = 0; k < N; k++) {
        if (k / N > frac) break;
        const ang = -Math.PI / 2 + (k / N) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(ang) * 7), Math.round(cy + Math.sin(ang) * 7), 1, 1);
      }
      const pal = w.need === 'pee'
        ? { '#': '#f2d43a', 'o': '#a8861a', 'h': '#fff6c0' }
        : { '#': '#4aa8ff', 'o': '#1f5a9a', 'h': '#d8f0ff' };
      sprite(DROP, cx - 2, cy - 3, pal);
    }

    function drawFx(w) {
      const k = 1 - w.fxT / (w.fx === 'give' ? 0.8 : 1);
      ctx.globalAlpha = Math.max(0, 1 - k);
      const pal = { '#': '#f2d43a', 'h': '#fff2a0', 'c': '#d8d8d8' };
      if (w.fx === 'give') {
        sprite(BOTTLE, w.x + 36, w.y - 4 - k * 12, pal);
      } else {
        sprite(BOTTLE, w.x + 21, w.y + 2 - k * 6, pal);
        sprite(['.#.', '###', '.#.'], w.x + 27, w.y - 2 - k * 8, { '#': '#7aff8a' });
      }
      ctx.globalAlpha = 1;
    }

    function drawBoss() {
      const bx = 284, fy = 172, t = clock;
      const br = Math.sin(t * 2) > 0 ? 1 : 0;
      R(bx - 11, fy, 22, 2, 'rgba(0,0,0,0.5)');
      // piernas
      R(bx - 5, fy - 12, 4, 12, '#0e0b0e'); R(bx + 1, fy - 12, 4, 12, '#0e0b0e');
      R(bx - 6, fy - 1, 5, 1, '#000'); R(bx + 1, fy - 1, 6, 1, '#000');
      // abrigo largo
      for (let i = 0; i < 34; i++) {
        const w2 = Math.round(lerp(14, 19, i / 33));
        R(bx - Math.floor(w2 / 2), fy - 44 + br + i, w2, 1, i % 9 === 0 ? '#1c161e' : '#151017');
      }
      R(bx - 1, fy - 44 + br, 2, 30, '#0c090d');
      // brazos cruzados
      R(bx - 8, fy - 34 + br, 16, 4, '#1e1820');
      R(bx - 8, fy - 34 + br, 16, 1, '#2a222c');
      // cabeza y sombrero
      R(bx - 3, fy - 47 + br, 6, 3, '#1a141a');
      R(bx - 4, fy - 55 + br, 8, 8, '#1c161c');
      R(bx - 7, fy - 56 + br, 14, 2, '#0a080a');
      R(bx - 5, fy - 63 + br, 10, 7, '#0a080a');
      R(bx - 5, fy - 58 + br, 10, 1, '#3a1a1a');
      // ojos que vigilan
      const blink = (t % 4) < 0.12;
      if (!blink) { R(bx - 4, fy - 52 + br, 2, 1, '#c83a2a'); R(bx, fy - 52 + br, 2, 1, '#c83a2a'); }
    }

    function draw() {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg, 0, 0);

      // lámpara
      R(159, 0, 1, 9, '#151512');
      R(154, 9, 11, 3, '#2c2a24'); R(155, 9, 9, 1, '#46423a');
      R(158, 12, 3, 2, lamp > 0.6 ? '#fff4c0' : '#6a6450');
      if (lamp > 0.6) {
        ctx.globalAlpha = 0.07 * lamp;
        ctx.fillStyle = '#ffe9a0';
        for (let i = 0; i < 60; i++) ctx.fillRect(159 - i * 1.6, 14 + i * 2.7, i * 3.2 + 3, 3);
        ctx.globalAlpha = 1;
      }

      for (const w of workers) drawWorker(w);
      drawBoss();

      // goteras
      for (const d of drips) {
        if (d.splash > 0) {
          R(d.x - 2, d.y, 1, 1, '#8aa8b0'); R(d.x + 2, d.y, 1, 1, '#8aa8b0'); R(d.x - 1, d.y - 1, 1, 1, '#8aa8b0'); R(d.x + 1, d.y - 1, 1, 1, '#8aa8b0');
        } else {
          R(d.x, d.y, 1, 2, '#8aa8b0');
        }
      }

      // oscuridad según la lámpara
      const dark = (1 - lamp) * 0.5 + 0.05;
      R(0, 0, W, H, 'rgba(0,0,0,' + dark.toFixed(3) + ')');

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

    // --- ratón ---
    function toInternal(e) {
      const r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    function workerAt(px, py) {
      let best = null, bd = Infinity;
      for (const w of workers) {
        if (px >= w.x + 2 && px <= w.x + 47 && py >= w.y - 11 && py <= w.y + 26) {
          const d = (px - (w.x + 24)) ** 2 + (py - (w.y + 10)) ** 2 - (w.need ? 900 : 0);
          if (d < bd) { bd = d; best = w; }
        }
      }
      return best;
    }

    function onDown(e) {
      if (e.button !== 0) return;
      if (state === 'intro') { startRound(); return; }
      if (state === 'lost') { if (endT > 0.8) startRound(); return; }
      if (state !== 'play') return;
      const p = toInternal(e);
      if (!p) return;
      const w = workerAt(p.x, p.y);
      if (!w || !w.need) return;
      if (w.need === 'pee') {
        w.need = null; w.cool = 1.5;
        w.fx = 'give'; w.fxT = 0.8;
        inv++;
        invEl.classList.add('mj-maq-pop'); popT = 0.25;
        beep(660, 0.08, 'square', 0.05, 990);
      } else if (w.need === 'thirst') {
        if (inv > 0) {
          inv--;
          w.need = null; w.cool = 2;
          w.fx = 'drink'; w.fxT = 1;
          beep(520, 0.12, 'triangle', 0.07, 800);
        } else {
          hintEl.hidden = false; hintT = 1.3;
          beep(140, 0.15, 'sawtooth', 0.05);
        }
      }
      updateHUD();
    }

    let hand = false;
    function setHand(v) {
      if (v === hand) return;
      hand = v;
      if (v) stage.setAttribute('data-cursor', 'hand'); else stage.removeAttribute('data-cursor');
    }
    function onMove(e) {
      if (state === 'intro' || state === 'lost') { setHand(true); return; }
      if (state !== 'play') { setHand(false); return; }
      const p = toInternal(e);
      const w = p && workerAt(p.x, p.y);
      setHand(!!(w && w.need));
    }

    stage.addEventListener('mousedown', onDown);
    stage.addEventListener('mousemove', onMove);

    // pantalla inicial
    resetRound();
    showOverlay([['h1', '', T.titulo], ['p', '', T.instrucciones], ['div', 'mj-maq-cta', T.empezar]]);
    setHand(true);

    return {
      done,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        stage.removeEventListener('mousedown', onDown);
        stage.removeEventListener('mousemove', onMove);
        root.remove();
      },
    };
  };
})();
