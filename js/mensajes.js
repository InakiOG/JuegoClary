// Mensajes: app de mensajería del teléfono/ordenador de la familia.
// Lista de chats → conversación. En el chat de la mamá están los mensajes de Tomás que no se enviaron.
window.Game = window.Game || {};

(function () {
  const M = Game.guion.mensajes;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let win = null;

  const avatar = (name) => `<span class="ms-avatar">${esc(name.charAt(0))}</span>`;

  function renderList(body) {
    const last = M.noEnviados[M.noEnviados.length - 1];
    body.innerHTML =
      '<div class="ms-head"><b>Mensajes</b></div>' +
      '<div class="ms-list">' +
      `  <div class="ms-item" data-chat="mama" data-cursor="hand">${avatar(M.contacto)}` +
      `    <div class="ms-item-text"><b>${esc(M.contacto)}</b><small><span class="ms-fail">!</span> ${esc(last.texto)}</small></div>` +
      `    <span class="ms-time">${esc(last.hora)}</span></div>` +
      '</div>';
    body.querySelector('[data-chat="mama"]').addEventListener('click', () => renderChat(body));
  }

  const now = () => {
    const d = Game.now();
    const h = d.getHours(), m = d.getMinutes();
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
  };
  const failedHtml = (m) =>
    '<div class="ms-msg out failed glitch-in">' +
    `<p>${esc(m.texto)}</p>` +
    `<span class="ms-meta">${esc(m.hora)} <span class="ms-fail">!</span> No enviado</span>` +
    '</div>';

  let input = null;
  function renderChat(body) {
    win.setTitle(`${M.contacto} — Mensajes`);
    body.innerHTML =
      `<div class="ms-head ms-chat-head"><span class="ms-back" data-cursor="hand">‹</span>${avatar(M.contacto)}` +
      `<div><b>${esc(M.contacto)}</b><small>sin conexión</small></div></div>` +
      `<div class="ms-convo">${M.noEnviados.map(failedHtml).join('')}</div>` +
      '<div class="lu-input ms-write"><input type="text" spellcheck="false" placeholder="Escribe un mensaje…">' +
      '<div class="btn lu-send" data-cursor="hand">Enviar</div></div>' +
      '<div class="ms-input"><span>Sin conexión. Los mensajes se enviarán cuando vuelva la red.</span></div>';
    input = body.querySelector('.ms-write input');
    const send = () => {
      const t = input.value.trim();
      if (!t || Game.input.locked) return;
      input.value = '';
      addFailed(t);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    body.querySelector('.ms-write .lu-send').addEventListener('click', send);
    body.querySelector('.ms-back').addEventListener('click', () => { input = null; win.setTitle('Mensajes'); renderList(body); });
    const convo = body.querySelector('.ms-convo');
    convo.scrollTop = convo.scrollHeight;
  }

  // Un mensaje más a la mamá que no llega.
  function addFailed(texto, hora = now()) {
    const m = { texto, hora };
    M.noEnviados.push(m);
    Game.sound.message(false);
    const convo = win && win.body.querySelector('.ms-convo');
    if (convo) {
      convo.insertAdjacentHTML('beforeend', failedHtml(m));
      convo.scrollTop = convo.scrollHeight;
    }
  }

  // Tomás escribe en el chat de su mamá (con sus manos en el teclado) y lo envía.
  async function typeAsTomas(texto, hora) {
    if (!input) return addFailed(texto, hora);
    input.value = '';
    await Game.input.type(texto, (ch) => { if (input) { input.value += ch; input.scrollLeft = input.scrollWidth; } });
    await new Promise((r) => setTimeout(r, 250));
    await Game.input.tap('Enter', 70);
    if (input) input.value = '';
    addFailed(texto, hora);
  }

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({
      key: 'mensajes', title: 'Mensajes', iconHtml: Game.icons.mensajes(), w: 30, h: 24,
      build(body, W) {
        body.classList.add('mensajes');
        win = W;
        renderList(body);
        W.onClose = () => { win = null; input = null; };
      },
    });
    return win;
  }

  Game.mensajes = {
    open,
    get window() { return win; },
    chatItem: () => win && win.body.querySelector('[data-chat="mama"]'),
    showList() { if (win) { input = null; win.setTitle('Mensajes'); renderList(win.body); } },
    // Abre (o trae al frente) la conversación con la mamá.
    openChat() { open(); renderChat(win.body); },
    typeAsTomas,
  };

  Game.os.addApp({ id: 'app-mensajes', name: 'Mensajes', iconHtml: Game.icons.mensajes(), open });
})();
