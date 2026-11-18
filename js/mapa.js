// Mapa interactivo: el contenido del link de SR, "fusionado" por LucIAno con el juego de Tomás.
// Es el tablero de investigación "IA en México" (corcho, recortes, notas e hilos rojos).
// Las secciones empiezan glitcheadas y se desbloquean durante la historia (contraseñas y minijuegos).
// Los textos están en Game.guion.mapa; las posiciones vienen del tablero original exportado.
//
// API (Game.mapa):
//   open()                      abre el mapa (o lo trae al frente)
//   close()                     lo cierra
//   unlock(sec, parte)          desbloquea una sección ('ribera' tiene parte 1 y 2)
//   waitClick(sec)              la sección parpadea hasta que el jugador la pulse (Promise)
//   focus(secs, ms)             la cámara se mueve para encuadrar esas secciones (Promise)
//   thread(a, b)                ilumina el hilo rojo entre dos secciones
//   password(cfg)               ventanita de contraseña dentro del mapa (Promise)
//   destroy()                   el mapa se borra visiblemente (Promise)
window.Game = window.Game || {};

(function () {
  const M = Game.guion.mapa;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Tablero (posiciones del tablero original, en px del tablero) ----------
  const ITEMS = [
    {"id": "gayyoxeuylqk", "type": "heading", "x": -470, "y": -400, "w": 640, "h": 57, "z": 1, "text": "IA", "fs": 50},
    {"id": "aysrwpluylqk", "type": "frame", "x": 51, "y": -149, "w": 720, "h": 470, "z": 1, "sec": "silicon", "color": "#4cb3d4", "label": "Silicon Valley"},
    {"id": "rqou3u1uylqk", "type": "note", "x": 117, "y": 231, "w": 250, "h": 170, "z": 6, "rot": 1.8, "sec": "silicon", "color": "#ffbfd0", "html": "<b>Hipótesis</b><br>Silicon Valley quiere mover su operación a latino America.", "fs": 18},
    {"id": "23jhflduzuxk", "type": "image", "x": 116, "y": -117, "w": 250, "h": 310, "z": 7, "rot": 1.4, "sec": "silicon", "src": "img/mapa/23jhflduzuxk.png", "ratio": 0.9791, "caption": "Peter Thiel en latino america"},
    {"id": "zmypm71v167w", "type": "link", "x": 399, "y": -90, "w": 300, "h": 106, "z": 8, "sec": "silicon", "domain": "bbc.com", "title": "C932qq7x07xo", "url": "https://www.bbc.com/mundo/articles/c932qq7x07xo"},
    {"id": "upn51jfv37r1", "type": "image", "x": 412, "y": 30, "w": 457, "h": 348, "z": 9, "rot": 1.5, "sec": "silicon", "src": "img/mapa/upn51jfv37r1.png", "ratio": 1.4716},
    {"id": "q7h9ejnv9oyg", "type": "image", "x": 338, "y": -380, "w": 638, "h": 154, "z": 10, "rot": -0.2, "src": "img/mapa/q7h9ejnv9oyg.png", "ratio": 5.9926, "caption": "Titular del Gobierno de Jalisco"},
    {"id": "91zur30vj1oy", "type": "image", "x": 898, "y": -153, "w": 698, "h": 149, "z": 11, "rot": 1.5, "src": "img/mapa/91zur30vj1oy.png", "ratio": 6.9077, "caption": "Inversión en Jalisco"},
    {"id": "vbqz496vlk32", "type": "link", "x": 512, "y": -193, "w": 300, "h": 126, "z": 12, "domain": "jalisco.gob.mx", "title": "Se consolida jalisco como el silicon valley de me 38699", "url": "https://www.jalisco.gob.mx/prensa/noticias/se-consolida-jalisco-como-el-silicon-valley-de-me-38699"},
    {"id": "ve2n5y7vn8h2", "type": "frame", "x": -1244, "y": -178, "w": 759, "h": 671, "z": 13, "sec": "planmexico", "color": "#ef6f8b", "label": "Plan México"},
    {"id": "gzcpj3qvqkxa", "type": "image", "x": -1323, "y": 169, "w": 466, "h": 492, "z": 14, "rot": 1.5, "sec": "planmexico", "src": "img/mapa/gzcpj3qvqkxa.png", "ratio": 1.0102, "caption": "Plan para industrializar México"},
    {"id": "wqe9dpcvvmj7", "type": "image", "x": -806, "y": 336, "w": 897, "h": 251, "z": 15, "rot": 1.1, "sec": "cfe", "src": "img/mapa/wqe9dpcvvmj7.png", "ratio": 4.3742},
    {"id": "kkvj3egvxwwm", "type": "frame", "x": -1281, "y": 868, "w": 1023, "h": 922, "z": 16, "sec": "ribera", "color": "#4cb3d4", "label": "Ribera Chapala"},
    {"id": "szb6jpyvygri", "type": "frame", "x": 302, "y": 929, "w": 1115, "h": 968, "z": 17, "sec": "acatlan", "color": "#3ccf9a", "label": "Acatlan"},
    {"id": "6kkr7oxw1ku5", "type": "note", "x": -223, "y": 760, "w": 230, "h": 210, "z": 18, "rot": -0.5, "color": "#c3ecb2", "html": "La producción de energia eléctrica en Jalisco va a la producción de chips para IA y centros de datos", "fs": 16},
    {"id": "t9gqk9504j61", "type": "image", "x": -911, "y": 906, "w": 621, "h": 497, "z": 19, "rot": 0.1, "sec": "ribera", "src": "img/mapa/t9gqk9504j61.png", "ratio": 1.3482},
    {"id": "8rvxdh007gnu", "type": "image", "x": 369, "y": 957, "w": 607, "h": 280, "z": 20, "rot": -0.4, "sec": "acatlan", "src": "img/mapa/8rvxdh007gnu.png", "ratio": 2.5579},
    {"id": "r3y7tal0cbzx", "type": "image", "x": -436, "y": -1268, "w": 687, "h": 671, "z": 21, "rot": 0.3, "sec": "chihuahua", "src": "img/mapa/r3y7tal0cbzx.jpg", "ratio": 1.0759},
    {"id": "hdgwp6k0ci0s", "type": "frame", "x": -481, "y": -1338, "w": 845, "h": 834, "z": 22, "sec": "chihuahua", "color": "#9b8cff", "label": "Chihuahua data centers"},
    {"id": "4phzrf20gfi6", "type": "frame", "x": 696, "y": -1219, "w": 677, "h": 559, "z": 23, "sec": "queretaro", "color": "#f78c40", "label": "Queretaro centros de datos"},
    {"id": "0uw7bc50juup", "type": "image", "x": 710, "y": -1164, "w": 382, "h": 269, "z": 24, "rot": 0.1, "sec": "queretaro", "src": "img/mapa/0uw7bc50juup.png", "ratio": 1.6587},
    {"id": "pmojiak0lg1u", "type": "image", "x": 1003, "y": -872, "w": 537, "h": 209, "z": 25, "rot": 0.3, "sec": "queretaro", "src": "img/mapa/pmojiak0lg1u.png", "ratio": 3.2644},
    {"id": "nw4kzd20ocwv", "type": "image", "x": -879, "y": -100, "w": 589, "h": 273, "z": 26, "rot": -1, "sec": "planmexico", "src": "img/mapa/nw4kzd20ocwv.png", "ratio": 2.5636},
  ];
  const LINKS = [["zmypm71v167w", "23jhflduzuxk"], ["aysrwpluylqk", "upn51jfv37r1"], ["q7h9ejnv9oyg", "91zur30vj1oy"], ["vbqz496vlk32", "q7h9ejnv9oyg"], ["vbqz496vlk32", "91zur30vj1oy"], ["wqe9dpcvvmj7", "kkvj3egvxwwm"], ["szb6jpyvygri", "wqe9dpcvvmj7"], ["8rvxdh007gnu", "t9gqk9504j61"], ["t9gqk9504j61", "ve2n5y7vn8h2"], ["kkvj3egvxwwm", "t9gqk9504j61"], ["t9gqk9504j61", "q7h9ejnv9oyg"], ["ve2n5y7vn8h2", "aysrwpluylqk"], ["4phzrf20gfi6", "ve2n5y7vn8h2"], ["4phzrf20gfi6", "vbqz496vlk32"], ["hdgwp6k0ci0s", "ve2n5y7vn8h2"], ["hdgwp6k0ci0s", "rqou3u1uylqk"], ["nw4kzd20ocwv", "rqou3u1uylqk"]];

  // Sección CÓDIGO (no está en el tablero original) e hilos extra que pide el guion.
  ITEMS.push(
    { id: 'codigo-frame', type: 'frame', x: 1520, y: 260, w: 640, h: 560, z: 1, sec: 'codigo', color: '#ffd84d', label: 'CÓDIGO' },
    { id: 'codigo-note', type: 'codigo', x: 1580, y: 340, w: 520, h: 420, z: 30, rot: -1.2, sec: 'codigo' },
  );
  LINKS.push(['hdgwp6k0ci0s', '4phzrf20gfi6'], ['codigo-frame', 'aysrwpluylqk'], ['codigo-frame', 'szb6jpyvygri']);

  const SECS = ['acatlan', 'ribera', 'planmexico', 'cfe', 'chihuahua', 'queretaro', 'silicon', 'codigo'];
  // Sección → elemento principal (el marco, o la imagen si es una sola).
  const MAIN = {
    acatlan: 'szb6jpyvygri', ribera: 'kkvj3egvxwwm', planmexico: 've2n5y7vn8h2', cfe: 'wqe9dpcvvmj7',
    chihuahua: 'hdgwp6k0ci0s', queretaro: '4phzrf20gfi6', silicon: 'aysrwpluylqk', codigo: 'codigo-frame',
  };
  // Lo que empieza bloqueado (glitcheado). Ribera tiene dos partes: 0 = nada, 1 = primera, 2 = todo.
  const state = {
    locked: { acatlan: true, ribera: true, cfe: true, silicon: true, codigo: true },
    ribera: 0,
  };

  // Límites del tablero.
  const PAD = 120;
  const minX = Math.min(...ITEMS.map((i) => i.x)) - PAD;
  const minY = Math.min(...ITEMS.map((i) => i.y)) - PAD;
  const BW = Math.max(...ITEMS.map((i) => i.x + i.w)) - minX + PAD;
  const BH = Math.max(...ITEMS.map((i) => i.y + i.h)) - minY + PAD;
  const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

  // Texto "glitcheado": mismas letras revueltas con símbolos.
  const GLYPHS = '#%&@$¿?!/\\|<>*+=~^¬§░▒▓█';
  function scramble(s) {
    return [...s].map((c) => (c === ' ' ? ' ' : Math.random() < 0.55 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : c)).join('');
  }

  // ---------- DOM ----------
  let W = null;          // ventana
  let view = null;       // viewport
  let board = null;      // contenedor transformado
  let threadsSvg = null;
  const cam = { x: 0, y: 0, z: 0.2 };   // traslación (px de pantalla) y zoom
  let camAnim = 0;
  const waiting = new Map();             // sec -> resolve
  const blinking = new Set();
  let scrambleTimer = 0;

  function itemHtml(it) {
    const style = `left:${it.x - minX}px;top:${it.y - minY}px;width:${it.w}px;` +
      (it.type === 'frame' || it.type === 'heading' ? `height:${it.h}px;` : '') +
      (it.rot ? `transform:rotate(${it.rot}deg);` : '') + `z-index:${it.z || 1};`;
    const sec = it.sec ? ` data-sec="${it.sec}"` : '';
    const pin = '<i class="mp-pin"></i>';
    switch (it.type) {
      case 'heading':
        return `<div class="mp-item mp-heading" style="${style}font-size:${it.fs}px">${esc(it.text)}</div>`;
      case 'frame':
        return `<div class="mp-item mp-frame" data-id="${it.id}"${sec} style="${style}--c:${it.color}">` +
          `<span class="mp-label" data-label="${esc(it.label)}">${esc(it.label)}</span></div>`;
      case 'note':
        return `<div class="mp-item mp-note" data-id="${it.id}"${sec} style="${style}min-height:${it.h}px;background:${it.color};font-size:${it.fs}px">` +
          `${pin}<div class="mp-content">${it.html}</div></div>`;
      case 'image': {
        const ih = Math.round(it.w / it.ratio);
        return `<div class="mp-item mp-photo" data-id="${it.id}"${sec} style="${style}">${pin}` +
          `<div class="mp-content"><div class="mp-img" style="height:${ih}px"><img src="${it.src}" alt="" draggable="false">` +
          (it.id === 't9gqk9504j61' ? '<div class="mp-veil"></div>' : '') +
          '</div>' +
          `<div class="mp-caption">${esc(it.caption || 'Pie de foto…')}</div></div></div>`;
      }
      case 'link':
        return `<div class="mp-item mp-link" data-id="${it.id}"${sec} style="${style}">${pin}` +
          `<div class="mp-content"><small>${esc(it.domain)}</small><b>${esc(it.title)}</b><span>${esc(it.url)}</span></div></div>`;
      case 'codigo': {
        const C = M.secciones.codigo;
        return `<div class="mp-item mp-note mp-codigo" data-id="${it.id}"${sec} style="${style}min-height:${it.h}px">${pin}` +
          `<div class="mp-content"><p>${esc(C.nota)}</p><ul>` +
          C.lineas.map((l) => `<li><b>${esc(l.charAt(0))}</b>${esc(l.slice(1))}</li>`).join('') +
          '</ul></div></div>';
      }
      default:
        return '';
    }
  }

  function center(id) {
    const it = byId[id];
    const h = it.type === 'image' ? it.w / it.ratio + 40 : it.h;
    return { x: it.x - minX + it.w / 2, y: it.y - minY + Math.min(h, it.h || h) / 2 };
  }

  function threadsHtml() {
    return LINKS.map(([a, b]) => {
      if (!byId[a] || !byId[b]) return '';
      const p = center(a), q = center(b);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2 + Math.hypot(q.x - p.x, q.y - p.y) * 0.06; // el hilo cuelga un poco
      return `<path data-a="${a}" data-b="${b}" d="M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}"/>`;
    }).join('');
  }

  function build(body, win) {
    body.classList.add('mapa');
    body.innerHTML =
      '<div class="mp-hud"><span>MAPA7382 · IA EN MÉXICO</span><span class="mp-hint">arrastra para moverte · rueda para zoom</span>' +
      '<span class="map-blink">● SEÑAL INTERCEPTADA</span></div>' +
      '<div class="mp-view"><div class="mp-board">' +
      `<svg class="mp-threads" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}">${threadsHtml()}</svg>` +
      ITEMS.map(itemHtml).join('') +
      '</div></div>';
    view = body.querySelector('.mp-view');
    board = body.querySelector('.mp-board');
    threadsSvg = body.querySelector('.mp-threads');
    board.style.width = `${BW}px`;
    board.style.height = `${BH}px`;
    applyState();
    bindView();
    // Encuadre inicial: todo el tablero (tras medir la ventana).
    requestAnimationFrame(() => { fitAll(); applyCam(); });
    body.classList.add('glitch-open');
    setTimeout(() => body.classList.remove('glitch-open'), 1200);
    win.onClose = () => { W = null; view = board = threadsSvg = null; };
    new ResizeObserver(() => { if (view) clampCam(); }).observe(view);
  }

  // ---------- Estado visual ----------
  function secEls(sec) { return board ? [...board.querySelectorAll(`[data-sec="${sec}"]`)] : []; }

  function applyState() {
    if (!board) return;
    SECS.forEach((sec) => {
      const locked = !!state.locked[sec];
      secEls(sec).forEach((el) => {
        el.classList.toggle('locked', locked);
        el.classList.toggle('blink', blinking.has(sec));
        if (blinking.has(sec)) el.dataset.cursor = 'hand'; else delete el.dataset.cursor;
      });
    });
    // Ribera: el marco y la imagen se ven, pero la segunda parte del texto sigue tapada.
    const veil = board.querySelector('.mp-veil');
    if (veil) {
      veil.hidden = state.ribera >= 2;
      veil.classList.toggle('blink', blinking.has('ribera2'));
      if (blinking.has('ribera2')) veil.dataset.cursor = 'hand'; else delete veil.dataset.cursor;
    }
    secEls('ribera').forEach((el) => el.classList.toggle('locked', state.ribera === 0));
    board.querySelectorAll('.mp-label').forEach((l) => {
      const fr = l.parentElement;
      if (!fr.classList.contains('locked')) l.textContent = l.dataset.label;
    });
  }

  // Las etiquetas de las secciones bloqueadas cambian de letras sin parar.
  function tickScramble() {
    if (board) {
      board.querySelectorAll('.mp-frame.locked .mp-label').forEach((l) => { l.textContent = scramble(l.dataset.label); });
    }
  }
  scrambleTimer = setInterval(tickScramble, 160);

  // ---------- Cámara ----------
  function viewSize() { return { w: view.clientWidth, h: view.clientHeight }; }
  function applyCam() {
    if (board) board.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
  }
  function fitRect(r, pad = 0.08) {
    const v = viewSize();
    const z = Math.min(v.w / (r.w * (1 + pad * 2)), v.h / (r.h * (1 + pad * 2)));
    return { z, x: v.w / 2 - (r.x + r.w / 2) * z, y: v.h / 2 - (r.y + r.h / 2) * z };
  }
  function fitAll() { Object.assign(cam, fitRect({ x: 0, y: 0, w: BW, h: BH }, 0.01)); }
  function clampCam() {
    const v = viewSize();
    const minZ = Math.min(v.w / BW, v.h / BH) * 0.9;
    cam.z = Math.min(2.5, Math.max(minZ, cam.z));
    applyCam();
  }
  function rectOf(secs) {
    const its = ITEMS.filter((i) => secs.includes(i.sec) || secs.includes(i.id));
    const x0 = Math.min(...its.map((i) => i.x - minX)), y0 = Math.min(...its.map((i) => i.y - minY));
    const x1 = Math.max(...its.map((i) => i.x - minX + i.w));
    const y1 = Math.max(...its.map((i) => i.y - minY + (i.type === 'image' ? i.w / i.ratio + 40 : i.h)));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // Mueve la cámara suavemente hasta encuadrar las secciones (o ids) dadas.
  function focus(secs, ms = 1400, pad = 0.08) {
    if (!view) return Promise.resolve();
    secs = [].concat(secs);
    const to = fitRect(rectOf(secs), pad);
    const from = { ...cam };
    const id = ++camAnim;
    const t0 = performance.now();
    return new Promise((done) => {
      function step(now) {
        if (id !== camAnim || !board) return done();
        const t = Math.min(1, (now - t0) / ms);
        const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        // el zoom se interpola en escala logarítmica para que no "salte"
        const z = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * k);
        // punto del tablero que queda en el centro, interpolado
        const v = viewSize();
        const cx0 = (v.w / 2 - from.x) / from.z, cy0 = (v.h / 2 - from.y) / from.z;
        const cx1 = (v.w / 2 - to.x) / to.z, cy1 = (v.h / 2 - to.y) / to.z;
        const cx = cx0 + (cx1 - cx0) * k, cy = cy0 + (cy1 - cy0) * k;
        cam.z = z; cam.x = v.w / 2 - cx * z; cam.y = v.h / 2 - cy * z;
        applyCam();
        if (t < 1) requestAnimationFrame(step); else done();
      }
      requestAnimationFrame(step);
    });
  }

  // Arrastrar para moverse, rueda para zoom. Un clic sin arrastrar llega a las secciones.
  function bindView() {
    let drag = null;
    view.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.mp-pass')) return;
      drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
    });
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      camAnim++;
      cam.x = drag.cx + dx; cam.y = drag.cy + dy;
      applyCam();
      view.classList.add('dragging');
    };
    const up = () => {
      if (drag && drag.moved) view._justDragged = true;
      drag = null;
      view.classList.remove('dragging');
      setTimeout(() => { if (view) view._justDragged = false; }, 0);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    W.onCloseExtra = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    view.addEventListener('wheel', (e) => {
      e.preventDefault();
      camAnim++;
      const r = view.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const bx = (px - cam.x) / cam.z, by = (py - cam.y) / cam.z;
      cam.z *= e.deltaY < 0 ? 1.15 : 1 / 1.15;
      clampCam();
      cam.x = px - bx * cam.z; cam.y = py - by * cam.z;
      applyCam();
    }, { passive: false });
    view.addEventListener('click', (e) => {
      if (view._justDragged || e.target.closest('.mp-pass')) return;
      const veil = e.target.closest('.mp-veil');
      if (veil && waiting.has('ribera2')) return resolveWait('ribera2');
      const el = e.target.closest('[data-sec]');
      if (el && waiting.has(el.dataset.sec)) resolveWait(el.dataset.sec);
    });
  }

  function resolveWait(sec) {
    const r = waiting.get(sec);
    waiting.delete(sec);
    blinking.delete(sec);
    applyState();
    Game.sound.mouse(true);
    r();
  }

  // ---------- Ventana ----------
  function open() {
    if (W) { Game.os.focusWindow(W); return W; }
    W = Game.os.createWindow({
      key: 'mapa', title: M.titulo, iconHtml: Game.icons.mapa(), w: 52, h: 34,
      build: (body, win) => { W = win; build(body, win); },
    });
    const prevClose = W.onClose;
    W.onClose = () => { if (W && W.onCloseExtra) W.onCloseExtra(); prevClose && prevClose(); };
    // La pestaña del mapa en la barra de tareas muestra el cursor de mano.
    W.task.dataset.cursor = 'hand';
    return W;
  }

  function close() { if (W) Game.os.closeWindow(W); }

  // ---------- API de la historia ----------
  function unlock(sec, parte) {
    if (sec === 'ribera') {
      state.ribera = Math.max(state.ribera, parte || 2);
      state.locked.ribera = false;
    } else {
      state.locked[sec] = false;
    }
    if (board) {
      const els = sec === 'ribera' && parte === 2 ? [board.querySelector('.mp-veil')] : secEls(sec);
      els.forEach((el) => { if (el) { el.classList.add('unglitch'); setTimeout(() => el.classList.remove('unglitch'), 1300); } });
    }
    Game.sound.glitch();
    applyState();
  }

  // La sección parpadea (y el cursor se vuelve mano) hasta que el jugador la pulse.
  function waitClick(sec) {
    return new Promise((resolve) => {
      waiting.set(sec, resolve);
      blinking.add(sec);
      applyState();
    });
  }

  function thread(a, b, on = true) {
    if (!threadsSvg) return;
    const A = MAIN[a] || a, B = MAIN[b] || b;
    threadsSvg.querySelectorAll('path').forEach((p) => {
      const hit = (p.dataset.a === A && p.dataset.b === B) || (p.dataset.a === B && p.dataset.b === A);
      if (hit) p.classList.toggle('hot', on);
    });
  }

  // Ventanita de contraseña dentro del mapa. Acepta mayúsculas/minúsculas y con o sin acentos.
  function password({ titulo, olvido, pista2, respuesta }) {
    const norm = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
    return new Promise((resolve) => {
      let hint2Timer = 0;
      let solved = false;
      const mount = () => {
        if (!W) open();
        const host = W.body;
        host.querySelectorAll('.mp-pass').forEach((n) => n.remove());
        const box = document.createElement('div');
        box.className = 'mp-pass glitch-in';
        box.innerHTML =
          `<div class="mp-pass-box"><label>${esc(titulo)}</label>` +
          '<input type="text" spellcheck="false" autocomplete="off" maxlength="24">' +
          '<div class="btn mp-pass-ok" data-cursor="hand">Entrar</div>' +
          `<p class="mp-pass-hint">${esc(olvido)}</p>` +
          `<p class="mp-pass-hint2" hidden>${esc(pista2)}</p>` +
          '<p class="mp-pass-err" hidden>Contraseña incorrecta</p></div>';
        host.appendChild(box);
        const input = box.querySelector('input');
        const err = box.querySelector('.mp-pass-err');
        const h2 = box.querySelector('.mp-pass-hint2');
        if (state.hint2Shown) h2.hidden = false;
        const tryIt = () => {
          if (norm(input.value) === norm(respuesta)) {
            clearTimeout(hint2Timer);
            solved = true;
            state.hint2Shown = false;
            box.remove();
            Game.sound.message(true);
            resolve();
          } else {
            err.hidden = false;
            box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
            Game.sound.glitch();
            input.select();
          }
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryIt(); });
        box.querySelector('.mp-pass-ok').addEventListener('click', tryIt);
        setTimeout(() => input.focus(), 50);
        // Si el jugador cierra el mapa, la ventanita vuelve a salir al reabrirlo.
        const prev = W.onClose;
        W.onClose = () => { prev && prev(); if (!solved) pendingPass = mount; };
      };
      state.hint2Shown = false;
      hint2Timer = setTimeout(() => {
        state.hint2Shown = true;
        if (W) { const h = W.body.querySelector('.mp-pass-hint2'); if (h) { h.hidden = false; h.classList.add('glitch-in'); } }
      }, 60000);
      mount();
    });
  }
  let pendingPass = null;
  const openBase = open;
  function openWithPending() {
    const w = openBase();
    if (pendingPass) { const m = pendingPass; pendingPass = null; setTimeout(m, 0); }
    return w;
  }

  // El mapa se borra a la vista: se deshace en glitch y la ventana se cierra.
  async function destroy() {
    if (!W) return;
    W.el.classList.add('mp-dying');
    Game.sound.glitch();
    await wait(1600);
    close();
  }

  Game.mapa = {
    open: openWithPending,
    close,
    unlock,
    waitClick,
    focus,
    thread,
    password,
    destroy,
    fitAll: () => { if (view) { fitAll(); applyCam(); } },
    isLocked: (sec) => !!state.locked[sec],
    get window() { return W; },
    get isOpen() { return !!W; },
  };
})();
