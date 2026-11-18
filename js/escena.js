// Recursos de escena que usa la historia:
//   Game.musica   canción en bucle por acto (con fundido) y bajada de volumen durante la voz en off
//   Game.voz      voz en off (síntesis de voz del navegador, español) con subtítulos en la pantalla real
//   Game.atencion barra de porcentaje de atención arriba de la pantalla real
//   Game.escena   pensamientos de Tomás, instrucciones moradas, zoom de "cámara", sacudidas
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const os = document.getElementById('os');
  const screenEl = document.getElementById('screen');
  const monitor = document.getElementById('monitor');

  // ---------- Música ----------
  const VOL = 0.45;
  let current = null;   // { key, audio }
  let duck = 1;
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
  Game.musica = {
    // Empieza la canción del acto (si ya suena esa misma, no hace nada).
    play(key) {
      const src = G.musica[key];
      if (!src || (current && current.src === src)) return;
      const prev = current;
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0;
      current = { key, src, audio };
      audio.play().then(() => fade(audio, VOL * duck, 1800)).catch(() => {});
      if (prev) fade(prev.audio, 0, 1500).then(() => prev.audio.pause());
    },
    stop(ms = 1500) {
      const prev = current;
      current = null;
      if (prev) fade(prev.audio, 0, ms).then(() => prev.audio.pause());
    },
    duck(on) {
      duck = on ? 0.3 : 1;
      if (current) fade(current.audio, VOL * duck, 500);
    },
  };

  // ---------- Voz en off ----------
  const subs = document.createElement('div');
  subs.id = 'subtitulos';
  subs.hidden = true;
  document.body.appendChild(subs);

  let voices = [];
  const synth = window.speechSynthesis;
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) { loadVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', loadVoices); }
  function pickVoice() {
    const es = voices.filter((v) => /^es/i.test(v.lang));
    return es.find((v) => /MX|419|US/i.test(v.lang)) || es[0] || null;
  }

  // Los textos largos se dicen por frases (algunos navegadores cortan las locuciones largas).
  function chunks(text) {
    return text.match(/[^.!?…]+[.!?…]*["”»]?\s*/g) || [text];
  }

  function speakChunk(text, { pitch, rate }) {
    return new Promise((resolve) => {
      // Sin voz disponible, el subtítulo se queda el tiempo de lectura; con voz, el tope es generoso.
      const fallback = setTimeout(resolve, synth ? 4000 + text.length * 150 : 900 + text.length * 60);
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'es-MX';
      u.pitch = pitch;
      u.rate = rate;
      u.onend = u.onerror = () => { clearTimeout(fallback); resolve(); };
      synth.speak(u);
    });
  }

  Game.voz = {
    // Lee el texto en voz alta con subtítulos. titulo: lo que se muestra encima del subtítulo.
    async say(text, { titulo = 'VOZ EN OFF', pitch = 1, rate = 1.02, profunda = false } = {}) {
      Game.musica.duck(true);
      subs.classList.toggle('profunda', profunda);
      subs.hidden = false;
      if (synth) synth.cancel();
      for (const part of chunks(text)) {
        subs.innerHTML = `<small>${titulo}</small>`;
        subs.appendChild(document.createTextNode(part.trim()));
        await speakChunk(part, { pitch, rate });
      }
      subs.hidden = true;
      Game.musica.duck(false);
    },
    stop() { if (synth) synth.cancel(); subs.hidden = true; Game.musica.duck(false); },
  };

  // ---------- Barra de atención ----------
  const at = document.createElement('div');
  at.id = 'atencion';
  at.hidden = true;
  at.innerHTML = `<span>${G.atencion.titulo}</span><div class="at-bar"><div class="at-fill"></div></div><span class="at-val"></span>`;
  document.body.appendChild(at);
  let atVal = G.atencion.inicial;
  function renderAt() {
    at.querySelector('.at-fill').style.width = `${atVal}%`;
    at.querySelector('.at-val').textContent = `${atVal}%`;
  }
  renderAt();
  Game.atencion = {
    show() { at.hidden = false; },
    hide() { at.hidden = true; },
    get value() { return atVal; },
    // Baja la atención hasta ese valor (nunca la sube).
    set(v) {
      if (v >= atVal) return;
      atVal = v;
      renderAt();
      at.classList.remove('drop'); void at.offsetWidth; at.classList.add('drop');
      Game.sound.glitch();
    },
  };

  // ---------- Pensamientos de Tomás ----------
  // Pestaña que baja por arriba de la pantalla del ordenador. Devuelve una promesa que se cumple
  // cuando la pestaña se va. Si repetir es una función, la pestaña vuelve a salir mientras esa función
  // devuelva true (p. ej. "si el jugador no interactúa en 5 segundos, el mensaje vuelve a aparecer").
  let thoughtEl = null;
  async function pensamiento(text, { duracion = 4200 + text.length * 45 } = {}) {
    if (thoughtEl) thoughtEl.remove();
    const el = document.createElement('div');
    el.className = 'pensamiento';
    el.textContent = `“${text}”`;
    os.appendChild(el);
    thoughtEl = el;
    Game.sound.message(false);
    await wait(30);
    el.classList.add('in');
    await wait(duracion);
    el.classList.remove('in');
    await wait(500);
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

  Game.escena = { pensamiento, instruccion, zoomTo, glitch, shake, wait };
})();
