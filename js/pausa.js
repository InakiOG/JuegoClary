// Pausa global. Se carga antes que todo lo demás porque envuelve el tiempo del navegador:
//   - performance.now() y los timestamps de requestAnimationFrame no avanzan mientras está en pausa,
//     así los minijuegos (que miden el tiempo con ellos) se congelan sin tocar su código;
//   - los setTimeout que vencen durante la pausa esperan a que se reanude;
//   - los setInterval no disparan durante la pausa;
//   - la música, la voz en off y los sonidos (Web Audio) se detienen.
// API: Game.pausa.toggle(), .set(bool), .activa, .on(fn) (fn(activa) en cada cambio).
window.Game = window.Game || {};

(function () {
  const realNow = performance.now.bind(performance);
  const realTimeout = window.setTimeout.bind(window);
  const realInterval = window.setInterval.bind(window);
  const realRAF = window.requestAnimationFrame.bind(window);

  let paused = false;
  let pausedAt = 0;
  let offset = 0;                 // tiempo total en pausa
  const heldTimeouts = [];        // callbacks que vencieron en pausa
  let heldFrames = [];            // rAF pedidos en pausa
  const listeners = [];

  performance.now = () => (paused ? pausedAt : realNow()) - offset;

  window.requestAnimationFrame = function (cb) {
    if (paused) { heldFrames.push(cb); return -1; }
    return realRAF((t) => {
      if (paused) { heldFrames.push(cb); return; }
      cb(t - offset);
    });
  };

  window.setTimeout = function (fn, ms, ...args) {
    if (typeof fn !== 'function') return realTimeout(fn, ms, ...args);
    return realTimeout(() => {
      if (paused) heldTimeouts.push(() => fn(...args));
      else fn(...args);
    }, ms);
  };

  window.setInterval = function (fn, ms, ...args) {
    if (typeof fn !== 'function') return realInterval(fn, ms, ...args);
    return realInterval(() => { if (!paused) fn(...args); }, ms);
  };

  // Medios: se pausan los que estaban sonando y se reanudan al volver.
  let pausedMedia = [];

  function set(on) {
    if (on === paused) return;
    if (on) {
      pausedAt = realNow();
      paused = true;
      pausedMedia = [...document.querySelectorAll('audio, video')].filter((m) => !m.paused);
      (Game._sueltos || []).forEach((m) => { if (!m.paused) pausedMedia.push(m); });
      pausedMedia.forEach((m) => m.pause());
      if (window.speechSynthesis) window.speechSynthesis.pause();
      if (Game.sound && Game.sound.suspend) Game.sound.suspend(true);
    } else {
      offset += realNow() - pausedAt;
      paused = false;
      pausedMedia.forEach((m) => m.play().catch(() => {}));
      pausedMedia = [];
      if (window.speechSynthesis) window.speechSynthesis.resume();
      if (Game.sound && Game.sound.suspend) Game.sound.suspend(false);
      const t = heldTimeouts.splice(0);
      t.forEach((fn) => realTimeout(fn, 0));
      const f = heldFrames;
      heldFrames = [];
      f.forEach((cb) => window.requestAnimationFrame(cb));
    }
    listeners.forEach((fn) => fn(paused));
  }

  Game.pausa = {
    get activa() { return paused; },
    set,
    toggle() { set(!paused); },
    on(fn) { listeners.push(fn); },
    // Para la interfaz de pausa: temporizadores que corren aunque el juego esté en pausa.
    realTimeout,
  };
})();
