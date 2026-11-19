// FAINT: parodia de Paint. Lienzo con pinceles (lápiz, pincel suave, aerosol, marcador de caligrafía,
// goma, arcoíris, glitch), bote de pintura, cuentagotas, paleta VGA de 2×14 colores, tamaños,
// Nuevo y Deshacer. Clic izquierdo = color principal, clic derecho = color de fondo.
// El lienzo crece con la ventana sin perder el dibujo (si la ventana se achica, aparecen barras de scroll).
window.Game = window.Game || {};

(function () {
  const PALETA = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
  ];
  const TAMANOS = [2, 4, 8, 14];
  const MAX_W = 1600, MAX_H = 1200;

  // Glifos de herramientas: mapas de 16×16 ('#' negro, otras letras = colores).
  const COL = { '#': '#000', w: '#fff', g: '#c0c0c0', d: '#808080', r: '#f00', y: '#ff0', b: '#00f', c: '#0ff', m: '#f0f', l: '#0f0', o: '#808000', n: '#000080' };
  const glyph = (rows) => {
    let s = '';
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (COL[ch]) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${COL[ch]}"/>`; }));
    return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">${s}</svg>`;
  };
  const TOOLS = [
    { id: 'pencil', name: 'Lápiz', icon: glyph([
      '..........##....', '.........#yy#...', '........#yyy#...', '.......#yyy#....', '......#yyy#.....', '.....#yyy#......',
      '....#yyy#.......', '...#yyy#........', '..#ggy#.........', '..#gg#..........', '.#dg#...........', '.##.............']) },
    { id: 'brush', name: 'Pincel', icon: glyph([
      '............##..', '...........#oo#.', '..........#oo#..', '.........#oo#...', '........#oo#....', '.......#gg#.....',
      '......#gwg#.....', '.....#ggg#......', '....####........', '...#nn#.........', '..#nnn#.........', '.#nnn#..........', '.#nn#...........', '..##............']) },
    { id: 'spray', name: 'Aerosol', icon: glyph([
      '.......n..n.n...', '.....n..n...n...', '......n.n.n.....', '....##..........', '...#gg#.........', '...####.........',
      '..#gddg#........', '..#gwdg#........', '..#gwdg#........', '..#grrg#........', '..#grrg#........', '..#gddg#........', '..#gddg#........', '...####.........']) },
    { id: 'marker', name: 'Caligrafía', icon: glyph([
      '...........###..', '..........#ddd#.', '.........#ddd#..', '........#ddd#...', '.......#ddd#....', '......#ddd#.....',
      '.....#bbb#......', '....#bbb#.......', '...#bb#.........', '..#b#...........', '..##............', '.....bbbb.......', '....bbbb........', '...bbbb.........']) },
    { id: 'eraser', name: 'Goma', icon: glyph([
      '................', '................', '.......######...', '......#mmmmm##..', '.....#mmmmm#m#..', '....#mmmmm#mm#..',
      '...#wwwww#mm#...', '..#wwwww#mm#....', '.#wwwww#m#......', '.#wwwww##.......', '.#######........']) },
    { id: 'rainbow', name: 'Arcoíris', icon: glyph([
      '................', '....rrrrrrrr....', '..rryyyyyyyyrr..', '.ryylllllllllyr.', '.ryllccccccclly.', 'ryllccbbbbbcclly',
      'rylcbbmmmmbbclyr', 'rylcbm....mbclyr', 'rylcbm....mbclyr', 'rylcbm....mbclyr']) },
    { id: 'glitch', name: 'Glitch', icon: glyph([
      '................', '.rrrr..cccc.....', '.rrrrr..cccc....', '....rrrrr.cccc..', '..lll.....mmmm..', '..llllll.mmmmmm.',
      '.......llll.....', '.bbbbbb...yyyy..', '...bbbbbbb.yyyy.', '..........######', '.####...........', '...cccccc.rr....']) },
    { id: 'fill', name: 'Relleno', icon: glyph([
      '................', '.....##.........', '....#ww#........', '...#wwww#.......', '..#wwwwww#......', '.#wwwwwwww#.....',
      '#dwwwwwwwd#b....', '.#dwwwwwd#.bb...', '..#dwwwd#..bbb..', '...#dwd#...bbb..', '....#d#.....b...', '.....#..........']) },
    { id: 'picker', name: 'Cuentagotas', icon: glyph([
      '...........###..', '..........#####.', '.........######.', '........#####...', '.......#gg##....', '......#gwg#.....',
      '.....#gwg#......', '....#gwg#.......', '...#gwg#........', '..#ccg#.........', '.#cc#...........', '.##.............', 'c...............']) },
  ];

  let win = null;

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({ key: 'faint', title: 'sin título — FAINT', iconHtml: Game.icons.faint(), w: 42, h: 30, build });
    return win;
  }

  function build(body, W) {
    body.classList.add('fa');
    body.innerHTML =
      '<div class="fa-menu">' +
      '  <span class="fa-mi fa-new" data-cursor="hand"><u>N</u>uevo</span>' +
      '  <span class="fa-mi fa-undo" data-cursor="hand"><u>D</u>eshacer</span>' +
      '  <span class="fa-mi off"><u>I</u>magen</span><span class="fa-mi off"><u>C</u>olores</span><span class="fa-mi off">A<u>y</u>uda</span>' +
      '</div>' +
      '<div class="fa-main">' +
      '  <div class="fa-side">' +
      '    <div class="fa-tools">' +
      TOOLS.map((t) => `<button class="fa-tool" data-tool="${t.id}" title="${t.name}" data-cursor="hand">${t.icon}</button>`).join('') +
      '    </div>' +
      '    <div class="fa-opts">' +
      TAMANOS.map((s) => `<button class="fa-size" data-size="${s}" data-cursor="hand"><i style="width:${Math.min(s, 12) / 16}em;height:${Math.min(s, 12) / 16}em"></i></button>`).join('') +
      '    </div>' +
      '  </div>' +
      '  <div class="fa-well"><canvas class="fa-canvas"></canvas></div>' +
      '</div>' +
      '<div class="fa-bottom">' +
      '  <div class="fa-current"><div class="fa-bg"></div><div class="fa-fg"></div></div>' +
      '  <div class="fa-palette">' +
      PALETA.map((c) => `<div class="fa-sw" data-c="${c}" style="background:${c}" data-cursor="hand"></div>`).join('') +
      '  </div>' +
      '</div>' +
      '<div class="fa-status"><span class="fa-st-tool"></span><span class="fa-st-pos"></span></div>';

    const $ = (s) => body.querySelector(s);
    const well = $('.fa-well'), canvas = $('.fa-canvas'), fgEl = $('.fa-fg'), bgEl = $('.fa-bg');
    const stTool = $('.fa-st-tool'), stPos = $('.fa-st-pos');
    const g = canvas.getContext('2d', { willReadFrequently: true });

    let tool = 'brush', size = 4, fg = '#000000', bg = '#ffffff';
    const undo = [];
    let closed = false;

    // ---------- Lienzo que crece con la ventana ----------
    // 1 px del lienzo = 1/16 em (escala con la pantalla del juego).
    canvas.width = 0; canvas.height = 0;
    function grow() {
      if (closed) return;
      const em = Game.os.em || 16;
      const k = em / 16; // px de maquetación por px del lienzo
      const needW = Math.min(MAX_W, Math.floor((well.clientWidth - 12) / k));
      const needH = Math.min(MAX_H, Math.floor((well.clientHeight - 12) / k));
      const w = Math.max(canvas.width, needW, 32), h = Math.max(canvas.height, needH, 32);
      if (w !== canvas.width || h !== canvas.height) {
        const old = canvas.width && canvas.height ? g.getImageData(0, 0, canvas.width, canvas.height) : null;
        canvas.width = w; canvas.height = h;
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        if (old) g.putImageData(old, 0, 0);
      }
      canvas.style.width = `${canvas.width / 16}em`;
      canvas.style.height = `${canvas.height / 16}em`;
    }
    const ro = new ResizeObserver(() => grow());
    ro.observe(well);

    // Coordenadas del ratón en píxeles del lienzo (sirve con la pantalla escalada o la ventana maximizada).
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * canvas.width) / r.width,
        y: ((e.clientY - r.top) * canvas.height) / r.height,
      };
    }

    // ---------- Herramientas ----------
    const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    let hue = 0;

    function lineSteps(a, b, step, fn) {
      const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) fn(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n);
    }

    function pencil(a, b, color) {
      g.fillStyle = color;
      let x0 = Math.floor(a.x), y0 = Math.floor(a.y);
      const x1 = Math.floor(b.x), y1 = Math.floor(b.y);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }

    function softDab(x, y, color) {
      const r = size * 1.1 + 1;
      const [R, G, B] = hexRgb(color);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${R},${G},${B},0.55)`);
      gr.addColorStop(0.5, `rgba(${R},${G},${B},0.3)`);
      gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    function spray(x, y, color, n = 0) {
      g.fillStyle = color;
      const r = size * 2 + 3;
      const count = n || Math.round(6 + size * 1.5);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        g.fillRect(Math.floor(x + Math.cos(a) * d), Math.floor(y + Math.sin(a) * d), 1, 1);
      }
    }

    // Plumilla plana a 45°: cuadrilátero entre el punto anterior y el actual.
    function marker(a, b, color) {
      const n = size * 0.9 + 1, nx = Math.cos(-Math.PI / 4) * n, ny = Math.sin(-Math.PI / 4) * n;
      g.fillStyle = color;
      g.globalAlpha = 0.85;
      g.beginPath();
      g.moveTo(a.x - nx, a.y - ny);
      g.lineTo(a.x + nx, a.y + ny);
      g.lineTo(b.x + nx, b.y + ny);
      g.lineTo(b.x - nx, b.y - ny);
      g.closePath();
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = color;
      g.beginPath();
      g.moveTo(a.x - nx, a.y - ny);
      g.lineTo(a.x + nx, a.y + ny);
      g.stroke();
      g.globalAlpha = 1;
    }

    function eraser(a, b, color) {
      const s = size * 2 + 4;
      g.fillStyle = color;
      lineSteps(a, b, 1, (x, y) => g.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s));
    }

    function rainbow(a, b) {
      const r = size / 2 + 1.5;
      lineSteps(a, b, Math.max(1, r / 2), (x, y) => {
        hue = (hue + 3) % 360;
        g.fillStyle = `hsl(${hue},100%,50%)`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      });
    }

    // Glitch: arrastra una franja de píxeles y separa los canales RGB.
    function glitch(a, b) {
      const h = Math.max(2, Math.round(size * 0.8 + Math.random() * size));
      const w = Math.round(size * 6 + 12);
      const x = Math.round(b.x - w / 2), y = Math.round(b.y - h / 2);
      const sx = Math.max(0, x), sy = Math.max(0, y);
      const sw = Math.min(canvas.width, x + w) - sx, sh = Math.min(canvas.height, y + h) - sy;
      if (sw <= 2 || sh <= 0) return;
      const src = g.getImageData(sx, sy, sw, sh), out = g.createImageData(sw, sh);
      const shift = 2 + Math.round(size / 3), d = src.data, o = out.data;
      for (let j = 0; j < sh; j++) {
        for (let i = 0; i < sw; i++) {
          const k = (j * sw + i) * 4;
          const kr = (j * sw + Math.min(sw - 1, Math.max(0, i - shift))) * 4;
          const kb = (j * sw + Math.min(sw - 1, Math.max(0, i + shift))) * 4;
          o[k] = d[kr];
          o[k + 1] = d[k + 1];
          o[k + 2] = d[kb + 2];
          o[k + 3] = 255;
        }
      }
      // la franja se corre en la dirección del trazo (con algo de azar), como una señal que se desliza
      const smear = Math.round((b.x - a.x) * 0.8 + (Math.random() - 0.5) * size * 2);
      g.putImageData(out, sx + smear, sy);
      if (Math.random() < 0.25) {
        g.fillStyle = PALETA[Math.floor(Math.random() * PALETA.length)];
        g.fillRect(sx + Math.floor(Math.random() * sw), sy + Math.floor(Math.random() * sh), Math.round(4 + Math.random() * w), 1);
      }
    }

    // Bote de pintura: relleno por líneas (color exacto).
    function flood(x0, y0, color) {
      x0 = Math.floor(x0); y0 = Math.floor(y0);
      const W_ = canvas.width, H_ = canvas.height;
      if (x0 < 0 || y0 < 0 || x0 >= W_ || y0 >= H_) return;
      const img = g.getImageData(0, 0, W_, H_);
      const px = new Uint32Array(img.data.buffer);
      const target = px[y0 * W_ + x0];
      const [R, G, B] = hexRgb(color);
      const tmp = new Uint8ClampedArray([R, G, B, 255]);
      const fill = new Uint32Array(tmp.buffer)[0];
      if (target === fill) return;
      const stack = [[x0, y0]];
      while (stack.length) {
        const [x, y] = stack.pop();
        let l = x;
        while (l > 0 && px[y * W_ + l - 1] === target) l--;
        let r = x;
        while (r < W_ - 1 && px[y * W_ + r + 1] === target) r++;
        for (let i = l; i <= r; i++) px[y * W_ + i] = fill;
        [y - 1, y + 1].forEach((ny) => {
          if (ny < 0 || ny >= H_) return;
          let inRun = false;
          for (let i = l; i <= r; i++) {
            const hit = px[ny * W_ + i] === target;
            if (hit && !inRun) stack.push([i, ny]);
            inRun = hit;
          }
        });
      }
      g.putImageData(img, 0, 0);
    }

    function pick(p, primary) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      const d = g.getImageData(x, y, 1, 1).data;
      const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      setColor(hex, primary);
    }

    // ---------- Ratón ----------
    let drag = null;      // { last, color, raf }
    function stroke(a, b, color) {
      switch (tool) {
        case 'pencil': pencil(a, b, color); break;
        case 'brush': lineSteps(a, b, Math.max(1, size / 3), (x, y) => softDab(x, y, color)); break;
        case 'spray': spray(b.x, b.y, color); break;
        case 'marker': marker(a, b, color); break;
        case 'eraser': eraser(a, b, color); break;
        case 'rainbow': rainbow(a, b); break;
        case 'glitch': glitch(a, b); break;
        default: break;
      }
    }

    function pushUndo() {
      undo.push(g.getImageData(0, 0, canvas.width, canvas.height));
      if (undo.length > 12) undo.shift();
    }

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      const primary = e.button === 0;
      const p = pos(e);
      if (tool === 'picker') { pick(p, primary); return; }
      pushUndo();
      // la goma pinta con el color de fondo (o con el principal si se usa el botón derecho)
      const color = tool === 'eraser' ? (primary ? bg : fg) : primary ? fg : bg;
      if (tool === 'fill') { flood(p.x, p.y, color); return; }
      drag = { last: p, color, raf: 0 };
      stroke(p, p, color);
      // el aerosol sigue soltando pintura aunque el ratón esté quieto
      if (tool === 'spray') {
        const loop = () => {
          if (!drag || closed) return;
          spray(drag.last.x, drag.last.y, drag.color, Math.round(3 + size / 2));
          drag.raf = requestAnimationFrame(loop);
        };
        drag.raf = requestAnimationFrame(loop);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
      if (!drag) return;
      const p = pos(e);
      stroke(drag.last, p, drag.color);
      drag.last = p;
      showPos(p);
    }
    function onUp() {
      if (drag) cancelAnimationFrame(drag.raf);
      drag = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    function showPos(p) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      stPos.textContent = x >= 0 && y >= 0 && x < canvas.width && y < canvas.height ? `${x}, ${y}` : '';
    }
    canvas.addEventListener('mousemove', (e) => { if (!drag) showPos(pos(e)); });
    canvas.addEventListener('mouseleave', () => { if (!drag) stPos.textContent = ''; });

    // ---------- Interfaz ----------
    function setTool(id) {
      tool = id;
      body.querySelectorAll('.fa-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === id));
      const t = TOOLS.find((x) => x.id === id);
      const usesSize = !['pencil', 'fill', 'picker'].includes(id);
      $('.fa-opts').classList.toggle('off', !usesSize);
      stTool.textContent = `${t.name}${usesSize ? ` · tamaño ${size}` : ''} — clic izq.: color, clic der.: fondo`;
      canvas.dataset.tool = id;
    }
    function setSize(s) {
      size = s;
      body.querySelectorAll('.fa-size').forEach((b) => b.classList.toggle('on', +b.dataset.size === s));
      setTool(tool);
    }
    function setColor(c, primary) {
      if (primary) fg = c; else bg = c;
      fgEl.style.background = fg;
      bgEl.style.background = bg;
    }

    body.querySelectorAll('.fa-tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
    body.querySelectorAll('.fa-size').forEach((b) => b.addEventListener('click', () => setSize(+b.dataset.size)));
    body.querySelectorAll('.fa-sw').forEach((s) => {
      s.addEventListener('mousedown', (e) => { if (e.button === 0 || e.button === 2) setColor(s.dataset.c, e.button === 0); });
      s.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    $('.fa-new').addEventListener('click', () => {
      pushUndo();
      g.fillStyle = bg;
      g.fillRect(0, 0, canvas.width, canvas.height);
      W.setTitle('sin título — FAINT');
    });
    $('.fa-undo').addEventListener('click', () => {
      const img = undo.pop();
      if (!img) return;
      if (img.width !== canvas.width || img.height !== canvas.height) {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.putImageData(img, 0, 0);
    });

    W.onClose = () => {
      closed = true;
      onUp();
      ro.disconnect();
      undo.length = 0;
      win = null;
    };

    setColor('#000000', true);
    setColor('#ffffff', false);
    setSize(4);
    setTool('brush');
    grow();
  }

  Game.faint = { open };
  Game.os.addApp({ id: 'app-faint', name: 'FAINT', iconHtml: Game.icons.faint(), open });
})();
