// Sonidos sintetizados con Web Audio (sin archivos): teclas, ratón, intro, chat e interferencias.
// El contexto de audio se crea en la primera pulsación (los navegadores exigen un gesto del usuario).
window.Game = window.Game || {};

(function () {
  let ctx = null;
  let master = null;
  let noise = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const jitter = (v, amt) => v * (1 - amt + Math.random() * amt * 2);

  // Un clic = ráfaga corta de ruido filtrado (+ un "golpe" grave opcional).
  function click({ freq, q = 1.5, dur, gain, thump = 0, thumpDur = 0.05 }) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;

    const src = c.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = jitter(1, 0.1);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = jitter(freq, 0.08);
    bp.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(jitter(gain, 0.15), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);

    if (thump) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(jitter(thump, 0.05), t);
      o.frequency.exponentialRampToValueAtTime(thump * 0.55, t + thumpDur);
      const og = c.createGain();
      og.gain.setValueAtTime(gain * 0.6, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + thumpDur);
      o.connect(og).connect(master);
      o.start(t);
      o.stop(t + thumpDur + 0.02);
    }
  }

  const BIG_KEYS = /^(Space|Enter|Backspace|ShiftLeft|ShiftRight|CapsLock|Tab|IntlBackslash)$/;

  Game.sound = {
    key(down, code) {
      const big = BIG_KEYS.test(code);
      if (down) {
        click(big
          ? { freq: 1500, q: 1.2, dur: 0.05, gain: 0.7, thump: 110, thumpDur: 0.07 }
          : { freq: 2600, q: 1.4, dur: 0.035, gain: 0.6, thump: 170, thumpDur: 0.045 });
      } else {
        click({ freq: big ? 2200 : 3300, q: 2, dur: 0.022, gain: 0.22 });
      }
    },
    mouse(down) {
      click(down
        ? { freq: 4200, q: 5, dur: 0.018, gain: 0.55, thump: 900, thumpDur: 0.012 }
        : { freq: 3600, q: 5, dur: 0.014, gain: 0.3 });
    },
    // Llamar desde un clic/tecla del jugador para que el navegador deje sonar el audio.
    unlock() { ensure(); },
    // Tic suave de máquina de escribir (texto de la intro).
    tick() {
      click({ freq: 5200, q: 6, dur: 0.012, gain: 0.12 });
    },
    // Aviso de mensaje en el chat: dos notas cortas (más agudas si escribe LucIAno).
    message(fromAI) {
      const base = fromAI ? 880 : 660;
      tone(base, 0, 0.07, 0.12, 'sine');
      tone(base * 1.5, 0.07, 0.09, 0.1, 'sine');
    },
    // Interferencia: pitidos cuadrados a saltos con ráfagas de ruido (mensajes de SR).
    glitch() {
      for (let i = 0; i < 7; i++) {
        tone(200 + Math.random() * 1800, i * 0.045, 0.035, 0.07, 'square');
      }
      click({ freq: 1800, q: 0.7, dur: 0.12, gain: 0.35 });
      setTimeout(() => click({ freq: 900, q: 0.7, dur: 0.08, gain: 0.25 }), 180);
    },
  };

  function tone(freq, delay, dur, gain, type) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
})();
