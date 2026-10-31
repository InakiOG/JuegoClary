// Escena principal: coloca los elementos, conecta ratón y teclado reales con los del juego.
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

  // ---------- Cursor virtual ----------
  cursor.innerHTML =
    '<svg viewBox="0 0 16 24"><path d="M1,1 L1,19 L5.5,14.8 L8.6,22 L11.4,20.8 L8.4,13.8 L14.5,13.8 Z" ' +
    'fill="#f5f7fa" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>';

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
  }

  // Punto del ratón bajo el índice (botón izquierdo).
  const mouseIndexPoint = () => ({ x: mousePos.x - MOUSE_W * 0.25, y: mousePos.y - MOUSE_H / 2 + 1.0 });

  let rightOnKeyboard = false;
  let rightReturnTimer = 0;

  function rightToMouse() {
    rightOnKeyboard = false;
    right.aimFinger(3, mouseIndexPoint(), 0);
  }

  // Última posición real del puntero (null hasta el primer movimiento: cursor centrado).
  let client = null;

  function applyPointer() {
    const r = screen.getBoundingClientRect();
    const nx = client ? Math.min(1, Math.max(0, (client.x - r.left) / r.width)) : 0.5;
    const ny = client ? Math.min(1, Math.max(0, (client.y - r.top) / r.height)) : 0.5;
    pointer = { nx, ny };
    // El cursor virtual se queda en el borde de la pantalla, como en un ordenador real.
    cursor.style.transform = `translate(${(nx * r.width).toFixed(1)}px, ${(ny * r.height).toFixed(1)}px)`;
    updateMouse();
    if (!rightOnKeyboard) rightToMouse();
  }

  window.addEventListener('mousemove', (e) => {
    client = { x: e.clientX, y: e.clientY };
    if (rightOnKeyboard && Math.hypot(e.movementX || 0, e.movementY || 0) > 2) {
      clearTimeout(rightReturnTimer);
      rightToMouse();
    }
    applyPointer();
  });

  const BTN_FINGER = { 0: 3, 1: 3, 2: 2 }; // izquierdo → índice, rueda → índice, derecho → corazón
  function mouseButton(e, down) {
    const btn = mouseEl.querySelector(`[data-btn="${e.button}"]`);
    if (!btn) return;
    btn.classList.toggle('down', down);
    if (down && rightOnKeyboard) { clearTimeout(rightReturnTimer); rightToMouse(); }
    right.press(BTN_FINGER[e.button], down);
  }
  window.addEventListener('mousedown', (e) => { mouseButton(e, true); if (e.button === 1) e.preventDefault(); });
  window.addEventListener('mouseup', (e) => mouseButton(e, false));
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

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (!e.ctrlKey && !e.metaKey && !/^F\d+$/.test(code)) e.preventDefault(); // evita scroll/atajos
    if (!kb.has(code) || held.has(code)) return;
    const f = Game.layout.fingers[code];
    if (!f) return;
    kb.setDown(code, true);
    held.set(code, f);
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
  });

  function release(code) {
    const f = held.get(code);
    if (!f) return;
    held.delete(code);
    kb.setDown(code, false);
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

  window.addEventListener('keyup', (e) => release(e.code));
  window.addEventListener('blur', () => {
    [...held.keys()].forEach(release);
    mouseEl.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
    [0, 1, 2, 3, 4].forEach((i) => right.press(i, false));
  });

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
    applyPointer(); // recoloca el cursor virtual con el nuevo tamaño de pantalla
    homeLeft();
    left.snap();
    right.snap();
  });
  requestAnimationFrame(frame);
})();
