// Datos del teclado: distribución ISO (español) en unidades de tecla (1u = una tecla normal).
// Cada tecla usa KeyboardEvent.code, que identifica la tecla física sin importar el idioma.
window.Game = window.Game || {};

(function () {
  // [code, etiqueta, ancho]
  const ROWS = [
    [
      ['Backquote', 'º'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'],
      ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'],
      ['Digit0', '0'], ['Minus', "'"], ['Equal', '¡'], ['Backspace', '⟵', 2],
    ],
    [
      ['Tab', 'Tab', 1.5], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'],
      ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'],
      ['BracketLeft', '`'], ['BracketRight', '+'],
      // Enter ISO (parte superior); la parte inferior está en la fila siguiente
      ['Enter', '↵', 1.5],
    ],
    [
      ['CapsLock', 'Bloq', 1.75], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'],
      ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', 'Ñ'], ['Quote', '´'],
      ['Backslash', 'Ç'], ['Enter', '', 1.25],
    ],
    [
      ['ShiftLeft', '⇧', 1.25], ['IntlBackslash', '<'], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'],
      ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M'], ['Comma', ','], ['Period', '.'],
      ['Slash', '-'], ['ShiftRight', '⇧', 2.75],
    ],
    [
      ['ControlLeft', 'Ctrl', 1.25], ['MetaLeft', '◆', 1.25], ['AltLeft', 'Alt', 1.25],
      ['Space', '', 6.25], ['AltRight', 'AltGr', 1.25], ['MetaRight', '◆', 1.25],
      ['ContextMenu', '≡', 1.25], ['ControlRight', 'Ctrl', 1.25],
    ],
  ];

  // Dedo que pulsa cada tecla (mecanografía clásica).
  // Mano: 'L' o 'R'. Dedo: 0 meñique, 1 anular, 2 corazón, 3 índice, 4 pulgar.
  const FINGERS = {};
  const assign = (hand, finger, codes) => codes.forEach((c) => { FINGERS[c] = { hand, finger }; });
  assign('L', 0, ['Backquote', 'Digit1', 'Tab', 'KeyQ', 'CapsLock', 'KeyA', 'ShiftLeft', 'IntlBackslash',
    'KeyZ', 'ControlLeft', 'MetaLeft']);
  assign('L', 1, ['Digit2', 'KeyW', 'KeyS', 'KeyX']);
  assign('L', 2, ['Digit3', 'KeyE', 'KeyD', 'KeyC']);
  assign('L', 3, ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']);
  assign('L', 4, ['Space', 'AltLeft']);
  assign('R', 3, ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM']);
  assign('R', 2, ['Digit8', 'KeyI', 'KeyK', 'Comma']);
  assign('R', 1, ['Digit9', 'KeyO', 'KeyL', 'Period']);
  assign('R', 0, ['Digit0', 'Minus', 'Equal', 'Backspace', 'KeyP', 'BracketLeft', 'BracketRight',
    'Enter', 'Semicolon', 'Quote', 'Backslash', 'Slash', 'ShiftRight', 'ControlRight', 'ContextMenu',
    'MetaRight']);
  assign('R', 4, ['AltRight']);

  // Construye la lista de teclas con posición (x, y) y tamaño (w, h) en unidades.
  const keys = [];
  ROWS.forEach((row, y) => {
    let x = 0;
    row.forEach(([code, label, w = 1]) => {
      const key = { code, label, x, y, w, h: 1 };
      keys.push(key);
      x += w;
    });
  });

  Game.layout = {
    keys,
    fingers: FINGERS,
    width: 15,
    height: ROWS.length,
  };
})();
