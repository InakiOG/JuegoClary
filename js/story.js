// Historia completa: INICIO, ACTO 1 (LucIAno, SR y el mapa), ACTO 2 (sopa de letras, contraseña EJIDO,
// la termoeléctrica), ACTO 3 (pesca, Plan México, contraseña APAGÓN, LucIAno borra el mapa, maquila,
// chat con SR y LucIAno revelado), ACTO 4 (pelea final, código PTAL) y créditos.
// Los textos están en guion.js.
//
// Para probar:
//   ?sin-intro          salta la intro
//   ?desde=acto2        empieza en el acto 2 (también: acto3, borrado, maquila, pelea, codigo)
//   ?desde=nada         escritorio libre, sin historia
window.Game = window.Game || {};

(function () {
  const G = Game.guion;
  const { pensamiento, siguiente, instruccion, zoomTo, glitch, shake, perder } = Game.escena;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = (pred, every = 200) => new Promise((r) => {
    (function check() { if (pred()) r(); else setTimeout(check, every); })();
  });
  const intro = document.getElementById('intro');
  const screenEl = document.getElementById('screen');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,]/g, ' ');

  // ---------- INICIO ----------
  // Pantalla de inicio: el jugador escribe su nombre de usuario (lo que quiera). Ese clic/tecla
  // también desbloquea el audio del navegador.
  function sello() {
    // Sello pixel art: un ojo dentro de un triángulo con aureola (maquinaria divina).
    const M = [
      '......XXXXXX......', '....XX......XX....', '...X....YY....X...', '..X....YYYY....X..',
      '.......YYYYYY.....', '......YY.MM.YY....', '.....YY.MMMM.YY...', '....YY..MOOM..YY..',
      '...YY...MMMM...YY.', '..YY.....MM.....YY', '.YYYYYYYYYYYYYYYYY', '..................',
    ];
    const C = { X: '#e3d34a', Y: '#2b0638', M: '#8c1f74', O: '#9dff3a' };
    let r = '';
    M.forEach((row, y) => [...row].forEach((ch, x) => { if (C[ch]) r += `<rect x="${x}" y="${y + 3}" width="1" height="1" fill="${C[ch]}"/>`; }));
    return `<svg class="login-sello" viewBox="0 0 18 18" shape-rendering="crispEdges">${r}</svg>`;
  }
  function waitForStart() {
    const L = G.login;
    return new Promise((resolve) => {
      intro.hidden = false;
      intro.classList.remove('fade');
      intro.innerHTML =
        `<form class="login" autocomplete="off"><div class="login-bar">${L.titulo}</div>` +
        `<div class="login-body">${sello()}<div class="login-form"><p>${L.texto}</p>` +
        `<label>${L.usuario}<input type="text" maxlength="18" spellcheck="false"></label>` +
        `<button class="g-btn" type="submit">${L.boton}</button></div></div></form>`;
      const form = intro.querySelector('form');
      const input = form.querySelector('input');
      setTimeout(() => input.focus(), 50);
      intro.addEventListener('mousedown', () => Game.sound.unlock());
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        Game.sound.unlock();
        Game.jugador.nombre = input.value.trim() || 'Anónimo';
        Game.sound.message(true);
        resolve();
      });
    });
  }

  async function typewriter(el, text, cps = 57) {
    for (const ch of text) {
      el.textContent += ch;
      if (ch !== ' ') Game.sound.tick();
      await wait(1000 / cps + (/[,.]/.test(ch) ? 120 : 0));
    }
  }

  // La primera leyenda se escribe y se lee en voz en off; queda en pantalla al menos 10 s.
  async function runIntro() {
    intro.innerHTML = '<div class="intro-text"><p></p><p></p></div>';
    const [p1, p2] = intro.querySelectorAll('p');
    await wait(2500);
    const voz = Game.voz.say(G.intro.join('. '), { titulo: 'AÑO 2040', subtitulos: false, clic: false });
    await typewriter(p1, G.intro[0], 40);
    await wait(1200);
    await typewriter(p2, G.intro[1], 40);
    await Promise.all([voz, wait(10000)]);
    await siguiente({ donde: 'pantalla' });  // clic para continuar
    intro.classList.add('fade');            // la pantalla de la computadora se vuelve visible
    await wait(1600);
    intro.hidden = true;
  }

  // ---------- Pausa ----------
  // Botón arriba a la derecha (o Esc). Congela minijuegos, temporizadores, música y voz.
  const pausaBtn = document.createElement('button');
  pausaBtn.id = 'pausa-btn';
  pausaBtn.title = 'Pausa (Esc)';
  pausaBtn.textContent = '❚❚';
  pausaBtn.hidden = true;
  document.body.appendChild(pausaBtn);
  const pausaEl = document.createElement('div');
  pausaEl.id = 'pausa';
  pausaEl.hidden = true;
  pausaEl.innerHTML =
    `<div class="login"><div class="login-bar">${G.pausa.titulo}</div><div class="login-body" style="flex-direction:column">` +
    `<h1>${G.pausa.titulo}</h1><p>${G.pausa.ayuda}</p><button class="g-btn">${G.pausa.continuar}</button></div></div>`;
  document.body.appendChild(pausaEl);
  pausaBtn.addEventListener('mousedown', (e) => e.stopPropagation(), true);
  pausaBtn.addEventListener('click', () => Game.pausa.toggle());
  pausaEl.querySelector('button').addEventListener('click', () => Game.pausa.set(false));
  pausaEl.addEventListener('mousedown', (e) => e.stopPropagation());
  Game.pausa.on((on) => { pausaEl.hidden = !on; pausaBtn.textContent = on ? '▶' : '❚❚'; });
  window.addEventListener('keydown', (e) => {
    if (pausaBtn.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); Game.pausa.toggle(); return; }
    if (Game.pausa.activa) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (Game.pausa.activa) e.stopImmediatePropagation(); }, true);
  function mostrarPausa() { pausaBtn.hidden = false; }

  // ---------- Notificación con glitch (abajo a la derecha) ----------
  // duracion en ms; suave = menos glitches; onClick = qué pasa al pulsarla (el cursor se vuelve mano).
  // Devuelve una promesa que se cumple cuando la notificación desaparece (por tiempo o por clic).
  function notify(text, { duracion = 7000, suave = false, onClick = null, largo = false } = {}) {
    const n = document.createElement('div');
    n.className = 'notif glitch' + (suave ? ' soft' : '');
    if (largo) n.style.width = '24em';
    n.innerHTML = '<div class="notif-bar"><span class="notif-dot"></span>MENSAJE</div><p></p>';
    n.querySelector('p').textContent = text;
    n.querySelector('p').dataset.text = text;
    document.getElementById('os').appendChild(n);
    Game.sound.glitch();
    let gone = false;
    const leave = async () => {
      if (gone) return;
      gone = true;
      n.classList.add('out');
      await wait(400);
      n.remove();
    };
    const p = new Promise((resolve) => {
      if (onClick) {
        n.dataset.cursor = 'hand';
        n.addEventListener('click', () => { if (Game.input.locked) return; onClick(); leave().then(resolve); });
      }
      setTimeout(() => leave().then(resolve), duracion);
    });
    p.el = n;
    return p;
  }

  // ---------- Chat libre con LucIAno ----------
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
  // nextReply: respuesta del guion para el próximo mensaje del jugador (en vez de las palabras clave).
  let busy = false;
  let draining = false;
  let nextReply = null;
  const queue = [];
  async function drain() {
    if (draining || busy) return;
    draining = true;
    while (queue.length && !busy) {
      const text = queue.shift();
      if (nextReply) {
        const r = nextReply;
        nextReply = null;
        await Game.luciano.say(r.text);
        r.resolve();
      } else {
        await Game.luciano.say(reply(text));
      }
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
  // Espera al próximo mensaje del jugador y contesta con el texto del guion.
  function scriptedReply(text) {
    return new Promise((resolve) => { nextReply = { text, resolve }; drain(); });
  }

  // Conversación del guion. Cuando la IA (o SR) termina y le toca escribir a Tomás, aparece ▶
  // y Tomás no empieza hasta que el jugador lo pulse.
  async function dialogo(lineas, chat = Game.luciano) {
    for (let i = 0; i < lineas.length; i++) {
      const line = lineas[i];
      if (line.quien === 'tomas') await chat.typeAsTomas(line.texto);
      else await chat.say(line.texto);
      const sig = lineas[i + 1];
      if (line.quien !== 'tomas' && sig && sig.quien === 'tomas') { await wait(500); await siguiente(); }
      else await wait(900);
    }
  }

  // Lectura de una ficha del mapa: el mapa ocupa toda la pantalla y la cámara se acerca a la ficha
  // mientras se lee en voz en off. parte: para la Ribera (1 o 2); false = no desbloquear nada.
  async function leerFicha(sec, texto, titulo, parte) {
    const W = Game.mapa.open();
    const osEl = document.getElementById('os');
    const eraMax = W.max;
    maximize(W);
    W.el.classList.add('mp-lectura');
    osEl.classList.add('lectura');
    await wait(80);
    await Game.mapa.focus(sec, 1500, 0.03);
    if (parte !== false) Game.mapa.unlock(sec, parte);
    await wait(1300);
    await Game.voz.say(texto, { titulo });
    await wait(600);
    osEl.classList.remove('lectura');
    W.el.classList.remove('mp-lectura');
    if (!eraMax) maximize.restore(W);
    await wait(80);
    await Game.mapa.focus(sec, 600, 0.1);
  }

  // ---------- Control ----------
  // Tomás (la historia) toma las manos / se las devuelve al jugador.
  function pilot() { Game.input.lock(); setBusy(true); }
  function free({ chat = true } = {}) { Game.input.unlock(); if (chat) setBusy(false); }

  async function clickEl(el, ms = 900) {
    if (!el) return;
    await Game.input.moveToElement(el, ms);
    await wait(200);
    await Game.input.click();
  }
  async function openIcon(id) {
    const icon = Game.os.iconEl(id);
    await Game.input.moveToElement(icon, 1000);
    await wait(250);
    await Game.input.click();
    await wait(110);
    await Game.input.click();
  }
  // Tomás vuelve a LucIAno (pestaña de la barra de tareas o icono del escritorio).
  async function goToLuciano() {
    const w = Game.luciano.window;
    if (w) {
      await clickEl(w.task);
      Game.os.focusWindow(w);
    } else {
      await openIcon('app-luciano');
      Game.luciano.open();
    }
    await wait(500);
  }
  function maximize(W) {
    if (W && !W.max) W.el.querySelector('.titlebar').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  }
  maximize.restore = (W) => {
    if (W && W.max) W.el.querySelector('.titlebar').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  };

  // Hace parpadear el icono de LucIAno (y su pestaña) hasta que el jugador lo abra.
  async function waitLucianoOpened() {
    const tick = () => {
      const icon = Game.os.iconEl('app-luciano');
      const w = Game.luciano.window;
      const on = !Game.luciano.isActive;
      if (icon) icon.classList.toggle('blink-icon', on);
      if (w) w.task.classList.toggle('blink-task', on);
    };
    const t = setInterval(tick, 200);
    await waitFor(() => Game.luciano.isActive);
    clearInterval(t);
    const icon = Game.os.iconEl('app-luciano');
    if (icon) icon.classList.remove('blink-icon');
    if (Game.luciano.window) Game.luciano.window.task.classList.remove('blink-task');
  }

  // Pregunta de LucIAno con dos opciones. La 1 baja la atención; después sale la 2 obligatoria.
  async function pregunta(q, obligatoria) {
    await Game.luciano.say(q.luciano);
    const i = await Game.luciano.choose([q.opcion1, q.opcion2]);
    if (i === 0) {
      Game.atencion.set(q.atencion);
      await wait(600);
      await Game.luciano.say(q.respuesta1);
      await Game.luciano.choose([obligatoria || q.opcion2]);
    }
  }

  // ---------- Mapa ----------
  // El archivo MAPA7382 aparece en el escritorio cuando LucIAno "fusiona" el juego con el link.
  let onMapReopen = null;
  const mapFile = {
    id: 'mapa7382', name: G.acto3.archivoMapa, type: 'app', loc: 'desktop',
    iconHtml: Game.icons.mapa(),
    open(f) {
      if (f.loc === 'trash') { Game.files.restore(f); Game.os.changed(); }
      Game.mapa.open();
      if (onMapReopen) { const fn = onMapReopen; onMapReopen = null; fn(); }
    },
  };
  function addMapFile() {
    Game.files.add(mapFile);
    Game.os.changed();
  }

  // Abre el mapa, lleva la cámara a la sección y espera a que el jugador la pulse.
  async function mapClick(sec, { abrir = true } = {}) {
    if (abrir) {
      Game.mapa.open();
      await wait(300);
      await Game.mapa.focus(sec === 'ribera2' ? 'ribera' : sec, 1300, 0.15);
    }
    free();
    // Si el jugador cierra el mapa, el icono del archivo parpadea.
    // Si el mapa está detrás de otras ventanas, parpadea su pestaña en la barra de tareas.
    const t = setInterval(() => {
      const icon = Game.os.iconEl('mapa7382');
      if (icon) icon.classList.toggle('blink-icon', !Game.mapa.isOpen);
      const W = Game.mapa.window;
      if (W) W.task.classList.toggle('blink-task', W.min || !W.el.classList.contains('active'));
    }, 250);
    await Game.mapa.waitClick(sec);
    clearInterval(t);
    const icon = Game.os.iconEl('mapa7382');
    if (icon) icon.classList.remove('blink-icon');
    if (Game.mapa.window) Game.mapa.window.task.classList.remove('blink-task');
    pilot();
  }

  // Abre un minijuego "en otra pestaña" (ventana maximizada sin botones) y espera a que termine.
  // La atención es la vida: se llena al empezar cada intento y, si se vacía (o el minijuego
  // termina en derrota), sale GAME OVER → "Perdiste toda tu atención" → score, y se puede reintentar.
  async function minijuego(nombre, titulo) {
    for (;;) {
      const W = Game.os.createWindow({
        key: `mj-${nombre}`, title: titulo, iconHtml: Game.icons.mapa(), w: 60, h: 40,
        build(body) { body.classList.add('minijuego'); },
      });
      W.el.querySelectorAll('.tb-close, .tb-min, .tb-max').forEach((b) => { b.hidden = true; });
      maximize(W);
      W.el.querySelector('.titlebar').style.pointerEvents = 'none'; // no se puede restaurar ni mover
      await glitch(500);
      Game.atencion.juego(true);
      const game = Game.minijuegos[nombre](W.body);
      free({ chat: false });
      const gano = await Promise.race([game.done, Game.atencion.vacia().then(() => false)]);
      pilot();
      game.destroy();
      Game.atencion.juego(false);
      Game.os.closeWindow(W);
      if (gano) return true;
      // En la maquila suenan varias muertes de Roblox a la vez (los empleados).
      const otra = await perder({ oofs: nombre === 'maquila' ? 9 : 1 });
      if (!otra) { reiniciar(); return new Promise(() => {}); }
    }
  }

  // ---------- ACTO 1 ----------
  async function act1() {
    pilot();
    Game.musica.play('acto1');
    await wait(900);

    // Tomás abre LucIAno (doble clic en el icono).
    await openIcon('app-luciano');
    Game.luciano.open();
    await wait(900);

    await dialogo(G.acto1);

    // Notificación de SR y, desde aquí, el jugador ya puede chatear.
    await wait(600);
    notify(G.notificacion);
    await wait(1200);
    Game.input.unlock();
    Game.luciano.enableInput(onPlayer);

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
    await glitch(900);
    await Game.luciano.say(G.fusion[0]);
    for (let v = 0.87; v <= 1; v += 0.03) { bar.set(v); await wait(140); }
    bar.done();
    await Game.luciano.say(G.fusion[1]);
    await wait(500);
    await glitch(500);
    addMapFile();
    Game.mapa.open();
    await act1Mapa();
  }

  // Tras abrirse el mapa: el jugador deja de tener el control y es espectador.
  async function act1Mapa() {
    await wait(2500);
    pilot();
    await goToLuciano();
    await dialogo(G.dialogoMapa);

    // Tomás abre Mensajes y entra al chat de su mamá: mensajes no enviados.
    await wait(600);
    await openIcon('app-mensajes');
    Game.mensajes.open();
    Game.mensajes.showList(); // por si el jugador ya la había abierto en otra pantalla
    await wait(1100);
    await clickEl(Game.mensajes.chatItem(), 700);
    Game.mensajes.chatItem().click();
    await wait(3500);

    // Otro mensaje de SR (10 s, menos glitch). Al poco, el control regresa al jugador; pulsar la
    // notificación o la pestaña del mapa trae el mapa al frente.
    let clicked = false;
    notify(G.sr2.texto, {
      duracion: G.sr2.duracion,
      suave: true,
      onClick: () => { clicked = true; Game.mapa.open(); },
    });
    await wait(2000);
    free();
    const W = Game.mapa.window;
    if (W) W.task.addEventListener('click', () => { clicked = true; }, { once: true });
    // El acto 2 empieza cuando el jugador vuelve al mapa (o a los 12 s).
    const t0 = Date.now();
    await waitFor(() => clicked || Date.now() - t0 > 12000);
    await wait(1500);
  }

  // ---------- ACTO 2 ----------
  async function act2() {
    const A = G.acto2;
    Game.musica.play('acto2');
    Game.luciano.enableInput(onPlayer);
    free();

    // Pensamiento: se queda en la nube hasta que el jugador le escriba a LucIAno.
    const answered = scriptedReply(A.respuestaLink);
    await pensamiento(A.pensamiento1, { esperar: answered });

    await wait(1200);
    pilot();
    await pensamiento(A.pensamiento2);

    // Tomás va a Mensajes, al chat de su mamá, y escribe. Los mensajes no llegan.
    await openIcon('app-mensajes');
    Game.mensajes.openChat();
    await wait(900);
    for (const m of A.aMama) {
      await Game.mensajes.typeAsTomas(m.texto);
      await wait(800);
    }
    await wait(1200);
    await pensamiento(A.pensamiento3);

    // SR: "Entramos a fase 3". Al pulsarla (o cuando se va) se abre la pestaña de la fase 3.
    free();
    await notify(A.sr3, { duracion: 5000, onClick: () => {} });
    pilot();

    // Pestaña glitcheando con código → sopa de letras.
    await minijuego('sopa', A.codigoTitulo);
    await pensamiento(A.pensamiento4);
    // Puede anotarlas en el Post-it.
    const postit = Game.os.iconEl('app-postit');
    if (postit) postit.classList.add('blink-icon');
    setTimeout(() => { const p = Game.os.iconEl('app-postit'); if (p) p.classList.remove('blink-icon'); }, 9000);
    free();
    await wait(3500);
    await pensamiento(A.pensamiento5);

    // "Vuelve al mapa": el texto glitcheado de Acatlán parpadea hasta que el jugador lo pulse.
    const quitar = instruccion(A.instruccionMapa);
    await mapClick('acatlan', { abrir: false });
    quitar();
    free();
    await Game.mapa.password(A.password1);
    pilot();
    await pensamiento(A.pensamiento6);

    // Se abre la sección de Acatlán y su texto se lee en voz alta.
    await leerFicha('acatlan', G.mapa.secciones.acatlan.voz, G.mapa.secciones.acatlan.nombre.toUpperCase());
    await pensamiento(A.pensamiento7);

    // El jugador va a preguntarle a LucIAno.
    free({ chat: false });
    await waitLucianoOpened();
    await pregunta(A.pregunta, A.pregunta.obligatoria);
    pilot();
    await Game.luciano.say(A.pregunta.respuesta2);
    await wait(1500);
    await pensamiento(A.pensamiento8);
    await act3();
  }

  // ---------- ACTO 3 ----------
  async function act3() {
    const A = G.acto3;
    const S = G.mapa.secciones;

    // La Ribera de Chapala parpadea (aún glitcheada).
    await mapClick('ribera');
    Game.musica.play('acto3');
    await minijuego('pesca', 'pesca.exe');

    // Se des-glitchea la primera parte del texto y se lee.
    await leerFicha('ribera', S.ribera.voz, S.ribera.nombre.toUpperCase(), 1);
    await pensamiento(A.pensamiento1);

    // Plan México parpadea → serpiente.
    await mapClick('planmexico');
    await minijuego('serpiente', 'plan_mexico.exe');

    // Se desbloquea la imagen de la CFE y la cámara sigue el hilo rojo hasta la Ribera.
    Game.mapa.open();
    await Game.mapa.focus('cfe', 1200, 0.2);
    Game.mapa.unlock('cfe');
    await wait(1500);
    Game.mapa.thread('cfe', 'ribera');
    await Game.mapa.focus(['cfe', 'ribera'], 1800, 0.05);
    await wait(800);
    await Game.mapa.focus('ribera', 1400, 0.15);
    await mapClick('ribera2', { abrir: false });
    Game.mapa.thread('cfe', 'ribera', false);
    free();
    await Game.mapa.password(A.password2);
    pilot();
    Game.mapa.unlock('ribera', 2);
    await wait(1200);
    await pensamiento(A.pensamiento2);

    // El chat con LucIAno se abre solo.
    Game.luciano.show();
    await wait(600);
    free({ chat: false });
    await pregunta(A.pregunta1);
    await pregunta(A.pregunta2);
    pilot();
    await dialogo(A.dialogo);
    await Game.luciano.say(A.virus, { extraHtml: `<a class="lu-virus">${A.virusLink}</a>` });
    await wait(500);
    await siguiente();
    await Game.luciano.typeAsTomas(A.noElimines);
    await wait(600);
    await Game.luciano.say(A.eliminado);
    await wait(800);

    // El mapa se elimina a la vista y va a la papelera.
    if (!Game.mapa.isOpen) Game.mapa.open();
    await wait(400);
    await Game.mapa.destroy();
    const f = Game.files.get('mapa7382');
    if (f) { Game.files.move(f, 'trash'); Game.os.changed(); }
    await wait(600);
    await pensamiento(A.pensamiento3);
    await borrado();
  }

  // El jugador recupera el mapa de la papelera.
  async function borrado() {
    const A = G.acto3;
    const S = G.mapa.secciones;
    const trash = () => Game.os.iconEl('sys-trash');
    const t = setInterval(() => { const el = trash(); if (el) el.classList.add('blink-icon'); }, 250);
    await zoomTo(trash());
    const reopened = new Promise((r) => { onMapReopen = r; });
    free();
    await reopened;
    clearInterval(t);
    if (trash()) trash().classList.remove('blink-icon');
    pilot();
    await wait(900);

    // Chihuahua parpadea; su texto se lee y la cámara recorre los hilos hasta Silicon Valley y Querétaro.
    await mapClick('chihuahua');
    await leerFicha('chihuahua', S.chihuahua.voz, S.chihuahua.nombre.toUpperCase(), false);
    Game.mapa.thread('chihuahua', 'rqou3u1uylqk');
    await Game.mapa.focus(['chihuahua', 'silicon'], 1800, 0.04);
    await Game.mapa.focus('silicon', 1500, 0.1);
    await wait(700);
    Game.mapa.thread('chihuahua', 'queretaro');
    await Game.mapa.focus(['chihuahua', 'queretaro'], 1800, 0.04);
    await Game.mapa.focus('queretaro', 1500, 0.1);
    await wait(700);
    Game.mapa.thread('chihuahua', 'rqou3u1uylqk', false);
    Game.mapa.thread('chihuahua', 'queretaro', false);
    await maquila();
  }

  async function maquila() {
    const A = G.acto3;
    const S = G.mapa.secciones;
    await mapClick('silicon');
    await minijuego('maquila', 'silicon_valley.exe');
    await leerFicha('silicon', S.silicon.voz, S.silicon.nombre.toUpperCase());

    // Toda la pantalla se glitchea y se abre LucIAno: "Hola Tomás…" seis veces.
    screenEl.classList.add('glitching');
    Game.sound.glitch();
    const W = Game.luciano.show();
    maximize(W);
    for (let i = 0; i < 6; i++) {
      Game.sound.glitch();
      await Game.luciano.say(A.holaRepetido, { typing: 350, cls: 'repeat' });
      await wait(250);
    }
    screenEl.classList.remove('glitching');
    for (let i = 0; i < 2; i++) {
      await Game.voz.say(A.holaRepetido, { titulo: 'LucIAno', pitch: 0.05, rate: 0.72, profunda: true });
    }
    await wait(600);
    await chatSR();
  }

  // ---------- Chat con SR y LucIAno revelado ----------
  async function chatSR() {
    const A = G.acto3;
    let n = notify(A.srHalcon, { duracion: 12000, largo: true, onClick: () => {} });
    await wait(1500);
    await pensamiento(A.pensamiento4);
    // Tomás pulsa el mensaje de SR y escribe en automático.
    if (n.el.isConnected) await clickEl(n.el, 800);
    n.el.remove();
    Game.sr.open();
    Game.sr.log(A.srHalcon.replace(/^SR:\s*/, ''));
    await wait(900);
    await dialogo(A.chatSR, Game.sr);

    // Glitch: LucIAno se mete. Tomás vuelve al chat de SR.
    await glitch(1200);
    Game.luciano.show();
    await Game.luciano.say(A.conQuien);
    await wait(900);
    await clickEl(Game.sr.window.task, 800);
    Game.sr.open();
    await Game.sr.typeAsTomas(A.queHago);
    await wait(700);

    // LucIAno a pantalla completa, en rojo y parpadeando.
    await glitch(1000);
    const W = Game.luciano.show();
    maximize(W);
    Game.luciano.setEvil(true);
    // El último monólogo de LucIAno se escucha en voz profunda.
    for (const t of A.revelacion) {
      await Game.luciano.say(t, { cls: 'flash', typing: 600 });
      await Game.voz.say(t, { titulo: 'LucIAno', estilo: 'profunda' });
      await wait(600);
    }

    // SR pide el código (notificación abajo a la derecha; también queda en el chat de SR).
    Game.sr.log(A.srCodigo.replace(/^SR:\s*/, ''));
    n = notify(A.srCodigo, { duracion: 26000, suave: true, largo: true, onClick: () => Game.sr.open() });
    await wait(9000);
    await pensamiento(A.pensamiento5);

    // La última sección del mapa parpadea.
    await mapClick('codigo');
    if (n.el.isConnected) n.el.remove();
    shake(true);
    await glitch(900);
    const L = Game.luciano.show();
    maximize(L);
    // Ahora con voz de loquendo. Al terminar el monólogo empieza el último minijuego.
    for (const t of A.reto) {
      await Game.luciano.say(t, { cls: 'flash', typing: 500 });
      await Game.voz.say(t, { titulo: 'LucIAno', estilo: 'loquendo' });
      await wait(300);
    }
    shake(false);
    await wait(900);
    await act4();
  }

  // ---------- ACTO 4 ----------
  async function act4() {
    Game.musica.play('acto4');
    await glitch(600);
    // Si pierde, minijuego() muestra GAME OVER / "Perdiste toda tu atención" / score y deja reintentar.
    await minijuego('pelea', 'shitgpt_fighter.exe');
    await lucianoPierde();
    await ganaPelea();
  }

  // Pantalla final sobre la pantalla real.
  const fin = document.createElement('div');
  fin.id = 'final';
  fin.hidden = true;
  document.body.appendChild(fin);

  function boton(texto, lado) {
    const b = document.createElement('button');
    b.className = `f-btn ${lado}`;
    b.textContent = texto;
    fin.appendChild(b);
    return new Promise((r) => b.addEventListener('click', () => r()));
  }

  // Tomás gana: el enemigo ya se desintegró; pantalla en negro con la voz de loquendo.
  async function lucianoPierde() {
    const A = G.acto4;
    fin.className = 'cursor-on';
    fin.innerHTML = '';
    fin.hidden = false;
    await wait(1200);
    const p = document.createElement('p');
    p.className = 'f-negro';
    fin.appendChild(p);
    await Promise.all([typewriter(p, A.ganaLuciano, 30), Game.voz.say(A.ganaLuciano, { titulo: 'LucIAno', estilo: 'loquendo', subtitulos: false, clic: false })]);
    await siguiente({ donde: 'pantalla' });
    await wait(400);
    fin.hidden = true;
    fin.innerHTML = '';
  }

  async function ganaPelea() {
    const A = G.acto4;
    const S = G.mapa.secciones;
    // Se abre el mapa y se vuelve visible la última sección, CÓDIGO.
    await leerFicha('codigo', S.codigo.voz, S.codigo.nombre);
    await pensamiento(A.pensamientoCodigo);

    // SR pide el código; el jugador lo escribe en el chat de SR.
    Game.sr.open();
    await Game.sr.say(A.srApurate);
    free({ chat: false });
    await new Promise((resolve) => {
      let last = Date.now();
      const nag = setInterval(() => {
        if (Date.now() - last >= 20000) { last = Date.now(); Game.sr.say(A.srApurateOtraVez); }
      }, 1000);
      Game.sr.enableInput(async (text) => {
        last = Date.now();
        if (norm(text).replace(/\s+/g, '') === norm(A.codigo)) {
          clearInterval(nag);
          Game.sr.enableInput(null);
          resolve();
        } else {
          await Game.sr.say(A.srCodigoMal);
        }
      });
      if (Game.sr.window && Game.sr.window.body) {
        const input = Game.sr.window.body.querySelector('input');
        if (input) input.focus();
      }
    });
    pilot();
    await Game.sr.say(A.srGracias);
    await wait(3000);

    // Pantalla en negro: LucIAno en verde, luego el pensamiento de Tomás y "Finalizar juego".
    Game.musica.stop(2500);
    fin.innerHTML = '';
    fin.hidden = false;
    fin.classList.add('cursor-on');
    await wait(1500);
    const p = document.createElement('p');
    p.className = 'f-verde';
    fin.appendChild(p);
    await typewriter(p, A.lucianoFinal);
    await wait(3500);
    fin.innerHTML = '';
    await wait(1500);
    fin.innerHTML = `<p class="f-pensamiento">“${A.pensamientoFinal}”</p>`;
    await wait(2000);
    await boton(A.finalizar, 'izq');
    await creditos();
  }

  // Créditos que suben, con la caída de Edgar de fondo y letra de cómic de acción.
  async function creditos() {
    const C = G.creditos;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    fin.className = 'cursor-on creditos';
    fin.hidden = false;
    fin.innerHTML =
      '<div class="cr-fondo-anim"></div>' +
      '<div class="cr-fondo cr-yt"></div>' +
      '<div class="cr-rodillo">' +
      `<h1>${esc(C.fin)}</h1><h2 class="cr-gracias">${esc(C.agradecimiento)}</h2><h2>${esc(C.titulo)}</h2>` +
      C.lista.map(([a, b]) => `<dl class="cr-fila"><dt>${esc(a)}</dt><dd>${esc(b)}</dd></dl>`).join('') +
      `<div class="cr-jugador">${esc(Game.jugador.nombre)} — SCORE ${String(Game.score.value).padStart(6, '0')}</div>` +
      '</div>';
    // Fondo: YouTube (en silencio, suena la música del juego); si falla, el video local; si no, el animado.
    const ytFondo = fin.querySelector('.cr-yt');
    const fondoLocal = () => {
      ytFondo.remove();
      const video = document.createElement('video');
      Object.assign(video, { className: 'cr-fondo', src: C.video, autoplay: true, loop: true, muted: true, playsInline: true });
      video.addEventListener('error', () => video.remove());
      fin.insertBefore(video, fin.querySelector('.cr-rodillo'));
      video.play().catch(() => {});
    };
    Game.yt.player(ytFondo, { id: C.youtube.id, inicio: C.youtube.inicio, mute: true })
      .then((h) => { h.onFallo = fondoLocal; })
      .catch(fondoLocal);
    Game.musica.play('acto1');
    const rod = fin.querySelector('.cr-rodillo');
    await wait(50);
    // El rodillo sube a velocidad constante hasta salir por arriba (y vuelve a empezar).
    const dist = window.innerHeight + rod.offsetHeight;
    rod.animate([{ transform: 'translate(-50%, 0)' }, { transform: `translate(-50%, ${-dist}px)` }],
      { duration: (dist / 70) * 1000, easing: 'linear', iterations: Infinity });
    await wait(6000);
    await boton('Volver al inicio', 'izq');
    reiniciar();
  }

  // Se acaba el juego y vuelve a la pantalla de inicio.
  function reiniciar() {
    location.href = location.pathname;
  }

  Game.story = { notify };

  // ---------- Atajos para probar (?desde=…) ----------
  // Dejan el estado como estaría en ese punto de la historia.
  async function saltar(desde) {
    Game.luciano.enableInput(onPlayer);
    addMapFile();
    // ?desde=mj-sopa (pesca, serpiente, maquila, pelea): solo ese minijuego, en bucle.
    if (desde.startsWith('mj-')) {
      for (;;) {
        await minijuego(desde.slice(3), `${desde.slice(3)}.exe`);
        await pensamiento(`Ganaste el minijuego. Score: ${Game.score.value}`);
      }
    }
    const orden = ['acto2', 'acto3', 'borrado', 'maquila', 'pelea', 'codigo'];
    const k = orden.indexOf(desde);
    if (k >= 1) Game.mapa.unlock('acatlan');
    if (k >= 2) { Game.mapa.unlock('ribera', 2); Game.mapa.unlock('cfe'); }
    if (k >= 4) Game.mapa.unlock('silicon');
    if (desde === 'acto2') { Game.mapa.open(); return act2(); }
    if (desde === 'acto3') { Game.musica.play('acto2'); return act3(); }
    if (desde === 'borrado') {
      Game.musica.play('acto3');
      const f = Game.files.get('mapa7382');
      Game.files.move(f, 'trash'); Game.os.changed();
      return borrado();
    }
    if (desde === 'maquila') { Game.musica.play('acto3'); return maquila(); }
    if (desde === 'pelea') return act4();
    if (desde === 'creditos') return creditos();
    if (desde === 'codigo') { Game.musica.play('acto4'); return ganaPelea(); }
    return act1();
  }

  async function start() {
    const q = new URLSearchParams(location.search);
    if (q.get('desde') === 'nada') { intro.hidden = true; return; } // escritorio libre, sin historia
    Game.input.lock();
    // Los atajos de prueba (?desde=…) entran directo, sin pantalla de inicio.
    if (q.has('desde')) {
      Game.jugador.nombre = q.get('usuario') || 'PRUEBA';
      intro.hidden = true;
      mostrarPausa();
      Game.sound.unlock();
      return saltar(q.get('desde'));
    }
    await waitForStart();
    mostrarPausa();
    if (q.has('sin-intro')) intro.hidden = true;
    else await runIntro();
    await act1();
    await act2();
  }

  start();
})();
