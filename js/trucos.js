// Trucos para probar el juego. Escribe PILINES en cualquier momento (o el código Konami: ↑↑↓↓←→←→BA)
// y se desbloquea todo al 100 %:
//   - el mapa completo (todas las secciones, el archivo MAPA7382 en el escritorio)
//   - la app "Trucos" en el escritorio con: atención infinita, ganar el minijuego en curso,
//     abrir Minijuegos (todos, con su dificultad), probar cada minijuego en bucle e ir a cualquier capítulo.
// Queda activo durante la sesión del navegador (sessionStorage), también al saltar de capítulo.
window.Game = window.Game || {};

(function () {
  const PALABRA = 'pilines';
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const CLAVE = 'juegoclary-trucos';

  const CAPITULOS = [
    ['acto1', 'Acto I · LucIAno'],
    ['acto2', 'Acto II · sopa de letras'],
    ['acto3', 'Acto III · pesca y serpiente'],
    ['borrado', 'Papelera · mapa borrado'],
    ['maquila', 'Maquila · Silicon Valley'],
    ['pelea', 'Acto IV · pelea final'],
    ['codigo', 'Código PTAL · final'],
    ['creditos', 'Créditos'],
  ];
  const MINIJUEGOS = [['sopa', 'Sopa de letras'], ['pesca', 'Pesca'], ['serpiente', 'Serpiente'], ['maquila', 'Maquila'], ['pelea', 'ShitGPT Fighter']];

  const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
  const guardar = (v) => { try { if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v)); else sessionStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ } };

  let estado = null;   // { inmortal: bool } cuando los trucos están activos
  let win = null;
  let appAgregada = false;

  // ---------- Detectar el código ----------
  let buffer = [];
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if (!k || k.length > 10) return;
    buffer.push(k);
    if (buffer.length > 12) buffer.shift();
    const letras = buffer.filter((x) => x.length === 1).join('');
    const konami = buffer.slice(-KONAMI.length).join(',') === KONAMI.join(',');
    if (letras.endsWith(PALABRA) || konami) {
      buffer = [];
      activar(true);
    }
  }, true);

  // ---------- Activar ----------
  function activar(desdeCodigo) {
    const primeraVez = !estado;
    estado = estado || leer() || { inmortal: false };
    guardar(estado);
    Game.atencion.inmortal = !!estado.inmortal;
    desbloquearTodo();
    if (!appAgregada) {
      appAgregada = true;
      Game.os.addApp({ id: 'app-trucos', name: 'Trucos', iconHtml: icono(), open });
    }
    if (desdeCodigo) {
      if (primeraVez) aviso('¡TRUCOS ACTIVADOS! · 100 % DESBLOQUEADO');
      Game.sound.glitch();
      open();
    }
  }

  // Todo el mapa visible y el archivo del mapa en el escritorio.
  function desbloquearTodo() {
    if (Game.story && Game.story.addMapFile && !Game.files.get('mapa7382')) Game.story.addMapFile();
    ['acatlan', 'cfe', 'silicon', 'codigo'].forEach((s) => { if (Game.mapa.isLocked(s)) Game.mapa.unlock(s); });
    Game.mapa.unlock('ribera', 2);
  }

  function aviso(texto) {
    const el = document.createElement('div');
    el.className = 'trucos-aviso';
    el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // ---------- Ventana ----------
  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({ key: 'trucos', title: 'trucos.exe — 100 %', iconHtml: icono(), w: 34, h: 30, build });
    return win;
  }

  function build(body, W) {
    body.classList.add('tr');
    body.innerHTML =
      '<div class="tr-cab">TRUCOS · 100 % DESBLOQUEADO</div>' +
      '<div class="tr-cuerpo">' +
      '<label class="tr-fila tr-check" data-cursor="hand"><input type="checkbox" class="tr-inmortal"> Atención infinita (no pierdes en los minijuegos)</label>' +
      '<div class="tr-fila"><button class="g-btn tr-ganar" data-cursor="hand">Ganar el minijuego en curso</button>' +
      '<button class="g-btn tr-mj" data-cursor="hand">Abrir Minijuegos</button></div>' +
      '<h3>Probar un minijuego (en bucle)</h3><div class="tr-grid">' +
      MINIJUEGOS.map(([k, t]) => `<button class="g-btn" data-ir="mj-${k}" data-cursor="hand">${t}</button>`).join('') +
      '</div><h3>Ir a un capítulo</h3><div class="tr-grid">' +
      CAPITULOS.map(([k, t]) => `<button class="g-btn" data-ir="${k}" data-cursor="hand">${t}</button>`).join('') +
      '</div><div class="tr-fila tr-pie"><span class="tr-estado"></span>' +
      '<button class="g-btn tr-apagar" data-cursor="hand">Desactivar trucos</button></div></div>';
    const $ = (s) => body.querySelector(s);
    const st = $('.tr-estado');
    const chk = $('.tr-inmortal');
    chk.checked = !!estado.inmortal;
    chk.addEventListener('change', () => {
      estado.inmortal = chk.checked;
      Game.atencion.inmortal = chk.checked;
      if (chk.checked) Game.atencion.llenar();
      guardar(estado);
      st.textContent = chk.checked ? 'Atención infinita: sí' : 'Atención infinita: no';
    });
    $('.tr-ganar').addEventListener('click', () => {
      const hay = [...MINIJUEGOS].some(([k]) => Game.os.getWindow(`mj-${k}`) || Game.os.getWindow(`mjapp-${k}`));
      if (Game.story) Game.story.forzarVictoria();
      if (Game.minijuegosApp) Game.minijuegosApp.forzarVictoria();
      st.textContent = hay ? '¡Minijuego ganado!' : 'No hay ningún minijuego abierto.';
    });
    $('.tr-mj').addEventListener('click', () => Game.minijuegosApp.open());
    body.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const u = new URLSearchParams({ desde: b.dataset.ir, usuario: Game.jugador.nombre || 'PRUEBA' });
      location.href = `${location.pathname}?${u}`;
    }));
    $('.tr-apagar').addEventListener('click', () => {
      guardar(null);
      estado = null;
      Game.atencion.inmortal = false;
      Game.os.closeWindow(W);
      aviso('Trucos desactivados (desde la próxima partida)');
    });
    W.onClose = () => { win = null; };
  }

  function icono() {
    // Mando con una estrella: reutiliza el icono de Minijuegos y le pinta una estrella encima.
    return Game.icons.minijuegos().replace('</svg>',
      '<path d="M24 1 L25.5 5 L29.5 5 L26.3 7.5 L27.5 11.5 L24 9 L20.5 11.5 L21.7 7.5 L18.5 5 L22.5 5 Z" fill="#ffff00" stroke="#000" stroke-width=".8"/></svg>');
  }

  // Si ya estaban activos en esta sesión (p. ej. después de saltar de capítulo), se vuelven a aplicar.
  window.addEventListener('load', () => { setTimeout(() => { if (leer()) activar(false); }, 300); });

  Game.trucos = { activar: () => activar(true), get activos() { return !!estado; } };
})();
