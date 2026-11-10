// Manos del jugador dibujadas en SVG (vista desde arriba, primera persona).
// Coordenadas en unidades de tecla. La mano izquierda es la base; la derecha es su espejo.
(function () {
  const W = 6.4;  // ancho del dibujo
  const H = 10;   // alto del dibujo (el antebrazo sale por abajo de la pantalla)

  // Dedos de la mano izquierda: 0 meñique, 1 anular, 2 corazón, 3 índice, 4 pulgar.
  // tip = punta, base = nudillo, w = grosor.
  const LEFT_FINGERS = [
    { tip: [0.95, 1.75], base: [1.1, 4.1], w: 0.62 },
    { tip: [1.95, 1.0], base: [1.95, 3.9], w: 0.7 },
    { tip: [2.95, 0.65], base: [2.9, 3.8], w: 0.74 },
    { tip: [3.95, 1.0], base: [3.8, 3.9], w: 0.72 },
    { tip: [5.3, 3.15], base: [4.25, 5.4], w: 0.82 },
  ];
  const PALM = 'M0.85,4.0 C0.8,3.6 4.4,3.4 4.45,3.85 C4.75,4.6 4.85,5.8 4.5,6.7 ' +
               'C4.2,7.4 1.5,7.5 1.25,6.8 C0.95,6.0 0.8,4.8 0.85,4.0 Z';
  const ARM = 'M1.35,6.6 L4.35,6.6 L4.6,10.5 L1.0,10.5 Z';
  const SLEEVE = 'M1.0,8.3 C2.0,8.0 3.6,8.0 4.55,8.3 L4.75,10.5 L0.85,10.5 Z';

  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  function buildSvg(mirror) {
    const svg = make('svg', { viewBox: `0 0 ${W} ${H}` });
    const root = make('g', mirror ? { transform: `translate(${W},0) scale(-1,1)` } : {});
    svg.appendChild(root);

    const skin = 'var(--skin)';
    const outline = 'var(--skin-dark)';
    const OUT = 0.09; // grosor del contorno

    // Antebrazo y manga
    root.appendChild(make('path', { d: ARM, fill: skin, stroke: outline, 'stroke-width': OUT }));
    root.appendChild(make('path', { d: SLEEVE, fill: 'var(--sleeve)', stroke: 'var(--sleeve-dark)', 'stroke-width': OUT }));
    // Contorno de la palma (debajo de los dedos)
    root.appendChild(make('path', { d: PALM, fill: skin, stroke: outline, 'stroke-width': OUT * 2 }));

    const fingers = LEFT_FINGERS.map((f) => {
      const g = make('g', { class: 'finger' });
      const line = (cls, color, width) => make('line', {
        class: cls, x1: f.base[0], y1: f.base[1], x2: f.tip[0], y2: f.tip[1],
        stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
      });
      g.appendChild(line('edge', outline, f.w + OUT * 2));
      g.appendChild(line('fill', skin, f.w));
      // Uña
      const dx = f.tip[0] - f.base[0], dy = f.tip[1] - f.base[1];
      const len = Math.hypot(dx, dy);
      const nx = f.tip[0] - (dx / len) * 0.12, ny = f.tip[1] - (dy / len) * 0.12;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      g.appendChild(make('rect', {
        x: nx - f.w * 0.3, y: ny - 0.02, width: f.w * 0.6, height: 0.42, rx: 0.16,
        fill: '#c79b7a', opacity: 0.85,
        transform: `rotate(${angle} ${nx} ${ny + 0.19})`,
      }));
      root.appendChild(g);
      return g;
    });

    // Relleno de la palma encima de las bases de los dedos (oculta las uniones)
    root.appendChild(make('path', { d: PALM, fill: skin, stroke: 'none' }));
    // Nudillos
    [[1.15, 4.05], [1.95, 3.85], [2.9, 3.75], [3.8, 3.85]].forEach(([x, y]) => {
      root.appendChild(make('path', { d: `M${x - 0.22},${y + 0.25} q0.22,-0.12 0.44,0`, stroke: outline,
        'stroke-width': 0.05, fill: 'none', opacity: 0.6, 'stroke-linecap': 'round' }));
    });
    return { svg, fingers };
  }

  class Hand {
    constructor(el, side) {
      this.el = el;
      this.side = side;
      const { svg, fingers } = buildSvg(side === 'R');
      el.appendChild(svg);
      el.style.width = `${W}em`;
      el.style.height = `${H}em`;
      this.fingerEls = fingers;
      this.pos = null;          // posición actual (esquina sup. izq., unidades)
      this.target = { x: 0, y: 0 };
    }

    // Punta del dedo i en coordenadas locales de la mano.
    tip(i) {
      const [x, y] = LEFT_FINGERS[i].tip;
      return { x: this.side === 'R' ? W - x : x, y };
    }

    // Mueve la mano para que la punta del dedo i quede en el punto p (del plano).
    aimFinger(i, p, dy = 0.15) {
      const t = this.tip(i);
      this.target = { x: p.x - t.x, y: p.y - t.y + dy };
    }

    press(i, on) {
      this.fingerEls[i].classList.toggle('press', on);
    }

    snap() { this.pos = { ...this.target }; }

    update(dt, speed = 18) {
      if (!this.pos) this.snap();
      const k = 1 - Math.exp(-speed * dt);
      this.pos.x += (this.target.x - this.pos.x) * k;
      this.pos.y += (this.target.y - this.pos.y) * k;
      this.el.style.transform = `translate(${this.pos.x.toFixed(4)}em, ${this.pos.y.toFixed(4)}em)`;
    }
  }

  Game.Hand = Hand;
})();
