// Sistema de archivos del ordenador del juego (en memoria) e iconos en SVG.
// Las fotos se pintan en un canvas al cargar, así no hacen falta archivos de imagen.
window.Game = window.Game || {};

(function () {
  // ---------- Fotos ----------
  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function paint(draw, w = 960, h = 640) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    return c.toDataURL('image/jpeg', 0.9);
  }

  function mountains(g, w, h) {
    const rnd = seeded(42);
    let gr = g.createLinearGradient(0, 0, 0, h * 0.65);
    gr.addColorStop(0, '#1c2a4d');
    gr.addColorStop(0.55, '#6b5b8c');
    gr.addColorStop(1, '#f2a477');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 70; i++) g.fillRect(rnd() * w, rnd() * h * 0.3, 1.5, 1.5);

    const ridge = (base, amp, color, seed) => {
      const r = seeded(seed);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, h);
      let y = base;
      for (let x = 0; x <= w + 40; x += 40) {
        y = Math.min(base + amp * 0.3, Math.max(base - amp, y + (r() - 0.5) * amp * 0.7));
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.fill();
    };
    ridge(h * 0.4, h * 0.2, '#7c6f9a', 3);
    ridge(h * 0.5, h * 0.16, '#4d4a78', 9);
    ridge(h * 0.6, h * 0.1, '#2e3258', 15);

    // lago
    gr = g.createLinearGradient(0, h * 0.68, 0, h);
    gr.addColorStop(0, '#d9967a');
    gr.addColorStop(1, '#283055');
    g.fillStyle = gr;
    g.fillRect(0, h * 0.68, w, h * 0.32);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 30; i++) g.fillRect(rnd() * w, h * (0.7 + rnd() * 0.28), w * (0.02 + rnd() * 0.06), 1.5);

    // pinos
    g.fillStyle = '#141a30';
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * w + rnd() * 20;
      if (x > w * 0.3 && x < w * 0.75) continue;
      const th = h * (0.12 + rnd() * 0.12);
      const base = h * 0.7;
      g.beginPath();
      g.moveTo(x, base - th);
      g.lineTo(x - th * 0.22, base);
      g.lineTo(x + th * 0.22, base);
      g.fill();
    }
  }

  // ---------- Archivos ----------
  // loc: 'desktop' | 'documents' | 'pictures' | 'trash'
  const items = [
    {
      id: 'nota', name: 'nota.txt', type: 'text', loc: 'desktop',
      content:
        'Cosas pendientes:\n' +
        '- Ordenar las fotos de las vacaciones\n' +
        '- Devolver el libro a la biblioteca\n' +
        '- Revisar la carpeta Documentos\n\n' +
        'No te olvides de vaciar la papelera de vez en cuando.',
    },
    { id: 'montana', name: 'montaña.jpg', type: 'image', loc: 'pictures', paint: mountains },
    {
      id: 'recordatorio', name: 'recordatorio.txt', type: 'text', loc: 'documents',
      content: 'Reunión el jueves a las 10:00.\nLlevar el informe impreso.',
    },
    {
      id: 'borrador', name: 'borrador.txt', type: 'text', loc: 'trash', prevLoc: 'documents',
      content: 'Esto no debería haberlo escrito...',
    },
  ];
  items.forEach((it) => { if (it.paint) it.src = paint(it.paint); });

  Game.files = {
    items,
    in: (loc) => items.filter((i) => i.loc === loc),
    get: (id) => items.find((i) => i.id === id),
    move(item, loc) {
      if (item.loc === loc) return false;
      if (loc === 'trash') item.prevLoc = item.loc;
      item.loc = loc;
      return true;
    },
    restore(item) {
      item.loc = item.prevLoc || 'desktop';
      delete item.prevLoc;
    },
    remove(item) {
      const i = items.indexOf(item);
      if (i >= 0) items.splice(i, 1);
    },
    // Añade un archivo (si no existe ya uno con ese id).
    add(item) {
      if (!items.some((i) => i.id === item.id)) items.push(item);
      return items.find((i) => i.id === item.id);
    },
  };

  // ---------- Iconos ----------
  // Pixel art de 32×32 al estilo del paquete de iconos de Windows 3.11: contorno negro de 1 px,
  // paleta VGA de 16 colores y algo de tramado. Cada icono se dibuja en una rejilla y se convierte
  // en rectángulos SVG (shape-rendering="crispEdges"), así se ve nítido a cualquier escala.
  const PAL = {
    K: '#000000', W: '#ffffff', G: '#c0c0c0', D: '#808080', N: '#000080', B: '#0000ff',
    T: '#008080', C: '#00ffff', Y: '#ffff00', O: '#808000', R: '#ff0000', M: '#800000',
    P: '#800080', F: '#ff00ff', g: '#008000', L: '#00ff00',
  };

  function grid() {
    const px = Array.from({ length: 32 }, () => Array(32).fill(null));
    const p = {
      set(x, y, c) { if (x >= 0 && x < 32 && y >= 0 && y < 32) px[y][x] = c; return p; },
      get: (x, y) => (x >= 0 && x < 32 && y >= 0 && y < 32 ? px[y][x] : null),
      rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i, y + j, c); return p; },
      hl: (x, y, w, c) => p.rect(x, y, w, 1, c),
      vl: (x, y, h, c) => p.rect(x, y, 1, h, c),
      // Caja con contorno negro.
      box(x, y, w, h, fill) { p.rect(x, y, w, h, 'K'); return p.rect(x + 1, y + 1, w - 2, h - 2, fill); },
      // Caja con las esquinas redondeadas un píxel.
      rbox(x, y, w, h, fill) {
        p.box(x, y, w, h, fill);
        [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]
          .forEach(([cx, cy, dx, dy]) => { p.set(cx, cy, null); p.set(cx + dx, cy + dy, 'K'); });
        return p;
      },
      // Relieve Win: luz arriba-izquierda, sombra abajo-derecha (por dentro del rectángulo dado).
      bevel(x, y, w, h, hi = 'W', lo = 'D') {
        p.hl(x, y, w - 1, hi); p.vl(x, y, h - 1, hi);
        p.hl(x + 1, y + h - 1, w - 1, lo); p.vl(x + w - 1, y + 1, h - 1, lo);
        return p;
      },
      // Tramado de tablero de ajedrez sobre lo que ya hay pintado.
      dither(x, y, w, h, c, phase = 0) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
          if ((x + i + y + j + phase) % 2 === 0 && p.get(x + i, y + j)) p.set(x + i, y + j, c);
        return p;
      },
      line(x0, y0, x1, y1, c) {
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          p.set(x0, y0, c);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return p;
      },
      // Región definida por una función (centro del píxel) con contorno negro automático.
      shape(inside, fill, outline = 'K') {
        const at = (x, y) => x >= 0 && x < 32 && y >= 0 && y < 32 && inside(x + 0.5, y + 0.5);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          if (!at(x, y)) continue;
          const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
          p.set(x, y, edge && outline ? outline : typeof fill === 'function' ? fill(x, y) : fill);
        }
        return p;
      },
      // Dibujo a partir de un mapa de texto (un carácter por píxel; '.' = no tocar, '_' = borrar).
      map(x, y, rows) {
        rows.forEach((r, j) => [...r].forEach((ch, i) => {
          if (ch === '_') p.set(x + i, y + j, null);
          else if (ch !== '.') p.set(x + i, y + j, ch);
        }));
        return p;
      },
      svg(extra = '') {
        let out = '';
        for (let y = 0; y < 32; y++) {
          let x = 0;
          while (x < 32) {
            const c = px[y][x];
            let n = 1;
            while (x + n < 32 && px[y][x + n] === c) n++;
            if (c) out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[c]}"/>`;
            x += n;
          }
        }
        return `<svg class="px-icon" viewBox="0 0 32 32" shape-rendering="crispEdges" fill="none" stroke="none">${out}${extra}</svg>`;
      },
    };
    return p;
  }

  const memo = (fn) => { const cache = {}; return (k = '') => (cache[k] ??= fn(k)); };
  const ellipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

  // Esquina doblada (oreja) arriba a la derecha de una hoja: corta el triángulo exterior y pinta la solapa.
  function earTopRight(p, x1, y0, n, flap = 'G') {
    for (let r = 0; r < n; r++) {
      for (let x = x1 - n + 2 + r; x <= x1; x++) p.set(x, y0 + r, null);
      p.hl(x1 - n + 1, y0 + r, r + 1, flap);
    }
    p.vl(x1 - n + 1, y0, n, 'K').hl(x1 - n + 1, y0 + n - 1, n, 'K');
    return p.line(x1 - n + 1, y0, x1, y0 + n - 1, 'K');
  }

  const drawPc = () => {
    const p = grid();
    // monitor
    p.box(4, 1, 24, 19, 'G').bevel(5, 2, 22, 17);
    p.box(7, 4, 18, 13, 'N');
    p.rect(8, 5, 16, 11, 'T');
    p.rect(10, 7, 9, 6, 'W').hl(10, 7, 9, 'N').vl(18, 8, 5, 'D').hl(10, 12, 9, 'D');
    p.hl(11, 9, 5, 'K').hl(11, 10, 3, 'D');
    p.set(8, 5, 'C').set(9, 5, 'C').set(8, 6, 'C');
    p.set(24, 17, 'L'); // piloto del monitor
    // pie
    p.rect(12, 20, 8, 1, 'K').rect(13, 20, 6, 1, 'D');
    // caja de sobremesa
    p.box(1, 21, 30, 9, 'G').bevel(2, 22, 28, 7);
    p.rect(17, 24, 11, 1, 'K').rect(17, 25, 11, 1, 'D');
    p.rect(4, 24, 2, 2, 'L').rect(7, 24, 2, 2, 'M');
    p.dither(3, 27, 12, 1, 'D');
    return p.svg();
  };

  const drawFolder = () => {
    const p = grid();
    p.box(2, 5, 12, 5, 'Y');
    p.box(2, 8, 28, 20, 'Y');
    p.hl(3, 8, 10, 'Y');
    p.hl(3, 6, 10, 'W').hl(3, 9, 26, 'W').vl(3, 9, 17, 'W');
    p.vl(28, 9, 18, 'O').hl(4, 26, 25, 'O');
    p.dither(4, 21, 24, 5, 'O');
    // solapa delantera
    p.hl(3, 12, 26, 'K').hl(3, 13, 26, 'W');
    return p.svg();
  };

  const drawText = () => {
    const p = grid();
    p.rect(9, 4, 18, 27, 'D'); // sombra
    p.box(7, 2, 18, 27, 'W');
    earTopRight(p, 24, 2, 7);
    [12, 9, 13, 11, 13, 6].forEach((w, i) => p.hl(10, 11 + i * 3, w, i === 0 ? 'N' : 'D'));
    return p.svg();
  };

  const drawNotes = () => {
    const p = grid();
    p.rect(8, 6, 20, 25, 'D');
    p.box(6, 4, 20, 26, 'W');
    p.rect(7, 5, 18, 3, 'R').hl(7, 7, 18, 'M');
    for (let x = 8; x <= 23; x += 3) p.map(x, 2, ['KK', 'K.', 'GK', 'DK']);
    for (let y = 11; y <= 26; y += 3) p.hl(8, y, 16, 'T');
    p.vl(11, 9, 20, 'R');
    p.hl(13, 10, 8, 'K').hl(13, 13, 10, 'K').hl(13, 16, 6, 'K');
    return p.svg();
  };

  const drawTrash = (full) => {
    const p = grid();
    // cuerpo: se estrecha hacia abajo
    const k = (y) => Math.floor((y - 10) / 7);
    p.shape((x, y) => y > 10 && y < 30 && x > 7 + (y - 10) / 7 && x < 25 - (y - 10) / 7, 'G');
    for (let y = 12; y < 28; y++) {
      [[11, 1], [15, 0], [19, -1]].forEach(([cx, dir]) => p.set(cx + dir * k(y), y, 'D').set(cx + 1 + dir * k(y), y, 'W'));
      p.set(9 + k(y), y, 'W').set(23 - k(y), y, 'D');
    }
    p.dither(9, 27, 15, 2, 'D');
    if (full) {
      // papeles arrugados asomando y la tapa apoyada de lado
      p.map(6, 1, [
        '....KKKK.....KKK...',
        '...KWWWWK...KWWWK..',
        '..KWWGWWWK.KWGWWWK.',
        '.KWWWWWGWWKWWWWGWK.',
        'KWGWWWDWWWWWWDWWWWK',
        'KWWDWWWWGWWWGWWWDWK',
        'KWWWWGWWWWDWWWWWWWK',
        'KWWWWWWWWWWWWWGWWK.',
      ]);
      p.rect(6, 9, 21, 3, 'K').rect(7, 10, 19, 1, 'D');
      p.map(25, 3, ['.KK.', 'KGWK', 'KGDK', 'KGDK', 'KGDK', 'KGDK', '.KK.']);
    } else {
      p.rect(6, 9, 21, 3, 'K').rect(7, 10, 19, 1, 'D');
      p.box(5, 6, 23, 4, 'G').hl(6, 7, 21, 'W');
      p.box(13, 3, 7, 3, 'G').hl(14, 4, 5, 'D');
    }
    return p.svg();
  };

  // LucIAno: cabeza de robot con aureola y una crucecita en el pecho (maquinaria divina).
  const drawLuciano = () => {
    const p = grid();
    p.map(9, 0, [
      '...YYYYYYYY...',
      '.YYOOOOOOOOYY.',
      'YO..........OY',
      '.YY........YY.',
      '...OOOOOOOO...',
    ]);
    p.vl(15, 5, 3, 'K').vl(16, 5, 3, 'D').rect(15, 4, 2, 1, 'R');
    p.box(3, 12, 4, 7, 'D').box(25, 12, 4, 7, 'D');
    p.box(6, 8, 20, 15, 'G').bevel(7, 9, 18, 13);
    p.box(9, 11, 14, 6, 'N');
    p.rect(11, 13, 3, 2, 'C').rect(18, 13, 3, 2, 'C').set(11, 13, 'W').set(18, 13, 'W');
    for (let x = 11; x <= 20; x += 2) p.vl(x, 18, 3, 'K');
    p.rect(13, 23, 6, 1, 'K').rect(14, 23, 4, 1, 'D');
    p.box(8, 24, 16, 8, 'B').hl(9, 25, 14, 'C');
    p.vl(15, 26, 5, 'Y').vl(16, 26, 5, 'Y').hl(13, 27, 6, 'Y');
    return p.svg();
  };

  const drawMensajes = () => {
    const p = grid();
    p.rbox(11, 2, 20, 13, 'T');
    p.hl(12, 3, 17, 'C').dither(12, 9, 18, 5, 'N');
    p.map(25, 14, ['KTK', '.KK', '..K']);
    p.rbox(1, 9, 23, 15, 'W');
    p.dither(2, 21, 21, 2, 'G');
    p.map(4, 23, ['KWWK', 'KWK.', 'KK..', 'K...']);
    [6, 11, 16].forEach((x) => p.rect(x, 15, 3, 3, 'N'));
    return p.svg();
  };

  const drawPostit = () => {
    const p = grid();
    p.rect(6, 7, 24, 24, 'D');
    p.box(4, 5, 24, 24, 'Y');
    // oreja doblada abajo a la derecha (esquina en 27,28; tamaño 7)
    for (let r = 0; r < 7; r++) {
      const y = 22 + r;
      for (let x = 28 - r; x <= 29; x++) p.set(x, y, null);
      p.hl(21, y, 7 - r, 'O');
      p.set(27 - r, y, 'K');
    }
    p.hl(21, 22, 7, 'K').vl(21, 22, 7, 'K');
    p.dither(6, 8, 20, 18, 'Y');
    p.hl(8, 12, 15, 'O').hl(8, 16, 15, 'O').hl(8, 20, 10, 'O');
    p.map(13, 1, ['.KKKK.', 'KRWRRK', 'KRRRRK', '.KMMK.', '..KK..', '..K...']);
    return p.svg();
  };

  const drawSr = () => {
    const p = grid();
    const d = (x, y) => Math.abs(x - 16) + Math.abs(y - 16);
    p.shape((x, y) => d(x, y) <= 15, (x, y) => (d(x + 0.5, y + 0.5) > 12.5 ? 'R' : 'K'));
    p.shape((x, y) => d(x, y) <= 12.6 && d(x, y) > 11.6, 'M', null);
    const eye = (x, y) => Math.abs(y - 16) <= 5 * (1 - ((x - 16) / 10) ** 2);
    p.shape(eye, 'W');
    p.shape(ellipse(16, 16, 3.6, 3.6), 'R', 'M');
    p.rect(15, 15, 2, 2, 'K').set(14, 14, 'W');
    return p.svg();
  };

  const drawMapa = () => {
    const p = grid();
    const top = (x) => {
      const i = x - 2, panel = Math.min(2, Math.floor(i / 10)), t = i - panel * 10;
      return 5 + (panel % 2 === 0 ? Math.round(3 - (t * 3) / 9) : Math.round((t * 3) / 9));
    };
    for (let x = 2; x <= 30; x++) {
      const t = top(x), panel = Math.min(2, Math.floor((x - 2) / 10)), shade = panel === 1;
      for (let y = t; y <= t + 21; y++) {
        const ry = y - t;
        const water = (x - 7) ** 2 + (ry - 14) ** 2 < 14 || (x > 22 && ry < 6 + (x - 22) / 3);
        let c = water ? (shade ? 'T' : 'C') : (shade ? 'g' : 'L');
        if (!water && (x + y) % 2 === 0 && (ry > 16 || shade)) c = shade ? 'O' : 'g';
        p.set(x, y, c);
      }
      p.set(x, t, 'K').set(x, t + 21, 'K');
    }
    [2, 12, 22, 30].forEach((x) => p.vl(x, top(x), 22, 'K'));
    [11, 21].forEach((x) => p.vl(x, top(x) + 1, 20, 'D'));
    // ruta roja punteada y una X
    const pts = [[5, 8], [10, 12], [15, 9], [19, 14], [24, 11]];
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
      for (let x = x0; x <= x1; x++) if (x % 2 === 0) p.set(x, top(x) + Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)), 'R');
    }
    const xt = top(26) + 11;
    p.map(24, xt - 2, ['R...R', '.R.R.', '..R..', '.R.R.', 'R...R']);
    return p.svg();
  };

  const drawViewer = () => {
    const p = grid();
    p.box(1, 4, 30, 25, 'G').bevel(2, 5, 28, 23);
    p.box(4, 7, 24, 19, 'C');
    p.dither(5, 8, 22, 6, 'W');
    p.shape(ellipse(22, 12, 2.6, 2.6), 'Y', 'O');
    p.shape((x, y) => x > 5 && x < 27 && y < 25 && y > 24 - Math.max(11 - Math.abs(x - 12) * 1.2, 6 - Math.abs(x - 22) * 0.9, 1),
      (x, y) => (y < 14.5 + Math.abs(x - 12) * 0.5 && Math.abs(x - 12) < 3 ? 'W' : (x + y) % 2 ? 'g' : 'O'), null);
    p.hl(5, 24, 22, 'g');
    return p.svg();
  };

  // Imagen: marco de cuadro gris con la foto metida dentro.
  const imageFrame = memo(() => {
    const p = grid();
    p.rect(3, 7, 29, 24, 'D');
    p.box(1, 5, 29, 24, 'G').bevel(2, 6, 27, 22);
    p.box(4, 8, 23, 18, 'K');
    return p;
  });

  const drawVideos = () => {
    const p = grid();
    p.line(9, 1, 14, 7, 'K').line(23, 1, 18, 7, 'K').set(9, 1, 'D').set(23, 1, 'D');
    p.box(1, 7, 30, 21, 'G').bevel(2, 8, 28, 19);
    p.rbox(4, 10, 18, 15, 'N');
    p.dither(5, 11, 16, 13, 'B');
    for (let dy = -4; dy <= 4; dy++) p.hl(10, 17 + dy, 1 + Math.round((4 - Math.abs(dy)) * 1.6), 'Y');
    p.vl(10, 13, 9, 'O');
    p.shape(ellipse(26, 12.5, 2, 2), 'D').set(26, 12, 'W');
    p.shape(ellipse(26, 17.5, 2, 2), 'D').set(26, 17, 'W');
    for (let y = 21; y <= 25; y += 2) p.hl(24, y, 5, 'K');
    p.rect(4, 28, 4, 2, 'K').rect(24, 28, 4, 2, 'K');
    return p.svg();
  };

  // FAINT: paleta de pintor con manchas de color y un pincel.
  const drawFaint = () => {
    const p = grid();
    const hole = ellipse(10, 22, 2.3, 2);
    p.shape((x, y) => ellipse(15, 17, 14, 10.5)(x, y) && !(x > 24 && y > 19 && y < 25) && !hole(x, y),
      (x, y) => ((x + y) % 2 === 0 && y > 21 ? 'O' : 'Y'));
    [[7, 11, 'R'], [12, 8, 'B'], [18, 8, 'L'], [23, 11, 'F'], [17, 21, 'P'], [5, 15, 'C']].forEach(([x, y, c]) =>
      p.rect(x, y, 3, 3, c).set(x, y, 'W'));
    // pincel en diagonal
    for (let i = 0; i < 13; i++) p.set(29 - i, 1 + i, 'K').set(30 - i, 1 + i, 'M').set(31 - i, 1 + i, 'R').set(31 - i, 2 + i, 'K');
    p.map(15, 13, ['..KGGK', '.KGWDK', 'KGGDK.', 'KKDKK.']);
    p.map(12, 16, ['..KK', '.KPK', 'KPPK', 'KPK.', '.K..']);
    return p.svg();
  };

  // Minijuegos: control de videojuego gris con cruceta y botones de colores.
  const drawMinijuegos = () => {
    const p = grid();
    p.shape((x, y) => ellipse(9, 18, 8, 7.5)(x, y) || ellipse(23, 18, 8, 7.5)(x, y) || (x >= 9 && x <= 23 && y >= 11 && y <= 21),
      (x, y) => (y > 21 ? 'D' : 'G'), 'K');
    p.hl(10, 12, 12, 'W');
    p.rect(5, 16, 7, 3, 'K').rect(7, 14, 3, 7, 'K');           // cruceta
    p.set(8, 17, 'D');
    p.rect(24, 13, 3, 3, 'R').rect(27, 16, 3, 3, 'L').rect(21, 16, 3, 3, 'B').rect(24, 19, 3, 3, 'Y');
    p.rect(13, 17, 2, 1, 'P').rect(17, 17, 2, 1, 'P');           // select / start
    p.vl(16, 4, 7, 'K').set(15, 3, 'R').set(16, 3, 'R').set(17, 3, 'R').set(16, 2, 'R');  // cable
    return p.svg();
  };

  const draw = {
    minijuegos: memo(drawMinijuegos),
    pc: memo(drawPc), folder: memo(drawFolder), text: memo(drawText), notes: memo(drawNotes),
    trash: memo((k) => drawTrash(k === 'full')), luciano: memo(drawLuciano), mensajes: memo(drawMensajes),
    postit: memo(drawPostit), sr: memo(drawSr), mapa: memo(drawMapa), viewer: memo(drawViewer),
    videos: memo(drawVideos), faint: memo(drawFaint),
  };

  Game.icons = {
    pc: () => draw.pc(),
    folder: () => draw.folder(),
    text: () => draw.text(),
    image: (src) => imageFrame().svg(
      `<image href="${src}" x="5" y="9" width="21" height="16" preserveAspectRatio="xMidYMid slice"/>` +
      '<rect x="5" y="9" width="21" height="1" fill="#ffffff" fill-opacity=".35"/>'),
    trash: (full) => draw.trash(full ? 'full' : 'empty'),
    luciano: () => draw.luciano(),
    mensajes: () => draw.mensajes(),
    mapa: () => draw.mapa(),
    viewer: () => draw.viewer(),
    postit: () => draw.postit(),
    sr: () => draw.sr(),
    notes: () => draw.notes(),
    videos: () => draw.videos(),
    faint: () => draw.faint(),
    minijuegos: () => draw.minijuegos(),
  };
})();
