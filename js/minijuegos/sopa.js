// Minijuego del acto 2: pestaña que se abre glitcheando con código y luego una sopa de letras.
// "Encuentra el mensaje encriptado": la lista muestra las palabras encriptadas (SxNCxEZ…) y el jugador
// las busca arrastrando de la primera a la última letra (en cualquier dirección, también en diagonal).
// Contrato: Game.minijuegos.sopa(host) → { done: Promise<true>, destroy() }
window.Game = window.Game || {};
Game.minijuegos = Game.minijuegos || {};

(function () {
  // La sopa del guion (15 × 15).
  const GRID = [
    'REUPPHXPÍJÁÜÁBG',
    'KEHMFSSAMKFEDFA',
    'ÉÑKXJEMUNOZTXPS',
    'BFKÉÍMKXÑNOJZJÍ',
    'UJAPAGÓNJVRPCJM',
    'RPUEJIDONÁMSRXU',
    'ZLÁHÑFÁSVÑÁFXIN',
    'UÁIQZMADQNDXYCD',
    'ÚNEÚACGSCBJQNMÜ',
    'ÉMHÓGVRHCPOSÉZA',
    'SÉICMAEKBILOKZÜ',
    'KXARPZPÓATSPÁKL',
    'MIÑKGCAMQKQMEOI',
    'ÓCQEÑÉLIÍÚEQODÑ',
    'ÁOTCÑBÓQJVTTÉÚU',
  ].map((r) => [...r]);
  const N = 15;
  const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  const CODE = [
    '#include <sr/fase3.h>', 'static const char *BLOQUE = "0x7F3A";', 'int main(int argc, char **argv) {',
    '  if (!enlace_seguro()) return -102;', '  cifrado_t c = cargar("MAPA7382");', '  for (int i = 0; i < 0xFFFF; i++) {',
    '    c.llave[i % 32] ^= ruido(i) << 3;', '    if (vigilancia_activa()) { ocultar(&c); }', '  }',
    '  /* NO CONFIAR EN EL ASISTENTE */', '  mensaje_t m = descifrar(&c, "xJIxO");', '  enviar(m, HALCON);', '}',
    'void ocultar(cifrado_t *c) {', '  memset(c->rastro, 0, sizeof c->rastro);', '  apagon_local(COLONIA_7);', '}',
  ];

  Game.minijuegos.sopa = function (host) {
    const T = Game.guion.minijuegos.sopa;
    const A = Game.guion.acto2;
    let alive = true;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });

    // 1) código largo que corre y glitchea
    host.classList.add('fase3', 'glitchy');
    host.innerHTML = '<pre class="fase3-code"></pre>';
    const pre = host.querySelector('pre');
    let line = 0;
    const scrollCode = setInterval(() => {
      if (!alive) return;
      pre.textContent += CODE[line % CODE.length] + '\n';
      if (Math.random() < 0.3) pre.textContent += [...Array(40)].map(() => '01#$%&@'[Math.floor(Math.random() * 7)]).join('') + '\n';
      pre.scrollTop = pre.scrollHeight;
      line++;
    }, 60);
    Game.sound.glitch();
    later(() => { clearInterval(scrollCode); host.classList.remove('glitchy'); build(); }, 3600);

    // 2) sopa de letras
    function build() {
      host.innerHTML =
        `<div class="sopa-head">${A.instruccion}</div>` +
        `<div class="sopa-help">${T.ayuda}</div>` +
        '<div class="sopa"><div class="sopa-grid"><svg class="sopa-lines"></svg></div>' +
        '<div class="sopa-list"><b>LISTA DE PALABRAS</b></div></div>';
      const grid = host.querySelector('.sopa-grid');
      const lines = host.querySelector('.sopa-lines');
      const list = host.querySelector('.sopa-list');
      const cells = [];
      GRID.forEach((row, r) => row.forEach((ch, c) => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.dataset.r = r; s.dataset.c = c;
        s.dataset.cursor = 'hand';
        grid.appendChild(s);
        cells.push(s);
      }));
      const words = T.palabras.map((w) => {
        const el = document.createElement('span');
        el.textContent = w.pista;
        el.dataset.real = w.palabra;
        list.appendChild(el);
        return { ...w, key: plain(w.palabra), el, found: false };
      });
      const cell = (r, c) => cells[r * N + c];

      let start = null;
      let path = [];
      function lineCells(a, b) {
        const dr = b.r - a.r, dc = b.c - a.c;
        const len = Math.max(Math.abs(dr), Math.abs(dc));
        if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null; // solo rectas
        const sr = Math.sign(dr), sc = Math.sign(dc);
        return Array.from({ length: len + 1 }, (_, i) => ({ r: a.r + sr * i, c: a.c + sc * i }));
      }
      const posOf = (el) => ({ r: +el.dataset.r, c: +el.dataset.c });
      function paint() {
        cells.forEach((s) => s.classList.remove('sel'));
        path.forEach((p) => cell(p.r, p.c).classList.add('sel'));
      }
      function cellAt(e) {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        return hit && hit.parentElement === grid && hit.dataset.r !== undefined ? hit : null;
      }
      const down = (e) => {
        const el = cellAt(e);
        if (!el || e.button !== 0) return;
        start = posOf(el);
        path = [start];
        paint();
      };
      const move = (e) => {
        if (!start) return;
        const el = cellAt(e);
        if (!el) return;
        const p = lineCells(start, posOf(el));
        if (p) { path = p; paint(); }
      };
      const up = () => {
        if (!start) return;
        const str = plain(path.map((p) => GRID[p.r][p.c]).join(''));
        const rev = [...str].reverse().join('');
        const w = words.find((x) => !x.found && (x.key === str || x.key === rev));
        if (w) {
          w.found = true;
          w.el.classList.add('found');
          path.forEach((p) => cell(p.r, p.c).classList.add('found'));
          const a = path[0], b = path[path.length - 1];
          const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          // en em de la cuadrícula: cada celda mide 1.55em
          ln.setAttribute('x1', `${(a.c + 0.5) * 1.55}em`); ln.setAttribute('y1', `${(a.r + 0.5) * 1.55}em`);
          ln.setAttribute('x2', `${(b.c + 0.5) * 1.55}em`); ln.setAttribute('y2', `${(b.r + 0.5) * 1.55}em`);
          lines.appendChild(ln);
          Game.sound.message(true);
          if (words.every((x) => x.found)) later(() => resolveDone(true), 1200);
        } else if (path.length > 1) {
          Game.sound.mouse(false);
        }
        start = null;
        path = [];
        paint();
      };
      grid.addEventListener('mousedown', down);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      cleanup = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }
    let cleanup = () => {};

    return {
      done,
      destroy() {
        alive = false;
        clearInterval(scrollCode);
        timers.forEach(clearTimeout);
        cleanup();
        host.innerHTML = '';
      },
    };
  };
})();
