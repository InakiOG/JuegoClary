// Reproductor de Videos: app extra del escritorio.
//  - Canal "DVD": el salvapantallas del logo que rebota (canvas). Cambia de color en cada rebote,
//    cuenta los golpes en las esquinas y lo celebra cuando el logo entra justo en una.
//  - Videos de la lista VIDEOS, a x1/x2/x3 (por defecto x3). Se reproducen desde YouTube (js/youtube.js);
//    si no hay conexión usa el archivo local de video/, y si tampoco está muestra "archivo no encontrado".
//    YouTube solo llega a x2, así que x3 solo es exacto con el archivo local.
window.Game = window.Game || {};

(function () {
  // Videos que busca el reproductor (rutas relativas a index.html). Ver video/README.txt.
  // yt: id del video en YouTube; inicio: segundo donde empieza (el de los enlaces del documento).
  const VIDEOS = [
    { titulo: 'Video del canal (x3)', yt: '1bTMsg2XN90', inicio: 446, src: 'video/video_x3.mp4' },
    { titulo: 'DVD · YouTube', yt: '5mGuCdlCcNM', inicio: 4079 },
    { titulo: 'La caída de Edgar', yt: 'b89CnP0Iq30', inicio: 0, src: 'video/caida_edgar.mp4' },
  ];

  const VELOCIDADES = [1, 2, 3];
  const COLORES = ['#ffffff', '#ff0000', '#00ff00', '#ffff00', '#00ffff', '#ff00ff', '#0000ff', '#ff8000', '#9dff3a'];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (t) => {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Glifos de los botones (pixel art 8×8).
  const glyph = (body) => `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" fill="currentColor">${body}</svg>`;
  const G = {
    play: glyph('<rect x="2" y="1" width="1" height="6"/><rect x="3" y="2" width="1" height="4"/><rect x="4" y="2" width="1" height="4"/><rect x="5" y="3" width="1" height="2"/>'),
    pause: glyph('<rect x="2" y="1" width="1.5" height="6"/><rect x="4.5" y="1" width="1.5" height="6"/>'),
    stop: glyph('<rect x="1.5" y="1.5" width="5" height="5"/>'),
    restart: glyph('<rect x="1" y="1" width="1" height="6"/><rect x="5" y="1" width="1" height="6"/><rect x="4" y="2" width="1" height="4"/><rect x="3" y="3" width="1" height="2"/>'),
    dvd: glyph('<rect x="0" y="2" width="8" height="4" rx="2"/>'),
    film: glyph('<rect x="1" y="0" width="1" height="8"/><rect x="6" y="0" width="1" height="8"/><rect x="2" y="0" width="4" height="1"/><rect x="2" y="3" width="4" height="2"/><rect x="2" y="7" width="4" height="1"/>'),
  };

  let win = null;

  function open() {
    if (win) { Game.os.focusWindow(win); return win; }
    win = Game.os.createWindow({
      key: 'videos', title: 'Reproductor de Videos', iconHtml: Game.icons.videos(), w: 40, h: 28,
      build,
    });
    return win;
  }

  function build(body, W) {
    body.classList.add('vp');
    body.innerHTML =
      '<div class="vp-menu"><span><u>A</u>rchivo</span><span><u>V</u>er</span><span><u>R</u>eproducir</span><span>A<u>y</u>uda</span></div>' +
      '<div class="vp-main">' +
      '  <div class="vp-side">' +
      '    <div class="vp-side-title">Lista</div>' +
      '    <div class="vp-list"></div>' +
      '  </div>' +
      '  <div class="vp-stage">' +
      '    <div class="vp-screen">' +
      '      <canvas class="vp-dvd"></canvas>' +
      '      <video class="vp-video" preload="metadata" playsinline hidden></video>' +
      '      <div class="vp-yt" hidden></div>' +
      '      <div class="vp-msg" hidden></div>' +
      '      <div class="vp-osd" hidden></div>' +
      '    </div>' +
      '    <div class="vp-seek" data-cursor="hand"><div class="vp-seek-fill"></div><div class="vp-seek-thumb"></div></div>' +
      '    <div class="vp-controls">' +
      `      <button class="vp-btn vp-play" data-cursor="hand" title="Reproducir / Pausa">${G.pause}</button>` +
      `      <button class="vp-btn vp-stop" data-cursor="hand" title="Detener">${G.stop}</button>` +
      `      <button class="vp-btn vp-restart" data-cursor="hand" title="Desde el principio">${G.restart}</button>` +
      '      <span class="vp-sep"></span>' +
      '      <span class="vp-label">Velocidad</span>' +
      '      <span class="vp-speeds">' +
      VELOCIDADES.map((v) => `<button class="vp-btn vp-speed" data-v="${v}" data-cursor="hand">x${v}</button>`).join('') +
      '      </span>' +
      '      <span class="vp-time">00:00 / 00:00</span>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div class="vp-status"><span class="vp-st-left"></span><span class="vp-st-right"></span></div>';

    const $ = (s) => body.querySelector(s);
    const list = $('.vp-list'), screen = $('.vp-screen'), canvas = $('.vp-dvd'), video = $('.vp-video');
    const msg = $('.vp-msg'), osd = $('.vp-osd'), seek = $('.vp-seek'), seekFill = $('.vp-seek-fill');
    const seekThumb = $('.vp-seek-thumb'), playBtn = $('.vp-play'), timeEl = $('.vp-time');
    const stLeft = $('.vp-st-left'), stRight = $('.vp-st-right');
    const g = canvas.getContext('2d');
    const ytBox = $('.vp-yt');
    let yt = null;      // reproductor de YouTube del video elegido (o null si es local)
    let selTok = 0;     // para ignorar cargas de un video que ya no está elegido
    let ytTimer = 0;
    function cerrarYt() {
      if (yt) { yt.destroy(); yt = null; }
      ytBox.hidden = true;
      clearInterval(ytTimer);
    }

    let speed = 3;
    let mode = 'dvd';      // 'dvd' | índice de VIDEOS
    let playing = true;
    let raf = 0;
    let closed = false;

    // ---------- Lista ----------
    const entries = [{ id: 'dvd', titulo: 'DVD · salvapantallas', icon: G.dvd }]
      .concat(VIDEOS.map((v, i) => ({ id: i, titulo: v.titulo, icon: G.film })));
    entries.forEach((e) => {
      const el = document.createElement('div');
      el.className = 'vp-item';
      el.dataset.cursor = 'hand';
      el.innerHTML = `<span class="vp-item-ico">${e.icon}</span><span>${esc(e.titulo)}</span>`;
      el.addEventListener('click', () => select(e.id));
      e.el = el;
      list.appendChild(el);
    });

    // ---------- DVD ----------
    const dvd = {
      x: 20, y: 14, vx: 1, vy: 1, color: COLORES[1], bounces: 0, corners: 0, party: 0, w: 0, h: 0,
      logo: null, tinted: null, confetti: [],
    };
    const LOGO_W = 92, LOGO_H = 38;

    // Logo blanco en un canvas aparte; luego se tiñe con el color del momento.
    function makeLogo() {
      const c = document.createElement('canvas');
      c.width = LOGO_W; c.height = LOGO_H;
      const l = c.getContext('2d');
      l.fillStyle = '#fff';
      l.font = 'italic bold 19px Tahoma, Verdana, sans-serif';
      l.textAlign = 'center';
      l.textBaseline = 'alphabetic';
      l.fillText('LucIAno', LOGO_W / 2, 19);
      // la "píldora" de debajo, con VIDEO calado
      l.beginPath();
      l.ellipse(LOGO_W / 2, 29, 34, 7, 0, 0, Math.PI * 2);
      l.fill();
      l.globalCompositeOperation = 'destination-out';
      l.font = 'bold 8px Tahoma, Verdana, sans-serif';
      l.fillText('V I D E O', LOGO_W / 2, 32);
      // aureola diminuta sobre la "i"
      l.globalCompositeOperation = 'source-over';
      l.strokeStyle = '#fff';
      l.lineWidth = 1;
      l.beginPath();
      l.ellipse(LOGO_W / 2 - 2, 3, 6, 1.5, 0, 0, Math.PI * 2);
      l.stroke();
      return c;
    }
    function tint() {
      const c = document.createElement('canvas');
      c.width = LOGO_W; c.height = LOGO_H;
      const l = c.getContext('2d');
      l.drawImage(dvd.logo, 0, 0);
      l.globalCompositeOperation = 'source-in';
      l.fillStyle = dvd.color;
      l.fillRect(0, 0, LOGO_W, LOGO_H);
      dvd.tinted = c;
    }
    function newColor() {
      let c;
      do c = COLORES[Math.floor(Math.random() * COLORES.length)]; while (c === dvd.color);
      dvd.color = c;
      tint();
    }
    dvd.logo = makeLogo();
    tint();

    // Resolución interna baja (unos 240 px de alto) para que se vea como un salvapantallas viejo.
    function fitCanvas() {
      const r = screen.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const h = 240, w = Math.max(LOGO_W + 4, Math.round((h * r.width) / r.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        dvd.x = Math.min(dvd.x, w - LOGO_W);
        dvd.y = Math.min(dvd.y, h - LOGO_H);
      }
      dvd.w = w; dvd.h = h;
    }
    const ro = new ResizeObserver(fitCanvas);
    ro.observe(screen);

    function corner() {
      dvd.corners++;
      dvd.party = 3;
      for (let i = 0; i < 60; i++) {
        dvd.confetti.push({
          x: dvd.x + LOGO_W / 2, y: dvd.y + LOGO_H / 2,
          vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.9) * 220,
          c: COLORES[Math.floor(Math.random() * COLORES.length)], life: 1.6 + Math.random(),
        });
      }
      showOsd('¡ESQUINA PERFECTA!', 2600);
      if (Game.sound && Game.sound.message) Game.sound.message(true);
    }

    function stepDvd(dt) {
      const v = 46 * speed;
      dvd.x += dvd.vx * v * dt;
      dvd.y += dvd.vy * v * dt;
      let hx = false, hy = false;
      const maxX = dvd.w - LOGO_W, maxY = dvd.h - LOGO_H;
      if (dvd.x <= 0) { dvd.x = 0; dvd.vx = 1; hx = true; } else if (dvd.x >= maxX) { dvd.x = maxX; dvd.vx = -1; hx = true; }
      if (dvd.y <= 0) { dvd.y = 0; dvd.vy = 1; hy = true; } else if (dvd.y >= maxY) { dvd.y = maxY; dvd.vy = -1; hy = true; }
      // Esquina: los dos bordes a la vez, o el otro borde a menos de 2 px.
      const nearX = dvd.x < 2 || dvd.x > maxX - 2, nearY = dvd.y < 2 || dvd.y > maxY - 2;
      if (hx || hy) {
        dvd.bounces++;
        newColor();
        if ((hx && hy) || (hx && nearY) || (hy && nearX)) corner();
      }
      dvd.confetti.forEach((p) => { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      dvd.confetti = dvd.confetti.filter((p) => p.life > 0 && p.y < dvd.h + 10);
      dvd.party = Math.max(0, dvd.party - dt);
    }

    function drawDvd(t) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, canvas.width, canvas.height);
      if (dvd.party > 0 && Math.floor(t / 120) % 2) {
        g.fillStyle = 'rgba(157,255,58,0.12)';
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.drawImage(dvd.tinted, Math.round(dvd.x), Math.round(dvd.y));
      dvd.confetti.forEach((p) => { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); });
      // contador en pantalla, estilo OSD de reproductor
      g.font = '8px "Lucida Console", monospace';
      g.fillStyle = '#9dff3a';
      g.textBaseline = 'top';
      g.fillText(`ESQUINAS ${dvd.corners}`, 4, 4);
    }

    let last = null;
    function frame(t) {
      if (closed) return;
      raf = requestAnimationFrame(frame);
      const dt = last == null ? 0 : Math.min(0.05, (t - last) / 1000);
      last = t;
      if (mode !== 'dvd' || W.el.hidden) return;
      if (!dvd.w) fitCanvas();
      if (!dvd.w) return;
      if (playing) stepDvd(dt);
      drawDvd(t);
      if (playing || dvd.party) updateStatus();
    }

    // ---------- Video ----------
    let osdTimer = 0;
    function showOsd(text, ms = 1200) {
      osd.textContent = text;
      osd.hidden = false;
      clearTimeout(osdTimer);
      osdTimer = setTimeout(() => { osd.hidden = true; }, ms);
    }

    function applySpeed() {
      if (yt) {
        const r = yt.setRate(speed);
        if (r !== speed) showOsd(`x${speed} → x${r} (máximo de YouTube)`, 2200);
      }
      video.defaultPlaybackRate = speed;
      video.playbackRate = speed;
      body.querySelectorAll('.vp-speed').forEach((b) => b.classList.toggle('on', +b.dataset.v === speed));
    }

    function showMissing(v) {
      msg.innerHTML =
        `<div class="vp-msg-box"><div class="vp-msg-ico">${Game.icons.videos()}</div>` +
        '<div><b>Archivo no encontrado</b><br>' +
        (v.yt ? 'No se pudo conectar con YouTube.<br>' : '') +
        (v.src ? `No se puede abrir <code>${esc(v.src)}</code>.<br>` +
          'Copia el video en la carpeta <code>video/</code> del juego y vuelve a intentarlo.' :
          'Revisa la conexión a internet y vuelve a intentarlo.') + '</div></div>';
      msg.hidden = false;
      setPlaying(false);
      stLeft.textContent = 'Error: archivo no encontrado';
    }

    video.addEventListener('error', () => { if (typeof mode === 'number' && video.getAttribute('src')) showMissing(VIDEOS[mode]); });
    video.addEventListener('loadedmetadata', () => { applySpeed(); updateStatus(); });
    video.addEventListener('timeupdate', updateStatus);
    video.addEventListener('play', () => { applySpeed(); playBtn.innerHTML = G.pause; });
    video.addEventListener('pause', () => { playBtn.innerHTML = G.play; updateStatus(); });
    video.addEventListener('ended', () => setPlaying(false));
    video.addEventListener('click', () => setPlaying(!playing));
    canvas.addEventListener('click', () => setPlaying(!playing));
    ytBox.addEventListener('click', () => setPlaying(!playing));

    function setPlaying(on) {
      playing = on;
      playBtn.innerHTML = on ? G.pause : G.play;
      if (yt) { if (on) yt.play(); else yt.pause(); }
      else if (typeof mode === 'number' && msg.hidden) {
        if (on) video.play().catch(() => {});
        else video.pause();
      }
      updateStatus();
    }

    function select(id) {
      mode = id;
      entries.forEach((e) => e.el.classList.toggle('sel', e.id === id));
      msg.hidden = true;
      osd.hidden = true;
      cerrarYt();
      const tok = ++selTok;
      if (id === 'dvd') {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.hidden = true;
        canvas.hidden = false;
        seek.classList.add('off');
        playing = true;
        playBtn.innerHTML = G.pause;
        W.setTitle('DVD — Reproductor de Videos');
      } else {
        const v = VIDEOS[id];
        canvas.hidden = true;
        seek.classList.remove('off');
        playing = true;
        playBtn.innerHTML = G.pause;
        W.setTitle(`${v.titulo} — Reproductor de Videos`);
        video.pause();
        video.removeAttribute('src');
        video.hidden = true;
        const local = () => {
          if (!v.src) { showMissing(v); return; }
          video.hidden = false;
          video.src = v.src;
          applySpeed();
          if (playing) video.play().catch(() => {}); // si falla, el evento 'error' muestra el aviso
          showOsd(`x${speed}`);
        };
        if (!v.yt) { local(); updateStatus(); return; }
        ytBox.hidden = false;
        stLeft.textContent = 'Conectando con YouTube…';
        Game.yt.player(ytBox, { id: v.yt, inicio: v.inicio || 0 }).then((h) => {
          if (tok !== selTok || closed) { h.destroy(); return; }
          yt = h;
          h.onFallo = () => { if (tok === selTok) { cerrarYt(); local(); } };
          applySpeed();
          if (!playing) h.pause();
          ytTimer = setInterval(updateStatus, 250);
          if (speed === h.setRate(speed)) showOsd(`x${speed}`);
          updateStatus();
        }).catch(() => {
          if (tok !== selTok || closed) return;
          ytBox.hidden = true;
          local();
          updateStatus();
        });
      }
      updateStatus();
    }

    function updateStatus() {
      stRight.textContent = `Velocidad x${speed}`;
      if (mode === 'dvd') {
        timeEl.textContent = 'EN VIVO';
        stLeft.textContent = `${playing ? 'Rebotando' : 'En pausa'} · rebotes ${dvd.bounces} · esquinas ${dvd.corners}`;
        seekFill.style.width = '0%';
        seekThumb.style.left = '0%';
        return;
      }
      const d = yt ? yt.duration() : video.duration, c = yt ? yt.time() : video.currentTime;
      const f = isFinite(d) && d > 0 ? c / d : 0;
      seekFill.style.width = `${f * 100}%`;
      seekThumb.style.left = `${f * 100}%`;
      timeEl.textContent = `${fmt(c)} / ${fmt(d)}`;
      if (msg.hidden) {
        const pausado = yt ? yt.paused : video.paused;
        stLeft.textContent = (pausado ? 'En pausa' : 'Reproduciendo') + (yt ? ' · YouTube' : '');
      }
    }

    // ---------- Controles ----------
    playBtn.addEventListener('click', () => setPlaying(!playing));
    $('.vp-stop').addEventListener('click', () => {
      if (mode === 'dvd') { setPlaying(false); return; }
      if (yt) { yt.seek(VIDEOS[mode].inicio || 0); setPlaying(false); return; }
      video.pause();
      if (msg.hidden) video.currentTime = 0;
      setPlaying(false);
    });
    $('.vp-restart').addEventListener('click', () => {
      if (mode === 'dvd') {
        Object.assign(dvd, { x: 20, y: 14, vx: 1, vy: 1, bounces: 0, corners: 0, confetti: [], party: 0 });
        setPlaying(true);
        return;
      }
      if (!msg.hidden) { select(mode); return; } // reintenta cargar el archivo
      if (yt) { yt.seek(VIDEOS[mode].inicio || 0); setPlaying(true); return; }
      video.currentTime = 0;
      setPlaying(true);
    });
    body.querySelectorAll('.vp-speed').forEach((b) => b.addEventListener('click', () => {
      speed = +b.dataset.v;
      applySpeed();
      showOsd(`x${speed}`);
      updateStatus();
    }));

    // barra de avance: clic y arrastre
    seek.addEventListener('mousedown', (e) => {
      const dur = yt ? yt.duration() : video.duration;
      if (mode === 'dvd' || !isFinite(dur) || !dur) return;
      e.preventDefault();
      e.stopPropagation();
      const go = (ev) => {
        const r = seek.getBoundingClientRect();
        const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        if (yt) yt.seek(f * dur); else video.currentTime = f * dur;
        updateStatus();
      };
      go(e);
      const up = () => { window.removeEventListener('mousemove', go); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', go);
      window.addEventListener('mouseup', up);
    });

    W.dvd = dvd; // para depurar desde la consola

    W.onClose = () => {
      closed = true;
      cancelAnimationFrame(raf);
      clearTimeout(osdTimer);
      ro.disconnect();
      selTok++;
      cerrarYt();
      video.pause();
      video.removeAttribute('src');
      video.load();
      win = null;
    };

    applySpeed();
    select('dvd');
    raf = requestAnimationFrame(frame);
  }

  Game.videos = { open, VIDEOS };
  Game.os.addApp({ id: 'app-videos', name: 'Videos', iconHtml: Game.icons.videos(), open });
})();
