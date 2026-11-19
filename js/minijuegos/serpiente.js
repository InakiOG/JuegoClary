// Minijuego "Plan México": una serpiente con la bandera de EE. UU. que crece al comer, estilo slither.io.
// Fase 1: municipios de Jalisco · Fase 2: los 32 estados (mínimo para ganar) · Fase 3 (bonus): Latinoamérica.
// Se pierde atención al chocar con la orilla del mapa, con las serpientes rivales (CFE, data center…),
// con los drones, o al pasar mucho tiempo sin comer (distracción). A 0 de atención el host hace el GAME OVER.
// Contrato: Game.minijuegos.serpiente(host) -> { done: Promise<boolean>, destroy() }.
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  const DEFAULTS = {
    titulo: 'PLAN MÉXICO',
    instrucciones: 'Eres la serpiente del Plan México. Muévela con el ratón y cómete el mapa: primero los municipios de Jalisco, luego los estados y al final Latinoamérica.',
    peligros: 'Las torres de la CFE, los data centers y los drones te distraen: si chocas con ellos o con la orilla del mapa pierdes atención. Si pasas mucho tiempo sin comer, también. Atrapa drones con el cuerpo y corta a los rivales cruzándote en su camino.',
    minimo: 'Mínimo para pasar: terminarte México.',
    ayuda: 'CLIC SOSTENIDO = ACELERAR (pierdes longitud)',
    empezar: '[ clic para empezar ]',
    fases: [
      { titulo: 'FASE 1 · JALISCO', meta: 'Cómete los municipios de Jalisco', contador: 'Municipios', fin: 'JALISCO CONSUMIDO' },
      { titulo: 'FASE 2 · MÉXICO', meta: 'Cómete los 32 estados', contador: 'Estados', fin: 'MÉXICO CONSUMIDO' },
      { titulo: 'FASE 3 · LATINOAMÉRICA', meta: 'Bonus: cómete Latinoamérica', contador: 'Países', fin: 'LATINOAMÉRICA CONSUMIDA' },
    ],
    eleccion: 'Mínimo cumplido: te comiste México. ¿Terminas aquí o sigues con Latinoamérica por puntos extra?',
    terminar: 'Terminar',
    seguir: 'Seguir ▸ Latinoamérica',
    auto: 'Sigue solo en',
    distraccion: 'DISTRACCIÓN · ¡come algo!',
    gana: 'Te comiste todo el mapa.',
    ganaMexico: 'Te comiste México.',
    agotado: 'Ya no puedes más. Suficiente imperio por hoy.',
    golpes: { pared: '¡FRONTERA!', rival: '¡CHOQUE!', dron: '¡DRON!' },
    corte: '¡CORTE!',
    dronAtrapado: '¡DRON ATRAPADO!',
    rivales: ['CFE', 'DATA CENTER', 'MINERA'],
    puntos: 'SCORE',
    longitud: 'LONGITUD',
  };

  // ---------------- geografía (lon, lat) ----------------
  const JALISCO = [
    [-105.55, 20.65], [-105.2, 20.9], [-104.6, 21.1], [-104.2, 21.3], [-104.3, 21.9], [-104.1, 22.4], [-103.9, 22.75],
    [-103.55, 22.6], [-103.3, 22.3], [-103.0, 22.2], [-103.1, 21.75], [-102.8, 21.65], [-102.55, 22.1], [-102.15, 22.25],
    [-101.8, 22.0], [-101.55, 21.7], [-101.6, 21.3], [-101.9, 21.05], [-102.2, 20.6], [-102.5, 20.2], [-102.9, 20.05],
    [-103.1, 19.7], [-103.0, 19.3], [-103.45, 19.1], [-103.6, 19.5], [-104.0, 19.5], [-104.4, 19.25], [-104.7, 19.15],
    [-105.05, 19.6], [-105.5, 20.1], [-105.7, 20.4],
  ];
  const MAINLAND = [
    [-114.72, 32.72], [-114.81, 32.49], [-111.07, 31.33], [-108.21, 31.33], [-108.21, 31.78], [-106.5, 31.78],
    [-105.0, 30.7], [-104.5, 29.6], [-103.3, 29.0], [-102.4, 29.8], [-101.4, 29.8], [-100.5, 28.3], [-99.5, 27.5],
    [-99.1, 26.5], [-98.2, 26.05], [-97.15, 25.95], [-97.5, 25.0], [-97.7, 24.0], [-97.8, 22.5], [-97.3, 21.0],
    [-96.8, 20.0], [-96.1, 19.2], [-95.0, 18.6], [-94.4, 18.15], [-93.0, 18.4], [-91.8, 18.6], [-91.0, 19.0],
    [-90.5, 19.9], [-90.4, 21.0], [-89.6, 21.3], [-88.2, 21.6], [-87.0, 21.55], [-86.75, 21.1], [-87.4, 20.2],
    [-87.6, 19.4], [-87.85, 18.6], [-88.3, 18.48], [-89.15, 17.95], [-89.15, 17.82], [-90.98, 17.82], [-90.98, 17.25],
    [-91.44, 17.25], [-90.44, 16.08], [-91.73, 16.07], [-92.2, 15.25], [-92.23, 14.53], [-93.9, 16.1], [-94.8, 16.2],
    [-95.2, 16.0], [-96.5, 15.65], [-98.0, 16.2], [-99.9, 16.85], [-101.5, 17.6], [-102.2, 17.95], [-103.5, 18.5],
    [-104.3, 19.1], [-105.3, 20.4], [-105.5, 21.5], [-105.7, 22.5], [-106.4, 23.2], [-107.5, 24.5], [-108.5, 25.5],
    [-109.4, 26.5], [-110.0, 27.5], [-111.0, 27.9], [-112.2, 29.0], [-112.8, 30.0], [-113.1, 31.2], [-114.1, 31.5],
    [-114.8, 31.9],
  ];
  const PENINSULA = [
    [-117.12, 32.53], [-114.72, 32.72], [-114.8, 31.9], [-114.6, 31.0], [-114.4, 30.0], [-113.5, 29.0], [-112.8, 28.0],
    [-112.2, 27.0], [-111.5, 26.0], [-110.7, 24.6], [-110.3, 24.2], [-109.5, 23.2], [-109.9, 22.9], [-110.3, 23.5],
    [-111.5, 24.5], [-112.1, 25.5], [-112.5, 26.4], [-114.0, 27.2], [-114.3, 27.8], [-114.1, 28.2], [-115.0, 29.3],
    [-115.8, 30.4], [-116.6, 31.8],
  ];
  const USA = [
    [-125, 40], [-60, 40], [-79, 32], [-80.6, 32], [-81.2, 30], [-80.1, 26.5], [-80.4, 25.2], [-81.2, 25.2],
    [-81.8, 26.6], [-82.7, 28], [-82.8, 29.2], [-84.0, 30.1], [-85.4, 29.7], [-86.5, 30.4], [-88.0, 30.4],
    [-89.6, 30.2], [-89.4, 29.2], [-90.5, 29.1], [-91.8, 29.5], [-93.8, 29.7], [-94.8, 29.3], [-96.6, 28.2],
    [-97.4, 27.4], [-97.4, 26.0], [-97.15, 25.95], [-98.2, 26.05], [-99.1, 26.5], [-99.5, 27.5], [-100.5, 28.3],
    [-101.4, 29.8], [-102.4, 29.8], [-103.3, 29.0], [-104.5, 29.6], [-105.0, 30.7], [-106.5, 31.78], [-108.21, 31.78],
    [-108.21, 31.33], [-111.07, 31.33], [-114.81, 32.49], [-114.72, 32.72], [-117.12, 32.53], [-117.3, 33.1],
    [-118.4, 33.9], [-119.5, 34.4], [-120.6, 34.5], [-123, 38],
  ];
  const CENTRAL = [
    [-88.3, 18.48], [-88.1, 18.0], [-88.3, 16.6], [-88.9, 15.9], [-86.0, 15.9], [-84.0, 15.9], [-83.2, 15.0],
    [-83.5, 12.0], [-83.7, 10.9], [-82.0, 9.2], [-79.5, 9.6], [-77.3, 8.6], [-77.9, 7.2], [-80.0, 7.4], [-81.7, 8.1],
    [-83.6, 8.4], [-85.7, 9.9], [-85.7, 11.1], [-87.5, 12.9], [-89.0, 13.4], [-90.6, 13.9], [-91.4, 14.0],
    [-92.23, 14.53], [-92.2, 15.25], [-91.73, 16.07], [-90.44, 16.08], [-91.44, 17.25], [-90.98, 17.25],
    [-90.98, 17.82], [-89.15, 17.82], [-89.15, 17.95],
  ];
  const CUBA = [
    [-84.95, 21.86], [-84.0, 22.6], [-82.0, 23.15], [-79.5, 22.9], [-77.0, 21.8], [-75.0, 20.7], [-74.1, 20.2],
    [-77.5, 19.9], [-78.5, 21.5], [-81.8, 22.2], [-83.2, 22.0], [-84.4, 21.6],
  ];
  const HISPANIOLA = [[-74.4, 18.4], [-72.8, 19.9], [-70.0, 19.8], [-68.3, 18.6], [-71.0, 18.0], [-74.4, 18.2]];
  const PUERTO_RICO = [[-67.2, 18.5], [-65.6, 18.4], [-65.7, 18.0], [-67.2, 18.0]];
  const SUDAMERICA = [
    [-77.3, 8.6], [-75.6, 10.6], [-71.9, 12.4], [-68, 10.6], [-62.5, 10.7], [-60, 8.5], [-57, 6], [-52, 4.5],
    [-50, 1.8], [-48.5, -1], [-44, -2.5], [-38.5, -3.7], [-35, -5.5], [-35, -9], [-38.5, -13], [-39, -17.5],
    [-40.5, -21.5], [-44, -23], [-48.5, -26], [-48.7, -28.5], [-53, -33.7], [-55, -35], [-57.5, -36.5],
    [-57.5, -38.5], [-62, -39], [-65, -41], [-63.8, -42.5], [-65.5, -45], [-67.5, -46.5], [-65.8, -48], [-69, -51],
    [-68.5, -52.5], [-68.6, -54.9], [-71, -54], [-74.5, -52], [-75.5, -47], [-73.5, -43], [-73.7, -37], [-71.5, -30],
    [-70.3, -18.5], [-75.5, -15], [-78.5, -9.5], [-81.2, -6], [-80.3, -3.5], [-80, -1], [-80.5, 0.8], [-78.8, 1.8],
    [-77.3, 3.8], [-77.5, 6.8],
  ];

  const MUNICIPIOS = [
    ['Guadalajara', -103.35, 20.67], ['Zapopan', -103.42, 20.74], ['Tlaquepaque', -103.31, 20.62],
    ['Tonalá', -103.22, 20.64], ['Tlajomulco', -103.44, 20.47], ['El Salto', -103.18, 20.52],
    ['Juanacatlán', -103.14, 20.48], ['Chapala', -103.19, 20.3], ['Poncitlán', -102.92, 20.38],
    ['Ocotlán', -102.77, 20.35], ['Acatlán de Juárez', -103.59, 20.42], ['Puerto Vallarta', -105.23, 20.62],
    ['Lagos de Moreno', -101.93, 21.36], ['Tepatitlán', -102.76, 20.82], ['Ameca', -104.05, 20.55],
    ['Autlán', -104.37, 19.77], ['Zapotlán el Grande', -103.46, 19.7], ['Tequila', -103.84, 20.88],
    ['Arandas', -102.35, 20.7], ['Colotlán', -103.27, 22.11], ['La Barca', -102.54, 20.29],
    ['San Juan de los Lagos', -102.33, 21.25], ['Mascota', -104.79, 20.52], ['Cihuatlán', -104.57, 19.24],
    ['Tamazula', -103.25, 19.68], ['Huejuquilla', -103.9, 22.62], ['Tomatlán', -105.25, 19.93], ['Sayula', -103.6, 19.88],
  ];
  const ESTADOS = [
    ['Baja California', -115.6, 31.0], ['Baja California Sur', -111.8, 25.6], ['Sonora', -110.8, 29.6],
    ['Chihuahua', -106.2, 28.8], ['Coahuila', -102.0, 27.5], ['Nuevo León', -99.9, 25.7], ['Tamaulipas', -98.6, 24.0],
    ['Sinaloa', -107.6, 25.2], ['Durango', -104.7, 24.9], ['Zacatecas', -102.8, 23.4], ['San Luis Potosí', -100.6, 22.6],
    ['Nayarit', -104.8, 21.8], ['Aguascalientes', -102.35, 21.95], ['Jalisco', -103.6, 20.3], ['Guanajuato', -101.1, 20.9],
    ['Querétaro', -99.9, 20.85], ['Hidalgo', -98.8, 20.45], ['Colima', -103.95, 19.15], ['Michoacán', -101.8, 19.2],
    ['Estado de México', -99.75, 19.5], ['Ciudad de México', -99.13, 19.3], ['Morelos', -99.05, 18.8],
    ['Tlaxcala', -98.2, 19.42], ['Puebla', -97.9, 18.7], ['Veracruz', -96.7, 19.4], ['Guerrero', -100.0, 17.6],
    ['Oaxaca', -96.6, 16.9], ['Chiapas', -92.6, 16.4], ['Tabasco', -92.7, 18.0], ['Campeche', -90.3, 19.0],
    ['Yucatán', -89.0, 20.8], ['Quintana Roo', -88.1, 19.4],
  ];
  const PAISES = [
    ['Guatemala', -90.4, 15.6], ['Belice', -88.7, 17.2], ['El Salvador', -88.9, 13.75], ['Honduras', -86.6, 14.9],
    ['Nicaragua', -85.2, 12.9], ['Costa Rica', -84.1, 9.9], ['Panamá', -80.2, 8.6], ['Cuba', -79.0, 21.8],
    ['Haití', -72.6, 19.1], ['República Dominicana', -70.3, 18.8], ['Puerto Rico', -66.5, 18.2],
    ['Colombia', -73.5, 4.5, 1.25], ['Venezuela', -66, 7.5, 1.2], ['Ecuador', -78.4, -1.4], ['Perú', -75, -9.8, 1.2],
    ['Bolivia', -64.7, -16.7, 1.15], ['Brasil', -51, -10, 1.6], ['Paraguay', -58.2, -23.3], ['Uruguay', -56, -32.7],
    ['Argentina', -64.5, -34.5, 1.4], ['Chile', -70.8, -30, 1.1],
  ];

  const PHASES = [
    {
      lon: [-105.95, -101.35], lat: [18.95, 22.85], k: 300, margin: 130, minD: 92, rad: 15,
      land: [JALISCO], foreign: [], consumed: [], lakes: [{ lon: -103.05, lat: 20.22, rx: 0.42, ry: 0.07 }],
      labels: [['NAYARIT', -104.9, 21.75], ['ZACATECAS', -102.35, 22.65], ['MICHOACÁN', -102.4, 19.35],
        ['COLIMA', -103.95, 19.05], ['OCÉANO PACÍFICO', -105.4, 19.4], ['LAGO DE CHAPALA', -103.05, 20.08]],
      items: MUNICIPIOS, start: [-102.4, 21.75], crumbs: 90, rivals: 1, drones: 0, hunger: 11,
      pts: 100, mass: 5, heal: 3, bonus: 1000,
    },
    {
      lon: [-117.6, -86.4], lat: [14.2, 33.1], k: 64, margin: 140, minD: 76, rad: 15,
      land: [MAINLAND, PENINSULA], foreign: [USA, CENTRAL, CUBA], consumed: [], lakes: [],
      labels: [['EE. UU.', -101, 31.6], ['OCÉANO PACÍFICO', -110, 18.2], ['GOLFO DE MÉXICO', -92.5, 24.5], ['GUATEMALA', -90.3, 15.0]],
      items: ESTADOS, start: [-103.6, 21.2], crumbs: 120, rivals: 2, drones: 2, hunger: 10,
      pts: 200, mass: 4, heal: 3, bonus: 2000,
    },
    {
      lon: [-118, -33], lat: [-56, 33], k: 24, margin: 140, minD: 84, rad: 17,
      land: [CENTRAL, CUBA, HISPANIOLA, PUERTO_RICO, SUDAMERICA], foreign: [USA], consumed: [MAINLAND, PENINSULA], lakes: [],
      labels: [['EE. UU.', -100, 31], ['MÉXICO (CONSUMIDO)', -103, 24], ['OCÉANO PACÍFICO', -100, -10], ['OCÉANO ATLÁNTICO', -40, 10]],
      items: PAISES, start: [-97, 17], crumbs: 140, rivals: 3, drones: 4, hunger: 10,
      pts: 400, mass: 5, heal: 4, bonus: 4000,
    },
  ];

  const PELLET_COLS = ['#9dff3a', '#d9259a', '#e3d34a', '#b98cff', '#5fe0c8', '#ff7a4a'];
  const CRUMB_COLS = ['#9dff3a', '#d9259a', '#e3d34a', '#b98cff'];
  const MS = 0.5;           // resolución del mapa precalculado (px por unidad de mundo)
  const START_MASS = 14, MIN_MASS = 10;
  const FLOOR3 = 6;         // en la fase bonus la atención no baja de aquí (se termina ganando)

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const radiusOf = (mass) => 7 + 10 * (1 - Math.exp(-mass / 170));
  const lengthOf = (mass) => Math.min(1250, 120 + mass * 4);

  // Construye la geometría de una fase en coordenadas de mundo.
  function buildPhase(def, idx) {
    const latMid = (def.lat[0] + def.lat[1]) / 2;
    const cosL = Math.cos(clamp(latMid, -30, 30) * Math.PI / 180);
    const kx = def.k * cosL, ky = def.k, m = def.margin;
    const P = {
      idx, def,
      W: Math.round((def.lon[1] - def.lon[0]) * kx + 2 * m),
      H: Math.round((def.lat[1] - def.lat[0]) * ky + 2 * m),
    };
    P.px = (lon) => (lon - def.lon[0]) * kx + m;
    P.py = (lat) => (def.lat[1] - lat) * ky + m;
    const proj = (poly) => poly.map(([lo, la]) => [P.px(lo), P.py(la)]);
    P.land = def.land.map(proj);
    P.foreign = def.foreign.map(proj);
    P.consumed = def.consumed.map(proj);
    P.lakes = def.lakes.map((l) => ({ x: P.px(l.lon), y: P.py(l.lat), rx: l.rx * kx, ry: l.ry * ky }));
    P.labels = def.labels.map(([t, lo, la]) => ({ t, x: P.px(lo), y: P.py(la) }));
    P.items = def.items.map(([name, lo, la, s], i) => ({
      name, x: P.px(lo), y: P.py(la), r: def.rad * (s || 1), col: PELLET_COLS[i % PELLET_COLS.length],
      eaten: false, ph: Math.random() * 6.28,
    }));
    // separa los que quedan amontonados (área metropolitana de Guadalajara, centro del país, Centroamérica…)
    const its = P.items;
    for (let it = 0; it < 120; it++) {
      for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) {
        const a = its[i], b = its[j];
        const need = def.minD + (a.r + b.r - 2 * def.rad);
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= need) continue;
        if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const push = (need - d) / 2 * 0.6;
        a.x -= dx / d * push; a.y -= dy / d * push;
        b.x += dx / d * push; b.y += dy / d * push;
      }
      for (const a of its) { a.x = clamp(a.x, m * 0.7, P.W - m * 0.7); a.y = clamp(a.y, m * 0.7, P.H - m * 0.7); }
    }
    // etiquetas: abajo si chocarían con la de un vecino cercano
    its.forEach((a, i) => {
      a.below = its.some((b, j) => j < i && !b.below && Math.abs(b.y - a.y) < 34 && Math.abs(b.x - a.x) < 9 * (a.name.length + b.name.length) / 2);
    });
    P.start = { x: P.px(def.start[0]), y: P.py(def.start[1]) };
    P.onLand = (x, y) => P.land.some((p) => inPoly(x, y, p));
    return P;
  }

  // Dibuja el mapa de una fase en un canvas aparte (una vez por fase).
  function renderMap(P) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(P.W * MS); c.height = Math.ceil(P.H * MS);
    const g = c.getContext('2d');
    g.scale(MS, MS);
    g.fillStyle = '#07040b';
    g.fillRect(0, 0, P.W, P.H);
    // mar: líneas de barrido
    g.fillStyle = '#0c0713';
    for (let y = 0; y < P.H; y += 8) g.fillRect(0, y, P.W, 3);
    // retícula
    g.fillStyle = '#1a1126';
    for (let x = 0; x < P.W; x += 120) g.fillRect(x, 0, 2, P.H);
    for (let y = 0; y < P.H; y += 120) g.fillRect(0, y, P.W, 2);
    const path = (poly) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const hatch = (poly, col, step, w) => {
      g.save(); path(poly); g.clip();
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath();
      for (let d = -P.H; d < P.W; d += step) { g.moveTo(d, 0); g.lineTo(d + P.H, P.H); }
      g.stroke(); g.restore();
    };
    for (const poly of P.foreign) {
      path(poly); g.fillStyle = '#120a18'; g.fill();
      hatch(poly, '#1d1226', 14, 4);
      g.strokeStyle = 'rgba(154,134,168,.35)'; g.lineWidth = 3; path(poly); g.stroke();
    }
    for (const poly of P.consumed) {
      path(poly); g.fillStyle = '#2a0d18'; g.fill();
      g.save(); path(poly); g.clip();
      g.fillStyle = 'rgba(200,40,60,.35)';
      for (let y = 0; y < P.H; y += 20) g.fillRect(0, y, P.W, 10);
      g.restore();
      g.strokeStyle = 'rgba(217,37,154,.5)'; g.lineWidth = 3; path(poly); g.stroke();
    }
    for (const poly of P.land) {
      path(poly); g.fillStyle = '#1b0f29'; g.fill();
      // tramado tipo dither
      g.save(); path(poly); g.clip();
      g.fillStyle = '#241536';
      for (let y = 0; y < P.H; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < P.W; x += 8) g.fillRect(x, y, 4, 4);
      g.restore();
    }
    for (const l of P.lakes) {
      g.beginPath(); g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      g.fillStyle = '#0c0713'; g.fill();
      g.strokeStyle = 'rgba(157,255,58,.45)'; g.lineWidth = 3; g.stroke();
    }
    g.strokeStyle = 'rgba(157,255,58,.7)'; g.lineWidth = 4;
    for (const poly of P.land) { path(poly); g.stroke(); }
    g.font = 'bold 26px "Lucida Console", "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(154,134,168,.55)';
    for (const l of P.labels) g.fillText(l.t, l.x, l.y);
    return c;
  }
  // "Bandera plantada" donde se comió algo.
  function stamp(map, it) {
    const g = map.getContext('2d');
    g.save(); g.scale(MS, MS);
    const R = it.r * 1.7;
    g.beginPath(); g.arc(it.x, it.y, R, 0, Math.PI * 2); g.clip();
    for (let k = -6; k < 6; k++) {
      g.fillStyle = k & 1 ? 'rgba(230,226,216,.5)' : 'rgba(200,40,60,.6)';
      g.fillRect(it.x - R, it.y + k * (R / 6), R * 2, R / 6);
    }
    g.fillStyle = 'rgba(36,48,122,.75)';
    g.fillRect(it.x - R, it.y - R, R, R);
    g.restore();
  }
  function renderMini(P, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const s = w / P.W;
    g.fillStyle = '#07040b'; g.fillRect(0, 0, w, h);
    const path = (poly) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s))); g.closePath(); };
    g.fillStyle = '#160d1e'; for (const p of P.foreign) { path(p); g.fill(); }
    g.fillStyle = '#3a1020'; for (const p of P.consumed) { path(p); g.fill(); }
    g.fillStyle = '#2a1840'; g.strokeStyle = 'rgba(157,255,58,.6)'; g.lineWidth = 1;
    for (const p of P.land) { path(p); g.fill(); g.stroke(); }
    return c;
  }

  Game.minijuegos.serpiente = function (host) {
    const G0 = (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.serpiente) || {};
    const T = Object.assign({}, DEFAULTS, G0);
    T.fases = DEFAULTS.fases.map((f, i) => Object.assign({}, f, (G0.fases && G0.fases[i]) || {}));
    T.golpes = Object.assign({}, DEFAULTS.golpes, G0.golpes || {});
    if (!Array.isArray(T.rivales) || !T.rivales.length) T.rivales = DEFAULTS.rivales;

    // ---------- DOM ----------
    const root = el('div', 'mj-serp-root');
    const canvas = el('canvas', 'mj-serp-canvas');
    const lab = el('canvas', 'mj-serp-labels');
    const flash = el('div', 'mj-serp-flash');
    const hud = el('div', 'mj-serp-hud');
    const hudTitle = el('div', 'mj-serp-hud-title');
    const hudCount = el('div', 'mj-serp-hud-count');
    const hudBar = el('div', 'mj-serp-hud-bar');
    const hudFill = el('div', 'mj-serp-hud-fill');
    hudBar.appendChild(hudFill);
    hud.append(hudTitle, hudCount, hudBar);
    const stats = el('div', 'mj-serp-stats');
    const scoreEl = el('div', 'mj-serp-score');
    const lenEl = el('div', 'mj-serp-len');
    stats.append(scoreEl, lenEl);
    const help = el('div', 'mj-serp-help', T.ayuda);
    const miniWrap = el('div', 'mj-serp-mini');
    const mini = el('canvas', 'mj-serp-mini-c');
    miniWrap.appendChild(mini);
    const warn = el('div', 'mj-serp-warn', T.distraccion);
    warn.hidden = true;
    const banner = el('div', 'mj-serp-banner');
    banner.hidden = true;
    const btnEnd = el('button', 'mj-serp-btn mj-serp-endbtn', T.terminar);
    btnEnd.hidden = true;
    btnEnd.setAttribute('data-cursor', 'hand');
    const ov = el('div', 'mj-serp-ov');
    root.append(canvas, lab, flash, hud, stats, help, miniWrap, warn, banner, btnEnd, ov);
    host.appendChild(root);

    const ctx = canvas.getContext('2d');
    const lctx = lab.getContext('2d');

    let PIX = 2, CW = 1, CH = 1, LW = 1, LH = 1, dpr = 1;
    function fit() {
      LW = Math.max(1, root.clientWidth); LH = Math.max(1, root.clientHeight);
      PIX = LW < 700 ? 1 : 2;
      CW = Math.max(1, Math.round(LW / PIX)); CH = Math.max(1, Math.round(LH / PIX));
      canvas.width = CW; canvas.height = CH;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      lab.width = Math.round(LW * dpr); lab.height = Math.round(LH * dpr);
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(host); }
    fit();

    // ---------- audio ----------
    let actx = null;
    function beep(f0, f1, dur, type, gain, delay) {
      try {
        if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
        if (actx.state === 'suspended') actx.resume();
        const t0 = actx.currentTime + (delay || 0);
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        g.gain.setValueAtTime(gain || 0.05, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(actx.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch (e) { /* sin audio */ }
    }
    const snd = (name, arg) => { try { if (Game.sound && Game.sound[name]) Game.sound[name](arg); } catch (e) { /* nada */ } };
    const addScore = (n) => { pts += n; try { if (Game.score) Game.score.add(n); } catch (e) { /* nada */ } };
    const att = () => (Game.atencion ? Game.atencion.value : 100);

    // ---------- estado ----------
    let alive = true, raf = 0, last = 0, clock = 0;
    let state = 'intro';       // intro | banner | play | choice | won
    let phase = -1, P = null, mapC = null, miniBase = null;
    let pts = 0;
    let resolveDone;
    const done = new Promise((res) => { resolveDone = res; });
    const jobs = [];
    const after = (sec, fn) => jobs.push({ t: clock + sec, fn });

    const player = { x: 0, y: 0, a: 0, mass: START_MASS, trail: [], pts: [], invul: 0, boost: false };
    let crumbs = [], rivals = [], drones = [], parts = [], floats = [];
    let hungry = 0, shake = 0, camX = 0, camY = 0, zoom = 1, aimA = null;
    let mouse = null, held = false, dropAcc = 0, miniTick = 0;
    let choiceLeft = 0, choiceEl = null;

    function resetTrail(s, len) {
      s.trail = [];
      for (let d = len; d >= 0; d -= 4) s.trail.push({ x: s.x - Math.cos(s.a) * d, y: s.y - Math.sin(s.a) * d });
    }
    function moveSnake(s, sp, dt, L) {
      s.x += Math.cos(s.a) * sp * dt;
      s.y += Math.sin(s.a) * sp * dt;
      const lp = s.trail[s.trail.length - 1];
      if (!lp || Math.hypot(s.x - lp.x, s.y - lp.y) >= 3) s.trail.push({ x: s.x, y: s.y });
      let acc = 0, cut = 0;
      for (let i = s.trail.length - 1; i > 0; i--) {
        acc += Math.hypot(s.trail[i].x - s.trail[i - 1].x, s.trail[i].y - s.trail[i - 1].y);
        if (acc > L + 12) { cut = i - 1; break; }
      }
      if (cut > 0) s.trail.splice(0, cut);
    }
    function bodyPoints(s, r, L) {
      const out = [{ x: s.x, y: s.y }];
      const sp = Math.max(3, r * 0.5);
      const n = Math.floor(L / sp);
      let want = sp, acc = 0, px = s.x, py = s.y;
      for (let i = s.trail.length - 1; i >= 0 && out.length <= n; i--) {
        const b = s.trail[i];
        const Ls = Math.hypot(b.x - px, b.y - py);
        while (Ls > 0 && acc + Ls >= want && out.length <= n) {
          const k = (want - acc) / Ls;
          out.push({ x: px + (b.x - px) * k, y: py + (b.y - py) * k });
          want += sp;
        }
        acc += Ls; px = b.x; py = b.y;
      }
      return out;
    }
    function steer(s, target, rate, dt) {
      let diff = target - s.a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.a += clamp(diff, -rate * dt, rate * dt);
    }

    // ---------- comida ----------
    function spawnCrumb(x, y, v, life) {
      if (x == null) {
        for (let k = 0; k < 8; k++) {
          x = rnd(40, P.W - 40); y = rnd(40, P.H - 40);
          if (Math.random() < 0.3 || P.onLand(x, y)) break;
        }
      }
      crumbs.push({ x, y, v: v || 0.7, c: CRUMB_COLS[(Math.random() * CRUMB_COLS.length) | 0], ph: Math.random() * 6.28, life: life || 0 });
    }
    function burst(x, y, col, n, sp) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (sp || 120) * (0.3 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.4, c: k % 3 ? col : '#ffffff' });
      }
    }
    function floatText(x, y, text, col) { floats.push({ x, y, text, col: col || '#e3d34a', life: 1.1 }); }

    // ---------- enemigos ----------
    const RIVAL_SKINS = [
      { a: '#e3d34a', b: '#141018', head: '#e3d34a' },     // CFE: amarillo/negro de peligro
      { a: '#4a4a5c', b: '#2c2c38', head: '#5a5a70', led: '#9dff3a' },  // data center
      { a: '#8a5a32', b: '#3c2414', head: '#a06a3a' },     // minera
    ];
    function farPoint(minD) {
      for (let k = 0; k < 30; k++) {
        const x = rnd(80, P.W - 80), y = rnd(80, P.H - 80);
        if (Math.hypot(x - player.x, y - player.y) > minD) return { x, y };
      }
      return { x: player.x > P.W / 2 ? 100 : P.W - 100, y: player.y > P.H / 2 ? 100 : P.H - 100 };
    }
    function makeRival(i) {
      const p = farPoint(700);
      const rv = {
        i, name: T.rivales[i % T.rivales.length], skin: RIVAL_SKINS[i % RIVAL_SKINS.length],
        x: p.x, y: p.y, a: Math.random() * 6.28, r: 9 + i, L: 300 + i * 70,
        speed: 140 + phase * 10 + i * 6, turn: 3.0, trail: [], pts: [], alive: true, think: 0, tx: p.x, ty: p.y, respawn: 0,
      };
      resetTrail(rv, rv.L);
      return rv;
    }
    function makeDrone() {
      const p = farPoint(650);
      return { x: p.x, y: p.y, vx: 0, vy: 0, alive: true, respawn: 0, ph: Math.random() * 6.28 };
    }

    // ---------- fases ----------
    function startPhase(i) {
      phase = i;
      P = buildPhase(PHASES[i], i);
      mapC = renderMap(P);
      const mw = 168, mh = Math.round(mw * P.H / P.W);
      mini.width = mw; mini.height = mh;
      miniBase = renderMini(P, mw, mh);
      player.x = P.start.x; player.y = P.start.y;
      player.a = Math.atan2(P.H / 2 - player.y, P.W / 2 - player.x);
      resetTrail(player, lengthOf(player.mass));
      player.invul = 1.5;
      camX = player.x; camY = player.y;
      crumbs = []; parts = []; floats = [];
      for (let k = 0; k < PHASES[i].crumbs; k++) spawnCrumb();
      rivals = []; for (let k = 0; k < PHASES[i].rivals; k++) rivals.push(makeRival(k));
      drones = []; for (let k = 0; k < PHASES[i].drones; k++) drones.push(makeDrone());
      hungry = 0;
      btnEnd.hidden = i !== 2;
      updateHud(true);
      showBanner(T.fases[i].titulo, T.fases[i].meta, 2.2, () => { state = 'play'; });
    }
    function showBanner(big, small, sec, then) {
      state = 'banner';
      banner.innerHTML = '';
      banner.append(el('div', 'mj-serp-banner-big', big));
      if (small) banner.append(el('div', 'mj-serp-banner-small', small));
      banner.hidden = false;
      banner.classList.remove('mj-serp-pop'); void banner.offsetWidth; banner.classList.add('mj-serp-pop');
      after(sec, () => { banner.hidden = true; if (then) then(); });
    }
    function remaining() { return P ? P.items.filter((it) => !it.eaten).length : 0; }
    function phaseComplete() {
      const def = PHASES[phase];
      addScore(def.bonus);
      floatText(player.x, player.y - 40, '+' + def.bonus, '#9dff3a');
      updateHud();
      [392, 523, 659, 784].forEach((fq, k) => beep(fq, fq, 0.15, 'square', 0.045, k * 0.11));
      snd('message', true);
      warn.hidden = true; root.classList.remove('mj-serp-distraido');
      if (phase === 0) {
        showBanner(T.fases[0].fin, '+' + def.bonus, 1.8, () => startPhase(1));
      } else if (phase === 1) {
        showChoice();
      } else {
        finish(T.gana);
      }
    }
    function showChoice() {
      state = 'choice';
      choiceLeft = 10;
      ov.innerHTML = '';
      ov.className = 'mj-serp-ov mj-serp-ov-dim';
      const win = el('div', 'mj-serp-dlg');
      const bar = el('div', 'mj-serp-dlg-bar', 'plan_mexico.exe');
      const body = el('div', 'mj-serp-dlg-body');
      body.append(el('div', 'mj-serp-dlg-big', T.fases[1].fin), el('div', 'mj-serp-dlg-txt', T.eleccion));
      const btns = el('div', 'mj-serp-dlg-btns');
      const bEnd = el('button', 'mj-serp-btn', T.terminar);
      const bGo = el('button', 'mj-serp-btn mj-serp-btn-go', T.seguir);
      bEnd.setAttribute('data-cursor', 'hand'); bGo.setAttribute('data-cursor', 'hand');
      bEnd.addEventListener('click', (e) => { e.stopPropagation(); closeChoice(); finish(T.ganaMexico); });
      bGo.addEventListener('click', (e) => { e.stopPropagation(); closeChoice(); startPhase(2); });
      btns.append(bEnd, bGo);
      const cd = el('div', 'mj-serp-dlg-cd');
      body.append(btns, cd);
      win.append(bar, body);
      ov.append(win);
      ov.hidden = false;
      choiceEl = cd;
    }
    function closeChoice() { ov.hidden = true; ov.innerHTML = ''; choiceEl = null; }
    function finish(msg) {
      if (state === 'won') return;
      state = 'won';
      btnEnd.hidden = true; warn.hidden = true; banner.hidden = true;
      root.classList.remove('mj-serp-distraido');
      ov.innerHTML = '';
      ov.className = 'mj-serp-ov mj-serp-ov-dim';
      ov.append(el('div', 'mj-serp-win', msg), el('div', 'mj-serp-win-pts', T.puntos + ' ' + pts));
      ov.hidden = false;
      [523, 659, 784, 1046].forEach((fq, k) => beep(fq, fq, 0.16, 'square', 0.045, k * 0.12));
      after(1.8, () => resolveDone(true));
    }

    // ---------- daño ----------
    function hurt(n, why) {
      if (player.invul > 0 || state !== 'play') return;
      player.invul = 1.1; shake = 0.4;
      if (phase === 2) n = Math.min(n, Math.max(0, att() - FLOOR3));
      if (n > 0 && Game.atencion) Game.atencion.danar(n);
      snd('glitch');
      beep(140, 60, 0.25, 'sawtooth', 0.05);
      floatText(player.x, player.y - 30, (T.golpes[why] || '!') + ' -' + Math.round(n), '#ff4d6d');
      flash.classList.remove('mj-serp-flash-on'); void flash.offsetWidth; flash.classList.add('mj-serp-flash-on');
      if (phase === 2 && att() <= FLOOR3 + 0.01) finish(T.agotado);
    }

    // ---------- entrada ----------
    function onMove(e) {
      const r = root.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function onDown(e) {
      if (e.button !== 0) return;
      if (state === 'intro') { e.stopPropagation(); begin(); return; }
      held = true;
    }
    function onUp() { held = false; }
    function onEnd(e) { e.stopPropagation(); if (state === 'play' || state === 'banner') finish(T.ganaMexico); }
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    btnEnd.addEventListener('mousedown', (e) => e.stopPropagation());
    btnEnd.addEventListener('click', onEnd);
    ov.addEventListener('mousedown', (e) => { if (state !== 'intro') e.stopPropagation(); });

    function begin() {
      ov.hidden = true; ov.innerHTML = '';
      beep(330, 660, 0.12, 'square', 0.04);
      startPhase(0);
    }

    // intro
    ov.className = 'mj-serp-ov mj-serp-ov-intro';
    ov.setAttribute('data-cursor', 'hand');
    const card = el('div', 'mj-serp-card');
    card.append(el('div', 'mj-serp-dlg-bar', 'plan_mexico.exe'));
    const cb = el('div', 'mj-serp-card-body');
    cb.append(el('div', 'mj-serp-title', T.titulo), el('div', 'mj-serp-ins', T.instrucciones),
      el('div', 'mj-serp-ins mj-serp-ins-dim', T.peligros), el('div', 'mj-serp-ins mj-serp-ins-min', T.minimo),
      el('div', 'mj-serp-go', T.empezar));
    card.append(cb);
    ov.append(card);
    // fondo de la intro: mapa de la fase 1
    P = buildPhase(PHASES[0], 0); mapC = renderMap(P);
    camX = P.W / 2; camY = P.H / 2;

    // ---------- HUD ----------
    const hudCache = {};
    function setText(node, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } }
    function updateHud() {
      if (phase < 0) return;
      const tot = P.items.length, got = tot - remaining();
      setText(hudTitle, 't', T.fases[phase].titulo);
      setText(hudCount, 'c', T.fases[phase].contador + ': ' + got + '/' + tot);
      const w = Math.round(got / tot * 100) + '%';
      if (hudCache.w !== w) { hudCache.w = w; hudFill.style.width = w; }
      setText(scoreEl, 's', T.puntos + ' ' + String(pts).padStart(6, '0'));
      setText(lenEl, 'l', T.longitud + ' ' + Math.round(lengthOf(player.mass)));
    }

    // ---------- lógica ----------
    function update(dt) {
      clock += dt;
      for (let i = jobs.length - 1; i >= 0; i--) if (clock >= jobs[i].t) { const j = jobs.splice(i, 1)[0]; if (alive) j.fn(); }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
      }
      for (let i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt; floats[i].y -= 30 * dt; if (floats[i].life <= 0) floats.splice(i, 1); }
      shake = Math.max(0, shake - dt);

      if (state === 'choice') {
        choiceLeft -= dt;
        if (choiceEl) choiceEl.textContent = T.auto + ' ' + Math.max(0, Math.ceil(choiceLeft)) + '…';
        if (choiceLeft <= 0) { closeChoice(); startPhase(2); }
        return;
      }
      if (state !== 'play') return;
      const def = PHASES[phase];

      // --- jugador ---
      const r = radiusOf(player.mass), L = lengthOf(player.mass);
      const hs = toScreen(player.x, player.y);
      let tight = 1;
      if (mouse) {
        const dx = mouse.x - hs.x, dy = mouse.y - hs.y;
        if (dx * dx + dy * dy > 64) aimA = Math.atan2(dy, dx);
        // gira más cerrado si el ratón está cerca de la cabeza (si no, se queda dando vueltas alrededor)
        const dW = Math.sqrt(dx * dx + dy * dy) / (zoom * PIX);
        tight = 1 + 2.5 * Math.max(0, 1 - dW / 140);
      }
      if (aimA != null) steer(player, aimA, tight * 5.6 / (1 + (r - 7) / 18), dt);
      player.boost = held && player.mass > MIN_MASS + 0.5;
      let sp = 175;
      if (player.boost) {
        sp *= 1.85;
        player.mass = Math.max(MIN_MASS, player.mass - 7 * dt);
        dropAcc += dt;
        if (dropAcc > 0.09) {
          dropAcc = 0;
          const tl = player.trail[0] || player;
          spawnCrumb(tl.x + rnd(-6, 6), tl.y + rnd(-6, 6), 0.4, 12);
        }
      }
      moveSnake(player, sp, dt, L);
      player.invul = Math.max(0, player.invul - dt);
      // orilla del mapa
      let wall = false;
      if (player.x < r) { player.x = r; player.a = Math.PI - player.a; wall = true; }
      if (player.x > P.W - r) { player.x = P.W - r; player.a = Math.PI - player.a; wall = true; }
      if (player.y < r) { player.y = r; player.a = -player.a; wall = true; }
      if (player.y > P.H - r) { player.y = P.H - r; player.a = -player.a; wall = true; }
      if (wall) { aimA = player.a; hurt(6, 'pared'); }
      player.pts = bodyPoints(player, r, L);

      // --- migajas ---
      for (let i = crumbs.length - 1; i >= 0; i--) {
        const c = crumbs[i];
        if (c.life) { c.life -= dt; if (c.life <= 0) { crumbs.splice(i, 1); continue; } }
        const dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
        if (d < r + 40) {
          const pull = 380 * dt;
          c.x += dx / d * Math.min(pull, d); c.y += dy / d * Math.min(pull, d);
          if (d < r + 2) {
            crumbs.splice(i, 1);
            player.mass += c.v;
            addScore(5);
            if (Game.atencion) Game.atencion.curar(0.2);
            if (Math.random() < 0.3) beep(880, 1320, 0.03, 'square', 0.015);
          }
        }
      }
      let base = 0; for (const c of crumbs) if (!c.life) base++;
      while (base < def.crumbs) { spawnCrumb(); base++; }

      // --- comer municipios / estados / países ---
      for (const it of P.items) {
        if (it.eaten) continue;
        const dx = player.x - it.x, dy = player.y - it.y, d = Math.hypot(dx, dy);
        if (d < r + 70 && d > 0) { const pull = Math.min(d, 150 * dt); it.x += dx / d * pull; it.y += dy / d * pull; }
        if (d < r + it.r * 0.8) eatItem(it);
        if (state !== 'play') return;
      }

      // --- rivales ---
      for (const rv of rivals) {
        if (!rv.alive) {
          rv.respawn -= dt;
          if (rv.respawn <= 0) Object.assign(rv, makeRival(rv.i));
          continue;
        }
        rv.think -= dt;
        if (rv.think <= 0) {
          rv.think = rnd(0.5, 1.3);
          const dp = Math.hypot(player.x - rv.x, player.y - rv.y);
          if (dp < 520 && Math.random() < 0.65) {
            // intenta cerrarle el paso a la serpiente
            rv.tx = player.x + Math.cos(player.a) * 160; rv.ty = player.y + Math.sin(player.a) * 160;
          } else {
            let best = null, bd = 1e9;
            for (const c of crumbs) { const d = Math.hypot(c.x - rv.x, c.y - rv.y); if (d < bd) { bd = d; best = c; } }
            if (best && bd < 400 && Math.random() < 0.6) { rv.tx = best.x; rv.ty = best.y; }
            else { rv.tx = rnd(100, P.W - 100); rv.ty = rnd(100, P.H - 100); }
          }
        }
        let tx = rv.tx, ty = rv.ty;
        if (rv.x < 120 || rv.x > P.W - 120 || rv.y < 120 || rv.y > P.H - 120) { tx = P.W / 2; ty = P.H / 2; }
        steer(rv, Math.atan2(ty - rv.y, tx - rv.x), rv.turn, dt);
        moveSnake(rv, rv.speed, dt, rv.L);
        if (rv.x < rv.r || rv.x > P.W - rv.r) { rv.x = clamp(rv.x, rv.r, P.W - rv.r); rv.a = Math.PI - rv.a; }
        if (rv.y < rv.r || rv.y > P.H - rv.r) { rv.y = clamp(rv.y, rv.r, P.H - rv.r); rv.a = -rv.a; }
        rv.pts = bodyPoints(rv, rv.r, rv.L);
        for (let i = crumbs.length - 1; i >= 0; i--) {
          const c = crumbs[i];
          if (Math.abs(c.x - rv.x) < rv.r + 6 && Math.abs(c.y - rv.y) < rv.r + 6) crumbs.splice(i, 1);
        }
        // la cabeza del jugador choca con el rival
        let hit = null;
        for (const q of rv.pts) if (Math.hypot(q.x - player.x, q.y - player.y) < r + rv.r * 0.85) { hit = q; break; }
        if (hit) {
          player.a = Math.atan2(player.y - hit.y, player.x - hit.x); aimA = player.a;
          player.x += Math.cos(player.a) * 6; player.y += Math.sin(player.a) * 6;
          hurt(10, 'rival');
          continue;
        }
        // la cabeza del rival choca con el cuerpo del jugador: el rival revienta
        for (let i = 3; i < player.pts.length; i++) {
          const q = player.pts[i];
          if (Math.hypot(q.x - rv.x, q.y - rv.y) < rv.r + r * 0.8) { killRival(rv); break; }
        }
      }

      // --- drones ---
      for (const dn of drones) {
        if (!dn.alive) {
          dn.respawn -= dt;
          if (dn.respawn <= 0) Object.assign(dn, makeDrone());
          continue;
        }
        dn.ph += dt * 3;
        const dx = player.x - dn.x, dy = player.y - dn.y, d = Math.hypot(dx, dy) || 1;
        const vmax = 105 + phase * 18;
        const wob = Math.sin(dn.ph) * 0.6;
        const ux = dx / d, uy = dy / d;
        dn.vx += ((ux - uy * wob) * vmax - dn.vx) * 1.4 * dt;
        dn.vy += ((uy + ux * wob) * vmax - dn.vy) * 1.4 * dt;
        dn.x += dn.vx * dt; dn.y += dn.vy * dt;
        if (d < r + 10) { hurt(7, 'dron'); killDrone(dn, false); continue; }
        for (let i = 3; i < player.pts.length; i++) {
          const q = player.pts[i];
          if (Math.abs(q.x - dn.x) < r + 8 && Math.abs(q.y - dn.y) < r + 8) { killDrone(dn, true); break; }
        }
      }

      // --- distracción ---
      hungry += dt;
      const lim = def.hunger;
      const draining = hungry > lim;
      warn.hidden = hungry < lim - 3;
      warn.classList.toggle('mj-serp-warn-on', draining);
      root.classList.toggle('mj-serp-distraido', draining);
      if (draining && Game.atencion) {
        let n = 3 * dt;
        if (phase === 2) n = Math.min(n, Math.max(0, att() - FLOOR3));
        if (n > 0) Game.atencion.danar(n);
        if (phase === 2 && att() <= FLOOR3 + 0.01) finish(T.agotado);
      }
      updateHud();
    }
    function eatItem(it) {
      const def = PHASES[phase];
      it.eaten = true;
      player.mass += def.mass;
      hungry = 0;
      addScore(def.pts);
      if (Game.atencion) Game.atencion.curar(def.heal);
      stamp(mapC, it);
      burst(it.x, it.y, it.col, 18, 160);
      floatText(it.x, it.y - it.r - 10, it.name + ' +' + def.pts, it.col);
      const n = P.items.length - remaining();
      beep(520 + n * 14, 260, 0.08, 'square', 0.045);
      beep(700 + n * 14, 900, 0.06, 'square', 0.035, 0.07);
      updateHud();
      if (remaining() === 0) phaseComplete();
    }
    function killRival(rv) {
      rv.alive = false; rv.respawn = 7;
      for (let i = 0; i < rv.pts.length; i += 2) spawnCrumb(rv.pts[i].x + rnd(-5, 5), rv.pts[i].y + rnd(-5, 5), 1.2, 15);
      burst(rv.x, rv.y, rv.skin.a, 26, 200);
      addScore(300);
      floatText(rv.x, rv.y - 20, T.corte + ' +300', '#9dff3a');
      beep(300, 1200, 0.2, 'square', 0.05);
    }
    function killDrone(dn, caught) {
      dn.alive = false; dn.respawn = 6;
      burst(dn.x, dn.y, '#d9259a', 14, 150);
      if (caught) {
        addScore(150);
        floatText(dn.x, dn.y - 14, T.dronAtrapado + ' +150', '#5fe0c8');
        beep(600, 1500, 0.12, 'square', 0.04);
      }
    }

    // ---------- dibujo ----------
    function toScreen(x, y) {
      return { x: (x - camX) * zoom * PIX + LW / 2, y: (y - camY) * zoom * PIX + LH / 2 };
    }
    function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    function drawPlayer(r) {
      const pts = player.pts.length ? player.pts : [{ x: player.x, y: player.y }];
      const blink = player.invul > 0 && Math.floor(clock * 14) % 2 === 0;
      if (blink && state === 'play') ctx.globalAlpha = 0.45;
      const n = pts.length;
      const rad = (i) => r * (i > n - 6 ? 0.55 + 0.09 * (n - i) : 1);
      for (let i = n - 1; i >= 0; i--) circle(pts[i].x + 3, pts[i].y + 4, rad(i) + 1, 'rgba(0,0,0,.45)');
      for (let i = n - 1; i >= 0; i--) circle(pts[i].x, pts[i].y, rad(i) + 2, '#0a070d');
      for (let i = n - 1; i >= 1; i--) {
        circle(pts[i].x, pts[i].y, rad(i), Math.floor((i - 1) / 3) % 2 === 0 ? '#c8283c' : '#e8e4d8');
        if (player.boost && i % 4 === 0) { ctx.globalAlpha *= 0.35; circle(pts[i].x, pts[i].y, rad(i) + 5, '#e3d34a'); ctx.globalAlpha = blink ? 0.45 : 1; }
      }
      // cabeza: azul con estrellas
      circle(player.x, player.y, r + 1, '#24307a');
      ctx.fillStyle = '#ffffff';
      const st = r / 4;
      for (const [sx, sy] of [[-2, -2], [1, -3], [-3, 1], [0, 0], [2, 2], [-1, 3], [3, -1]]) ctx.fillRect(player.x + sx * st - 1, player.y + sy * st - 1, 2, 2);
      const look = aimA != null ? aimA : player.a;
      const fx = Math.cos(player.a), fy = Math.sin(player.a);
      for (const sgn of [-1, 1]) {
        const ex = player.x + fx * r * 0.45 - fy * r * 0.5 * sgn, ey = player.y + fy * r * 0.45 + fx * r * 0.5 * sgn;
        circle(ex, ey, r * 0.32, '#fff8d0');
        circle(ex + Math.cos(look) * r * 0.14, ey + Math.sin(look) * r * 0.14, r * 0.16, '#0a070d');
      }
      ctx.globalAlpha = 1;
    }
    function drawRival(rv) {
      const n = rv.pts.length;
      for (let i = n - 1; i >= 0; i--) circle(rv.pts[i].x + 3, rv.pts[i].y + 4, rv.r + 1, 'rgba(0,0,0,.4)');
      for (let i = n - 1; i >= 0; i--) circle(rv.pts[i].x, rv.pts[i].y, rv.r + 2, '#0a070d');
      for (let i = n - 1; i >= 1; i--) {
        const p = rv.pts[i];
        circle(p.x, p.y, rv.r, Math.floor(i / 2) % 2 ? rv.skin.a : rv.skin.b);
        if (rv.skin.led && i % 3 === 0 && Math.floor(clock * 6 + i) % 3 === 0) {
          ctx.fillStyle = rv.skin.led; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
      }
      circle(rv.x, rv.y, rv.r + 1.5, rv.skin.head);
      // rayo / ojo rojo
      ctx.fillStyle = '#0a070d';
      ctx.save(); ctx.translate(rv.x, rv.y); ctx.rotate(rv.a);
      ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(2, -1); ctx.lineTo(-1, 0); ctx.lineTo(4, 5); ctx.lineTo(-2, 1); ctx.lineTo(1, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#ff2a4a' : '#7a0a1a';
      ctx.fillRect(rv.r * 0.4, -2, 3, 4);
      ctx.restore();
    }
    function drawDrone(dn) {
      ctx.save(); ctx.translate(dn.x, dn.y);
      ctx.strokeStyle = '#0a070d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke();
      ctx.strokeStyle = '#9a86a8'; ctx.lineWidth = 2.5; ctx.stroke();
      const sp = clock * 30;
      for (const [x, y] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
        ctx.fillStyle = 'rgba(223,245,200,.5)';
        ctx.fillRect(x - 5 * Math.abs(Math.cos(sp)), y - 1, 10 * Math.abs(Math.cos(sp)), 2);
      }
      circle(0, 0, 5, '#1b1024');
      circle(0, 0, 2.5, Math.floor(clock * 5) % 2 ? '#d9259a' : '#5a0a3a');
      ctx.restore();
    }
    function drawItem(it) {
      const pulse = 1 + 0.08 * Math.sin(clock * 4 + it.ph);
      const R = it.r * pulse;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const a = k / 12 * Math.PI * 2;
        const rr = R * (1 + 0.14 * Math.sin(a * 3 + clock * 2.5 + it.ph));
        const x = it.x + Math.cos(a) * rr, y = it.y + Math.sin(a) * rr;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.25; ctx.fillStyle = it.col;
      ctx.save(); ctx.translate(it.x, it.y); ctx.scale(1.7, 1.7); ctx.translate(-it.x, -it.y); ctx.fill(); ctx.restore();
      ctx.globalAlpha = 1;
      ctx.fillStyle = it.col; ctx.fill();
      ctx.strokeStyle = '#0a070d'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(it.x - R * 0.45, it.y - R * 0.45, R * 0.3, R * 0.3);
    }
    function render() {
      // cámara
      if (phase >= 0) {
        const r = radiusOf(player.mass);
        const zs = Math.min(LW, LH) / 600 / (1 + (r - 7) / 13);
        zoom += (zs / PIX - zoom) * 0.08;
        if (state !== 'intro') { camX += (player.x - camX) * 0.18; camY += (player.y - camY) * 0.18; }
      } else {
        zoom = Math.min(CW / P.W, CH / P.H) * 1.05;
        camX = P.W / 2 + Math.sin(clock * 0.2) * 30; camY = P.H / 2;
      }
      const sx = shake > 0 ? rnd(-1, 1) * shake * 14 : 0, sy = shake > 0 ? rnd(-1, 1) * shake * 14 : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#030205';
      ctx.fillRect(0, 0, CW, CH);
      ctx.setTransform(zoom, 0, 0, zoom, CW / 2 - camX * zoom + sx, CH / 2 - camY * zoom + sy);
      ctx.drawImage(mapC, 0, 0, P.W, P.H);
      // orilla del mapa (hace daño)
      ctx.strokeStyle = Math.floor(clock * 3) % 2 ? '#d9259a' : '#8c1f74';
      ctx.lineWidth = 8;
      ctx.setLineDash([24, 16]); ctx.lineDashOffset = -clock * 40;
      ctx.strokeRect(-4, -4, P.W + 8, P.H + 8);
      ctx.setLineDash([]);
      // vista visible en coordenadas de mundo
      const vw = CW / zoom / 2 + 60, vh = CH / zoom / 2 + 60;
      const vis = (x, y) => Math.abs(x - camX) < vw && Math.abs(y - camY) < vh;
      for (const c of crumbs) {
        if (!vis(c.x, c.y)) continue;
        const s = (c.v > 1 ? 7 : 5) * (0.8 + 0.25 * Math.sin(clock * 6 + c.ph));
        ctx.fillStyle = c.c;
        ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s);
      }
      if (P) for (const it of P.items) if (!it.eaten && vis(it.x, it.y)) drawItem(it);
      for (const dn of drones) if (dn.alive && vis(dn.x, dn.y)) drawDrone(dn);
      for (const rv of rivals) if (rv.alive) drawRival(rv);
      if (phase >= 0) drawPlayer(radiusOf(player.mass));
      for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
      renderLabels(vis);
      if (phase >= 0 && (miniTick = (miniTick + 1) % 3) === 0) renderMiniMap();
    }
    function renderLabels(vis) {
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, LW, LH);
      if (!P || phase < 0) return;
      lctx.textAlign = 'center'; lctx.textBaseline = 'bottom';
      lctx.lineJoin = 'round';
      const fs = clamp(Math.round(Math.min(LW, LH) / 58), 11, 16);
      lctx.font = 'bold ' + fs + 'px "Lucida Console", "Courier New", monospace';
      const text = (t, x, y, col) => {
        lctx.lineWidth = 4; lctx.strokeStyle = '#0a070d'; lctx.strokeText(t, x, y);
        lctx.fillStyle = col; lctx.fillText(t, x, y);
      };
      let near = null, nd = 1e9;
      for (const it of P.items) {
        if (it.eaten) continue;
        if (vis(it.x, it.y)) {
          const s = toScreen(it.x, it.y);
          const off = it.r * zoom * PIX + 4;
          text(it.name, s.x, it.below ? s.y + off + fs : s.y - off, '#f2eef7');
        }
        const d = Math.hypot(it.x - player.x, it.y - player.y);
        if (d < nd) { nd = d; near = it; }
      }
      for (const rv of rivals) {
        if (!rv.alive) continue;
        const s = toScreen(rv.x, rv.y);
        text(rv.name, s.x, s.y - rv.r * zoom * PIX - 6, rv.skin.a === '#e3d34a' ? '#e3d34a' : '#ff6a8a');
      }
      for (const f of floats) {
        const s = toScreen(f.x, f.y);
        lctx.globalAlpha = clamp(f.life * 1.5, 0, 1);
        text(f.text, s.x, s.y, f.col);
      }
      lctx.globalAlpha = 1;
      // flecha hacia lo más cercano que falta, si está fuera de la pantalla
      if (near && state === 'play') {
        const s = toScreen(near.x, near.y), m = 44;
        if (s.x < m || s.x > LW - m || s.y < m || s.y > LH - m) {
          const cx = LW / 2, cy = LH / 2, dx = s.x - cx, dy = s.y - cy;
          const k = Math.min((LW / 2 - m) / Math.abs(dx || 1), (LH / 2 - m) / Math.abs(dy || 1));
          const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
          lctx.save(); lctx.translate(ax, ay); lctx.rotate(a);
          lctx.fillStyle = Math.floor(clock * 4) % 2 ? '#9dff3a' : '#e3d34a';
          lctx.strokeStyle = '#0a070d'; lctx.lineWidth = 3;
          lctx.beginPath(); lctx.moveTo(16, 0); lctx.lineTo(-8, -11); lctx.lineTo(-3, 0); lctx.lineTo(-8, 11); lctx.closePath();
          lctx.stroke(); lctx.fill(); lctx.restore();
          text(near.name, clamp(ax - Math.cos(a) * 30, 60, LW - 60), clamp(ay - Math.sin(a) * 22 + 6, 30, LH - 10), '#9dff3a');
        }
      }
    }
    function renderMiniMap() {
      const g = mini.getContext('2d');
      const s = mini.width / P.W;
      g.drawImage(miniBase, 0, 0);
      const on = Math.floor(clock * 3) % 2;
      for (const it of P.items) {
        if (it.eaten) continue;
        g.fillStyle = on ? '#e3d34a' : '#9dff3a';
        g.fillRect(Math.round(it.x * s) - 1, Math.round(it.y * s) - 1, 3, 3);
      }
      g.fillStyle = '#ff2a4a';
      for (const rv of rivals) if (rv.alive) g.fillRect(Math.round(rv.x * s) - 1, Math.round(rv.y * s) - 1, 3, 3);
      g.fillStyle = '#d9259a';
      for (const dn of drones) if (dn.alive) g.fillRect(Math.round(dn.x * s) - 1, Math.round(dn.y * s) - 1, 2, 2);
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(player.x * s) - 2, Math.round(player.y * s) - 2, 5, 5);
      g.strokeStyle = 'rgba(242,238,247,.5)'; g.lineWidth = 1;
      g.strokeRect(Math.round((camX - CW / zoom / 2) * s) + 0.5, Math.round((camY - CH / zoom / 2) * s) + 0.5, Math.round(CW / zoom * s), Math.round(CH / zoom * s));
    }

    function frame(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, Math.max(0, (ts - last) / 1000)) : 0;
      last = ts;
      update(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    // Gancho de depuración (inofensivo): window.__serpDebug.comerFase() se come lo que falta de la fase.
    const debug = {
      get estado() { return { state, phase, mass: player.mass, restantes: remaining(), atencion: att(), pts, hungry }; },
      comerFase(dejar) {
        if (state !== 'play') return false;
        const left = P.items.filter((it) => !it.eaten);
        for (let k = 0; k < left.length - (dejar || 0); k++) eatItem(left[k]);
        return true;
      },
      // posición en pantalla (coordenadas de página) del municipio/estado/país más cercano que falta
      objetivo() {
        let best = null, bd = 1e9;
        for (const it of P.items) { if (it.eaten) continue; const d = Math.hypot(it.x - player.x, it.y - player.y); if (d < bd) { bd = d; best = it; } }
        if (!best) return null;
        const s = toScreen(best.x, best.y), rr = root.getBoundingClientRect();
        return { x: rr.left + s.x, y: rr.top + s.y, name: best.name };
      },
      irA() { const it = P.items.find((x) => !x.eaten); if (it) { player.x = it.x - 60; player.y = it.y; player.a = 0; aimA = 0; resetTrail(player, lengthOf(player.mass)); } },
    };
    window.__serpDebug = debug;

    return {
      done,
      destroy() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(raf);
        jobs.length = 0;
        if (ro) ro.disconnect();
        root.removeEventListener('mousemove', onMove);
        root.removeEventListener('mousedown', onDown);
        window.removeEventListener('mouseup', onUp);
        btnEnd.removeEventListener('click', onEnd);
        if (actx) { try { actx.close(); } catch (e) { /* nada */ } }
        if (window.__serpDebug === debug) delete window.__serpDebug;
        root.remove();
        resolveDone(false); // no hace nada si ya se resolvió con true
      },
    };
  };
})();
