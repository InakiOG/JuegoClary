// Minijuego final: pelea arcade Tomás (monigote) contra LucIAno (tronco de madera con bate).
// Una sola barra de "tira y afloja": cada golpe empuja el divisor hacia el lado del rival.
// Contrato: Game.minijuegos.pelea(host) -> { done: Promise<boolean>, destroy() }.
// done se resuelve una vez: true si gana Tomás, false si pierde. Cada llamada es una ronda nueva.
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const W = 320, H = 180;
  const GY = 150;                 // línea del suelo (pies)
  const BAR_X = 24, BAR_Y = 16, BAR_W = 272, BAR_H = 8;
  const KICK_PUSH = 0.03;         // barra por patada acertada
  const BAT_PUSH = 0.06;          // barra por batazo
  const KICK_CD = 0.12;           // cooldown de patada (s)
  const KICK_REACH = 37;          // distancia máx. entre centros para acertar la patada
  const BAT_REACH = 42;
  const WINDUP = 0.4, SWING = 0.15, RECOVER = 1.3;
  const FIGHT_T = 1.2, KO_T = 1.5;

  const DEFAULTS = {
    titulo: 'ÚLTIMO MINIJUEGO',
    instrucciones: 'Flechas ← → para moverte · ↑ para saltar · ESPACIO para patear. ¡Patea rápido!',
    tomas: 'TOMÁS',
    luciano: 'LucIAno',
    fight: 'FIGHT!',
    gana: 'K.O.',
    pierde: 'K.O.',
    empezar: '[ clic o ESPACIO para empezar ]',
    servidor: 'SHITGPT',
  };

  const CSS = `
.mj-pelea-root{position:absolute;inset:0;overflow:hidden;background:#111;user-select:none;-webkit-user-select:none;}
.mj-pelea-stage{position:absolute;left:0;top:0;overflow:hidden;font-family:"Lucida Console",Consolas,monospace;color:#111;}
.mj-pelea-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:crisp-edges;image-rendering:pixelated;}
.mj-pelea-name{position:absolute;top:2.5%;font-size:7em;font-weight:bold;letter-spacing:.06em;pointer-events:none;color:#fff;text-shadow:-.1em 0 0 #000,.1em 0 0 #000,0 -.1em 0 #000,0 .1em 0 #000,.12em .12em 0 #000;}
.mj-pelea-name.l{left:7.5%;color:#7fd4ff;}
.mj-pelea-name.r{right:7.5%;color:#39ff7a;}
.mj-pelea-label{position:absolute;left:5.6%;top:29.6%;font-size:4.4em;font-weight:bold;color:#e8e8e8;background:#2a2a2e;padding:0 .2em;pointer-events:none;letter-spacing:.03em;}
.mj-pelea-fight{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-6deg);font-size:30em;font-weight:900;font-style:italic;color:#fff35a;pointer-events:none;letter-spacing:.02em;-webkit-text-stroke:.05em #000;text-shadow:.07em .07em 0 #000,.1em .1em 0 #b23a00;animation:mj-pelea-pop .25s ease-out;white-space:nowrap;}
.mj-pelea-ko{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-size:42em;font-weight:900;color:#ff3a2a;pointer-events:none;-webkit-text-stroke:.04em #000;text-shadow:.06em .06em 0 #000;animation:mj-pelea-pop .3s ease-out;white-space:nowrap;}
.mj-pelea-ko.win{color:#7fd4ff;}
@keyframes mj-pelea-pop{from{transform:translate(-50%,-50%) scale(2.4) rotate(-6deg);opacity:0;}to{opacity:1;}}
.mj-pelea-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(10,10,14,.84);color:#eee;padding:0 9%;box-sizing:border-box;}
.mj-pelea-ov h1{margin:0 0 .6em;font-size:17em;font-weight:900;font-style:italic;color:#fff35a;letter-spacing:.06em;-webkit-text-stroke:.03em #000;text-shadow:.08em .08em 0 #b23a00;}
.mj-pelea-ov p{margin:0 0 1.4em;font-size:7em;line-height:1.55;}
.mj-pelea-cta{font-size:7em;color:#39ff7a;animation:mj-pelea-blink 1s steps(2,start) infinite;}
@keyframes mj-pelea-blink{to{visibility:hidden;}}
[class^="mj-pelea-"][hidden]{display:none!important;}
`;

  function injectCSS() {
    if (document.getElementById('mj-pelea-style')) return;
    const s = document.createElement('style');
    s.id = 'mj-pelea-style';
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

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  // --- sonidos mínimos ---
  let actx = null;
  function tone(freq, dur, type, vol, slideTo, delay) {
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
      g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) { /* sin audio */ }
  }

  // Estallido tipo cómic pre-renderizado píxel a píxel (sin antialias).
  function buildBurst() {
    const R = 72;
    const c = document.createElement('canvas');
    c.width = R * 2 + 2; c.height = Math.round(R * 1.3) + 2;
    const g = c.getContext('2d');
    const cx = c.width / 2, cy = c.height / 2;
    const spikes = 14;
    const rnd = mulberry32(99);
    const jag = [];
    for (let i = 0; i < spikes; i++) jag.push(0.85 + rnd() * 0.3);
    function radius(ang, outer, inner) {
      const f = ((ang / (Math.PI * 2)) * spikes + spikes) % spikes;
      const i = Math.floor(f), k = f - i;
      const tri = 1 - Math.abs(k - 0.5) * 2; // 0 en valles, 1 en puntas
      return inner + (outer * jag[i] - inner) * tri;
    }
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const dx = (x - cx) / 1, dy = (y - cy) / 0.62;
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const ro = radius(a, R, R * 0.62);
        let col = null;
        if (d < ro * 0.66) col = '#fff35a';
        else if (d < ro * 0.7) col = '#000';
        else if (d < ro - 1.6) col = '#ff8a1a';
        else if (d < ro) col = '#000';
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }
  let burstCache = null;

  Game.minijuegos.pelea = function (host) {
    const T = Object.assign({}, DEFAULTS,
      (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.pelea) || {});
    injectCSS();
    if (!burstCache) burstCache = buildBurst();
    const burst = burstCache;

    // --- DOM ---
    const root = el('div', 'mj-pelea-root');
    const stage = el('div', 'mj-pelea-stage');
    const canvas = el('canvas', 'mj-pelea-canvas');
    canvas.width = W; canvas.height = H;
    stage.appendChild(canvas);
    stage.appendChild(el('div', 'mj-pelea-name l', T.tomas));
    stage.appendChild(el('div', 'mj-pelea-name r', T.luciano));
    stage.appendChild(el('div', 'mj-pelea-label', T.servidor));
    const fightEl = el('div', 'mj-pelea-fight', T.fight);
    fightEl.hidden = true;
    const koEl = el('div', 'mj-pelea-ko');
    koEl.hidden = true;
    const ov = el('div', 'mj-pelea-ov');
    ov.setAttribute('data-cursor', 'hand');
    ov.appendChild(el('h1', '', T.titulo));
    ov.appendChild(el('p', '', T.instrucciones));
    ov.appendChild(el('div', 'mj-pelea-cta', T.empezar));
    stage.appendChild(fightEl); stage.appendChild(koEl); stage.appendChild(ov);
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
    fit();

    // --- primitivas de píxel ---
    function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function line(x0, y0, x1, y1, c, th) {
      th = th || 1;
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      ctx.fillStyle = c;
      const o = Math.floor(th / 2);
      for (let n = 0; n < 400; n++) {
        ctx.fillRect(x0 - o, y0 - o, th, th);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function circle(cx, cy, r, c, fill) {
      cx = Math.round(cx); cy = Math.round(cy);
      if (fill) {
        ctx.fillStyle = fill;
        for (let dy = -r; dy <= r; dy++) {
          const hw = Math.floor(Math.sqrt(r * r - dy * dy));
          ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
        }
      }
      ctx.fillStyle = c;
      let x = r, y = 0, err = 1 - r;
      while (x >= y) {
        const pts = [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]];
        for (const p of pts) ctx.fillRect(cx + p[0], cy + p[1], 1, 1);
        y++;
        if (err < 0) err += 2 * y + 1;
        else { x--; err += 2 * (y - x) + 1; }
      }
    }

    // --- fondo estático ---
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    (function buildBG() {
      const g = bg.getContext('2d');
      const rnd = mulberry32(2024);
      g.fillStyle = '#f1ede2'; g.fillRect(0, 0, W, H);
      // pinceladas grises horizontales, más densas en el suelo
      for (let i = 0; i < 120; i++) {
        const y = Math.floor(rnd() < 0.75 ? lerp(104, H - 2, rnd()) : lerp(32, 104, rnd()));
        const x = Math.floor(rnd() * W), len = Math.floor(10 + rnd() * 70);
        const shade = Math.floor(lerp(170, 215, rnd()));
        g.fillStyle = 'rgb(' + shade + ',' + shade + ',' + (shade - 4) + ')';
        g.fillRect(x, y, len, 1);
        if (rnd() < 0.5) g.fillRect(x + 3, y + 1, Math.floor(len * 0.7), 1);
        // trazo irregular: huecos
        g.fillStyle = '#f1ede2';
        for (let k = 0; k < 3; k++) g.fillRect(x + Math.floor(rnd() * len), y, 1 + Math.floor(rnd() * 2), 1);
      }
      g.fillStyle = '#bdb8aa'; g.fillRect(0, 104, W, 1);
      g.fillStyle = '#d6d1c4'; g.fillRect(0, 105, W, 1);
    })();

    // --- estado ---
    const tom = { x: 96, y: 0, vy: 0, kickT: 0, kickCd: 0, hurtT: 0, kbx: 0, walkPh: 0, moving: false };
    const luc = { x: 230, state: 'walk', t: 0, cd: 0.4, kbx: 0, flashT: 0, stagger: 0, walkPh: 0, hitDone: false };
    let bar = 0.5, barShown = 0.5;
    let state = 'intro';            // intro | fight | ko | over
    let fightT = 0, koT = 0, winner = null;
    let clock = 0, shakeT = 0;
    const sparks = [];
    const keys = { left: false, right: false };

    let resolveDone, settled = false;
    const done = new Promise((res) => { resolveDone = res; });
    function finish(v) {
      if (settled) return;
      settled = true;
      resolveDone(v);
    }

    function start() {
      if (state !== 'intro') return;
      state = 'fight';
      fightT = 0;
      ov.hidden = true;
      fightEl.hidden = false;
      tone(180, 0.35, 'sawtooth', 0.06, 520);
      tone(880, 0.25, 'square', 0.04, 440, 0.25);
    }

    function endRound(tomWins) {
      state = 'ko';
      koT = 0;
      winner = tomWins ? 'tom' : 'luc';
      fightEl.hidden = true;
      koEl.textContent = tomWins ? T.gana : T.pierde;
      koEl.className = 'mj-pelea-ko' + (tomWins ? ' win' : '');
      koEl.hidden = false;
      tone(220, 0.6, 'sawtooth', 0.07, 55);
      if (tomWins) [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'square', 0.045, null, 0.4 + i * 0.12));
    }

    function addSpark(x, y, col) { sparks.push({ x, y, t: 0.18, col }); }

    function tryKick() {
      if (state !== 'fight' || fightT < FIGHT_T) return;
      if (tom.kickCd > 0 || tom.hurtT > 0) return;
      tom.kickCd = KICK_CD;
      tom.kickT = 0.1;
      const dist = luc.x - tom.x;
      if (dist <= KICK_REACH) {
        bar = clamp(bar + KICK_PUSH, 0, 1);
        luc.kbx = 70;
        luc.flashT = 0.08;
        luc.stagger = 0.15;
        addSpark(tom.x + 22, GY - 15 - tom.y, '#ffd21a');
        tone(1300 + Math.random() * 300, 0.05, 'square', 0.05, 500);
        if (bar >= 1) endRound(true);
      } else {
        tone(500, 0.03, 'sine', 0.025, 300);
      }
    }

    function update(dt) {
      clock += dt;
      if (shakeT > 0) shakeT -= dt;
      for (let i = sparks.length - 1; i >= 0; i--) { sparks[i].t -= dt; if (sparks[i].t <= 0) sparks.splice(i, 1); }
      barShown += (bar - barShown) * Math.min(1, dt * 14);
      if (luc.flashT > 0) luc.flashT -= dt;

      if (state === 'fight') {
        fightT += dt;
        if (fightT >= FIGHT_T) fightEl.hidden = true;
        const live = fightT >= FIGHT_T;

        // Tomás
        if (tom.kickCd > 0) tom.kickCd -= dt;
        if (tom.kickT > 0) tom.kickT -= dt;
        if (tom.hurtT > 0) tom.hurtT -= dt;
        let mv = 0;
        if (live && tom.hurtT <= 0) mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        tom.moving = mv !== 0;
        if (tom.moving) tom.walkPh += dt * 12;
        tom.x += mv * 82 * dt + tom.kbx * dt;
        tom.kbx *= Math.pow(0.004, dt);
        if (Math.abs(tom.kbx) < 2) tom.kbx = 0;
        if (tom.y > 0 || tom.vy > 0) {
          tom.vy -= 620 * dt;
          tom.y += tom.vy * dt;
          if (tom.y <= 0) { tom.y = 0; tom.vy = 0; }
        }

        // LucIAno
        if (luc.stagger > 0) luc.stagger -= dt;
        if (luc.cd > 0) luc.cd -= dt;
        luc.x += luc.kbx * dt;
        luc.kbx *= Math.pow(0.002, dt);
        if (Math.abs(luc.kbx) < 2) luc.kbx = 0;
        if (live) {
          const dist = luc.x - tom.x;
          if (luc.state === 'walk') {
            if (dist > 30 && luc.stagger <= 0) {
              luc.x -= 34 * dt;
              luc.walkPh += dt * 7;
            }
            if (dist <= BAT_REACH - 2 && luc.cd <= 0) { luc.state = 'wind'; luc.t = WINDUP; tone(140, 0.3, 'triangle', 0.04, 260); }
          } else if (luc.state === 'wind') {
            luc.t -= dt;
            if (luc.t <= 0) { luc.state = 'swing'; luc.t = SWING; luc.hitDone = false; tone(700, 0.1, 'sawtooth', 0.025, 200); }
          } else if (luc.state === 'swing') {
            luc.t -= dt;
            if (!luc.hitDone && dist <= BAT_REACH && tom.y < 16 && tom.hurtT <= 0) {
              luc.hitDone = true;
              bar = clamp(bar - BAT_PUSH, 0, 1);
              tom.kbx = -150;
              tom.hurtT = 0.35;
              tom.kickT = 0;
              shakeT = 0.2;
              addSpark(tom.x + 4, GY - 26 - tom.y, '#ffffff');
              tone(90, 0.22, 'square', 0.08, 40);
              if (Game.sound && Game.sound.glitch) { try { Game.sound.glitch(); } catch (e) { /* nada */ } }
              if (bar <= 0) endRound(false);
            }
            if (luc.t <= 0 && state === 'fight') { luc.state = 'recover'; luc.t = RECOVER; }
          } else if (luc.state === 'recover') {
            luc.t -= dt;
            if (luc.t <= 0) { luc.state = 'walk'; luc.cd = 0; }
          }
        }

        // límites y separación
        luc.x = clamp(luc.x, 40, W - 14);
        tom.x = clamp(tom.x, 12, W - 40);
        if (luc.x - tom.x < 18) {
          if (luc.x >= W - 14) tom.x = luc.x - 18; else luc.x = tom.x + 18;
        }
      } else if (state === 'ko') {
        koT += dt;
        if (tom.y > 0) { tom.vy -= 620 * dt; tom.y = Math.max(0, tom.y + tom.vy * dt); }
        if (koT >= KO_T) {
          state = 'over';
          finish(winner === 'tom');
        }
      }
    }

    // --- dibujo de personajes ---
    function drawTom() {
      const x = Math.round(tom.x), base = GY - Math.round(tom.y);
      const K = '#111';
      if (state !== 'intro' && winner === 'luc' && state !== 'fight') {
        // tumbado
        circle(x - 14, GY - 4, 4, K, '#f1ede2');
        line(x - 10, GY - 3, x + 6, GY - 2, K);
        line(x + 6, GY - 2, x + 16, GY - 1, K);
        line(x + 6, GY - 2, x + 15, GY - 5, K);
        line(x - 5, GY - 3, x - 2, GY - 8, K);
        sprite(['#.#', '.#.', '#.#'], x - 16, GY - 6, K);
        for (let i = 0; i < 4; i++) circle(x - 18 - (i % 2), GY - 6 + i * 2, 1, K);
        return;
      }
      const hurt = tom.hurtT > 0;
      const kick = tom.kickT > 0;
      const air = tom.y > 0;
      const lean = hurt ? -3 : (kick ? -2 : 0);
      const hip = { x: x, y: base - 14 };
      const neck = { x: x + lean, y: base - 27 };
      const head = { x: x + lean + (hurt ? -1 : 1), y: base - 32 };
      // piernas
      if (kick) {
        line(hip.x, hip.y, x + 22, base - 15, K);
        line(x + 22, base - 15, x + 23, base - 17, K);
        line(hip.x, hip.y, x - 5, base, K);
      } else if (air) {
        line(hip.x, hip.y, x + 6, base - 7, K); line(x + 6, base - 7, x + 3, base - 1, K);
        line(hip.x, hip.y, x - 4, base - 6, K); line(x - 4, base - 6, x - 6, base - 1, K);
      } else {
        const s = tom.moving ? Math.sin(tom.walkPh) * 5 : 0;
        line(hip.x, hip.y, x + 5 + s, base, K);
        line(hip.x, hip.y, x - 5 - s, base, K);
      }
      // cuerpo
      line(hip.x, hip.y, neck.x, neck.y, K);
      // brazos
      const sh = { x: neck.x, y: neck.y + 3 };
      if (hurt) {
        line(sh.x, sh.y, sh.x - 7, sh.y - 6, K);
        line(sh.x, sh.y, sh.x + 5, sh.y - 7, K);
      } else {
        line(sh.x, sh.y, sh.x + 5, sh.y + 4, K); line(sh.x + 5, sh.y + 4, sh.x + 8, sh.y - 1, K);
        line(sh.x, sh.y, sh.x + 2, sh.y + 6, K); line(sh.x + 2, sh.y + 6, sh.x + 5, sh.y + 2, K);
      }
      // cabeza con pelo rizado
      circle(head.x, head.y, 5, K, '#f1ede2');
      const curls = [[-5, -3], [-3, -6], [0, -7], [3, -6], [5, -4], [-6, 0]];
      for (const c of curls) circle(head.x + c[0], head.y + c[1], 1, K);
      R(head.x - 4, head.y - 5, 8, 1, K);
      if (hurt) {
        sprite(['#.#', '.#.', '#.#'], head.x + 1, head.y - 1, K);
      } else {
        R(head.x + 2, head.y - 1, 1, 2, K);
        R(head.x + 4, head.y - 1, 1, 2, K);
        R(head.x + 2, head.y + 2, 3, 1, K);
      }
    }

    function sprite(map, x, y, col) {
      ctx.fillStyle = col;
      for (let j = 0; j < map.length; j++) {
        for (let i = 0; i < map[j].length; i++) if (map[j][i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
      }
    }

    function drawLuc() {
      const x = Math.round(luc.x);
      const fl = luc.flashT > 0;
      const C = (c) => (fl ? '#ffffff' : c);
      const OUT = C('#4a240c'), BODY = C('#b8692e'), LIGHT = C('#d0884a'), DARK = C('#8a4a1e'), END = C('#e6b273');

      if (state !== 'intro' && winner === 'tom' && state !== 'fight') {
        // tronco caído
        const y0 = GY - 18;
        R(x - 34, y0, 46, 18, OUT); R(x - 33, y0 + 1, 44, 16, BODY);
        for (let i = 0; i < 3; i++) R(x - 30 + i * 3, y0 + 4 + i * 4, 34, 1, DARK);
        R(x + 10, y0, 6, 18, OUT); R(x + 11, y0 + 1, 4, 16, END);
        sprite(['#.#', '.#.', '#.#'], x - 26, y0 + 4, '#000');
        sprite(['#.#', '.#.', '#.#'], x - 26, y0 + 11, '#000');
        line(x - 18, y0 + 6, x - 18, y0 + 12, '#000');
        line(x - 40, GY - 2, x - 18, GY - 3, '#6a3a14', 2); // bate en el suelo
        return;
      }

      const bob = luc.state === 'walk' && luc.stagger <= 0 ? (Math.sin(luc.walkPh) > 0 ? 1 : 0) : 0;
      const top = GY - 60 + bob;
      const bottom = GY - 14;
      const L = x - 11, Wd = 22;
      // piernas finas
      const s = luc.state === 'walk' ? Math.round(Math.sin(luc.walkPh) * 3) : 0;
      line(x - 5, bottom, x - 6 + s, GY, OUT, 2);
      line(x + 5, bottom, x + 6 - s, GY, OUT, 2);
      R(x - 9 + s, GY - 1, 5, 2, OUT); R(x + 3 - s, GY - 1, 5, 2, OUT);
      // cuerpo de tronco (rectángulo redondeado)
      R(L + 2, top, Wd - 4, bottom - top + 1, OUT);
      R(L + 1, top + 1, Wd - 2, bottom - top - 1, OUT);
      R(L, top + 3, Wd, bottom - top - 5, OUT);
      R(L + 2, top + 1, Wd - 4, bottom - top - 1, BODY);
      R(L + 1, top + 3, Wd - 2, bottom - top - 5, BODY);
      R(L + Wd - 4, top + 3, 3, bottom - top - 5, DARK);
      R(L + 2, top + 3, 2, bottom - top - 5, LIGHT);
      // vetas
      const grains = [[5, 0.0], [9, 1.3], [14, 2.1], [17, 0.7]];
      ctx.fillStyle = DARK;
      for (const g of grains) {
        for (let yy = top + 8; yy < bottom - 1; yy++) {
          const gx = L + g[0] + Math.round(Math.sin(yy * 0.35 + g[1]) * 1.2);
          if ((yy + g[0]) % 7 !== 0) ctx.fillRect(gx, yy, 1, 1);
        }
      }
      // nudo
      circle(L + 15, top + 36, 2, DARK, BODY);
      // tapa superior con anillos
      R(L + 2, top, Wd - 4, 5, OUT);
      R(L + 3, top + 1, Wd - 6, 3, END);
      R(L + 6, top + 2, Wd - 12, 1, C('#c48a4e'));
      // cara enfadada (mira a la izquierda)
      const fy = top + 14;
      const fx = x - 4;
      R(fx - 5, fy, 4, 3, C('#fff')); R(fx + 2, fy, 4, 3, C('#fff'));
      R(fx - 5, fy + 1, 2, 2, '#000'); R(fx + 2, fy + 1, 2, 2, '#000');
      line(fx - 6, fy - 3, fx - 1, fy - 1, '#000');
      line(fx + 7, fy - 3, fx + 2, fy - 1, '#000');
      const angry = luc.state === 'wind' || luc.state === 'swing';
      R(fx - 3, fy + 7, 7, angry ? 3 : 2, '#2a0e04');
      if (angry) { R(fx - 2, fy + 7, 1, 1, '#fff'); R(fx + 2, fy + 7, 1, 1, '#fff'); }
      R(fx - 4, fy + 8 + (angry ? 2 : 1), 1, 1, '#2a0e04'); R(fx + 4, fy + 8 + (angry ? 2 : 1), 1, 1, '#2a0e04');

      // brazo y bate. Ángulo: 0 = apunta hacia Tomás (izquierda), positivo = hacia arriba.
      let ang;
      if (luc.state === 'wind') ang = lerp(70, 150, 1 - luc.t / WINDUP);
      else if (luc.state === 'swing') ang = lerp(150, -15, 1 - luc.t / SWING);
      else if (luc.state === 'recover') ang = luc.t > RECOVER - 0.35 ? -15 : lerp(70, -15, (luc.t / (RECOVER - 0.35)));
      else ang = 70 + Math.sin(clock * 3) * 4;
      const a = ang * Math.PI / 180;
      const sx = x - 9, sy = top + 30;
      const hx = sx - 6, hy = sy - 1;
      line(sx, sy, hx, hy, OUT, 2);
      const dx = -Math.cos(a), dy = -Math.sin(a);
      const BAT = C('#8a5424'), BATD = C('#5a3414');
      line(hx, hy, hx + dx * 9, hy + dy * 9, BATD, 2);
      line(hx + dx * 8, hy + dy * 8, hx + dx * 26, hy + dy * 26, BAT, 4);
      line(hx + dx * 10, hy + dy * 10, hx + dx * 25, hy + dy * 25, C('#a8703a'), 1);
      R(hx - 1, hy - 1, 3, 3, BODY);
      if (luc.state === 'swing') {
        // estela del golpe
        ctx.globalAlpha = 0.5;
        for (let k = 0; k < 4; k++) {
          const aa = (ang + 18 + k * 14) * Math.PI / 180;
          line(hx - Math.cos(aa) * 22, hy - Math.sin(aa) * 22, hx - Math.cos(aa) * 28, hy - Math.sin(aa) * 28, '#999', 1);
        }
        ctx.globalAlpha = 1;
      }
      if (luc.state === 'wind') {
        // aviso: signo de exclamación
        if (Math.sin(clock * 30) > -0.3) { R(x - 1, top - 10, 2, 5, '#ff3a2a'); R(x - 1, top - 4, 2, 2, '#ff3a2a'); }
      }
    }

    function drawServer() {
      const x = 16, y = 52, w = 32, h = 22;
      R(x + 2, y + h, w, 2, 'rgba(0,0,0,0.15)');
      R(x, y, w, h, '#2a2a2e');
      R(x + 1, y + 1, w - 2, 1, '#45454c');
      for (let i = 0; i < 3; i++) {
        R(x + 3, y + 9 + i * 4, w - 6, 2, '#1a1a1e');
        R(x + w - 7, y + 9 + i * 4, 1, 1, (Math.floor(clock * 6 + i * 2) % 3) ? '#ff3a2a' : '#3a0a0a');
        R(x + w - 5, y + 9 + i * 4, 1, 1, (Math.floor(clock * 4 + i) % 2) ? '#ffb020' : '#3a2a0a');
      }
      R(x + 2, y + 4, w - 4, 1, '#55555c'); // zona de la etiqueta (texto DOM encima)
      // llamas
      for (let i = 0; i < w; i++) {
        const fh = 5 + Math.round(Math.abs(Math.sin(i * 0.9 + clock * 9) * 5 + Math.sin(i * 0.37 - clock * 13) * 4));
        for (let j = 0; j < fh; j++) {
          const k = j / fh;
          ctx.fillStyle = k < 0.35 ? '#ffe45a' : (k < 0.7 ? '#ff8a1a' : '#e0301a');
          if (k > 0.8 && (i + j + Math.floor(clock * 20)) % 3 === 0) continue;
          ctx.fillRect(x + i, y - 1 - j, 1, 1);
        }
      }
      // humo
      for (let i = 0; i < 5; i++) {
        const ph = (clock * 0.6 + i * 0.2) % 1;
        const r = Math.round(2 + ph * 4);
        ctx.globalAlpha = 0.35 * (1 - ph);
        circle(x + 10 + i * 4 + Math.sin(ph * 6 + i) * 3, y - 16 - ph * 22, r, '#777', '#888');
      }
      ctx.globalAlpha = 1;
    }

    function drawBar() {
      R(BAR_X - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4, '#000');
      const split = Math.round(BAR_W * clamp(barShown, 0, 1));
      R(BAR_X, BAR_Y, split, BAR_H, '#7fd4ff');
      R(BAR_X, BAR_Y, split, 2, '#c4ecff');
      R(BAR_X + split, BAR_Y, BAR_W - split, BAR_H, '#39ff7a');
      R(BAR_X + split, BAR_Y, BAR_W - split, 2, '#aaffc4');
      R(BAR_X, BAR_Y + BAR_H - 1, BAR_W, 1, 'rgba(0,0,0,0.2)');
      // marcador del centro original y divisor
      R(BAR_X + BAR_W / 2, BAR_Y + BAR_H, 1, 2, '#000');
      const dx = BAR_X + split;
      R(dx - 1, BAR_Y - 3, 3, BAR_H + 6, '#000');
      R(dx, BAR_Y - 2, 1, BAR_H + 4, '#fff35a');
    }

    function drawKey(x, y, w, h, dir, lit) {
      R(x, y, w, h, '#333');
      R(x + 1, y + 1, w - 2, h - 2, lit ? '#fff35a' : '#e6e2d6');
      R(x + 1, y + h - 2, w - 2, 1, lit ? '#d0c030' : '#b8b4a8');
      ctx.fillStyle = '#333';
      const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2) - 1;
      if (dir === 'u') { ctx.fillRect(cx, cy - 1, 1, 1); ctx.fillRect(cx - 1, cy, 3, 1); }
      if (dir === 'l') { ctx.fillRect(cx - 1, cy, 1, 1); ctx.fillRect(cx, cy - 1, 1, 3); }
      if (dir === 'r') { ctx.fillRect(cx + 1, cy, 1, 1); ctx.fillRect(cx, cy - 1, 1, 3); }
      if (dir === 'd') { ctx.fillRect(cx, cy + 1, 1, 1); ctx.fillRect(cx - 1, cy, 3, 1); }
    }

    function drawHint() {
      const x = 6, y = 158;
      drawKey(x + 9, y, 8, 7, 'u', tom.y > 0);
      drawKey(x, y + 8, 8, 7, 'l', keys.left);
      drawKey(x + 9, y + 8, 8, 7, 'd', false);
      drawKey(x + 18, y + 8, 8, 7, 'r', keys.right);
      drawKey(x + 31, y + 8, 40, 7, null, tom.kickT > 0);
    }

    function draw() {
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      if (shakeT > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
      ctx.drawImage(bg, 0, 0);
      drawServer();
      // sombras
      R(tom.x - 7, GY, 14, 2, 'rgba(0,0,0,0.12)');
      R(luc.x - 12, GY, 24, 2, 'rgba(0,0,0,0.14)');
      drawLuc();
      drawTom();
      for (const s of sparks) {
        const r = Math.round((0.18 - s.t) * 40) + 2;
        ctx.fillStyle = s.col;
        ctx.fillRect(s.x - r, s.y, r * 2 + 1, 1);
        ctx.fillRect(s.x, s.y - r, 1, r * 2 + 1);
        ctx.fillRect(s.x - (r >> 1), s.y - (r >> 1), 1, 1); ctx.fillRect(s.x + (r >> 1), s.y + (r >> 1), 1, 1);
        ctx.fillRect(s.x + (r >> 1), s.y - (r >> 1), 1, 1); ctx.fillRect(s.x - (r >> 1), s.y + (r >> 1), 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillRect(s.x, s.y, 1, 1);
      }
      ctx.restore();

      drawBar();
      drawHint();

      if (state === 'fight' && fightT < FIGHT_T) {
        const k = Math.min(1, fightT / 0.15);
        const sc = lerp(0.3, 1, k);
        const bw = Math.round(burst.width * sc), bh = Math.round(burst.height * sc);
        ctx.drawImage(burst, Math.round(W / 2 - bw / 2), Math.round(H / 2 - bh / 2 + 2), bw, bh);
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
      const c = e.code;
      if (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'ArrowUp' || c === 'ArrowDown' || c === 'Space') e.preventDefault();
      if (c === 'Space') {
        if (state === 'intro') { start(); return; }
        if (!e.repeat) tryKick();
      } else if (c === 'ArrowLeft') keys.left = true;
      else if (c === 'ArrowRight') keys.right = true;
      else if (c === 'ArrowUp') {
        if (state === 'fight' && fightT >= FIGHT_T && tom.y <= 0 && tom.vy <= 0 && tom.hurtT <= 0) {
          tom.vy = 215;
          tom.y = 0.01;
          tone(300, 0.08, 'square', 0.03, 600);
        }
      }
    }
    function onKeyUp(e) {
      if (e.code === 'ArrowLeft') keys.left = false;
      else if (e.code === 'ArrowRight') keys.right = false;
    }
    function onBlur() { keys.left = keys.right = false; }
    function onDown(e) {
      if (e.button === 0 && state === 'intro') start();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    stage.addEventListener('mousedown', onDown);

    return {
      done,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        stage.removeEventListener('mousedown', onDown);
        root.remove();
      },
    };
  };
})();
