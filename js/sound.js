// Sonidos sintetizados con Web Audio (sin archivos): clic de teclas y botones del ratón.
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
  };
})();
