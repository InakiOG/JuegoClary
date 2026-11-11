// Sistema operativo del ordenador del juego: fondo, iconos del escritorio, ventanas,
// barra de tareas, menú de inicio, explorador de archivos, bloc de notas y visor de fotos.
// Todo se mide en "em" del contenedor #os, que escala con el tamaño de la pantalla.
(function () {
  const screen = document.getElementById('screen');
  const os = document.getElementById('os');
  const fs = Game.files;
  const icons = Game.icons;

  const LOC_NAMES = {
    pc: 'Este equipo', desktop: 'Escritorio', documents: 'Documentos',
    pictures: 'Imágenes', trash: 'Papelera',
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iconFor = (item) => (item.type === 'image' ? icons.image(item.src) : icons.text());
  const locIcon = (loc) => (loc === 'pc' ? icons.pc() : loc === 'trash' ? icons.trash(fs.in('trash').length > 0) : icons.folder());

  const UI = {
    min: '<svg viewBox="0 0 10 10"><path d="M1 5.5h8" stroke="currentColor"/></svg>',
    max: '<svg viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor"/></svg>',
    close: '<svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor"/></svg>',
    back: '<svg viewBox="0 0 10 10"><path d="M6.5 1.5L3 5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    up: '<svg viewBox="0 0 10 10"><path d="M1.5 6.5L5 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  };

  // Fondo: oscuro y con grano, anillos tenues y líneas de barrido, como una señal lejana.
  const WALLPAPER =
    '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">' +
    '<defs><radialGradient id="wp-bg" cx=".62" cy=".42" r=".8">' +
    '<stop offset="0" stop-color="#0c2420"/><stop offset=".5" stop-color="#061311"/>' +
    '<stop offset="1" stop-color="#020606"/></radialGradient>' +
    '<filter id="wp-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4"/>' +
    '<feColorMatrix values="0 0 0 0 .37  0 0 0 0 .88  0 0 0 0 .78  0 0 0 -1.5 .95"/></filter>' +
    '<pattern id="wp-lines" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0.5H8" stroke="#5fe0c8" stroke-opacity=".05"/></pattern></defs>' +
    '<rect width="1600" height="900" fill="url(#wp-bg)"/>' +
    '<rect width="1600" height="900" fill="url(#wp-lines)"/>' +
    '<g fill="none" stroke="#5fe0c8">' +
    '<circle cx="1000" cy="380" r="140" stroke-opacity=".10" stroke-width="2"/>' +
    '<circle cx="1000" cy="380" r="230" stroke-opacity=".07" stroke-dasharray="3 9"/>' +
    '<circle cx="1000" cy="380" r="340" stroke-opacity=".05"/>' +
    '<circle cx="1000" cy="380" r="480" stroke-opacity=".035" stroke-dasharray="40 18"/>' +
    '<path d="M1000 0V900M0 380H1600" stroke-opacity=".04"/>' +
    '<path d="M1000 330 l14 50 -14 50 -14 -50z" stroke-opacity=".14"/>' +
    '</g>' +
    '<rect width="1600" height="900" filter="url(#wp-grain)" opacity=".12"/>' +
    '<text x="1000" y="800" text-anchor="middle" font-family="Lucida Console, Consolas, monospace" font-size="18" ' +
    'fill="#5fe0c8" fill-opacity=".22" letter-spacing="4">NODO_03 :: ENLACE ESTABLE</text>' +
    '</svg>';

  os.innerHTML =
    `<div id="wallpaper">${WALLPAPER}</div>` +
    '<div id="desktop" data-drop-loc="desktop"></div>' +
    '<div id="windows"></div>' +
    '<div id="start-menu" hidden></div>' +
    '<div id="taskbar">' +
    '  <div id="start-btn" title="Inicio"><span class="logo"></span>Inicio</div>' +
    '  <div id="task-items"></div>' +
    '  <div id="tray"><span id="clock"></span></div>' +
    '</div>';

  const desktopEl = os.querySelector('#desktop');
  const windowsEl = os.querySelector('#windows');
  const startMenu = os.querySelector('#start-menu');
  const startBtn = os.querySelector('#start-btn');
  const taskItems = os.querySelector('#task-items');
  const clock = os.querySelector('#clock');

  // ---------- Escala ----------
  let em = 16;
  function fit() {
    em = Math.max(8, screen.clientHeight / 42);
    os.style.fontSize = `${em}px`;
    layoutDesktop();
    wins.forEach(applyWin);
  }
  const deskSize = () => ({ w: desktopEl.clientWidth / em, h: desktopEl.clientHeight / em });

  // ---------- Notificar cambios ----------
  const views = new Set(); // funciones que repintan algo cuando cambian los archivos
  function changed() {
    renderDesktop();
    views.forEach((fn) => fn());
  }

  // ---------- Selección ----------
  let selection = null; // { file, el }
  function select(el, file) {
    os.querySelectorAll('.icon.selected').forEach((e) => e.classList.remove('selected'));
    selection = el ? { el, file } : null;
    if (el) el.classList.add('selected');
  }

  function makeIcon({ id, name, iconHtml, dropLoc, file }) {
    const el = document.createElement('div');
    el.className = 'icon';
    el.dataset.id = id;
    if (dropLoc) el.dataset.dropLoc = dropLoc;
    el.innerHTML = `<div class="icon-img">${iconHtml}</div><div class="icon-label">${esc(name)}</div>`;
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      select(el, file || null);
      if (file) beginDrag(e, el, file);
      else if (el.closest('#desktop')) beginDrag(e, el, null);
    });
    return el;
  }

  // ---------- Escritorio ----------
  const SLOT_W = 5.6, SLOT_H = 5.4, PAD = 0.5;
  const positions = {}; // id -> {x, y} (en em)

  function desktopEntries() {
    return [
      { id: 'sys-pc', name: 'Este equipo', iconHtml: icons.pc(), open: () => openExplorer('pc') },
      {
        id: 'sys-trash', name: 'Papelera', iconHtml: icons.trash(fs.in('trash').length > 0),
        dropLoc: 'trash', open: () => openExplorer('trash'),
      },
      ...fs.in('desktop').map((f) => ({ id: f.id, name: f.name, iconHtml: iconFor(f), file: f, open: () => openFile(f) })),
    ];
  }

  function rowsPerCol() { return Math.max(1, Math.floor((deskSize().h - PAD) / SLOT_H)); }
  function slotPos(i) {
    const rows = rowsPerCol();
    return { x: PAD + Math.floor(i / rows) * SLOT_W, y: PAD + (i % rows) * SLOT_H };
  }
  const occupied = (p, exceptId) =>
    Object.entries(positions).some(([id, q]) => id !== exceptId && Math.abs(q.x - p.x) < 0.1 && Math.abs(q.y - p.y) < 0.1);
  function freeSlot(exceptId) {
    for (let i = 0; i < 200; i++) {
      const p = slotPos(i);
      if (!occupied(p, exceptId)) return p;
    }
    return slotPos(0);
  }
  // Casilla libre más cercana a (x, y).
  function nearestSlot(x, y, exceptId) {
    const d = deskSize();
    let best = null;
    for (let c = 0; PAD + c * SLOT_W + SLOT_W <= d.w + 0.01 || c === 0; c++) {
      for (let r = 0; r < rowsPerCol(); r++) {
        const p = { x: PAD + c * SLOT_W, y: PAD + r * SLOT_H };
        if (occupied(p, exceptId)) continue;
        const dist = Math.hypot(p.x - x, p.y - y);
        if (!best || dist < best.dist) best = { ...p, dist };
      }
    }
    return best ? { x: best.x, y: best.y } : freeSlot(exceptId);
  }

  function renderDesktop() {
    const entries = desktopEntries();
    const ids = new Set(entries.map((e) => e.id));
    Object.keys(positions).forEach((id) => { if (!ids.has(id)) delete positions[id]; });
    const selId = selection && selection.el.closest('#desktop') ? selection.el.dataset.id : null;
    desktopEl.innerHTML = '';
    entries.forEach((entry) => {
      if (!positions[entry.id]) positions[entry.id] = freeSlot(entry.id);
      const el = makeIcon(entry);
      el.addEventListener('dblclick', entry.open);
      el._open = entry.open;
      desktopEl.appendChild(el);
      if (entry.id === selId) select(el, entry.file || null);
    });
    layoutDesktop();
  }

  function layoutDesktop() {
    const d = deskSize();
    desktopEl.querySelectorAll('.icon').forEach((el) => {
      const p = positions[el.dataset.id];
      if (!p) return;
      // Si la pantalla encoge, los iconos no se salen del escritorio.
      const x = Math.min(p.x, Math.max(PAD, d.w - SLOT_W));
      const y = Math.min(p.y, Math.max(PAD, d.h - SLOT_H));
      el.style.left = `${x}em`;
      el.style.top = `${y}em`;
    });
  }

  desktopEl.addEventListener('mousedown', (e) => { if (e.target === desktopEl) select(null); });

  // ---------- Arrastrar archivos ----------
  // Se puede soltar en el escritorio, en una carpeta del explorador o en la papelera.
  function beginDrag(e, el, file) {
    const start = { x: e.clientX, y: e.clientY };
    const r = el.getBoundingClientRect();
    const grab = { x: e.clientX - r.left, y: e.clientY - r.top };
    let ghost = null;

    function move(ev) {
      if (!ghost) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        ghost = el.cloneNode(true);
        ghost.classList.add('ghost', 'selected');
        ghost.style.width = `${r.width}px`;
        os.appendChild(ghost);
        el.classList.add('dragging');
      }
      const o = os.getBoundingClientRect();
      ghost.style.left = `${ev.clientX - o.left - grab.x}px`;
      ghost.style.top = `${ev.clientY - o.top - grab.y}px`;
      os.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'));
      const t = dropTarget(ev, el);
      if (t && t.dataset.dropLoc !== 'desktop' && (!file || t.dataset.dropLoc !== file.loc)) t.classList.add('drop-hover');
    }

    function up(ev) {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (!ghost) return;
      ghost.remove();
      el.classList.remove('dragging');
      os.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'));
      const t = dropTarget(ev, el);
      if (!t) return;
      const loc = t.dataset.dropLoc;
      const id = el.dataset.id;
      if (loc === 'desktop') {
        const d = desktopEl.getBoundingClientRect();
        const target = nearestSlot((ev.clientX - grab.x - d.left) / em, (ev.clientY - grab.y - d.top) / em, id);
        if (file) fs.move(file, 'desktop');
        positions[id] = target;
        changed();
      } else if (file && fs.move(file, loc)) {
        changed();
      }
    }

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function dropTarget(ev, el) {
    const hit = document.elementFromPoint(ev.clientX, ev.clientY);
    const t = hit && hit.closest('[data-drop-loc]');
    if (!t || t === el || el.contains(t)) return null;
    return t;
  }

  // ---------- Ventanas ----------
  const wins = new Map(); // key -> win
  let zTop = 10;
  let cascade = 0;

  function createWindow({ key, title, iconHtml, w, h, build }) {
    if (wins.has(key)) {
      const W = wins.get(key);
      W.min = false;
      applyWin(W);
      focus(W);
      return W;
    }
    const el = document.createElement('div');
    el.className = 'win';
    el.innerHTML =
      '<div class="titlebar">' +
      `  <span class="ticon">${iconHtml}</span><span class="ttext"></span>` +
      `  <div class="tbtns"><div class="tb tb-min">${UI.min}</div><div class="tb tb-max">${UI.max}</div>` +
      `  <div class="tb tb-close">${UI.close}</div></div>` +
      '</div><div class="wbody"></div><div class="resize"></div>';

    const d = deskSize();
    w = Math.min(w, d.w - 1);
    h = Math.min(h, d.h - 1);
    const off = (cascade++ % 6) * 1.4;
    const W = {
      key, el, w, h, min: false, max: false,
      x: Math.max(0.3, (d.w - w) / 2 - 3 + off),
      y: Math.max(0.3, (d.h - h) / 2 - 2 + off),
      body: el.querySelector('.wbody'),
      onClose: null,
    };
    W.setTitle = (t) => {
      el.querySelector('.ttext').textContent = t;
      W.task.querySelector('.task-label').textContent = t;
    };
    W.setIcon = (html) => {
      el.querySelector('.ticon').innerHTML = html;
      W.task.querySelector('.task-icon').innerHTML = html;
    };

    W.task = document.createElement('div');
    W.task.className = 'task';
    W.task.innerHTML = `<span class="task-icon">${iconHtml}</span><span class="task-label"></span>`;
    W.task.addEventListener('mousedown', (e) => e.stopPropagation());
    W.task.addEventListener('click', () => {
      if (!W.min && W.el.classList.contains('active')) minimize(W);
      else { W.min = false; applyWin(W); focus(W); }
    });
    taskItems.appendChild(W.task);

    el.addEventListener('mousedown', () => focus(W), true);
    el.querySelector('.tb-min').addEventListener('click', () => minimize(W));
    el.querySelector('.tb-max').addEventListener('click', () => toggleMax(W));
    el.querySelector('.tb-close').addEventListener('click', () => closeWin(W));
    el.querySelector('.tbtns').addEventListener('mousedown', (e) => e.stopPropagation());
    const bar = el.querySelector('.titlebar');
    bar.addEventListener('dblclick', () => toggleMax(W));
    bar.addEventListener('mousedown', (e) => dragWin(e, W, 'move'));
    el.querySelector('.resize').addEventListener('mousedown', (e) => dragWin(e, W, 'resize'));

    wins.set(key, W);
    windowsEl.appendChild(el);
    W.setTitle(title);
    build(W.body, W);
    applyWin(W);
    focus(W);
    return W;
  }

  function applyWin(W) {
    W.el.hidden = W.min;
    W.el.classList.toggle('maximized', W.max);
    if (W.max) {
      Object.assign(W.el.style, { left: '0', top: '0', width: '100%', height: '100%' });
      return;
    }
    const d = deskSize();
    W.x = Math.min(Math.max(W.x, 2 - W.w), d.w - 3);
    W.y = Math.min(Math.max(W.y, 0), d.h - 2);
    Object.assign(W.el.style, { left: `${W.x}em`, top: `${W.y}em`, width: `${W.w}em`, height: `${W.h}em` });
  }

  function focus(W) {
    W.el.style.zIndex = ++zTop;
    wins.forEach((o) => {
      const on = o === W;
      o.el.classList.toggle('active', on);
      o.task.classList.toggle('active', on && !o.min);
    });
  }

  function focusTopmost() {
    const visible = [...wins.values()].filter((o) => !o.min);
    if (!visible.length) { wins.forEach((o) => { o.el.classList.remove('active'); o.task.classList.remove('active'); }); return; }
    focus(visible.reduce((a, b) => (+a.el.style.zIndex > +b.el.style.zIndex ? a : b)));
  }

  function minimize(W) {
    W.min = true;
    applyWin(W);
    W.task.classList.remove('active');
    W.el.classList.remove('active');
    focusTopmost();
  }

  function toggleMax(W) {
    W.max = !W.max;
    applyWin(W);
  }

  function closeWin(W) {
    if (W.onClose) W.onClose();
    W.el.remove();
    W.task.remove();
    wins.delete(W.key);
    focusTopmost();
  }

  function dragWin(e, W, mode) {
    if (e.button !== 0 || W.max) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, wx: W.x, wy: W.y, ww: W.w, wh: W.h };
    function move(ev) {
      const dx = (ev.clientX - start.x) / em, dy = (ev.clientY - start.y) / em;
      if (mode === 'move') {
        W.x = start.wx + dx;
        W.y = start.wy + dy;
      } else {
        const d = deskSize();
        W.w = Math.min(Math.max(16, start.ww + dx), d.w - W.x);
        W.h = Math.min(Math.max(9, start.wh + dy), d.h - W.y);
      }
      applyWin(W);
    }
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  // ---------- Abrir archivos ----------
  function openFile(file) {
    if (file.type === 'text') openNotes(file);
    else if (file.type === 'image') openViewer(file);
  }

  // Bloc de notas: el texto editado se guarda en el archivo (en memoria).
  function openNotes(file) {
    createWindow({
      key: `notes:${file.id}`, title: `${file.name} — Notas`, iconHtml: icons.notes(), w: 30, h: 20,
      build(body, W) {
        body.classList.add('notes');
        body.innerHTML =
          '<div class="menubar"><span>Archivo</span><span>Editar</span><span>Ver</span></div>' +
          '<textarea spellcheck="false"></textarea>' +
          '<div class="statusbar"><span class="pos"></span><span>UTF-8</span></div>';
        const ta = body.querySelector('textarea');
        const pos = body.querySelector('.pos');
        ta.value = file.content;
        const updatePos = () => {
          const before = ta.value.slice(0, ta.selectionStart).split('\n');
          pos.textContent = `Lín ${before.length}, col ${before[before.length - 1].length + 1}`;
        };
        ta.addEventListener('input', () => { file.content = ta.value; updatePos(); });
        ['keyup', 'click', 'select'].forEach((ev) => ta.addEventListener(ev, updatePos));
        updatePos();
        setTimeout(() => ta.focus(), 0);
      },
    });
  }

  // Visor de imágenes con zoom (botones o rueda del ratón).
  function openViewer(file) {
    createWindow({
      key: `viewer:${file.id}`, title: `${file.name} — Fotos`, iconHtml: icons.viewer(), w: 36, h: 26,
      build(body) {
        body.classList.add('viewer');
        body.innerHTML =
          `<div class="stage"><img src="${file.src}" alt="${esc(file.name)}" draggable="false"></div>` +
          '<div class="viewer-bar"><div class="btn zoom-out">−</div><span class="zoom-val">100%</span>' +
          '<div class="btn zoom-in">+</div><div class="btn zoom-fit">Ajustar</div></div>';
        const img = body.querySelector('img');
        const val = body.querySelector('.zoom-val');
        let zoom = 1;
        const set = (z) => {
          zoom = Math.min(4, Math.max(0.25, z));
          img.style.transform = `scale(${zoom})`;
          val.textContent = `${Math.round(zoom * 100)}%`;
        };
        body.querySelector('.zoom-in').addEventListener('click', () => set(zoom * 1.25));
        body.querySelector('.zoom-out').addEventListener('click', () => set(zoom / 1.25));
        body.querySelector('.zoom-fit').addEventListener('click', () => set(1));
        body.querySelector('.stage').addEventListener('wheel', (e) => {
          e.preventDefault();
          set(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
        }, { passive: false });
      },
    });
  }

  // ---------- Explorador de archivos ----------
  let explorerCount = 0;
  function openExplorer(loc) {
    // Si ya hay un explorador abierto en esa carpeta, se trae al frente.
    for (const W of wins.values()) {
      if (W.explorer && W.explorer.loc === loc) {
        W.min = false;
        applyWin(W);
        focus(W);
        return;
      }
    }
    createWindow({
      key: `explorer:${++explorerCount}`, title: LOC_NAMES[loc], iconHtml: locIcon(loc), w: 40, h: 25,
      build(body, W) {
        body.classList.add('explorer');
        body.innerHTML =
          '<div class="ex-toolbar">' +
          `  <div class="btn ex-back" title="Atrás">${UI.back}</div>` +
          `  <div class="btn ex-up" title="Subir">${UI.up}</div>` +
          '  <div class="ex-path"></div>' +
          '  <div class="ex-actions"></div>' +
          '</div>' +
          '<div class="ex-main"><div class="ex-side"></div><div class="ex-view"></div></div>' +
          '<div class="statusbar"><span class="ex-count"></span></div>';
        const st = { loc, history: [] };
        W.explorer = st;
        const side = body.querySelector('.ex-side');
        const view = body.querySelector('.ex-view');
        const path = body.querySelector('.ex-path');
        const actions = body.querySelector('.ex-actions');
        const count = body.querySelector('.ex-count');

        function go(next) {
          if (next === st.loc) return;
          st.history.push(st.loc);
          st.loc = next;
          render();
        }
        body.querySelector('.ex-back').addEventListener('click', () => {
          if (st.history.length) { st.loc = st.history.pop(); render(); }
        });
        body.querySelector('.ex-up').addEventListener('click', () => go('pc'));

        function render() {
          const l = st.loc;
          W.setTitle(LOC_NAMES[l]);
          W.setIcon(locIcon(l));
          path.innerHTML = l === 'pc'
            ? `<span class="crumb">${LOC_NAMES.pc}</span>`
            : `<span class="crumb" data-go="pc">${LOC_NAMES.pc}</span><span class="sep">›</span><span class="crumb">${LOC_NAMES[l]}</span>`;
          path.querySelectorAll('[data-go]').forEach((c) => c.addEventListener('click', () => go(c.dataset.go)));

          side.innerHTML = '';
          ['pc', 'desktop', 'documents', 'pictures', 'trash'].forEach((k) => {
            const it = document.createElement('div');
            it.className = 'side-item' + (k === l ? ' current' : '');
            if (k !== 'pc') it.dataset.dropLoc = k;
            it.innerHTML = `<span class="side-icon">${locIcon(k)}</span>${LOC_NAMES[k]}`;
            it.addEventListener('click', () => go(k));
            side.appendChild(it);
          });

          view.innerHTML = '';
          if (l === 'pc') delete view.dataset.dropLoc;
          else view.dataset.dropLoc = l;
          view.onmousedown = (e) => { if (e.target === view) select(null); };

          let n = 0;
          if (l === 'pc') {
            ['desktop', 'documents', 'pictures'].forEach((k) => {
              const el = makeIcon({ id: `folder-${k}`, name: LOC_NAMES[k], iconHtml: icons.folder(), dropLoc: k });
              el.addEventListener('dblclick', () => go(k));
              el._open = () => go(k);
              view.appendChild(el);
              n++;
            });
          } else {
            fs.in(l).forEach((f) => {
              const el = makeIcon({ id: f.id, name: f.name, iconHtml: iconFor(f), file: f });
              el.addEventListener('dblclick', () => openFile(f));
              el._open = () => openFile(f);
              view.appendChild(el);
              n++;
            });
            if (!n) view.innerHTML = `<div class="empty">${l === 'trash' ? 'La papelera está vacía.' : 'Esta carpeta está vacía.'}</div>`;
          }
          count.textContent = `${n} elemento${n === 1 ? '' : 's'}`;

          actions.innerHTML = '';
          if (l === 'trash') {
            const restore = document.createElement('div');
            restore.className = 'btn text';
            restore.textContent = 'Restaurar';
            restore.addEventListener('click', () => {
              const f = selection && selection.file;
              if (f && f.loc === 'trash') { fs.restore(f); select(null); changed(); }
            });
            const empty = document.createElement('div');
            empty.className = 'btn text danger';
            empty.textContent = 'Vaciar papelera';
            empty.addEventListener('click', () => {
              fs.in('trash').forEach((f) => fs.remove(f));
              select(null);
              changed();
            });
            actions.append(restore, empty);
          }
        }

        views.add(render);
        W.onClose = () => views.delete(render);
        render();
      },
    });
  }

  // ---------- Menú de inicio ----------
  const START_ITEMS = [
    { label: 'Explorador de archivos', icon: icons.folder(), run: () => openExplorer('pc') },
    { label: 'Documentos', icon: icons.folder(), run: () => openExplorer('documents') },
    { label: 'Imágenes', icon: icons.folder(), run: () => openExplorer('pictures') },
    { label: 'Papelera', icon: () => icons.trash(fs.in('trash').length > 0), run: () => openExplorer('trash') },
  ];
  function renderStart() {
    startMenu.innerHTML =
      '<div class="start-user"><span class="avatar"></span>Usuario</div>' +
      '<div class="start-list"></div>';
    const list = startMenu.querySelector('.start-list');
    START_ITEMS.forEach((it) => {
      const el = document.createElement('div');
      el.className = 'start-item';
      el.innerHTML = `<span class="start-icon">${typeof it.icon === 'function' ? it.icon() : it.icon}</span>${it.label}`;
      el.addEventListener('click', () => { startMenu.hidden = true; startBtn.classList.remove('open'); it.run(); });
      list.appendChild(el);
    });
  }
  startBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  startBtn.addEventListener('click', () => {
    startMenu.hidden = !startMenu.hidden;
    startBtn.classList.toggle('open', !startMenu.hidden);
    if (!startMenu.hidden) renderStart();
  });
  startMenu.addEventListener('mousedown', (e) => e.stopPropagation());
  os.addEventListener('mousedown', () => {
    startMenu.hidden = true;
    startBtn.classList.remove('open');
  });

  // ---------- Reloj ----------
  function tick() {
    const now = new Date();
    clock.innerHTML =
      `<span>${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>` +
      `<span>${now.toLocaleDateString('es-ES')}</span>`;
  }

  // ---------- Teclado: Supr y Enter sobre el archivo seleccionado ----------
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('textarea, input')) return;
    if (!selection) return;
    if (e.code === 'Enter' && selection.el._open) {
      selection.el._open();
    } else if (e.code === 'Delete' && selection.file) {
      const f = selection.file;
      if (f.loc === 'trash') fs.remove(f); // en la papelera, Supr borra para siempre
      else fs.move(f, 'trash');
      select(null);
      changed();
    }
  });

  // ---------- Inicio ----------
  new ResizeObserver(fit).observe(screen);
  fit();
  renderDesktop();
  tick();
  setInterval(tick, 10000);

  Game.os = { openExplorer, openFile, changed };
})();
