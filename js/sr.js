// Chat con la Sociedad Revolucionaria (SR): canal cifrado que aparece en el acto 3.
// Tomás escribe a la derecha; SR, en rojo, a la izquierda. El historial no se pierde al cerrar la ventana.
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = document.createElement('div');
  log.className = 'chat-log';
  let win = null;
  let input = null;
  let onPlayer = null;
  let installed = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  function add(cls, html) {
    const m = document.createElement('div');
    m.className = `msg ${cls}`;
    m.innerHTML = html;
    log.appendChild(m);
    scroll();
    return m;
  }

  function open() {
    install();
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({
      key: 'sr', title: 'SR · canal cifrado', iconHtml: Game.icons.sr(), w: 34, h: 26,
      build(body, W) {
        body.classList.add('luciano', 'srchat');
        body.innerHTML =
          `<div class="lu-head"><span class="sr-logo">${Game.icons.sr()}</span><div><b>${esc(G.personajes.sr)}</b>` +
          '<small>canal cifrado · conexión inestable</small></div></div>' +
          '<div class="lu-log-wrap"></div>' +
          '<div class="lu-input"><input type="text" spellcheck="false" placeholder="Escribe un mensaje…">' +
          '<div class="btn lu-send" data-cursor="hand">Enviar</div></div>';
        body.querySelector('.lu-log-wrap').appendChild(log);
        input = body.querySelector('input');
        input.readOnly = !onPlayer;
        const send = () => {
          const text = input.value.trim();
          if (!text || !onPlayer || Game.input.locked) return;
          input.value = '';
          tomas(text);
          onPlayer(text);
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        body.querySelector('.lu-send').addEventListener('click', send);
        W.onClose = () => { win = null; input = null; };
        setTimeout(scroll, 0);
        if (onPlayer) setTimeout(() => input && input.focus(), 0);
      },
    });
    return win;
  }

  // El icono de SR aparece en el escritorio la primera vez que se abre el canal.
  function install() {
    if (installed) return;
    installed = true;
    Game.os.addApp({ id: 'app-sr', name: 'SR', iconHtml: Game.icons.sr(), open });
  }

  function tomas(text) {
    Game.sound.message(false);
    return add('tomas', `<span class="who">${esc(G.personajes.tomas)}</span><p>${esc(text)}</p>`);
  }

  async function say(text, { typing = 700 + text.length * 14 } = {}) {
    const dots = add('srm typing', `<span class="who">${esc(G.personajes.sr)}</span><p><i></i><i></i><i></i></p>`);
    await wait(Math.min(typing, 2200));
    dots.remove();
    Game.sound.glitch();
    return add('srm glitch-in', `<span class="who">${esc(G.personajes.sr)}</span><p>${esc(text)}</p>`);
  }

  // Mensaje de SR que llega sin "escribiendo…" (p. ej. el de una notificación).
  function log_(text) { return add('srm', `<span class="who">${esc(G.personajes.sr)}</span><p>${esc(text)}</p>`); }

  async function typeAsTomas(text) {
    if (!win) open();
    input.value = '';
    await Game.input.type(text, (ch) => { if (input) { input.value += ch; input.scrollLeft = input.scrollWidth; } });
    await wait(250);
    await Game.input.tap('Enter', 70);
    if (input) input.value = '';
    tomas(text);
  }

  Game.sr = {
    open,
    say,
    log: log_,
    tomas,
    typeAsTomas,
    get window() { return win; },
    get isActive() { return !!(win && !win.min && win.el.classList.contains('active')); },
    // El jugador puede escribir; fn(texto) recibe cada mensaje. fn = null lo desactiva.
    enableInput(fn) {
      onPlayer = fn;
      if (input) { input.readOnly = !fn; if (fn) input.focus(); }
    },
  };
})();
