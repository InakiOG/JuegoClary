// Minijuego del acto 2: pestaña que se abre glitcheando con código y luego una sopa de letras
// con estética de página web dosmilera. Solo hay cuatro palabras (EJIDO, APAGÓN, IA, SANCHEZ).
// Mientras tanto salen anuncios pop-up (diálogos tipo Windows 98 en cascada) que van comiendo
// atención (muy poco a poco) mientras sigan abiertos. No sale ninguno hasta encontrar la primera
// palabra; luego salen más conforme se encuentran palabras. Con EJIDO y APAGÓN basta para pasar:
// se ofrece pasar a la siguiente fase o seguir jugando. La atención la gestiona el host (Game.atencion).
// Contrato: Game.minijuegos.sopa(host, { dificultad: 'facil'|'intermedio'|'dificil' })
//   → { done: Promise<boolean>, destroy() }
window.Game = window.Game || {};
Game.minijuegos = Game.minijuegos || {};

(function () {
  const N = 15;
  const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];

  // Dónde va cada palabra: fila, columna y dirección (dr, dc).
  const PLACE = {
    SANCHEZ: [1, 2, 1, 1],   // diagonal ↘
    APAGON: [13, 12, -1, 0], // vertical, de abajo arriba
    EJIDO: [11, 1, 0, 1],    // horizontal
    IA: [5, 10, -1, 1],      // diagonal ↗
  };

  // Cuadrícula determinista: las cuatro palabras y relleno sin que aparezcan otra vez.
  function makeGrid(words) {
    let seed = 0x5a1c7e2;
    const rnd = () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const FILL = 'BCDEFGHJKLMNOPQRSTUVXYZÑÁÉÍÓÚAEIOUAIRSTNL';
    const g = Array.from({ length: N }, () => Array(N).fill(null));
    const fixed = new Set();
    const placed = {};
    words.forEach((w) => {
      const key = plain(w);
      const [r0, c0, dr, dc] = PLACE[key];
      const chars = [...w.toUpperCase()];
      placed[key] = chars.map((ch, i) => {
        const r = r0 + dr * i, c = c0 + dc * i;
        g[r][c] = ch;
        fixed.add(r * N + c);
        return { r, c };
      });
    });
    const roll = (r, c) => { g[r][c] = FILL[Math.floor(rnd() * FILL.length)]; };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) roll(r, c);
    // Quita apariciones extra (sobre todo "IA" / "AI").
    for (let guard = 0; guard < 2000; guard++) {
      let bad = null;
      for (const w of words) {
        const key = plain(w);
        for (let r = 0; r < N && !bad; r++) for (let c = 0; c < N && !bad; c++) for (const [dr, dc] of DIRS) {
          const cells = [];
          let ok = true;
          for (let i = 0; i < key.length; i++) {
            const R = r + dr * i, C = c + dc * i;
            if (R < 0 || C < 0 || R >= N || C >= N || plain(g[R][C]) !== key[i]) { ok = false; break; }
            cells.push({ r: R, c: C });
          }
          if (!ok) continue;
          if (cells.every((p) => fixed.has(p.r * N + p.c))) continue; // es la palabra colocada
          bad = cells.filter((p) => !fixed.has(p.r * N + p.c));
          break;
        }
        if (bad) break;
      }
      if (!bad) break;
      const p = bad[Math.floor(rnd() * bad.length)];
      roll(p.r, p.c);
    }
    return { g, placed };
  }

  const CODE = [
    '#include <sr/fase3.h>', 'static const char *BLOQUE = "0x7F3A";', 'int main(int argc, char **argv) {',
    '  if (!enlace_seguro()) return -102;', '  cifrado_t c = cargar("MAPA7382");', '  for (int i = 0; i < 0xFFFF; i++) {',
    '    c.llave[i % 32] ^= ruido(i) << 3;', '    if (vigilancia_activa()) { ocultar(&c); }', '  }',
    '  /* NO CONFIAR EN EL ASISTENTE */', '  mensaje_t m = descifrar(&c, "xJIxO");', '  enviar(m, HALCON);', '}',
    'void ocultar(cifrado_t *c) {', '  memset(c->rastro, 0, sizeof c->rastro);', '  apagon_local(COLONIA_7);', '}',
  ];

  // Ajustes por dificultad. Con 0 palabras encontradas no sale ningún anuncio.
  //   every: segundos entre anuncios según palabras encontradas (1, 2, 3+)
  //   max:   anuncios abiertos a la vez como mucho (1, 2, 3+ palabras)
  //   burst: anuncios que salen justo al encontrar una palabra
  //   base / slope / cap: drenaje de atención por anuncio abierto (puntos/s sobre 100):
  //          base + slope · segundos abierto, hasta cap
  const TUNING = {
    facil:      { every: [11, 9, 8],    max: [1, 1, 2], burst: 1, base: 0.06, slope: 0.004, cap: 0.2 },
    intermedio: { every: [8, 6.5, 5.5], max: [1, 2, 3], burst: 1, base: 0.12, slope: 0.008, cap: 0.4 },
    dificil:    { every: [5, 4, 3],     max: [3, 4, 5], burst: 2, base: 0.25, slope: 0.02,  cap: 0.8 },
  };
  const HOT_AGE = 6;        // a partir de aquí la barra del anuncio parpadea en rojo
  const KEY_WORDS = ['EJIDO', 'APAGON']; // con estas dos ya se puede pasar de fase

  // Textos nuevos (el resto viene de Game.guion.minijuegos.sopa).
  const TXT = {
    elegirTitulo: 'Mensaje_descifrado.txt',
    elegirGrande: '¡MENSAJE ENCONTRADO!',
    elegirTexto: 'Ya tienes EJIDO y APAGÓN. Puedes pasar a la siguiente fase o seguir buscando el resto de palabras.',
    pasar: 'Pasar a la siguiente fase',
    seguir: 'Seguir jugando',
    mensaje: '¡¡MENSAJE ENCONTRADO!!',
  };

  // Adornos de cada anuncio (estrella, icono).
  const ART = {
    apuestas: { burst: '500%', icon: '$' },
    lonely: { icon: '♥' },
    robots: { burst: 'HOT', icon: '♀' },
    seguro: { icon: '✚', shield: true },
    mama: { burst: '-50%', icon: '☺' },
    transformers: { burst: 'NUEVO', icon: '▶' },
    real: { warn: true, icon: '!' },
    virus: { warn: true, icon: '☣' },
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  Game.minijuegos.sopa = function (host, opts) {
    const dif = opts && TUNING[opts.dificultad] ? opts.dificultad : 'intermedio';
    const TU = TUNING[dif];
    const lvl = (n) => Math.max(0, Math.min(n, 3) - 1); // índice en every/max (n ≥ 1)
    const T = (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.sopa) || {};
    const A = (Game.guion && Game.guion.acto2) || {};
    const WORDS = T.palabras || ['EJIDO', 'APAGÓN', 'IA', 'SANCHEZ'];
    const ADS = T.anuncios || [];
    const { g: GRID } = makeGrid(WORDS);

    let alive = true;
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    const timeouts = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timeouts.delete(id); if (alive) fn(); }, ms);
      timeouts.add(id);
    };
    const listeners = [];
    const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); };

    const root = document.createElement('div');
    root.className = 'sp-root';
    host.appendChild(root);

    // Tamaño de letra según el tamaño del host (todo va en em).
    function fit() {
      const w = host.clientWidth || 1280, h = host.clientHeight || 740;
      root.style.fontSize = `${Math.max(6, Math.min(w / 80, h / 46))}px`;
    }
    fit();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(host); }

    // ---------- 1) código largo que corre y glitchea ----------
    root.innerHTML = '<pre class="sp-intro"></pre>';
    root.classList.add('sp-glitchy');
    const pre = root.querySelector('.sp-intro');
    let line = 0;
    let scrollCode = setInterval(() => {
      if (!alive) return;
      pre.textContent += CODE[line % CODE.length] + '\n';
      if (Math.random() < 0.3) pre.textContent += [...Array(48)].map(() => '01#$%&@'[Math.floor(Math.random() * 7)]).join('') + '\n';
      pre.scrollTop = pre.scrollHeight;
      line++;
    }, 60);
    if (Game.sound && Game.sound.glitch) Game.sound.glitch();
    later(() => {
      clearInterval(scrollCode); scrollCode = null;
      root.classList.remove('sp-glitchy');
      build();
    }, 3600);

    // ---------- 2) sopa de letras + anuncios ----------
    let raf = 0;
    function build() {
      const COLORS = ['c0', 'c1', 'c2', 'c3'];
      root.innerHTML =
        '<div class="sp-page">' +
          '<header class="sp-head">' +
            '<span class="sp-star">✦</span>' +
            `<h1 class="sp-title">${esc(T.titulo || 'SOPA DE LETRAS')}</h1>` +
            '<span class="sp-star sp-star-b">✦</span>' +
          '</header>' +
          `<div class="sp-marquee"><span>${esc(T.marquesina || '')}</span></div>` +
          '<main class="sp-main">' +
            '<section class="sp-board">' +
              `<div class="sp-board-head"><b>${esc(A.instruccion || 'Encuentra el mensaje encriptado')}</b>` +
              `<span>${esc(T.ayuda || '')}</span></div>` +
              '<div class="sp-grid-wrap"><div class="sp-grid"></div>' +
              `<svg class="sp-lines" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none"></svg></div>` +
            '</section>' +
            '<aside class="sp-side">' +
              `<div class="sp-box sp-list"><div class="sp-box-t">${esc(T.lista || 'LISTA DE PALABRAS')}</div><ul></ul></div>` +
              '<div class="sp-box sp-counter"><div class="sp-box-t">PUNTOS</div><div class="sp-digits sp-score">000000</div></div>' +
              '<div class="sp-box sp-counter"><div class="sp-box-t">VISITAS</div><div class="sp-digits">000402040</div></div>' +
              '<div class="sp-construction"><span>EN CONSTRUCCIÓN</span></div>' +
              '<div class="sp-badges"><span>Hecho con<br>Bloc de notas</span><span>Mejor visto<br>a 800×600</span></div>' +
            '</aside>' +
          '</main>' +
        '</div>' +
        '<div class="sp-pops"></div>';

      const gridEl = root.querySelector('.sp-grid');
      const lines = root.querySelector('.sp-lines');
      const listEl = root.querySelector('.sp-list ul');
      const scoreEl = root.querySelector('.sp-score');
      const popsEl = root.querySelector('.sp-pops');

      const cells = [];
      GRID.forEach((row, r) => row.forEach((ch, c) => {
        const s = document.createElement('span');
        s.className = 'sp-cell';
        s.textContent = ch;
        s.dataset.cursor = 'hand';
        gridEl.appendChild(s);
        cells.push(s);
      }));
      const cell = (r, c) => cells[r * N + c];

      const words = WORDS.map((w, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="sp-check"></i><span>${esc(w)}</span>`;
        listEl.appendChild(li);
        return { word: w, key: plain(w), el: li, found: false, color: COLORS[i % COLORS.length] };
      });
      const foundCount = () => words.filter((w) => w.found).length;
      const showScore = () => { scoreEl.textContent = String((Game.score && Game.score.value) || 0).padStart(6, '0'); };
      showScore();
      const addScore = (n) => { if (Game.score) Game.score.add(n); showScore(); };

      // --- selección arrastrando ---
      let start = null;
      let path = [];
      let finished = false;
      let choosing = false; // panel de "pasar / seguir" abierto
      let offered = false;
      function cellFromPoint(x, y) {
        const rc = gridEl.getBoundingClientRect();
        return { r: ((y - rc.top) / rc.height) * N - 0.5, c: ((x - rc.left) / rc.width) * N - 0.5 };
      }
      // Recta desde start hacia el punto, ajustada a una de las 8 direcciones.
      function lineTo(p) {
        const vr = p.r - start.r, vc = p.c - start.c;
        const dist = Math.hypot(vr, vc);
        if (dist < 0.5) return [start];
        let best = DIRS[0], bestDot = -Infinity;
        for (const d of DIRS) {
          const dot = (vr * d[0] + vc * d[1]) / Math.hypot(d[0], d[1]);
          if (dot > bestDot) { bestDot = dot; best = d; }
        }
        const step = Math.hypot(best[0], best[1]);
        let len = Math.round(bestDot / step);
        const out = [start];
        for (let i = 1; i <= len; i++) {
          const r = start.r + best[0] * i, c = start.c + best[1] * i;
          if (r < 0 || c < 0 || r >= N || c >= N) break;
          out.push({ r, c });
        }
        return out;
      }
      function paint() {
        cells.forEach((s) => s.classList.remove('sp-sel'));
        path.forEach((p) => cell(p.r, p.c).classList.add('sp-sel'));
      }
      on(gridEl, 'mousedown', (e) => {
        if (e.button !== 0 || finished || choosing) return;
        e.preventDefault();
        const p = cellFromPoint(e.clientX, e.clientY);
        const r = Math.round(p.r), c = Math.round(p.c);
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        start = { r, c };
        path = [start];
        paint();
      });
      on(window, 'mousemove', (e) => {
        if (!start) return;
        path = lineTo(cellFromPoint(e.clientX, e.clientY));
        paint();
      });
      on(window, 'mouseup', () => {
        if (!start) return;
        const str = plain(path.map((p) => GRID[p.r][p.c]).join(''));
        const rev = [...str].reverse().join('');
        const w = words.find((x) => !x.found && (x.key === str || x.key === rev));
        if (w && path.length > 1) foundWord(w, path);
        else if (path.length > 1 && Game.sound) Game.sound.mouse(false);
        start = null;
        path = [];
        paint();
      });

      function foundWord(w, p) {
        w.found = true;
        w.el.classList.add('sp-found', `sp-${w.color}`);
        p.forEach((q) => cell(q.r, q.c).classList.add('sp-hit', `sp-${w.color}`));
        const a = p[0], b = p[p.length - 1];
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('x1', a.c + 0.5); ln.setAttribute('y1', a.r + 0.5);
        ln.setAttribute('x2', b.c + 0.5); ln.setAttribute('y2', b.r + 0.5);
        ln.setAttribute('class', `sp-${w.color}`);
        lines.appendChild(ln);
        if (Game.sound) Game.sound.message(true);
        addScore(500);
        if (Game.atencion) Game.atencion.curar(6);
        const n = foundCount();
        if (n >= words.length) { win(T.completa || '¡SOPA COMPLETA!'); return; }
        if (!offered && KEY_WORDS.every((k) => words.some((x) => x.key === k && x.found))) {
          offered = true;
          later(offerChoice, 500);
          return;
        }
        // Anuncios de golpe al encontrar una palabra (los primeros salen tras la primera).
        for (let i = 0; i < TU.burst; i++) {
          later(() => { if (pops.length < TU.max[lvl(foundCount())]) spawn(); }, 600 + i * 500);
        }
        nextSpawn = TU.every[lvl(n)];
      }

      // --- panel: pasar a la siguiente fase o seguir jugando ---
      function offerChoice() {
        if (finished) return;
        choosing = true;
        start = null; path = []; paint();
        const ov = document.createElement('div');
        ov.className = 'sp-choice';
        ov.innerHTML =
          '<div class="sp-pop sp-dlg">' +
            '<div class="sp-pop-bar">' +
              '<span class="sp-pop-ico">✉</span>' +
              `<span class="sp-pop-t">${esc(TXT.elegirTitulo)}</span>` +
            '</div>' +
            '<div class="sp-pop-body">' +
              '<div class="sp-shield"><span>✔</span></div>' +
              `<div class="sp-pop-big">${esc(TXT.elegirGrande)}</div>` +
              `<div class="sp-pop-txt">${esc(TXT.elegirTexto)}</div>` +
              '<div class="sp-pop-btns sp-dlg-btns">' +
                `<button class="sp-pop-btn sp-dlg-pasar" data-cursor="hand">${esc(TXT.pasar)}</button>` +
                `<button class="sp-pop-btn sp-dlg-seguir" data-cursor="hand">${esc(TXT.seguir)}</button>` +
              '</div>' +
            '</div>' +
          '</div>';
        root.appendChild(ov);
        if (Game.sound) Game.sound.message(true);
        ov.querySelector('.sp-dlg-pasar').addEventListener('click', () => {
          if (finished) return;
          if (Game.sound) Game.sound.tick();
          ov.remove();
          choosing = false;
          win(TXT.mensaje);
        });
        ov.querySelector('.sp-dlg-seguir').addEventListener('click', () => {
          if (Game.sound) Game.sound.tick();
          ov.remove();
          choosing = false;
          nextSpawn = TU.every[lvl(foundCount())];
        });
      }

      // --- anuncios ---
      const pops = [];
      let z = 10;
      let cascade = null; // { x, y, k } en em
      let adIndex = 0;
      const order = ADS.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const fs = () => parseFloat(root.style.fontSize) || 16;
      const POP_W = 21, POP_H = 15; // em aproximados

      function nextPos(near) {
        const wEm = root.clientWidth / fs(), hEm = root.clientHeight / fs();
        if (near) return { x: Math.min(near.x + 2, wEm - POP_W - 0.5), y: Math.min(near.y + 2, hEm - POP_H - 0.5) };
        if (!cascade || cascade.k >= 5 || cascade.x + 2 * (cascade.k + 1) > wEm - POP_W || cascade.y + 2 * (cascade.k + 1) > hEm - POP_H) {
          cascade = { x: 1 + Math.random() * Math.max(1, wEm - POP_W - 12), y: 4 + Math.random() * Math.max(1, hEm - POP_H - 14), k: 0 };
        } else cascade.k++;
        return { x: cascade.x + cascade.k * 2, y: cascade.y + cascade.k * 2 };
      }

      function front(p) { p.el.style.zIndex = ++z; }

      function spawn(near) {
        if (!alive || finished || choosing || !ADS.length) return;
        const ad = ADS[order[adIndex++ % order.length]];
        const art = ART[ad.id] || {};
        const el = document.createElement('div');
        el.className = `sp-pop sp-pop-${ad.id}${art.warn ? ' sp-pop-warn' : ''}`;
        el.innerHTML =
          '<div class="sp-pop-bar">' +
            `<span class="sp-pop-ico">${esc(art.icon || '★')}</span>` +
            `<span class="sp-pop-t">${esc(ad.titulo)}</span>` +
            '<span class="sp-pop-q">?</span>' +
            '<button class="sp-pop-x" data-cursor="hand" title="Cerrar">×</button>' +
          '</div>' +
          '<div class="sp-pop-body">' +
            (art.burst ? `<div class="sp-burst"><span>${esc(art.burst)}</span></div>` : '') +
            (art.warn ? `<div class="sp-warn"><span>${esc(art.icon)}</span></div>` : '') +
            (art.shield ? '<div class="sp-shield"><span>✚</span></div>' : '') +
            `<div class="sp-pop-big">${esc(ad.grande)}</div>` +
            (ad.texto ? `<div class="sp-pop-txt">${esc(ad.texto)}</div>` : '') +
            `<div class="sp-pop-btns"><button class="sp-pop-btn" data-cursor="hand">${esc(ad.boton)}</button></div>` +
          '</div>';
        const pos = nextPos(near);
        el.style.left = `${pos.x}em`;
        el.style.top = `${pos.y}em`;
        popsEl.appendChild(el);
        const p = { el, ad, age: 0, x: pos.x, y: pos.y, hot: false };
        pops.push(p);
        front(p);
        if (Game.sound) Game.sound.message(false);

        el.addEventListener('mousedown', (e) => { front(p); e.stopPropagation(); });
        el.querySelector('.sp-pop-x').addEventListener('click', () => close(p));
        el.querySelector('.sp-pop-btn').addEventListener('click', () => {
          if (ad.trampa) {
            // Trampa: no cierra, abre otro encima.
            el.classList.remove('sp-shake'); void el.offsetWidth; el.classList.add('sp-shake');
            if (Game.sound) Game.sound.glitch();
            spawn({ x: p.x, y: p.y });
          } else close(p);
        });
        // Arrastrar por la barra de título.
        el.querySelector('.sp-pop-bar').addEventListener('mousedown', (e) => {
          if (e.button !== 0 || e.target.closest('.sp-pop-x')) return;
          e.preventDefault();
          const rc = root.getBoundingClientRect();
          const scale = (rc.width / root.offsetWidth) || 1;
          drag = { p, sx: e.clientX, sy: e.clientY, x0: p.x, y0: p.y, k: scale * fs() };
        });
      }

      let drag = null;
      on(window, 'mousemove', (e) => {
        if (!drag) return;
        const wEm = root.clientWidth / fs(), hEm = root.clientHeight / fs();
        drag.p.x = Math.max(-POP_W + 3, Math.min(wEm - 3, drag.x0 + (e.clientX - drag.sx) / drag.k));
        drag.p.y = Math.max(0, Math.min(hEm - 2, drag.y0 + (e.clientY - drag.sy) / drag.k));
        drag.p.el.style.left = `${drag.p.x}em`;
        drag.p.el.style.top = `${drag.p.y}em`;
      });
      on(window, 'mouseup', () => { drag = null; });

      function close(p) {
        const i = pops.indexOf(p);
        if (i < 0) return;
        pops.splice(i, 1);
        if (drag && drag.p === p) drag = null;
        if (Game.sound) Game.sound.tick();
        addScore(50 + Math.max(0, Math.round(60 - p.age * 15)));
        p.el.classList.add('sp-pop-bye');
        later(() => p.el.remove(), 160);
      }

      // --- bucle: aparición y drenaje ---
      let last = null;
      let nextSpawn = TU.every[0];
      let debt = 0;
      function frame(ts) {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        const dt = last == null ? 0 : Math.min(0.05, Math.max(0, (ts - last) / 1000));
        last = ts;
        if (finished || choosing) return;
        const n = foundCount();
        if (n === 0) return; // sin palabras encontradas no hay anuncios
        nextSpawn -= dt;
        if (nextSpawn <= 0) {
          if (pops.length < TU.max[lvl(n)]) spawn();
          nextSpawn = TU.every[lvl(n)] * (0.8 + Math.random() * 0.4);
        }
        for (const p of pops) {
          p.age += dt;
          debt += Math.min(TU.cap, TU.base + TU.slope * p.age) * dt;
          if (!p.hot && p.age > HOT_AGE) { p.hot = true; p.el.classList.add('sp-pop-hot'); }
        }
        if (debt >= 1) {
          const n = Math.floor(debt);
          debt -= n;
          if (Game.atencion) Game.atencion.danar(n);
        }
      }
      raf = requestAnimationFrame(frame);

      function win(msg) {
        finished = true;
        pops.splice(0).forEach((p, i) => later(() => p.el.classList.add('sp-pop-bye'), i * 60));
        addScore(Math.round(((Game.atencion && Game.atencion.value) || 0) * 10));
        const ban = document.createElement('div');
        ban.className = 'sp-win';
        ban.innerHTML = `<span>${esc(msg)}</span>`;
        root.appendChild(ban);
        later(() => resolveDone(true), 1600);
      }
    }

    return {
      done,
      destroy() {
        alive = false;
        if (scrollCode) clearInterval(scrollCode);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        cancelAnimationFrame(raf);
        listeners.forEach(([el, ev, fn, opt]) => el.removeEventListener(ev, fn, opt));
        listeners.length = 0;
        if (ro) ro.disconnect();
        root.remove();
      },
    };
  };
})();
