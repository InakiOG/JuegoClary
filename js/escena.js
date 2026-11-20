// Recursos de escena que usa la historia:
//   Game.jugador   nombre de usuario que el jugador escribe al entrar
//   Game.score     puntaje acumulado de los minijuegos
//   Game.musica    las tres canciones en bucle, una tras otra (con fundido); baja durante la voz en off
//   Game.voz       voz en off (síntesis de voz del navegador) con subtítulos
//   Game.atencion  barra de atención = vida del jugador en los minijuegos (solo visible en ellos)
//   Game.escena    pensamientos de Tomás (nube), botón "siguiente", instrucciones, zoom, sacudidas,
//                  y la secuencia de perder (GAME OVER → "Perdiste toda tu atención" → score)
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const os = document.getElementById('os');
  const screenEl = document.getElementById('screen');
  const cursorEl = document.getElementById('cursor');
  const monitor = document.getElementById('monitor');
  Game._sueltos = Game._sueltos || [];   // audios fuera del DOM (para la pausa)

  // ---------- Jugador y puntaje ----------
  Game.jugador = { nombre: '' };
  let score = 0;
  Game.score = {
    get value() { return score; },
    add(n) { score = Math.max(0, score + Math.round(n || 0)); },
  };

  // ---------- Música: las tres canciones en bucle, una tras otra ----------
  const VOL = 0.45;
  const LISTA = ['acto1', 'acto2', 'acto3'];
  let current = null;   // { key, src, audio }
  let duck = 1;
  let silencio = 1;     // 0 mientras suena la música de arcade de GAME OVER
  function fade(audio, to, ms) {
    const from = audio.volume;
    const t0 = performance.now();
    return new Promise((done) => {
      (function step() {
        const t = Math.min(1, (performance.now() - t0) / ms);
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
        if (t < 1) setTimeout(step, 40); else done();
      })();
    });
  }
  const target = () => VOL * duck * silencio;
  function startTrack(key, fadeMs = 1800) {
    const src = G.musica[key];
    const prev = current;
    const audio = new Audio(src);
    audio.volume = 0;
    Game._sueltos.push(audio);
    current = { key, src, audio };
    // Al terminar, sigue la siguiente canción de la lista.
    audio.addEventListener('ended', () => {
      if (current && current.audio === audio) {
        const i = LISTA.indexOf(key);
        startTrack(LISTA[(i + 1) % LISTA.length], 400);
      }
    });
    audio.play().then(() => fade(audio, target(), fadeMs)).catch(() => {});
    if (prev) fade(prev.audio, 0, 1500).then(() => { prev.audio.pause(); drop(prev.audio); });
  }
  const drop = (a) => { const i = Game._sueltos.indexOf(a); if (i >= 0) Game._sueltos.splice(i, 1); };
  Game.musica = {
    // Pasa a la canción del acto (si ya suena esa misma, no hace nada); luego sigue la lista.
    play(key) {
      const src = G.musica[key];
      if (!src || (current && current.src === src)) return;
      startTrack(LISTA.includes(key) ? key : LISTA.find((k) => G.musica[k] === src) || key);
    },
    stop(ms = 1500) {
      const prev = current;
      current = null;
      if (prev) fade(prev.audio, 0, ms).then(() => { prev.audio.pause(); drop(prev.audio); });
    },
    duck(on) {
      duck = on ? 0.3 : 1;
      if (current) fade(current.audio, target(), 500);
    },
    // Silencia la música del juego (p. ej. mientras suena la de arcade).
    mute(on) {
      silencio = on ? 0 : 1;
      if (current) fade(current.audio, target(), 400);
    },
  };

  // ---------- Voz en off ----------
  // Estilos:
  //   'narrador'  voz robótica con glitches (cambios bruscos de tono por fragmento) — la de la intro y el mapa
  //   'loquendo'  voz sintética clásica en español
  //   'profunda'  muy grave y lenta (LucIAno)
  const subs = document.createElement('div');
  subs.id = 'subtitulos';
  subs.hidden = true;
  document.body.appendChild(subs);

  let voices = [];
  const synth = window.speechSynthesis;
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  // Los navegadores cargan la lista de voces tarde: se espera (máx. 2 s) antes de la primera locución,
  // para no hablar con la voz por defecto del sistema (a menudo en inglés).
  const vocesListas = !synth ? Promise.resolve() : new Promise((resolve) => {
    loadVoices();
    if (voices.length) { resolve(); return; }
    const t = setTimeout(resolve, 2000);
    if (synth.addEventListener) synth.addEventListener('voiceschanged', () => { loadVoices(); if (voices.length) { clearTimeout(t); resolve(); } });
  });
  if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);

  // Solo voces en español. Orden: México, Latinoamérica/EE. UU., cualquier otra en español; dentro de cada
  // grupo, primero las de mejor calidad ("Natural", "Online", Google). Sin voz en español no se habla:
  // se deja solo el subtítulo (nunca se lee el texto con una voz en otro idioma).
  const esEspanol = (v) => /^es([-_]|$)/i.test(v.lang);
  const region = (v) => (/MX/i.test(v.lang) ? 0 : /419|US/i.test(v.lang) ? 1 : 2);
  const calidad = (v) => (/natural|online|google|neural/i.test(v.name) ? 0 : 1);
  function pickVoice(estilo) {
    const es = voices.filter(esEspanol).sort((a, b) => region(a) - region(b) || calidad(a) - calidad(b));
    if (estilo === 'loquendo' || estilo === 'profunda') {
      const lq = es.find((v) => /jorge|carlos|raul|raúl|pablo|diego|enrique|alvaro|álvaro|gerardo/i.test(v.name));
      if (lq) return lq;
    }
    return es[0] || null;
  }

  // Frases (algunos navegadores cortan las locuciones largas).
  function chunks(text) {
    return text.match(/[^.!?…]+[.!?…]*["”»]?\s*/g) || [text];
  }
  // Para la voz con glitches: cada frase se parte también por comas.
  function fragmentos(text) {
    return chunks(text).flatMap((c) => c.match(/[^,;:]+[,;:]?\s*/g) || [c]);
  }

  function speakChunk(text, { pitch, rate, estilo }) {
    return new Promise((resolve) => {
      // Sin voz disponible, el subtítulo se queda el tiempo de lectura; con voz, el tope es generoso.
      if (synth && !voices.length) loadVoices();
      const v = synth ? pickVoice(estilo) : null;
      const conVoz = !!v;
      const fallback = setTimeout(resolve, conVoz ? 5000 + text.length * 160 : (1200 + text.length * 70) / VELOCIDAD);
      if (!conVoz) return;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.lang = v.lang;
      u.pitch = pitch;
      u.rate = rate * VELOCIDAD;
      u.onend = u.onerror = () => { clearTimeout(fallback); resolve(); };
      synth.speak(u);
    });
  }

  // Todas las voces hablan un 10 % más rápido que su velocidad base.
  const VELOCIDAD = 1.1;

  const ESTILOS = {
    narrador: { pitch: 0.75, rate: 0.92 },
    loquendo: { pitch: 0.85, rate: 1.0 },
    profunda: { pitch: 0.05, rate: 0.72 },
  };

  Game.voz = {
    // Lee el texto en voz alta con subtítulos. titulo: lo que se muestra encima del subtítulo.
    // subtitulos: false cuando el texto ya está en pantalla (p. ej. escrito a máquina), para no duplicarlo.
    // clic: al terminar, el subtítulo se queda hasta que el jugador haga clic (false = sigue solo).
    async say(text, { titulo = 'VOZ EN OFF', estilo = 'narrador', pitch, rate, profunda = false, subtitulos = true, clic = true } = {}) {
      if (profunda) estilo = 'profunda';
      await vocesListas;
      const base = ESTILOS[estilo] || ESTILOS.narrador;
      Game.musica.duck(true);
      subs.className = `voz-${estilo}`;
      subs.hidden = !subtitulos;
      if (synth) synth.cancel();
      for (const frase of chunks(text)) {
        subs.innerHTML = `<small>${esc(titulo)}</small>`;
        subs.appendChild(document.createTextNode(frase.trim()));
        if (estilo === 'narrador') {
          // Voz robótica que se "traba": cada fragmento con un tono distinto y un chasquido entre medio.
          for (const f of fragmentos(frase)) {
            const p = pitch != null ? pitch : base.pitch + (Math.random() - 0.5) * 0.7;
            const r = rate != null ? rate : base.rate + (Math.random() - 0.5) * 0.18;
            subs.classList.remove('glitch-sub'); void subs.offsetWidth; subs.classList.add('glitch-sub');
            await speakChunk(f, { pitch: p, rate: r, estilo });
            if (Math.random() < 0.35) Game.sound.glitch();
          }
        } else {
          await speakChunk(frase, { pitch: pitch != null ? pitch : base.pitch, rate: rate != null ? rate : base.rate, estilo });
        }
        await wait(450); // un respiro para terminar de leer el subtítulo
      }
      Game.musica.duck(false);
      if (clic) await siguiente({ donde: subtitulos ? 'subs' : 'pantalla' });
      subs.hidden = true;
      Game.musica.duck(false);
    },
    stop() { if (synth) synth.cancel(); subs.hidden = true; Game.musica.duck(false); },
  };

  // ---------- Barra de atención (= vida en los minijuegos) ----------
  const at = document.createElement('div');
  at.id = 'atencion';
  at.hidden = true;
  at.innerHTML = `<span>${G.atencion.titulo}</span><div class="at-bar"><div class="at-fill"></div></div><span class="at-val"></span>`;
  document.body.appendChild(at);
  let atVal = G.atencion.inicial;
  let vaciaWaiters = [];
  let flashTimer = 0;
  let enJuego = false;                 // true mientras hay un minijuego (la barra se queda visible)
  function renderAt() {
    const v = Math.round(atVal);
    at.querySelector('.at-fill').style.width = `${v}%`;
    at.querySelector('.at-val').textContent = `${v}%`;
    at.classList.toggle('baja', v <= 30);
    alarma();
  }
  // Con poca atención suena la muerte de Roblox en repetición.
  let alarmaTimer = 0;
  function alarma() {
    const on = enJuego && !at.hidden && atVal > 0 && atVal <= 30;
    if (on && !alarmaTimer) {
      Game.sound.oof();
      alarmaTimer = setInterval(() => Game.sound.oof(), 950);
    } else if (!on && alarmaTimer) {
      clearInterval(alarmaTimer);
      alarmaTimer = 0;
    }
  }
  function sacudir() { at.classList.remove('drop'); void at.offsetWidth; at.classList.add('drop'); }
  function setVal(v) {
    const prev = atVal;
    atVal = Math.max(0, Math.min(100, v));
    renderAt();
    if (atVal <= 0 && prev > 0) {
      const ws = vaciaWaiters;
      vaciaWaiters = [];
      ws.forEach((r) => r());
    }
  }
  renderAt();
  Game.atencion = {
    show() { at.hidden = false; renderAt(); },
    hide() { at.hidden = true; renderAt(); },
    get value() { return atVal; },
    // Modo minijuego: la barra se queda visible y llena.
    juego(on) {
      enJuego = on;
      clearTimeout(flashTimer);
      if (on) { setVal(100); at.hidden = false; } else { at.hidden = true; }
      renderAt();
    },
    // Baja la atención hasta ese valor (nunca la sube). Fuera de los minijuegos la barra
    // aparece un momento para que se vea la bajada y se vuelve a esconder.
    set(v) {
      if (v >= atVal) return;
      setVal(v);
      sacudir();
      Game.sound.glitch();
      if (!enJuego) {
        at.hidden = false;
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => { if (!enJuego) at.hidden = true; }, 3500);
      }
    },
    // Daño y curación en los minijuegos (puntos de 0 a 100).
    danar(n) {
      if (!(n > 0) || atVal <= 0) return;
      setVal(atVal - n);
      if (n >= 3) sacudir();
    },
    curar(n) { if (n > 0 && atVal > 0) setVal(atVal + n); },
    llenar() { setVal(100); },
    // Vuelve a poner un valor sin efectos (al salir de un minijuego jugado desde la app Minijuegos).
    restaurar(v) { setVal(v); },
    // Promesa que se cumple cuando la atención llega a 0.
    vacia() { return new Promise((r) => { if (atVal <= 0) r(); else vaciaWaiters.push(r); }); },
  };

  // ---------- Botón "siguiente" ----------
  // Flechita que parpadea; se cumple al pulsarla (o con Enter / Espacio). Queda por encima
  // del bloqueo, así funciona también cuando la historia controla el ratón.
  // Espera a que el jugador haga clic en cualquier parte de la pantalla (o Enter / Espacio): el clic es
  // el botón "siguiente". El ▶ parpadeante solo indica que se puede continuar.
  // donde: posición del ▶ — 'chat', 'nube' (pensamiento), 'subs' (subtítulos) o 'pantalla'.
  function siguiente({ texto = '▶', donde = 'chat' } = {}) {
    return new Promise((resolve) => {
      const capa = document.createElement('div');
      capa.className = 'clic-seguir';
      const b = document.createElement('div');
      b.className = `siguiente siguiente-${donde}`;
      b.innerHTML = `<span>${esc(texto)}</span>`;
      capa.appendChild(b);
      document.body.appendChild(capa);
      const fin = () => {
        window.removeEventListener('keydown', key, true);
        capa.remove();
        Game.sound.mouse(true);
        resolve();
      };
      const key = (e) => {
        if (Game.pausa && Game.pausa.activa) return;
        if (e.target && e.target.closest && e.target.closest('input, textarea') && !Game.input.locked) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fin(); }
      };
      capa.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
      capa.addEventListener('click', (e) => { e.stopPropagation(); if (!(Game.pausa && Game.pausa.activa)) fin(); });
      window.addEventListener('keydown', key, true);
    });
  }

  // ---------- Pensamientos de Tomás ----------
  // Nube de pensamiento pixel art abajo de la pantalla. Se queda hasta que el jugador pulse ▶,
  // o, si se pasa esperar (una promesa), hasta que esa acción ocurra (sin botón).
  let thoughtEl = null;
  async function pensamiento(text, { esperar = null } = {}) {
    if (thoughtEl) thoughtEl.remove();
    const el = document.createElement('div');
    el.className = 'pensamiento';
    el.innerHTML = '<i class="pz1"></i><i class="pz2"></i><div class="pz-nube"><small>TOMÁS PIENSA…</small><p></p></div>';
    el.querySelector('p').textContent = text;
    screenEl.insertBefore(el, cursorEl);
    thoughtEl = el;
    Game.sound.message(false);
    await wait(30);
    el.classList.add('in');
    if (esperar) {
      await esperar;
    } else {
      await wait(700);
      if (!el.isConnected) return;
      await siguiente({ donde: 'nube' });
    }
    el.classList.remove('in');
    await wait(350);
    el.remove();
    if (thoughtEl === el) thoughtEl = null;
  }

  // Instrucción morada fija arriba ("Vuelve al mapa"). Devuelve una función para quitarla.
  function instruccion(text) {
    const el = document.createElement('div');
    el.className = 'instruccion glitch-in';
    el.textContent = text;
    os.appendChild(el);
    Game.sound.glitch();
    return () => el.remove();
  }

  // "Cámara": acerca la pantalla del ordenador a un elemento y vuelve.
  async function zoomTo(el, { escala = 2.6, ms = 1600, mantener = 1400 } = {}) {
    if (!el) return;
    const o = os.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cx = ((r.left + r.width / 2 - o.left) / o.width) * 100;
    const cy = ((r.top + r.height / 2 - o.top) / o.height) * 100;
    os.style.transformOrigin = `${cx}% ${cy}%`;
    os.classList.add('zooming');
    os.style.transform = `scale(${escala})`;
    await wait(ms + mantener);
    os.style.transform = '';
    await wait(ms);
    os.classList.remove('zooming');
    os.style.transformOrigin = '';
  }

  async function glitch(ms = 700) {
    screenEl.classList.add('glitching');
    Game.sound.glitch();
    await wait(ms);
    screenEl.classList.remove('glitching');
  }

  function shake(on) { monitor.classList.toggle('shake', on); }

  // ---------- Perder: GAME OVER → "Perdiste toda tu atención" → score ----------
  const go = document.createElement('div');
  go.id = 'gameover';
  go.hidden = true;
  document.body.appendChild(go);

  // Computadora en llamas con calavera, en pixel art (paleta goth ácida, poco saturada).
  // Calavera en la computadora en llamas, animada: las llamas se mueven y la calaca se ríe
  // (la mandíbula sube y baja, la cabeza rebota y salen "JA JA"). Se dibuja mientras esté en pantalla.
  function dibujoPerdiste() {
    const W = 64, H = 52, S = 6;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    c.className = 'go-dibujo';
    const g = c.getContext('2d');
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x * S, y * S, S, S); };
    const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * S, y * S, w * S, h * S); };
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const base = Array.from({ length: W }, (_, x) => 14 + Math.floor(rnd() * 16) + (x % 7 === 0 ? 6 : 0));
    const fase = Array.from({ length: W }, () => rnd() * Math.PI * 2);
    // calavera: cráneo (filas 0-8) y mandíbula (filas 9-10) por separado para que la boca se abra
    const CRANEO = [
      '....XXXXXX....',
      '..XXXXXXXXXX..',
      '.XXXXXXXXXXXX.',
      '.XXXXXXXXXXXX.',
      'XXX..XXXX..XXX',
      'XXX..XXXX..XXX',
      'XXXXXXXXXXXXXX',
      '.XXXXX..XXXXX.',
      '..XXXXXXXXXX..',
    ];
    // ojos entrecerrados de risa (^ ^)
    const OJOS_RISA = ['XX.XXXXXXX.XXX', 'X.X.XXXXX.X.XX'];
    const MANDIBULA = ['...X.X.X.X.X..', '...XXXXXXXXX..'];
    const HUESO = '#d9e6d0';

    function frame(t) {
      // fondo: franjas diagonales que se deslizan
      const off = Math.floor(t / 140);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = Math.floor((x + y + off) / 4) % 3;
        px(x, y, ['#3a1030', '#6b5a1e', '#2a0f1f'][k]);
      }
      // llamas que suben y bailan
      for (let x = 0; x < W; x++) {
        const h = Math.max(4, Math.round(base[x] + Math.sin(t * 0.009 + fase[x]) * 4 + Math.sin(t * 0.021 + x * 1.7) * 2.5));
        for (let y = H - 1; y > H - 1 - h; y--) {
          const k = (H - 1 - y) / h + Math.sin(t * 0.03 + x + y) * 0.06;
          px(x, y, k < 0.35 ? '#c9d64a' : k < 0.7 ? '#b8732a' : '#7a2340');
        }
        // chispas
        if (Math.sin(t * 0.017 + fase[x] * 3) > 0.985) px(x, H - 2 - h - ((t / 40 + x) % 6 | 0), '#ffe98a');
      }
      // monitor
      rect(14, 6, 36, 28, '#0d0d12');
      rect(15, 7, 34, 26, '#8d8f86');
      rect(17, 9, 30, 20, '#101814');
      rect(28, 34, 8, 3, '#8d8f86');
      rect(20, 37, 24, 3, '#6d6f68');
      rect(12, 41, 40, 6, '#8d8f86');
      for (let x = 13; x < 51; x += 2) for (let y = 42; y < 46; y += 2) px(x, y, '#3b3c38');
      // risa: carcajadas en ráfagas; la boca se abre y cierra, la cabeza rebota
      const ciclo = t % 2600;
      const riendo = ciclo < 1900;
      const golpe = riendo && Math.floor(t / 130) % 2 === 0;
      const dy = golpe ? -1 : 0;
      const boca = riendo ? (golpe ? 2 : 1) : 0;
      CRANEO.forEach((row, j) => {
        const fila = riendo && (j === 4 || j === 5) ? OJOS_RISA[j - 4] : row;
        [...fila].forEach((ch, i) => { if (ch === 'X') px(25 + i, 11 + j + dy, HUESO); });
      });
      MANDIBULA.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') px(25 + i, 20 + j + dy + boca, HUESO); }));
      // huesos cruzados
      for (let i = 0; i < 12; i++) { px(20 + i * 2, 23 + Math.floor(i / 2), HUESO); px(42 - i * 2, 23 + Math.floor(i / 2), HUESO); }
      // "JA JA"
      if (riendo) {
        g.font = `bold ${S * 4}px monospace`;
        g.fillStyle = '#ff4ad8';
        const a = Math.floor(t / 260) % 2;
        g.fillText('JA', (a ? 17 : 41) * S, (a ? 12 : 10) * S);
        g.fillText('JA', (a ? 42 : 18) * S, (a ? 27 : 29) * S);
      }
    }
    (function loop(t) {
      if (!c.isConnected && c.dataset.started) return;
      c.dataset.started = '1';
      frame(t || 0);
      requestAnimationFrame(loop);
    })();
    return c;
  }

  function botonGO(texto) {
    const b = document.createElement('button');
    b.className = 'go-btn';
    b.textContent = texto;
    return b;
  }

  // Devuelve true si el jugador quiere volver a intentar, false si quiere terminar.
  // oofs: cuántas "muertes de Roblox" suenan a la vez al perder.
  async function perder({ oofs = 1, leyenda = null } = {}) {
    const P = G.perder;
    Game.voz.stop();
    Game.musica.mute(true);
    Game.atencion.juego(false);
    for (let i = 0; i < oofs; i++) setTimeout(() => Game.sound.oof(0.8 + Math.random() * 0.5), i * 60 + Math.random() * 120);
    go.hidden = false;
    go.className = '';

    if (leyenda) {
      go.innerHTML = `<div class="go-leyenda">${esc(leyenda)}</div>`;
      await wait(2200);
    }
    // 1. GAME OVER con música de arcade.
    Game.sound.arcade(true);
    go.innerHTML = `<div class="go-titulo">${esc(P.gameOver)}</div>`;
    await wait(3600);
    // 2. "Perdiste toda tu atención" con voz de loquendo.
    go.innerHTML = '<div class="go-perdiste"></div>';
    const box = go.querySelector('.go-perdiste');
    box.appendChild(dibujoPerdiste());
    const t = document.createElement('p');
    t.textContent = P.perdiste;
    box.appendChild(t);
    Game.sound.arcade(false);
    await Promise.all([Game.voz.say(P.perdiste, { titulo: 'GAME OVER', estilo: 'loquendo' }), wait(2500)]);
    // 3. Score con el nombre de usuario.
    Game.sound.arcade(true);
    go.innerHTML =
      '<div class="go-score">' +
      `<h2>${esc(P.scoreTitulo)}</h2>` +
      `<dl><dt>${esc(P.usuario)}</dt><dd>${esc(Game.jugador.nombre || '???')}</dd>` +
      `<dt>${esc(P.score)}</dt><dd>${String(Game.score.value).padStart(6, '0')}</dd></dl>` +
      '<div class="go-btns"></div></div>';
    const btns = go.querySelector('.go-btns');
    const otra = botonGO(P.reintentar);
    const fin = botonGO(P.finalizar);
    btns.append(otra, fin);
    const r = await new Promise((res) => {
      otra.addEventListener('click', () => res(true));
      fin.addEventListener('click', () => res(false));
    });
    Game.sound.arcade(false);
    Game.musica.mute(false);
    go.hidden = true;
    go.innerHTML = '';
    return r;
  }

  // ---------- Dificultad ----------
  // Pestaña con tres opciones antes de empezar cada minijuego. Devuelve 'facil' | 'intermedio' | 'dificil'.
  // ?dificultad=… en la URL la salta (para pruebas).
  const DIFICULTADES = [['facil', 'Fácil'], ['intermedio', 'Intermedio'], ['dificil', 'Difícil']];
  function elegirDificultad(titulo = 'Minijuego') {
    const fija = new URLSearchParams(location.search).get('dificultad');
    if (DIFICULTADES.some(([k]) => k === fija)) return Promise.resolve(fija);
    return new Promise((resolve) => {
      const capa = document.createElement('div');
      capa.className = 'dif-capa';
      capa.innerHTML =
        `<div class="dif-ventana"><div class="dif-barra">${esc(titulo)}</div><div class="dif-cuerpo">` +
        '<p>Elige la dificultad:</p><div class="dif-botones">' +
        DIFICULTADES.map(([k, t]) => `<button class="g-btn dif-${k}" data-k="${k}">${t}</button>`).join('') +
        '</div></div></div>';
      document.body.appendChild(capa);
      capa.addEventListener('mousedown', (e) => e.stopPropagation());
      capa.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (Game.pausa && Game.pausa.activa) return;
        Game.sound.mouse(true);
        capa.remove();
        resolve(b.dataset.k);
      }));
    });
  }

  Game.escena = { pensamiento, siguiente, instruccion, zoomTo, glitch, shake, wait, perder, elegirDificultad };
})();
