// Post-it: notita amarilla en el escritorio para que el jugador apunte lo que quiera (p. ej. las palabras
// de la sopa de letras). El texto se guarda en memoria mientras dura la partida.
window.Game = window.Game || {};

(function () {
  let texto = '';
  let win = null;

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({
      key: 'postit', title: 'Post-it', iconHtml: Game.icons.postit(), w: 18, h: 16,
      build(body, W) {
        body.classList.add('postit');
        body.innerHTML = '<textarea spellcheck="false" placeholder="Apunta aquí…"></textarea>';
        const ta = body.querySelector('textarea');
        ta.value = texto;
        ta.addEventListener('input', () => { texto = ta.value; });
        setTimeout(() => ta.focus(), 0);
        W.onClose = () => { win = null; };
      },
    });
    return win;
  }

  Game.postit = { open, get texto() { return texto; } };
  Game.os.addApp({ id: 'app-postit', name: 'Post-it', iconHtml: Game.icons.postit(), open });
})();
