// Teclado del juego: construye las teclas y muestra el estado pulsado.
// Todas las medidas están en "em" del plano del escritorio (1em = 1 unidad de tecla),
// así el conjunto escala con la ventana cambiando un solo font-size.
(function () {
  const PAD = 0.3;   // margen de la placa alrededor de las teclas
  const GAP = 0.06;  // separación entre teclas

  const el = document.getElementById('keyboard');
  const elementsByCode = {};
  const centers = {};       // centro de cada tecla, en unidades del plano
  let origin = { x: 0, y: 0 };

  function build() {
    el.innerHTML = '';
    Game.layout.keys.forEach((k) => {
      const key = document.createElement('div');
      key.className = 'key' + (k.label.length > 1 ? ' wide' : '');
      key.dataset.code = k.code;
      let h = k.h;
      let y = k.y;
      if (k.part === 'top') h += GAP * 2; // une las dos piezas del Enter ISO
      if (k.part === 'bottom') { y -= GAP * 2; h += GAP * 2; }
      Object.assign(key.style, {
        left: `${PAD + k.x + GAP / 2}em`,
        top: `${PAD + y + GAP / 2}em`,
        width: `${k.w - GAP}em`,
        height: `${h - GAP}em`,
      });
      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = k.label;
      key.appendChild(lbl);
      el.appendChild(key);
      (elementsByCode[k.code] = elementsByCode[k.code] || []).push(key);
    });
    el.style.width = `${Game.layout.width + PAD * 2}em`;
    el.style.height = `${Game.layout.height + PAD * 2}em`;
    localizeLabels();
  }

  // Si el navegador lo permite, muestra las letras de la distribución real del usuario.
  function localizeLabels() {
    if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return;
    navigator.keyboard.getLayoutMap().then((map) => {
      map.forEach((value, code) => {
        const els = elementsByCode[code];
        if (!els || !value || value.length !== 1 || !/^(Key|Digit|Intl|Backquote|Minus|Equal|Bracket|Semicolon|Quote|Backslash|Comma|Period|Slash)/.test(code)) return;
        els.forEach((e) => { e.firstChild.textContent = value.toUpperCase(); });
      });
    }).catch(() => {});
  }

  // Coloca el teclado en el plano (x, y = esquina superior izquierda, en unidades).
  function place(x, y) {
    origin = { x, y };
    el.style.left = `${x}em`;
    el.style.top = `${y}em`;
    Game.layout.keys.forEach((k) => {
      centers[k.code] = { x: x + PAD + k.x + k.w / 2, y: y + PAD + k.y + k.h / 2 };
    });
  }

  function setDown(code, down) {
    const els = elementsByCode[code];
    if (!els) return false;
    els.forEach((e) => e.classList.toggle('down', down));
    return true;
  }

  Game.keyboard = {
    build,
    place,
    setDown,
    has: (code) => !!elementsByCode[code],
    center: (code) => centers[code],
    get width() { return Game.layout.width + PAD * 2; },
    get height() { return Game.layout.height + PAD * 2; },
    get origin() { return origin; },
  };
})();
