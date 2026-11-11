// Mapa interactivo: el contenido del link de SR, "fusionado" por LucIAno con el juego de Tomás.
// PROVISIONAL: dibujo de ejemplo (la colonia, el ejido y el centro de datos) con lugares que se
// pueden pulsar. Los lugares y sus textos están en Game.guion.mapa.
window.Game = window.Game || {};

(function () {
  const M = Game.guion.mapa;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Calles de la colonia (cuadrícula torcida), parcelas del ejido y el recinto del centro de datos.
  function terrain() {
    let streets = '';
    for (let i = 0; i < 7; i++) streets += `<path d="M${4 + i * 6} 18 L${2 + i * 6} 88"/>`;
    for (let j = 0; j < 7; j++) streets += `<path d="M2 ${20 + j * 11} L46 ${18 + j * 11}"/>`;
    let parcels = '';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        parcels += `<rect x="${52 + i * 9.5}" y="${10 + j * 13}" width="8.5" height="11.5"/>`;
      }
    }
    return '<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<defs><pattern id="mapgrid" width="5" height="5" patternUnits="userSpaceOnUse">' +
      '<path d="M5 0H0V5" fill="none" stroke="currentColor" stroke-width=".15" opacity=".35"/></pattern></defs>' +
      '<rect width="100" height="100" fill="url(#mapgrid)"/>' +
      // río
      '<path class="map-river" d="M48 0 C50 20 44 35 49 50 S56 80 50 100"/>' +
      `<g class="map-streets">${streets}</g>` +
      `<g class="map-parcels">${parcels}</g>` +
      // centro de datos: recinto cercado que se come parte del ejido
      '<path class="map-dc" d="M60 52 H96 V90 H64 L60 70 Z"/>' +
      '<path class="map-dc-fence" d="M58 50 H98 V92 H62 L58 70 Z"/>' +
      '<g class="map-dc-rows">' +
      Array.from({ length: 6 }, (_, i) => `<path d="M66 ${58 + i * 5} H92"/>`).join('') + '</g>' +
      '</svg>';
  }

  function open() {
    return Game.os.createWindow({
      key: 'mapa', title: M.titulo, iconHtml: Game.icons.mapa(), w: 44, h: 28,
      build(body) {
        body.classList.add('mapa', 'glitch-open');
        body.innerHTML =
          '<div class="map-hud"><span>NIVEL 1</span><span class="map-blink">● SEÑAL INTERCEPTADA</span></div>' +
          `<div class="map-stage">${terrain()}<div class="map-pins"></div></div>` +
          '<div class="map-info"><b>Selecciona un lugar</b><p>Pulsa un punto del mapa.</p></div>';
        const pins = body.querySelector('.map-pins');
        const info = body.querySelector('.map-info');
        M.lugares.forEach((l) => {
          const pin = document.createElement('div');
          pin.className = 'map-pin';
          pin.dataset.cursor = 'hand';
          pin.style.left = `${l.x}%`;
          pin.style.top = `${l.y}%`;
          pin.innerHTML = `<i></i><span>${esc(l.nombre)}</span>`;
          pin.addEventListener('click', () => {
            pins.querySelectorAll('.map-pin').forEach((p) => p.classList.toggle('on', p === pin));
            info.innerHTML = `<b>${esc(l.nombre)}</b><p>${esc(l.texto)}</p>`;
            Game.sound.mouse(true);
          });
          pins.appendChild(pin);
        });
        setTimeout(() => body.classList.remove('glitch-open'), 1200);
      },
    });
  }

  Game.mapa = { open };
})();
