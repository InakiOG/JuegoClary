// Videos de YouTube con la IFrame Player API (https://www.youtube.com/iframe_api). No hace falta clave.
// Game.yt.player(host, {id, inicio, mute}) -> Promise<reproductor>. La promesa falla si no hay internet,
// si el juego se abrió con doble clic (file://, YouTube no deja incrustar desde ahí) o si el video no se puede
// incrustar; quien la usa decide qué mostrar entonces (un archivo local o un fondo animado).
// El iframe no recibe el ratón (el juego dibuja su propio cursor); los controles son los del juego.
// La pausa global (Esc) también pausa estos videos.
window.Game = window.Game || {};

(function () {
  let apiPromesa = null;
  const activos = new Set();

  function api() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiPromesa) return apiPromesa;
    apiPromesa = new Promise((resolve, reject) => {
      if (location.protocol === 'file:') { reject(new Error('file://')); return; }
      const previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (previo) previo(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => reject(new Error('sin conexión'));
      document.head.appendChild(s);
      (Game.pausa ? Game.pausa.realTimeout : setTimeout)(() => reject(new Error('tiempo agotado')), 10000);
    }).catch((e) => { apiPromesa = null; throw e; });
    return apiPromesa;
  }

  function player(host, opts) {
    const o = Object.assign({ inicio: 0, mute: false }, opts);
    return api().then((YT) => new Promise((resolve, reject) => {
      const caja = document.createElement('div');
      caja.className = 'yt-caja';
      const div = document.createElement('div');
      caja.appendChild(div);
      host.appendChild(caja);
      let listo = false;
      let pausadoPorJuego = false;
      const h = {
        el: caja,
        onEstado: null,
        onFallo: null, // error de YouTube después de cargar (p. ej. el video no se deja incrustar)
        play() { p.playVideo(); },
        pause() { p.pauseVideo(); },
        get paused() { const e = p.getPlayerState ? p.getPlayerState() : -1; return e !== 1 && e !== 3; },
        time() { return p.getCurrentTime ? p.getCurrentTime() : 0; },
        duration() { return p.getDuration ? p.getDuration() : 0; },
        seek(t) { p.seekTo(t, true); },
        // YouTube solo ofrece ciertas velocidades (normalmente hasta x2): se usa la más cercana posible.
        setRate(r) {
          const tasas = (p.getAvailablePlaybackRates && p.getAvailablePlaybackRates()) || [1];
          const efectiva = tasas.filter((t) => t <= r).pop() || 1;
          p.setPlaybackRate(efectiva);
          return efectiva;
        },
        destroy() {
          activos.delete(h);
          try { p.destroy(); } catch (e) { /* ya no existe */ }
          caja.remove();
        },
        _pausaJuego(on) {
          if (!listo) return;
          if (on) {
            // Se reanuda al quitar la pausa si estaba sonando, cargando o a punto de empezar (no si el jugador la pausó).
            const e = p.getPlayerState ? p.getPlayerState() : -1;
            pausadoPorJuego = e === 1 || e === 3 || e === -1 || e === 5;
            h.pause();
          }
          else if (pausadoPorJuego) { pausadoPorJuego = false; h.play(); }
        },
      };
      (Game.pausa ? Game.pausa.realTimeout : setTimeout)(() => {
        if (!listo) { listo = true; h.destroy(); reject(new Error('YouTube no respondió')); }
      }, 12000);
      // YouTube a veces activa los subtítulos automáticos aunque se pida que no: se descargan a mano.
      const sinSubtitulos = () => { try { p.unloadModule('captions'); p.unloadModule('cc'); } catch (e) { /* sin módulo */ } };
      const p = new YT.Player(div, {
        videoId: o.id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1,
          playsinline: 1, rel: 0, cc_load_policy: 0, start: Math.floor(o.inicio), mute: o.mute ? 1 : 0,
        },
        events: {
          onReady() {
            if (listo) return; // ya se dio por perdido
            listo = true;
            activos.add(h);
            if (o.mute) p.mute();
            sinSubtitulos();
            if (Game.pausa && Game.pausa.activa) h._pausaJuego(true);
            resolve(h);
          },
          onError(e) {
            const err = new Error(`YouTube error ${e.data}`);
            if (!listo) { listo = true; h.destroy(); reject(err); } else if (h.onFallo) h.onFallo(err);
          },
          onStateChange(e) {
            // Al terminar vuelve a empezar desde el punto de inicio (bucle).
            if (e.data === YT.PlayerState.ENDED) { p.seekTo(o.inicio, true); p.playVideo(); }
            if (e.data === YT.PlayerState.PLAYING) sinSubtitulos();
            if (h.onEstado) h.onEstado(e.data);
          },
        },
      });
    }));
  }

  if (Game.pausa) Game.pausa.on((on) => activos.forEach((h) => h._pausaJuego(on)));

  Game.yt = { player, api };
})();
