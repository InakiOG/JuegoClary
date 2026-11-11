// Historia: INICIO (texto sobre la pantalla real oscurecida) y ACTO 1 (chat con LucIAno,
// notificación de SR, mensaje con link y mapa). Los textos están en guion.js.
//
// Para probar sin esperar la intro: añade ?sin-intro a la dirección (http://localhost:8000/?sin-intro).
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const intro = document.getElementById('intro');
  const screenEl = document.getElementById('screen');

  // ---------- INICIO ----------
  // Los navegadores no dejan sonar audio hasta el primer clic/tecla, así que la intro empieza
  // con un clic. Desde ese momento cuentan los 4 segundos del guion.
  function waitForStart() {
    return new Promise((resolve) => {
      intro.innerHTML = '<div class="intro-start">[ clic para empezar ]</div>';
      const go = () => {
        window.removeEventListener('mousedown', go, true);
        window.removeEventListener('keydown', go, true);
        Game.sound.unlock();
        resolve();
      };
      window.addEventListener('mousedown', go, true);
      window.addEventListener('keydown', go, true);
    });
  }

  async function typewriter(el, text, cps = 38) {
    for (const ch of text) {
      el.textContent += ch;
      if (ch !== ' ') Game.sound.tick();
      await wait(1000 / cps + (/[,.]/.test(ch) ? 180 : 0));
    }
  }

  async function runIntro() {
    await waitForStart();
    intro.innerHTML = '<div class="intro-text"><p></p><p></p></div>';
    const [p1, p2] = intro.querySelectorAll('p');
    await wait(4000);
    await typewriter(p1, G.intro[0]);
    await wait(2200);
    await typewriter(p2, G.intro[1]);
    await wait(3200);
    intro.classList.add('fade');            // la pantalla real se vuelve visible
    await wait(1600);
    intro.hidden = true;
  }

  // ---------- Notificación con glitch (abajo a la derecha, 5 s) ----------
  async function notify(text) {
    const n = document.createElement('div');
    n.className = 'notif glitch';
    n.innerHTML = '<div class="notif-bar"><span class="notif-dot"></span>MENSAJE</div><p></p>';
    n.querySelector('p').textContent = text;
    n.querySelector('p').dataset.text = text;
    document.getElementById('os').appendChild(n);
    Game.sound.glitch();
    await wait(5000);
    n.classList.add('out');
    await wait(400);
    n.remove();
  }

  // ---------- Chat libre ----------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,]/g, ' ');
  const turn = new Map();
  function reply(text) {
    const t = ` ${norm(text)} `;
    const rule = G.respuestas.find((r) => r.claves.some((k) => t.includes(` ${k} `) || (k.includes(' ') && t.includes(k))));
    const list = rule ? rule.textos : G.porDefecto;
    const i = turn.get(list) || 0;
    turn.set(list, i + 1);
    return list[i % list.length];
  }

  // Los mensajes del jugador se contestan en orden; si LucIAno está en mitad del guion, esperan.
  let busy = false;
  let draining = false;
  const queue = [];
  async function drain() {
    if (draining || busy) return;
    draining = true;
    while (queue.length && !busy) {
      await Game.luciano.say(reply(queue.shift()));
    }
    draining = false;
  }
  function onPlayer(text) {
    queue.push(text);
    drain();
  }
  function setBusy(v) {
    busy = v;
    if (!v) drain();
  }

  // ---------- ACTO 1 ----------
  async function act1() {
    Game.input.lock();
    await wait(900);

    // Tomás abre LucIAno (doble clic en el icono).
    const icon = Game.os.iconEl('app-luciano');
    await Game.input.moveToElement(icon, 1100);
    await wait(250);
    await Game.input.click();
    await wait(110);
    await Game.input.click();
    Game.luciano.open();
    await wait(900);

    for (const line of G.acto1) {
      if (line.quien === 'tomas') await Game.luciano.typeAsTomas(line.texto);
      else await Game.luciano.say(line.texto);
      await wait(700);
    }

    // Notificación de SR y, desde aquí, el jugador ya puede chatear.
    await wait(600);
    notify(G.notificacion);
    await wait(1200);
    Game.input.unlock();
    Game.luciano.enableInput(onPlayer);

    setBusy(true);
    const msg = await Game.luciano.say(G.procesando);
    const bar = Game.luciano.progress(msg);
    setBusy(false);
    // La barra avanza y se queda atascada: el juego "no termina de procesarse".
    for (let i = 1; i <= 20; i++) { bar.set(Math.min(0.87, i * 0.045)); await wait(320); }

    // Mensaje de SR con link: espera lo que haga falta a que el jugador haga clic.
    await wait(2500);
    await Game.luciano.srMessage(G.sr);

    // LucIAno "fusiona" el juego con la información del link.
    setBusy(true);
    screenEl.classList.add('glitching');
    Game.sound.glitch();
    await wait(900);
    screenEl.classList.remove('glitching');
    await Game.luciano.say(G.fusion[0]);
    for (let v = 0.87; v <= 1; v += 0.03) { bar.set(v); await wait(140); }
    bar.done();
    await Game.luciano.say(G.fusion[1]);
    setBusy(false);
    await wait(500);
    screenEl.classList.add('glitching');
    Game.sound.glitch();
    await wait(500);
    screenEl.classList.remove('glitching');
    Game.mapa.open();
  }

  Game.story = { notify };

  async function start() {
    const skip = new URLSearchParams(location.search).has('sin-intro');
    Game.input.lock();
    if (skip) intro.hidden = true;
    else await runIntro();
    await act1();
  }

  start();
})();
