// Minijuegos: app del escritorio con todos los minijuegos. Antes de empezar cada uno sale la
// pestaña de dificultad (Fácil / Intermedio / Difícil). Se juegan igual que en la historia
// (la barra de atención es la vida; si se vacía, GAME OVER), pero al terminar se vuelve a la lista
// y la atención de la historia queda como estaba.
window.Game = window.Game || {};

(function () {
  const JUEGOS = [
    { id: 'sopa', titulo: 'Sopa de letras', archivo: 'sopa.exe', desc: 'Encuentra las palabras entre los anuncios.' },
    { id: 'pesca', titulo: 'Pesca', archivo: 'pesca.exe', desc: 'Solo vale el pez dorado.' },
    { id: 'serpiente', titulo: 'Serpiente', archivo: 'serpiente.exe', desc: 'Cómete el mapa antes que las otras serpientes.' },
    { id: 'maquila', titulo: 'Maquila', archivo: 'maquila.exe', desc: 'Aguanta el turno repartiendo botellas.' },
    { id: 'pelea', titulo: 'ShitGPT Fighter', archivo: 'shitgpt_fighter.exe', desc: 'Tomás contra la IA, tres niveles.' },
  ];
  const NOMBRE_DIF = { facil: 'Fácil', intermedio: 'Intermedio', dificil: 'Difícil' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let win = null;
  let jugando = false;
  let forzar = null;   // truco: gana el minijuego en curso

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({ key: 'minijuegos', title: 'Minijuegos', iconHtml: Game.icons.minijuegos(), w: 38, h: 28, build });
    return win;
  }

  function build(body, W) {
    body.classList.add('mjl');
    body.innerHTML =
      '<div class="mjl-cabecera">Elige un minijuego</div>' +
      '<div class="mjl-lista">' +
      JUEGOS.map((j) =>
        `<div class="mjl-item" data-id="${j.id}" data-cursor="hand">` +
        `<span class="mjl-ico">${Game.icons.minijuegos()}</span>` +
        `<span class="mjl-txt"><b>${esc(j.titulo)}</b><small>${esc(j.desc)}</small></span>` +
        '<button class="g-btn mjl-jugar" data-cursor="hand">Jugar</button></div>').join('') +
      '</div>' +
      '<div class="mjl-estado">Antes de cada juego eliges la dificultad.</div>';
    const estado = body.querySelector('.mjl-estado');
    body.querySelectorAll('.mjl-item').forEach((el) => {
      const j = JUEGOS.find((x) => x.id === el.dataset.id);
      el.addEventListener('click', () => jugar(j, estado));
    });
    W.onClose = () => { win = null; };
  }

  async function jugar(j, estado) {
    // Un minijuego a la vez (ni desde la app ni mientras la historia tiene uno abierto).
    if (jugando || [...JUEGOS].some((x) => Game.os.getWindow(`mj-${x.id}`))) {
      estado.textContent = 'Ya hay un minijuego abierto.';
      return;
    }
    jugando = true;
    const atencionAntes = Game.atencion.value;
    try {
      for (;;) {
        const dificultad = await Game.escena.elegirDificultad(j.titulo);
        const W = Game.os.createWindow({
          key: `mjapp-${j.id}`, title: `${j.archivo} — ${NOMBRE_DIF[dificultad]}`, iconHtml: Game.icons.minijuegos(), w: 60, h: 40,
          build(b) { b.classList.add('minijuego'); },
        });
        W.el.querySelectorAll('.tb-min, .tb-max').forEach((b) => { b.hidden = true; });
        if (!W.max) W.el.querySelector('.titlebar').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        Game.atencion.juego(true);
        const game = Game.minijuegos[j.id](W.body, { dificultad });
        // Cerrar la ventana con la X cuenta como abandonar.
        const cerrada = new Promise((r) => { const prev = W.onClose; W.onClose = () => { if (prev) prev(); r('cerrada'); }; });
        const res = await Promise.race([game.done, Game.atencion.vacia().then(() => false), cerrada,
          new Promise((r) => { forzar = () => r(true); }),
          Game.escena.botonSalir(W).then(() => 'cerrada')]);
        forzar = null;
        game.destroy();
        Game.atencion.juego(false);
        if (W.el.isConnected) Game.os.closeWindow(W);
        if (res === 'cerrada') { estado.textContent = `${j.titulo}: saliste al escritorio.`; break; }
        if (res) {
          estado.textContent = `${j.titulo} (${NOMBRE_DIF[dificultad]}): ¡ganaste! Score ${Game.score.value}`;
          Game.sound.glitch();
          break;
        }
        const otra = await Game.escena.perder({ oofs: j.id === 'maquila' ? 9 : 1, salir: true });
        if (!otra) { estado.textContent = `${j.titulo}: perdiste.`; break; }
      }
    } finally {
      Game.atencion.restaurar(atencionAntes);
      jugando = false;
      if (win) Game.os.focusWindow(win);
    }
  }

  Game.minijuegosApp = { open, JUEGOS, forzarVictoria: () => { if (forzar) forzar(); } };
  Game.os.addApp({ id: 'app-minijuegos', name: 'Minijuegos', iconHtml: Game.icons.minijuegos(), open });
})();
