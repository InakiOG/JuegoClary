// Fotos: app del escritorio. Dentro solo hay una carpeta, PILINES.12, con las imágenes del
// documento de correcciones, en su orden (img/pilines/01.jpg … 14.jpg).
// Vistas: carpeta raíz → miniaturas de PILINES.12 → visor (anterior / siguiente, flechas del teclado).
window.Game = window.Game || {};

(function () {
  const CARPETA = 'PILINES.12';
  const FOTOS = Array.from({ length: 14 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { nombre: `pilin_${n}.jpg`, src: `img/pilines/${n}.jpg` };
  });

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let win = null;

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({ key: 'fotos', title: 'Fotos', iconHtml: Game.icons.viewer(), w: 42, h: 30, build });
    return win;
  }

  function build(body, W) {
    body.classList.add('fo');
    body.innerHTML =
      '<div class="fo-barra">' +
      '  <button class="fo-btn fo-atras" data-cursor="hand" title="Atrás">◀ Atrás</button>' +
      '  <div class="fo-ruta"></div>' +
      '</div>' +
      '<div class="fo-vista"></div>' +
      '<div class="fo-estado"></div>';
    const $ = (s) => body.querySelector(s);
    const vista = $('.fo-vista'), ruta = $('.fo-ruta'), estado = $('.fo-estado'), atras = $('.fo-atras');
    let modo = 'raiz';   // 'raiz' | 'carpeta' | número de foto
    let elegida = 0;

    function raiz() {
      modo = 'raiz';
      ruta.textContent = 'Fotos';
      atras.disabled = true;
      vista.className = 'fo-vista fo-raiz';
      vista.innerHTML =
        `<div class="fo-item fo-carpeta" data-cursor="hand" tabindex="0">${Game.icons.folder()}<span>${esc(CARPETA)}</span></div>`;
      const c = vista.querySelector('.fo-carpeta');
      c.addEventListener('click', () => { vista.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); c.classList.add('sel'); });
      c.addEventListener('dblclick', carpeta);
      estado.textContent = '1 carpeta';
      W.setTitle('Fotos');
    }

    function carpeta() {
      modo = 'carpeta';
      ruta.textContent = `Fotos › ${CARPETA}`;
      atras.disabled = false;
      vista.className = 'fo-vista fo-miniaturas';
      vista.innerHTML = FOTOS.map((f, i) =>
        `<div class="fo-item fo-mini${i === elegida ? ' sel' : ''}" data-i="${i}" data-cursor="hand">` +
        `<div class="fo-marco"><img src="${f.src}" alt="" loading="lazy"></div><span>${esc(f.nombre)}</span></div>`).join('');
      vista.querySelectorAll('.fo-mini').forEach((el) => {
        const i = +el.dataset.i;
        el.addEventListener('click', () => {
          elegida = i;
          vista.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
          el.classList.add('sel');
          estado.textContent = `${FOTOS[i].nombre} · ${i + 1} de ${FOTOS.length}`;
        });
        el.addEventListener('dblclick', () => ver(i));
      });
      estado.textContent = `${FOTOS.length} imágenes · doble clic para abrir`;
      W.setTitle(`${CARPETA} — Fotos`);
    }

    function ver(i) {
      modo = i;
      elegida = i;
      const f = FOTOS[i];
      ruta.textContent = `Fotos › ${CARPETA} › ${f.nombre}`;
      atras.disabled = false;
      vista.className = 'fo-vista fo-visor';
      vista.innerHTML =
        `<button class="fo-btn fo-prev" data-cursor="hand" title="Anterior"${i === 0 ? ' disabled' : ''}>◀</button>` +
        `<div class="fo-grande"><img src="${f.src}" alt="${esc(f.nombre)}"></div>` +
        `<button class="fo-btn fo-next" data-cursor="hand" title="Siguiente"${i === FOTOS.length - 1 ? ' disabled' : ''}>▶</button>`;
      vista.querySelector('.fo-prev').addEventListener('click', () => { if (i > 0) ver(i - 1); });
      vista.querySelector('.fo-next').addEventListener('click', () => { if (i < FOTOS.length - 1) ver(i + 1); });
      estado.textContent = `${f.nombre} · ${i + 1} de ${FOTOS.length}`;
      W.setTitle(`${f.nombre} — Fotos`);
    }

    atras.addEventListener('click', () => { if (typeof modo === 'number') carpeta(); else if (modo === 'carpeta') raiz(); });

    // Flechas del teclado en el visor (solo con la ventana de Fotos al frente).
    const tecla = (e) => {
      if (typeof modo !== 'number' || !W.el.classList.contains('active')) return;
      if (e.key === 'ArrowLeft' && modo > 0) ver(modo - 1);
      else if (e.key === 'ArrowRight' && modo < FOTOS.length - 1) ver(modo + 1);
      else if (e.key === 'Backspace') carpeta();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', tecla);

    W.onClose = () => { window.removeEventListener('keydown', tecla); win = null; };
    raiz();
  }

  Game.fotos = { open, FOTOS, CARPETA };
  Game.os.addApp({ id: 'app-fotos', name: 'Fotos', iconHtml: Game.icons.viewer(), open });
})();
