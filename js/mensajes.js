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

  function renderChat(body) {
    win.setTitle(`${M.contacto} — Mensajes`);
    body.innerHTML =
      `<div class="ms-head ms-chat-head"><span class="ms-back" data-cursor="hand">‹</span>${avatar(M.contacto)}` +
      `<div><b>${esc(M.contacto)}</b><small>sin conexión</small></div></div>` +
      '<div class="ms-convo">' +
      M.noEnviados.map((m) =>
        '<div class="ms-msg out failed">' +
        `<p>${esc(m.texto)}</p>` +
        `<span class="ms-meta">${esc(m.hora)} <span class="ms-fail">!</span> No enviado</span>` +
        '</div>').join('') +
      '</div>' +
      '<div class="ms-input"><span>Sin conexión. Los mensajes se enviarán cuando vuelva la red.</span></div>';
    body.querySelector('.ms-back').addEventListener('click', () => { win.setTitle('Mensajes'); renderList(body); });
  }

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({
      key: 'mensajes', title: 'Mensajes', iconHtml: Game.icons.mensajes(), w: 30, h: 24,
      build(body, W) {
        body.classList.add('mensajes');
        win = W;
        renderList(body);
        W.onClose = () => { win = null; };
      },
    });
    return win;
  }

  Game.mensajes = {
    open,
    get window() { return win; },
    chatItem: () => win && win.body.querySelector('[data-chat="mama"]'),
    showList() { if (win) { win.setTitle('Mensajes'); renderList(win.body); } },
  };

  Game.os.addApp({ id: 'app-mensajes', name: 'Mensajes', iconHtml: Game.icons.mensajes(), open });
})();
