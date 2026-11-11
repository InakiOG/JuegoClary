// Escena principal: coloca los elementos, conecta ratón y teclado reales con los del juego.
// También expone Game.input para que la historia pueda "mover las manos de Tomás"
// (mover el cursor, hacer clic y teclear) mientras la entrada del jugador está bloqueada.
(function () {
  const plane = document.getElementById('plane');
  const desk = document.getElementById('desk');
  const monitor = document.getElementById('monitor');
  const screen = document.getElementById('screen');
  const cursor = document.getElementById('cursor');
  const mouseEl = document.getElementById('mouse');
  const pad = document.getElementById('mousepad');

  const kb = Game.keyboard;
  const left = new Game.Hand(document.getElementById('hand-left'), 'L');
  const right = new Game.Hand(document.getElementById('hand-right'), 'R');

  const MOUSE_W = 2.3, MOUSE_H = 3.4;   // tamaño del ratón (unidades)
  const RANGE_X = 1.5, RANGE_Y = 0.7;   // recorrido del ratón sobre la alfombrilla

  let mouseHome = { x: 0, y: 0 };       // centro de reposo del ratón
  let pointer = { nx: 0.5, ny: 0.5 };   // posición normalizada sobre la pantalla
  let mousePos = { x: 0, y: 0 };
  let locked = false;                   // true = la historia controla las manos

  // ---------- Cursor virtual (flecha, o mano sobre lo que se puede pulsar) ----------
  cursor.innerHTML =
    '<svg class="c-arrow" viewBox="0 0 16 24"><path d="M1,1 L1,19 L5.5,14.8 L8.6,22 L11.4,20.8 L8.4,13.8 L14.5,13.8 Z" ' +
    'fill="#d6fff4" stroke="#03120f" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
    '<svg class="c-hand" viewBox="0 0 20 24"><path d="M7,1.5 C8.3,1.5 9,2.3 9,3.6 V10 L9.6,9.6 C10,8.4 12.4,8.4 12.6,10 ' +
    'C13.1,8.9 15.4,9 15.6,10.6 C16.2,9.8 18.4,10.1 18.4,12 V16.5 C18.4,20 16,22.5 12.6,22.5 H10.4 C8.3,22.5 7,21.6 5.8,20 ' +
    'L1.9,14.6 C1.1,13.5 2.4,11.9 3.7,12.8 L5,13.8 V3.6 C5,2.3 5.7,1.5 7,1.5 Z" ' +
    'fill="#d6fff4" stroke="#03120f" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  // ---------- Disposición ----------
  function layout() {
    const u = Math.min(window.innerHeight * 0.036, window.innerWidth * 0.026);
    plane.style.fontSize = `${u}px`;
    const planeW = window.innerWidth / u;

    // Parte superior del escritorio tapada por el monitor (en unidades): el teclado empieza debajo.
    const hidden = Math.max(0,
      monitor.getBoundingClientRect().bottom - desk.getBoundingClientRect().top) / u;
    const GAP = 4.6; // del borde derecho del teclado al centro del ratón
    const kx = (planeW - (kb.width + GAP + 3)) / 2;
    const ky = hidden * 1.08 + 0.35;
    kb.place(kx, ky);

    mouseHome = { x: kx + kb.width + GAP, y: ky + 3.4 };
    Object.assign(pad.style, {
      left: `${mouseHome.x - 3}em`, top: `${mouseHome.y - 3.2}em`, width: '6em', height: '7em',
    });
    Object.assign(mouseEl.style, { width: `${MOUSE_W}em`, height: `${MOUSE_H}em` });
    Game.room.layoutDesk({ planeW, planeH: desk.clientHeight / u, kx, ky, kw: kb.width, mouseHome });
    updateMouse();
    right.snap();
    left.snap();
  }

  // ---------- Ratón ----------
  function updateMouse() {
    mousePos = {
      x: mouseHome.x + (pointer.nx - 0.5) * 2 * RANGE_X,
      y: mouseHome.y + (pointer.ny - 0.5) * 2 * RANGE_Y,
    };
    mouseEl.style.transform =
      `translate(${(mousePos.x - MOUSE_W / 2).toFixed(4)}em, ${(mousePos.y - MOUSE_H / 2).toFixed(4)}em)`;
    Game.room.updateMouseCable({ x: mousePos.x, y: mousePos.y - MOUSE_H / 2 + 0.1 });
  }

  // Punto del ratón bajo el índice (botón izquierdo).
  const mouseIndexPoint = () => ({ x: mousePos.x - MOUSE_W * 0.25, y: mousePos.y - MOUSE_H / 2 + 1.0 });

  let rightOnKeyboard = false;
  let rightReturnTimer = 0;

  function rightToMouse() {
    rightOnKeyboard = false;
    right.aimFinger(3, mouseIndexPoint(), 0);
  }

  // Coloca el cursor virtual en (nx, ny) de la pantalla y mueve el ratón y la mano.
  function setPointer(nx, ny) {
    const r = screen.getBoundingClientRect();
    pointer = { nx, ny };
    cursor.style.transform = `translate(${(nx * r.width).toFixed(1)}px, ${(ny * r.height).toFixed(1)}px)`;
    updateMouse();
    if (!rightOnKeyboard) rightToMouse();
    updateHover();
  }

  // El cursor se vuelve mano sobre lo que se puede pulsar (data-cursor="hand").
  // Se comprueba al mover el puntero y cuando cambia lo que hay en pantalla.
  let lastHover = false;
  function updateHover() {
    const c = cursor.getBoundingClientRect();
    const hit = document.elementFromPoint(c.left + 1, c.top + 1);
    const hover = !!(hit && hit.closest('[data-cursor="hand"]'));
    if (hover !== lastHover) { cursor.classList.toggle('hand', hover); lastHover = hover; }
  }
  let hoverQueued = false;
  new MutationObserver(() => {
    if (hoverQueued) return;
    hoverQueued = true;
    setTimeout(() => { hoverQueued = false; updateHover(); }, 50);
  }).observe(document.getElementById('os'), { childList: true, subtree: true, attributes: true, attributeFilter: ['data-cursor', 'hidden'] });

  // Última posición real del puntero (null hasta el primer movimiento: cursor centrado).
  let client = null;

  function applyPointer() {
    const r = screen.getBoundingClientRect();
    // El cursor virtual se queda en el borde de la pantalla, como en un ordenador real.
    const nx = client ? Math.min(1, Math.max(0, (client.x - r.left) / r.width)) : 0.5;
    const ny = client ? Math.min(1, Math.max(0, (client.y - r.top) / r.height)) : 0.5;
    setPointer(nx, ny);
  }

  window.addEventListener('mousemove', (e) => {
    client = { x: e.clientX, y: e.clientY };
    if (locked) return;
    if (rightOnKeyboard && Math.hypot(e.movementX || 0, e.movementY || 0) > 2) {
      clearTimeout(rightReturnTimer);
      rightToMouse();
    }
    applyPointer();
  });

  const BTN_FINGER = { 0: 3, 1: 3, 2: 2 }; // izquierdo → índice, rueda → índice, derecho → corazón
  function mouseButtonVisual(button, down) {
    const btn = mouseEl.querySelector(`[data-btn="${button}"]`);
    if (!btn) return;
    btn.classList.toggle('down', down);
    Game.sound.mouse(down);
    if (down && rightOnKeyboard) { clearTimeout(rightReturnTimer); rightToMouse(); }
    right.press(BTN_FINGER[button], down);
  }
  window.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
    if (!locked) mouseButtonVisual(e.button, true);
  });
  window.addEventListener('mouseup', (e) => { if (!locked) mouseButtonVisual(e.button, false); });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));

  // ---------- Teclado ----------
  const held = new Map(); // code -> {hand, finger}
  let leftReturnTimer = 0;

  function homeLeft() {
    left.aimFinger(3, kb.center('KeyF'));
  }

  function aimFor(hand, finger, code) {
    const h = hand === 'L' ? left : right;
    h.aimFinger(finger, kb.center(code), finger === 4 ? -0.05 : 0.15);
  }

  function press(code) {
    if (!kb.has(code) || held.has(code)) return;
    const f = Game.layout.fingers[code];
    if (!f) return;
    kb.setDown(code, true);
    held.set(code, f);
    Game.sound.key(true, code);
    if (f.hand === 'L') {
      clearTimeout(leftReturnTimer);
      aimFor('L', f.finger, code);
      left.press(f.finger, true);
    } else {
      clearTimeout(rightReturnTimer);
      rightOnKeyboard = true;
      aimFor('R', f.finger, code);
      right.press(f.finger, true);
    }
  }

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    // Evita scroll/atajos, salvo al escribir en un campo de texto del juego (ahí solo se bloquea Tab).
    const typing = !locked && e.target.closest && e.target.closest('textarea, input');
    if (typing ? code === 'Tab' : (!e.ctrlKey && !e.metaKey && !/^F\d+$/.test(code))) e.preventDefault();
    if (locked) return;
    press(code);
  });

  function release(code) {
    const f = held.get(code);
    if (!f) return;
    held.delete(code);
    kb.setDown(code, false);
    Game.sound.key(false, code);
    const hand = f.hand === 'L' ? left : right;
    // Solo levanta el dedo si ninguna otra tecla lo mantiene pulsado.
    const stillUsed = [...held.values()].some((o) => o.hand === f.hand && o.finger === f.finger);
    if (!stillUsed) hand.press(f.finger, false);

    const others = [...held.entries()].filter(([, o]) => o.hand === f.hand);
    if (others.length) {
      const [c, o] = others[others.length - 1];
      aimFor(f.hand, o.finger, c);
    } else if (f.hand === 'L') {
      leftReturnTimer = setTimeout(homeLeft, 140);
    } else {
      // La mano derecha vuelve al ratón si deja de teclear un momento.
      rightReturnTimer = setTimeout(rightToMouse, 900);
    }
  }

  window.addEventListener('keyup', (e) => { if (!locked) release(e.code); });
  function releaseAll() {
    [...held.keys()].forEach(release);
    mouseEl.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
    [0, 1, 2, 3, 4].forEach((i) => right.press(i, false));
  }
  window.addEventListener('blur', releaseAll);

  // ---------- Control desde la historia ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Carácter → tecla física (distribución española) y si hace falta Mayúsculas.
  const ACCENTS = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u' };
  const SYMBOLS = {
    ' ': ['Space'], ',': ['Comma'], '.': ['Period'], '-': ['Slash'], "'": ['Minus'], '¡': ['Equal'],
    '?': ['Minus', true], '¿': ['Equal', true], '!': ['Digit1', true], ':': ['Period', true],
    ';': ['Comma', true], '"': ['Digit2', true], '(': ['Digit8', true], ')': ['Digit9', true],
    'ñ': ['Semicolon'], 'Ñ': ['Semicolon', true], '\n': ['Enter'],
  };
  function keysFor(ch) {
    if (SYMBOLS[ch]) return { code: SYMBOLS[ch][0], shift: !!SYMBOLS[ch][1] };
    const lower = ch.toLowerCase();
    const base = ACCENTS[lower] || lower;
    if (/^[a-z]$/.test(base)) {
      return { code: `Key${base.toUpperCase()}`, shift: ch !== lower, accent: !!ACCENTS[lower] };
    }
    if (/^[0-9]$/.test(ch)) return { code: `Digit${ch}` };
    return null;
  }

  async function tap(code, hold = 55) {
    press(code);
    await wait(hold);
    release(code);
  }

  Game.input = {
    get locked() { return locked; },
    // Bloquea la entrada del jugador: la historia mueve las manos.
    lock() {
      locked = true;
      releaseAll();
      document.body.classList.add('locked');
    },
    unlock() {
      locked = false;
      document.body.classList.remove('locked');
      if (client) applyPointer();
    },
    // Lleva el cursor al centro de un elemento de la pantalla, con un movimiento suave.
    async moveToElement(el, ms = 900) {
      const s = screen.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const to = { nx: (r.left + r.width / 2 - s.left) / s.width, ny: (r.top + r.height / 2 - s.top) / s.height };
      const from = { ...pointer };
      const t0 = performance.now();
      await new Promise((done) => {
        function step() {
          const t = Math.min(1, (performance.now() - t0) / ms);
          const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // suave al salir y al llegar
          setPointer(from.nx + (to.nx - from.nx) * k, from.ny + (to.ny - from.ny) * k);
          if (t < 1) setTimeout(step, 16); else done();
        }
        step();
      });
    },
    async click() {
      mouseButtonVisual(0, true);
      await wait(90);
      mouseButtonVisual(0, false);
    },
    // Teclea un texto en el teclado del escritorio. onChar(ch) se llama con cada carácter.
    async type(text, onChar, speed = 1) {
      for (const ch of text) {
        const k = keysFor(ch);
        if (k) {
          if (k.accent) await tap('Quote', 45);           // tecla de acento antes de la vocal
          if (k.shift) press('ShiftLeft');
          await tap(k.code);
          if (k.shift) release('ShiftLeft');
        }
        if (onChar) onChar(ch);
        const base = ch === ' ' ? 70 : /[,.?!]/.test(ch) ? 160 : 55;
        await wait((base + Math.random() * 60) / speed);
      }
    },
    tap,
  };

  // ---------- Bucle ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    left.update(dt);
    // Sobre el ratón la mano lo sigue pegada; al viajar al teclado va algo más suave.
    right.update(dt, rightOnKeyboard ? 16 : 30);
    requestAnimationFrame(frame);
  }

  kb.build();
  layout();
  applyPointer(); // cursor centrado hasta que se mueva el ratón real
  homeLeft();
  left.snap();
  right.snap();
  window.addEventListener('resize', () => {
    layout();
    if (!locked) applyPointer(); // recoloca el cursor virtual con el nuevo tamaño de pantalla
    else setPointer(pointer.nx, pointer.ny);
    homeLeft();
    left.snap();
    right.snap();
  });
  requestAnimationFrame(frame);
})();
