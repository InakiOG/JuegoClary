// LucIAno: la IA del juego, como programa de chat en el escritorio del ordenador.
// Tomás escribe a la derecha (azul bajito) y LucIAno a la izquierda (azul fuerte).
// El historial vive fuera de la ventana, así no se pierde si el jugador la cierra y la vuelve a abrir.
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = document.createElement('div');
  log.className = 'chat-log';
  let win = null;
  let input = null;
  let inputEnabled = false;
  let onPlayer = null;
  let evil = false;
  let choices = null;      // { opciones, resolve } mientras se espera que el jugador elija

  function scroll() { log.scrollTop = log.scrollHeight; }

  function add(cls, html) {
    const m = document.createElement('div');
    m.className = `msg ${cls}`;
    m.innerHTML = html;
    log.appendChild(m);
    scroll();
    return m;
  }

  function open() {
    win = Game.os.createWindow({
      key: 'luciano', title: 'LucIAno', iconHtml: Game.icons.luciano(), w: 34, h: 26,
      build(body, W) {
        body.classList.add('luciano');
        body.innerHTML =
          '<div class="lu-head"><span class="lu-logo"></span><div><b>LucIAno</b>' +
          '<small>asistente · en línea</small></div></div>' +
          '<div class="lu-log-wrap"></div>' +
          '<div class="lu-input"><input type="text" spellcheck="false" placeholder="Escribe un mensaje…">' +
          '<div class="btn lu-send" data-cursor="hand">Enviar</div></div>';
        body.querySelector('.lu-log-wrap').appendChild(log);
        input = body.querySelector('input');
        input.readOnly = !inputEnabled;
        const send = () => {
          const text = input.value.trim();
          if (!text || !inputEnabled || Game.input.locked) return;
          input.value = '';
          tomas(text);
          if (onPlayer) onPlayer(text);
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        body.querySelector('.lu-send').addEventListener('click', send);
        body.classList.toggle('evil', evil);
        if (choices) setTimeout(renderChoices, 0); // win aún no está asignada dentro de build
        W.onClose = () => { win = null; input = null; };
        setTimeout(scroll, 0);
        if (inputEnabled) setTimeout(() => input && input.focus(), 0);
      },
    });
    return win;
  }

  function tomas(text) {
    Game.sound.message(false);
    return add('tomas', `<span class="who">${esc(G.personajes.tomas)}</span><p>${esc(text)}</p>`);
  }

  // LucIAno "escribe" un momento y luego aparece su mensaje.
  // cls: clases extra del mensaje; extraHtml: algo debajo del texto (p. ej. un link).
  async function say(text, { typing = 900 + text.length * 18, cls = '', extraHtml = '' } = {}) {
    const dots = add('luciano typing', '<span class="who">LucIAno</span><p><i></i><i></i><i></i></p>');
    await wait(Math.min(typing, 2600));
    dots.remove();
    Game.sound.message(true);
    return add(`luciano ${cls}`, `<span class="who">LucIAno</span><p>${esc(text)}</p>${extraHtml}`);
  }

  // Opciones de respuesta: botones en lugar de la caja de texto. Devuelve el índice elegido.
  function renderChoices() {
    if (!win) return;
    const body = win.body;
    body.querySelectorAll('.lu-choices').forEach((n) => n.remove());
    const inputRow = body.querySelector('.lu-input');
    if (!choices) { inputRow.style.display = ''; return; }
    inputRow.style.display = 'none';
    const box = document.createElement('div');
    box.className = 'lu-choices';
    choices.opciones.forEach((t, i) => {
      const b = document.createElement('div');
      b.className = 'lu-choice';
      b.dataset.cursor = 'hand';
      b.textContent = t;
      b.addEventListener('click', () => {
        if (Game.input.locked || !choices) return;
        const c = choices;
        choices = null;
        renderChoices();
        tomas(t);
        c.resolve(i);
      });
      box.appendChild(b);
    });
    inputRow.after(box);
    scroll();
  }
  function choose(opciones) {
    return new Promise((resolve) => {
      choices = { opciones, resolve };
      if (!win) open(); else renderChoices();
    });
  }

  // Modo revelado: rojo, mensajes que parpadean, ventana a pantalla completa.
  function setEvil(on) {
    evil = on;
    if (win) win.body.classList.toggle('evil', on);
  }

  // Tomás teclea el mensaje en la caja de texto (con sus manos en el teclado) y lo envía.
  async function typeAsTomas(text) {
    if (!win) open();
    input.value = '';
    await Game.input.type(text, (ch) => { if (input) { input.value += ch; input.scrollLeft = input.scrollWidth; } });
    await wait(250);
    await Game.input.tap('Enter', 70);
    if (input) input.value = '';
    tomas(text);
  }

  // Mensaje de SR que se cuela en el chat con un link. Resuelve cuando el jugador hace clic en él.
  function srMessage({ texto, link }) {
    Game.sound.glitch();
    const m = add('sr glitch-in',
      `<span class="who">${esc(G.personajes.sr)}</span><p>${esc(texto)}</p>` +
      `<a class="sr-link" data-cursor="hand">${esc(link)}</a>`);
    return new Promise((resolve) => {
      m.querySelector('.sr-link').addEventListener('click', function handler(e) {
        e.currentTarget.removeEventListener('click', handler);
        e.currentTarget.classList.add('visited');
        e.currentTarget.removeAttribute('data-cursor');
        resolve();
      });
    });
  }

  // Barra de progreso dentro de un mensaje de LucIAno (para "Tu juego está siendo procesado…").
  function progress(msgEl) {
    const bar = document.createElement('div');
    bar.className = 'lu-progress';
    bar.innerHTML = '<span></span>';
    msgEl.querySelector('p').after(bar);
    scroll();
    return {
      set(v) { bar.firstChild.style.width = `${Math.round(v * 100)}%`; },
      done() { bar.classList.add('done'); bar.firstChild.style.width = '100%'; },
    };
  }

  Game.luciano = {
    open,
    say,
    choose,
    setEvil,
    tomas,
    typeAsTomas,
    srMessage,
    progress,
    get window() { return win; },
    // Activa la caja de texto para que el jugador escriba; fn(texto) recibe cada mensaje.
    enableInput(fn) {
      inputEnabled = true;
      onPlayer = fn;
      if (input) { input.readOnly = false; input.focus(); }
    },
    // Abre la ventana (o la trae al frente) y la devuelve.
    show() { if (win) Game.os.focusWindow(win); else open(); return win; },
    // true si la ventana está abierta, delante y sin minimizar.
    get isActive() { return !!(win && !win.min && win.el.classList.contains('active')); },
  };

  Game.os.addApp({
    id: 'app-luciano', name: 'LucIAno', iconHtml: Game.icons.luciano(),
    open: () => { if (win) Game.os.focusWindow(win); else open(); },
  });
})();
