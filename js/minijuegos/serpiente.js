// Minijuego "Plan México": una serpiente caricaturesca con la bandera de EE. UU. que crece al comer, estilo slither.io.
// Fase 1: municipios de Jalisco · Fase 2: los 32 estados sobre el mapa del cliente (mínimo para ganar) · Fase 3 (bonus): Latinoamérica.
// Compiten tres serpientes rivales (Israel, Coca-Cola, Nestlé) que también se comen el mapa. Se pierde atención al
// chocar de cabeza con ellas, con los drones o con la orilla del mapa, o al pasar mucho tiempo sin comer.
// A 0 de atención el host hace el GAME OVER.
// Contrato: Game.minijuegos.serpiente(host, { dificultad: 'facil' | 'intermedio' | 'dificil' }) -> { done: Promise<boolean>, destroy() }.
(function () {
  window.Game = window.Game || {};
  Game.minijuegos = Game.minijuegos || {};

  // ---------------- dificultad ('intermedio' = la afinación normal de la historia) ----------------
  // rivales/drones: cuántos hay en cada fase · vel/giro: velocidad y giro de los rivales · acoso: prob. de ir a
  // cerrarle el paso al jugador · comer: prob. de ir por un estado/municipio/país · cdComer: segundos entre bocados
  // de un rival · esquiva: prob. de que un rival esquive cuerpos · dano: multiplicador de la atención que quitan los
  // golpes · hambre: segundos extra (o menos) antes de la distracción.
  const DIFICULTAD = {
    facil:      { rivales: [1, 2, 2], vel: 0.8, giro: 2.6, acoso: 0.3, comer: 0.3, cdComer: [14, 20], esquiva: 0.4, dano: 0.6, hambre: 4, drones: [0, 1, 2], dronVel: 0.85 },
    intermedio: { rivales: [2, 3, 3], vel: 1.0, giro: 3.0, acoso: 0.55, comer: 0.5, cdComer: [9, 14], esquiva: 0.65, dano: 1.0, hambre: 0, drones: [0, 2, 4], dronVel: 1.0 },
    dificil:    { rivales: [3, 3, 3], vel: 1.2, giro: 3.5, acoso: 0.8, comer: 0.7, cdComer: [5, 9], esquiva: 0.85, dano: 1.4, hambre: -2, drones: [1, 3, 5], dronVel: 1.15 },
  };
  const DANO = { pared: 6, rival: 10, dron: 7 }; // atención por golpe, antes del multiplicador de dificultad

  const DEFAULTS = {
    titulo: 'PLAN MÉXICO',
    instrucciones: 'Eres la serpiente del Plan México. Muévela con el ratón y cómete el mapa: primero los municipios de Jalisco, luego los estados y al final Latinoamérica.',
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
    puntos: 'SCORE',
    longitud: 'LONGITUD',
    cargando: 'CARGANDO MAPA…',
  };
  // Textos nuevos de esta versión: mandan sobre los del guion (que aún habla de la CFE y los data centers).
  const PELIGROS = 'Israel, Coca-Cola y Nestlé también quieren el mapa: sus serpientes se comen lo que encuentran. Si chocas de cabeza con ellas, con los drones o con la orilla del mapa pierdes atención; si pasas mucho tiempo sin comer, también. Atrapa drones con el cuerpo y revienta a los rivales cruzándote en su camino.';
  const RIVAL_COME = '¡{r} se comió {x}!';
  const DE_RIVALES = 'rivales';

  // Serpientes rivales.
  const RIVALES = [
    { kind: 'israel', nombre: 'ISRAEL', a: '#ffffff', label: '#a9c6ff' },
    { kind: 'coca', nombre: 'COCA-COLA', a: '#e41e2b', label: '#ff7a7a', texto: 'Coca-Cola',
      font: 'italic bold {s}px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive' },
    { kind: 'nestle', nombre: 'NESTLÉ', a: '#f37fb5', label: '#ff9fcd', texto: 'Nestlé',
      font: 'bold {s}px "Arial Rounded MT Bold", "Trebuchet MS", Verdana, sans-serif' },
  ];

  // Colores del mapa político del cliente (img/minijuegos/mapa_mexico.png).
  const MAR = '#105dad', EXTRANJERO = '#ffebac';
  const PALETA = ['#ed7c82', '#73ae44', '#c7c7c7', '#9a2775', '#aa6e28', '#f07f21', '#fbb927'];
  const US = { rojo: '#b22234', blanco: '#ffffff', azul: '#3c3b6e' };
  const TINTA = '#1a1020';
  const IMG_MAPA = 'img/minijuegos/mapa_mexico.png';
  const DIR_ESTADOS = 'img/minijuegos/serpiente_estados/';
  const MAPA_W = 1920, MAPA_H = 1392;
  // la imagen trae un marco blanco con una línea negra: se recorta INSET px y se extiende PAD px de mar/tierra alrededor
  const INSET = 14, PAD = 110, SH = PAD - INSET; // SH: desplazamiento imagen -> lienzo del mapa
  const LIENZO_W = MAPA_W - 2 * INSET + 2 * PAD, LIENZO_H = MAPA_H - 2 * INSET + 2 * PAD;

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
  // nombre, x0, y0 (esquina del recorte img/minijuegos/serpiente_estados/NN.png), cx, cy (centro), área (px), color
  const ESTADOS_MAPA = [
    ['Baja California', 67, 118, 172, 256, 26094, '#f07f21'], ['Baja California Sur', 154, 423, 323, 570, 27280, '#c7c7c7'],
    ['Sonora', 183, 132, 415, 332, 63790, '#73ae44'], ['Chihuahua', 507, 203, 663, 401, 87399, '#ed7c82'],
    ['Coahuila', 810, 333, 921, 501, 54125, '#c7c7c7'], ['Nuevo León', 972, 468, 1046, 612, 22557, '#ed7c82'],
    ['Tamaulipas', 1037, 477, 1124, 697, 27487, '#aa6e28'], ['Sinaloa', 480, 509, 593, 642, 19917, '#fbb927'],
    ['Durango', 613, 527, 748, 653, 42627, '#9a2775'], ['Zacatecas', 774, 643, 882, 759, 25749, '#f07f21'],
    ['San Luis Potosí', 904, 683, 1020, 805, 20981, '#73ad46'], ['Nayarit', 695, 774, 750, 855, 9253, '#aa6e28'],
    ['Aguascalientes', 868, 815, 901, 842, 2015, '#c7c7c7'], ['Jalisco', 693, 790, 823, 932, 28033, '#ed7c82'],
    ['Guanajuato', 916, 850, 983, 913, 10477, '#9a2775'], ['Querétaro', 1012, 863, 1057, 916, 4106, '#fbb829'],
    ['Hidalgo', 1055, 877, 1117, 938, 7217, '#9a2775'], ['Colima', 758, 1001, 803, 1026, 2176, '#fbb72e'],
    ['Michoacán', 813, 943, 931, 1022, 20384, '#aa6e28'], ['Estado de México', 1009, 949, 1070, 1012, 7604, '#ed7c82'],
    ['Ciudad de México', 1087, 996, 1103, 1016, 569, '#c6c6c8'], ['Morelos', 1081, 1024, 1108, 1050, 1712, '#73ae44'],
    ['Tlaxcala', 1127, 986, 1163, 1005, 1484, '#c7c7c7'], ['Puebla', 1109, 912, 1180, 1031, 11558, '#fbb927'],
    ['Veracruz', 1132, 809, 1276, 1007, 25144, '#ed7c82'], ['Guerrero', 909, 1040, 1056, 1120, 22351, '#c7c7c7'],
    ['Oaxaca', 1145, 1051, 1279, 1161, 34070, '#73ae44'], ['Chiapas', 1425, 1083, 1534, 1178, 26604, '#c7c7c7'],
    ['Tabasco', 1419, 1039, 1521, 1086, 9206, '#b06c23'], ['Campeche', 1523, 893, 1658, 1016, 19887, '#9a2775'],
    ['Yucatán', 1639, 827, 1734, 888, 13776, '#fbb927'], ['Quintana Roo', 1717, 824, 1789, 957, 15807, '#73ae44'],
  ];
  // 1 bit por celda de 16×16 px de mapa_mexico.png (120×87 celdas): 1 = territorio mexicano
  const TIERRA_MX = [
    '000000000000000000000000000000', '000000000000000000000000000000', '000000000000000000000000000000',
    '000000000000000000000000000000', '000000000000000000000000000000', '000000000000000000000000000000',
    '000000000000000000000000000000', '0ff800000000000000000000000000', '0ff800000000000000000000000000',
    '07fe00000000000000000000000000', '07ffc0000000000000000000000000', '03f7f0000000000000000000000000',
    '03f2fc000000000000000000000000', '01f0ff001fc0000000000000000000', '01f03fffffe0000000000000000000',
    '01f03ffffff0000000000000000000', '00f83ffffffc000000000000000000', '00f81ffffffe000000000000000000',
    '00f81ffffffe000000000000000000', '00781fffffff000000000000000000', '003c1fffffff000000000000000000',
    '001e0fffffff01f000000000000000', '000f0fffffffc1fc00000000000000', '000787ffffffe3fc00000000000000',
    '000783fffffffffe00000000000000', '0003c3fffffffffe00000000000000', '0007c1ffffffffff00000000000000',
    '003fc0ffffffffff80000000000000', '001fe03fffffffff80000000000000', '000ff03fffffffffc0000000000000',
    '0007f01fffffffffe0000000000000', '0003f80fffffffffe0000000000000', '0000fc07fffffffff0000000000000',
    '00003e03fffffffff0000000000000', '00001e01fffffffff8000000000000', '00000e03fffffffffe000000000000',
    '00000e03ffffffffffd00000000000', '00000f01fffffffffff00000000000', '00000f00ffffffffffe00000000000',
    '00001f003fffffffffc00000000000', '00001f801fffffffffc00000000000', '00000f801fffffffffc00000000000',
    '000003a00fffffffffc00000000000', '000000f003ffffffffc00000000000', '0000007001ffffffffc00000000000',
    '0000003800ffffffffc00000000000', '0000003800ffffffffc00000000000', '00000018007fffffffc00000000000',
    '00000000003fffffffc00000000000', '00000000001fffffffc00000000000', '00000000001fffffffc00000000000',
    '00000000000fffffffc00000000000', '00000000000fffffffc000000007f0', '000000000007ffffffe00000007ff0',
    '000000000007ffffffe0000001fff0', '000000000007ffffffe0000003ffe0', '000000000007fffffff0000003ffe0',
    '00000000000ffffffff8000003ffc0', '00000000000ffffffff8000003ffc0', '00000000001ffffffffc000003ffc0',
    '00000000000ffffffffe000003ffc0', '000000000007ffffffff000003ffc0', '000000000007ffffffff000007ffc0',
    '000000000003ffffffff80001fffc0', '000000000000ffffffffc0000ffec0', '0000000000003ffffffff803fffe00',
    '0000000000001ffffffffe3ffffc00', '0000000000000fffffffffffffe000', '00000000000003fffffffffffc0000',
    '000000000000001ffffffffffc0000', '000000000000000ffffffffff80000', '0000000000000003fffffffffc0000',
    '0000000000000000fffffffffe0000', '00000000000000003fffffffff0000', '000000000000000003ffffffff0000',
    '000000000000000000fffc7fe00000', '0000000000000000001ff00fe00000', '00000000000000000003c007c00000',
    '000000000000000000000003c00000', '000000000000000000000001c00000', '000000000000000000000000c00000',
    '000000000000000000000000400000', '000000000000000000000000000000', '000000000000000000000000000000',
    '000000000000000000000000000000', '000000000000000000000000000000', '000000000000000000000000000000',
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
      tipo: 'voronoi', lon: [-105.95, -101.35], lat: [18.95, 22.85], k: 300, margin: 130, minD: 92, rad: 15,
      land: [JALISCO], context: [MAINLAND], foreign: [], consumed: [], lakes: [{ lon: -103.05, lat: 20.22, rx: 0.42, ry: 0.07 }],
      vecinos: [['NAYARIT', -104.9, 21.75, '#aa6e28'], ['ZACATECAS', -102.6, 22.7, '#f07f21'], ['AGUASCALIENTES', -102.15, 22.05, '#c7c7c7'],
        ['GUANAJUATO', -101.55, 21.0, '#9a2775'], ['MICHOACÁN', -102.4, 19.35, '#aa6e28'], ['COLIMA', -103.95, 19.05, '#fbb927']],
      labels: [['OCÉANO PACÍFICO', -105.4, 19.4], ['LAGO DE CHAPALA', -103.05, 20.08]],
      items: MUNICIPIOS, start: [-102.4, 21.75], crumbs: 90, hunger: 11,
      pts: 100, mass: 5, heal: 3, bonus: 1000,
    },
    {
      tipo: 'imagen', ws: 1.15, start: [800, 875],
      labels: [['ESTADOS UNIDOS', 1000, 120], ['OCÉANO PACÍFICO', 560, 1130], ['GOLFO DE MÉXICO', 1530, 560], ['GUATEMALA', 1700, 1270]],
      crumbs: 120, hunger: 10, pts: 200, mass: 4, heal: 3, bonus: 2000,
    },
    {
      tipo: 'voronoi', lon: [-118, -33], lat: [-56, 33], k: 24, margin: 140, minD: 84, rad: 17,
      land: [CENTRAL, CUBA, HISPANIOLA, PUERTO_RICO, SUDAMERICA], context: [], foreign: [USA], consumed: [MAINLAND, PENINSULA], lakes: [], vecinos: [],
      labels: [['EE. UU.', -100, 31], ['MÉXICO (CONSUMIDO)', -103, 24], ['OCÉANO PACÍFICO', -100, -10], ['OCÉANO ATLÁNTICO', -40, 10]],
      items: PAISES, start: [-97, 17], crumbs: 140, hunger: 10,
      pts: 400, mass: 5, heal: 4, bonus: 4000,
    },
  ];

  const CRUMB_COLS = ['#ffffff', '#ffe14d', '#7df9ff', '#ff5ec4', '#b6ff5e'];
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
  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const radiusOf = (mass) => 7 + 10 * (1 - Math.exp(-mass / 170));
  const lengthOf = (mass) => Math.min(1250, 120 + mass * 4);

  // territorio mexicano en el mapa del cliente (para soltar comida sobre tierra)
  const TIERRA_BITS = TIERRA_MX.map((h) => h.split('').map((ch) => parseInt(ch, 16).toString(2).padStart(4, '0')).join(''));
  const enMexico = (ix, iy) => { const r = TIERRA_BITS[Math.floor(iy / 16)]; return !!r && r[Math.floor(ix / 16)] === '1'; };

  // ---------------- imágenes (se cargan una sola vez y se comparten) ----------------
  const ASSETS = { started: false, mapa: null, failed: false, masks: [] };
  function loadAssets() {
    if (ASSETS.started) return;
    ASSETS.started = true;
    const im = new Image();
    im.onload = () => { ASSETS.mapa = im; };
    im.onerror = () => { ASSETS.failed = true; };
    im.src = IMG_MAPA;
    ESTADOS_MAPA.forEach((e, i) => {
      const s = new Image();
      s.onload = () => {
        // silueta blanca del estado: sirve de brillo y de máscara para "conquistarlo"
        const c = canvasOf(s.naturalWidth, s.naturalHeight), g = c.getContext('2d');
        g.drawImage(s, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
        ASSETS.masks[i] = { img: c, x: e[1] + SH, y: e[2] + SH, w: c.width, h: c.height };
      };
      s.src = DIR_ESTADOS + String(i).padStart(2, '0') + '.png';
    });
  }

  // ---------------- dibujitos ----------------
  function star(g, x, y, r) {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r;
      if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  function david(g, x, y, r, lw) {
    g.lineWidth = lw; g.lineJoin = 'miter';
    for (const off of [-Math.PI / 2, Math.PI / 2]) {
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = off + k * Math.PI * 2 / 3;
        if (k) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath(); g.stroke();
    }
  }
  // Bandera / logo con que queda pintado lo que se come cada serpiente. u = alto de franja (px).
  function drawFlag(g, kind, x, y, w, h, u) {
    g.save();
    if (kind === 'usa') {
      for (let k = 0, yy = y; yy < y + h; k++, yy += u) { g.fillStyle = k % 2 ? US.blanco : US.rojo; g.fillRect(x, yy, w, u + 0.5); }
      const cw = Math.min(w * 0.45, u * 11), ch = Math.min(h * 0.55, u * 7);
      g.fillStyle = US.azul; g.fillRect(x, y, cw, ch);
      g.fillStyle = '#ffffff';
      const st = u * 1.3;
      for (let yy = y + st * 0.6, row = 0; yy < y + ch - st * 0.3; yy += st, row++) {
        for (let xx = x + st * (row % 2 ? 1.1 : 0.6); xx < x + cw - st * 0.3; xx += st) star(g, xx, yy, u * 0.45);
      }
    } else if (kind === 'israel') {
      g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#0038b8';
      const b = Math.max(u, h * 0.12);
      g.fillRect(x, y + h * 0.12, w, b); g.fillRect(x, y + h * 0.88 - b, w, b);
      g.strokeStyle = '#0038b8';
      david(g, x + w / 2, y + h / 2, Math.max(u, Math.min(w, h) * 0.2), Math.max(1.5, u * 0.35));
    } else if (kind === 'coca') {
      g.fillStyle = '#e41e2b'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, u * 0.6);
      g.beginPath();
      for (let xx = x; xx <= x + w; xx += 3) {
        const yy = y + h * 0.7 + Math.sin((xx - x) / Math.max(1, w) * Math.PI * 2) * h * 0.08;
        if (xx === x) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
      const s = Math.min(h * 0.3, w / 4.2);
      if (s >= 7) {
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = RIVALES[1].font.replace('{s}', Math.round(s));
        g.fillText('Coca-Cola', x + w / 2, y + h * 0.45);
      }
    } else {
      g.fillStyle = '#f37fb5'; g.fillRect(x, y, w, h);
      const s = Math.min(h * 0.3, w / 3.8);
      if (s >= 7) {
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = RIVALES[2].font.replace('{s}', Math.round(s));
        g.fillText('Nestlé', x + w / 2, y + h / 2);
      }
    }
    g.restore();
  }

  // ---------------- geometría de cada fase (coordenadas de mundo) ----------------
  function labelsBelow(its) {
    its.forEach((a, i) => {
      a.below = its.some((b, j) => j < i && !b.below && Math.abs(b.y - a.y) < 34 && Math.abs(b.x - a.x) < 9 * (a.name.length + b.name.length) / 2);
    });
  }
  function buildPhase(def, idx) {
    if (def.tipo === 'imagen') {
      const ws = def.ws;
      const P = { idx, def, imagen: true, ms: 1 / ws, W: Math.round(LIENZO_W * ws), H: Math.round(LIENZO_H * ws) };
      P.items = ESTADOS_MAPA.map(([name, , , cx, cy, area, col], i) => ({
        name, x: (cx + SH) * ws, y: (cy + SH) * ws, r: clamp(Math.sqrt(area) / 9, 9, 20), col, idx: i,
        eaten: false, by: null, ph: Math.random() * 6.28,
      }));
      labelsBelow(P.items);
      P.labels = def.labels.map(([t, x, y]) => ({ t, x: x + SH, y: y + SH }));
      P.start = { x: (def.start[0] + SH) * ws, y: (def.start[1] + SH) * ws };
      P.onLand = (x, y) => enMexico(x / ws - SH, y / ws - SH);
      return P;
    }
    const latMid = (def.lat[0] + def.lat[1]) / 2;
    const cosL = Math.cos(clamp(latMid, -30, 30) * Math.PI / 180);
    const kx = def.k * cosL, ky = def.k, m = def.margin;
    const P = {
      idx, def, ms: 0.5,
      W: Math.round((def.lon[1] - def.lon[0]) * kx + 2 * m),
      H: Math.round((def.lat[1] - def.lat[0]) * ky + 2 * m),
    };
    P.px = (lon) => (lon - def.lon[0]) * kx + m;
    P.py = (lat) => (def.lat[1] - lat) * ky + m;
    const proj = (poly) => poly.map(([lo, la]) => [P.px(lo), P.py(la)]);
    P.land = def.land.map(proj);
    P.context = def.context.map(proj);
    P.foreign = def.foreign.map(proj);
    P.consumed = def.consumed.map(proj);
    P.lakes = def.lakes.map((l) => ({ x: P.px(l.lon), y: P.py(l.lat), rx: l.rx * kx, ry: l.ry * ky }));
    P.vecinos = def.vecinos.map(([t, lo, la, col]) => ({ t, x: P.px(lo), y: P.py(la), col }));
    P.labels = def.labels.concat(def.vecinos).map(([t, lo, la]) => ({ t, x: P.px(lo), y: P.py(la) }));
    P.items = def.items.map(([name, lo, la, s], i) => {
      const x = P.px(lo), y = P.py(la);
      return {
        name, x, y, ox: x, oy: y, r: def.rad * (s || 1), col: PALETA[i % PALETA.length], idx: i,
        eaten: false, by: null, ph: Math.random() * 6.28, poly: P.land.findIndex((p) => inPoly(x, y, p)),
      };
    });
    // separa los que quedan amontonados (área metropolitana de Guadalajara, Centroamérica…)
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
    // que cada uno siga sobre su propio pedazo de tierra
    for (const a of its) {
      if (a.poly < 0) continue;
      const poly = P.land[a.poly];
      for (let t = 1; t >= 0 && !inPoly(a.x, a.y, poly); t -= 0.1) {
        a.x = a.ox + (a.x - a.ox) * t; a.y = a.oy + (a.y - a.oy) * t;
      }
      if (!inPoly(a.x, a.y, poly)) { a.x = a.ox; a.y = a.oy; }
    }
    labelsBelow(its);
    P.start = { x: P.px(def.start[0]), y: P.py(def.start[1]) };
    P.onLand = (x, y) => P.land.some((p) => inPoly(x, y, p));
    return P;
  }

  // ---------------- mapas precalculados ----------------
  function pathOf(g, poly) { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  function polyBox(poly) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function drawMapLabels(g, labels, size) {
    g.font = 'bold ' + size + 'px "Lucida Console", "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const l of labels) {
      g.lineWidth = size * 0.28; g.strokeStyle = 'rgba(20,16,40,.55)'; g.strokeText(l.t, l.x, l.y);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(l.t, l.x, l.y);
    }
  }
  // Fase 2: el mapa político del cliente, tal cual, con sus colores.
  function renderImagen(P) {
    const c = canvasOf(LIENZO_W, LIENZO_H), g = c.getContext('2d');
    const im = ASSETS.mapa;
    if (im) {
      const w = MAPA_W - 2 * INSET, h = MAPA_H - 2 * INSET, R = MAPA_W - INSET - 1, B = MAPA_H - INSET - 1;
      g.imageSmoothingEnabled = false;
      g.drawImage(im, INSET, INSET, w, h, PAD, PAD, w, h);
      // orillas: se estira la última fila/columna del mapa (mar, EE. UU., Guatemala…)
      g.drawImage(im, INSET, INSET, w, 1, PAD, 0, w, PAD);
      g.drawImage(im, INSET, B, w, 1, PAD, PAD + h, w, PAD);
      g.drawImage(im, INSET, INSET, 1, h, 0, PAD, PAD, h);
      g.drawImage(im, R, INSET, 1, h, PAD + w, PAD, PAD, h);
      for (const [sx, sy, dx, dy] of [[INSET, INSET, 0, 0], [R, INSET, PAD + w, 0], [INSET, B, 0, PAD + h], [R, B, PAD + w, PAD + h]]) {
        g.drawImage(im, sx, sy, 1, 1, dx, dy, PAD, PAD);
      }
    } else {
      g.fillStyle = MAR; g.fillRect(0, 0, LIENZO_W, LIENZO_H);
      for (const it of P.items) { g.fillStyle = it.col; g.beginPath(); g.arc(it.x * P.ms, it.y * P.ms, it.r * 3, 0, Math.PI * 2); g.fill(); }
    }
    drawMapLabels(g, P.labels, 30);
    return c;
  }
  // Fases 1 y 3: mapa político dibujado (una celda de color por municipio/país), en la paleta del mapa del cliente.
  function renderVoronoi(P) {
    const ms = P.ms, w = Math.ceil(P.W * ms), h = Math.ceil(P.H * ms);
    const c = canvasOf(w, h), g = c.getContext('2d');
    g.scale(ms, ms);
    g.fillStyle = MAR; g.fillRect(0, 0, P.W, P.H);
    for (const poly of P.foreign) { pathOf(g, poly); g.fillStyle = EXTRANJERO; g.fill(); }
    for (const poly of P.consumed) {
      const b = polyBox(poly);
      g.save(); pathOf(g, poly); g.clip(); drawFlag(g, 'usa', b.x, b.y, b.w, b.h, 22); g.restore();
    }
    // máscara: rojo = tierra (rojo 20·(n+1) = polígono n), verde = contexto (estados vecinos)
    const mk = canvasOf(w, h), mg = mk.getContext('2d');
    mg.scale(ms, ms);
    mg.fillStyle = '#00ff00'; for (const poly of P.context) { pathOf(mg, poly); mg.fill(); }
    P.land.forEach((poly, n) => { pathOf(mg, poly); mg.fillStyle = 'rgb(' + (20 * (n + 1)) + ',0,0)'; mg.fill(); });
    mg.fillStyle = '#000000';
    for (const l of P.lakes) { mg.beginPath(); mg.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2); mg.fill(); }
    const md = mg.getImageData(0, 0, w, h).data;
    const its = P.items, vs = P.vecinos;
    const sx = its.map((it) => it.x * ms), sy = its.map((it) => it.y * ms);
    const vx = vs.map((v) => v.x * ms), vy = vs.map((v) => v.y * ms);
    const ids = new Int16Array(w * h).fill(-1);
    const box = its.map(() => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 }));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, R = md[o], G = md[o + 1];
      if (R >= 10) {
        const poly = Math.round(R / 20) - 1;
        let best = -1, bd = 1e18;
        for (let pass = 0; pass < 2 && best < 0; pass++) {
          for (let k = 0; k < its.length; k++) {
            if (pass === 0 && its[k].poly !== poly) continue;
            const dx = sx[k] - x, dy = sy[k] - y, d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = k; }
          }
        }
        ids[y * w + x] = best;
        const b = box[best];
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.n++;
      } else if (G >= 128 && vs.length) {
        let best = 0, bd = 1e18;
        for (let k = 0; k < vs.length; k++) { const dx = vx[k] - x, dy = vy[k] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
        ids[y * w + x] = -2 - best;
      }
    }
    // colores: que dos vecinos no compartan color (coloreo voraz con la paleta del mapa)
    const adj = its.map(() => new Set());
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
      const a = ids[y * w + x];
      if (a < 0) continue;
      const r = ids[y * w + x + 1], d = ids[(y + 1) * w + x];
      if (r >= 0 && r !== a) { adj[a].add(r); adj[r].add(a); }
      if (d >= 0 && d !== a) { adj[a].add(d); adj[d].add(a); }
    }
    its.forEach((it, i) => {
      const used = new Set([...adj[i]].filter((j) => j < i).map((j) => its[j].col));
      for (let k = 0; k < PALETA.length; k++) { const cc = PALETA[(i * 3 + k) % PALETA.length]; if (!used.has(cc)) { it.col = cc; break; } }
    });
    const rgbI = its.map((it) => hexRgb(it.col));
    const rgbV = vs.map((v) => hexRgb(v.col).map((ch) => Math.round(ch * 0.55 + 255 * 0.45))); // vecinos: más pálidos
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, id = ids[i];
      if (id === -1) continue;
      const rgb = id >= 0 ? rgbI[id] : rgbV[-2 - id];
      const r = x < w - 1 ? ids[i + 1] : id, dn = y < h - 1 ? ids[i + w] : id;
      const border = (r !== id && r !== -1) || (dn !== id && dn !== -1);
      const o = i * 4;
      if (border) { d[o] = 253; d[o + 1] = 251; d[o + 2] = 242; } else { d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; }
      d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // máscaras (siluetas blancas) de cada celda
    its.forEach((it, k) => {
      const b = box[k];
      if (!b.n) { it.mask = null; return; }
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const mc = canvasOf(bw, bh), mcg = mc.getContext('2d');
      const mi = mcg.createImageData(bw, bh), mdd = mi.data;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (ids[(y + b.y0) * w + x + b.x0] === k) { const o = (y * bw + x) * 4; mdd[o] = mdd[o + 1] = mdd[o + 2] = mdd[o + 3] = 255; }
      }
      mcg.putImageData(mi, 0, 0);
      it.mask = { img: mc, x: b.x0, y: b.y0, w: bw, h: bh };
    });
    for (const l of P.lakes) {
      g.beginPath(); g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      g.fillStyle = MAR; g.fill();
    }
    drawMapLabels(g, P.labels, 26);
    return c;
  }
  const renderMap = (P) => (P.imagen ? renderImagen(P) : renderVoronoi(P));
  const maskOf = (P, it) => (P.imagen ? ASSETS.masks[it.idx] || null : it.mask || null);

  Game.minijuegos.serpiente = function (host, opts) {
    const G0 = (Game.guion && Game.guion.minijuegos && Game.guion.minijuegos.serpiente) || {};
    const T = Object.assign({}, DEFAULTS, G0);
    T.fases = DEFAULTS.fases.map((f, i) => Object.assign({}, f, (G0.fases && G0.fases[i]) || {}));
    T.golpes = Object.assign({}, DEFAULTS.golpes, G0.golpes || {});
    T.peligros = PELIGROS;
    const nivel = opts && DIFICULTAD[opts.dificultad] ? opts.dificultad : 'intermedio';
    const D = DIFICULTAD[nivel];
    loadAssets();

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
    let pts = 0, waitLoad = 0;
    const golpes = {};
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

    // ---------- mapa: lo comido queda pintado con la bandera/logo de quien se lo comió ----------
    function refreshMini() {
      if (!mini.width) return;
      miniBase = canvasOf(mini.width, mini.height);
      const g = miniBase.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.drawImage(mapC, 0, 0, mini.width, mini.height);
    }
    function conquer(it, kind) {
      const g = mapC.getContext('2d');
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      const m = maskOf(P, it);
      if (m) {
        const t = canvasOf(m.w, m.h), tg = t.getContext('2d');
        drawFlag(tg, kind, 0, 0, m.w, m.h, Math.max(3, 13 * P.ms));
        tg.globalCompositeOperation = 'destination-in';
        tg.drawImage(m.img, 0, 0);
        g.globalAlpha = 0.93;
        g.drawImage(t, m.x, m.y);
      } else {
        // sin silueta (no cargó): una banderita redonda
        const R = it.r * 1.7 * P.ms, cx = it.x * P.ms, cy = it.y * P.ms;
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
        drawFlag(g, kind, cx - R, cy - R, R * 2, R * 2, Math.max(2, R / 6));
      }
      g.restore();
      refreshMini();
    }

    // ---------- enemigos ----------
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
        i, skin: RIVALES[i % RIVALES.length],
        x: p.x, y: p.y, a: Math.random() * 6.28, r: 10 + Math.max(0, phase) * 1.5, L: 320 + i * 60,
        speed: (140 + phase * 10 + i * 6) * D.vel, turn: D.giro, trail: [], pts: [], alive: true, think: 0, tx: p.x, ty: p.y,
        respawn: 0, eatCd: rnd(D.cdComer[0], D.cdComer[1]) * 0.5, cauto: true, goal: null,
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
      const def = PHASES[i];
      if (def.tipo === 'imagen' && !ASSETS.mapa && !ASSETS.failed && waitLoad < 40) {
        waitLoad++;
        showBanner(T.cargando, '', 0.25, () => startPhase(i));
        return;
      }
      phase = i;
      P = buildPhase(def, i);
      mapC = renderMap(P);
      const mw = 168, mh = Math.round(mw * P.H / P.W);
      mini.width = mw; mini.height = mh;
      refreshMini();
      player.x = P.start.x; player.y = P.start.y;
      player.a = Math.atan2(P.H / 2 - player.y, P.W / 2 - player.x);
      resetTrail(player, lengthOf(player.mass));
      player.invul = 1.5;
      camX = player.x; camY = player.y;
      crumbs = []; parts = []; floats = [];
      for (let k = 0; k < def.crumbs; k++) spawnCrumb();
      rivals = []; for (let k = 0; k < D.rivales[i]; k++) rivals.push(makeRival(k));
      drones = []; for (let k = 0; k < D.drones[i]; k++) drones.push(makeDrone());
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
    function hurt(why) {
      if (player.invul > 0 || state !== 'play') return;
      let n = DANO[why] * D.dano;
      golpes[why] = (golpes[why] || 0) + 1;
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
      const deRiv = P.items.filter((it) => it.eaten && it.by !== 'usa').length;
      setText(hudTitle, 't', T.fases[phase].titulo);
      setText(hudCount, 'c', T.fases[phase].contador + ': ' + got + '/' + tot + (deRiv ? '  (' + DE_RIVALES + ': ' + deRiv + ')' : ''));
      const w = Math.round(got / tot * 100) + '%';
      if (hudCache.w !== w) { hudCache.w = w; hudFill.style.width = w; }
      setText(scoreEl, 's', T.puntos + ' ' + String(pts).padStart(6, '0'));
      setText(lenEl, 'l', T.longitud + ' ' + Math.round(lengthOf(player.mass)));
    }

    // ---------- lógica ----------
    // ¿algún cuerpo (que no sea el de `self`) toca el punto (x, y) con holgura `pad`?
    function bodyAt(x, y, pad, self) {
      const pr = radiusOf(player.mass);
      if (self !== player) for (const q of player.pts) if (Math.abs(q.x - x) < pr + pad && Math.abs(q.y - y) < pr + pad) return q;
      for (const o of rivals) {
        if (!o.alive || o === self) continue;
        for (const q of o.pts) if (Math.abs(q.x - x) < o.r + pad && Math.abs(q.y - y) < o.r + pad) return q;
      }
      return null;
    }
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
      if (wall) { aimA = player.a; hurt('pared'); }
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

      // --- comer municipios / estados / países (quedan fijos en su lugar del mapa) ---
      for (const it of P.items) {
        if (it.eaten) continue;
        const d = Math.hypot(player.x - it.x, player.y - it.y);
        if (d < r + it.r + 6) eatItem(it);
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
        rv.eatCd -= dt;
        if (rv.goal && rv.goal.eaten) { rv.goal = null; rv.think = 0; }
        if (rv.think <= 0) {
          rv.think = rnd(0.5, 1.3);
          rv.cauto = Math.random() < D.esquiva;
          rv.goal = null;
          const dp = Math.hypot(player.x - rv.x, player.y - rv.y);
          if (dp < 520 && Math.random() < D.acoso) {
            // intenta cerrarle el paso a la serpiente
            rv.tx = player.x + Math.cos(player.a) * 160; rv.ty = player.y + Math.sin(player.a) * 160;
          } else {
            if (rv.eatCd <= 0 && Math.random() < D.comer) {
              let best = null, bd = 1e9;
              for (const it of P.items) { if (it.eaten) continue; const d = Math.hypot(it.x - rv.x, it.y - rv.y); if (d < bd) { bd = d; best = it; } }
              if (best && bd < 1100) { rv.goal = best; rv.tx = best.x; rv.ty = best.y; rv.think = 3; }
            }
            if (!rv.goal) {
              let best = null, bd = 1e9;
              for (const c of crumbs) { const d = Math.hypot(c.x - rv.x, c.y - rv.y); if (d < bd) { bd = d; best = c; } }
              if (best && bd < 400 && Math.random() < 0.6) { rv.tx = best.x; rv.ty = best.y; }
              else if (Math.random() < 0.5) { rv.tx = rnd(100, P.W - 100); rv.ty = rnd(100, P.H - 100); }
            }
          }
        }
        let ta = Math.atan2(rv.ty - rv.y, rv.tx - rv.x);
        if (rv.x < 120 || rv.x > P.W - 120 || rv.y < 120 || rv.y > P.H - 120) ta = Math.atan2(P.H / 2 - rv.y, P.W / 2 - rv.x);
        let turn = rv.turn;
        if (rv.cauto) {
          // esquiva cuerpos que tiene enfrente
          const look = rv.r * 3 + 34;
          const fx = rv.x + Math.cos(rv.a) * look, fy = rv.y + Math.sin(rv.a) * look;
          const q = bodyAt(fx, fy, 6, rv);
          if (q) {
            const side = Math.sign((q.x - rv.x) * Math.sin(rv.a) - (q.y - rv.y) * Math.cos(rv.a)) || 1;
            ta = rv.a + side * Math.PI / 2; turn *= 1.6;
          }
        }
        steer(rv, ta, turn, dt);
        moveSnake(rv, rv.speed, dt, rv.L);
        if (rv.x < rv.r || rv.x > P.W - rv.r) { rv.x = clamp(rv.x, rv.r, P.W - rv.r); rv.a = Math.PI - rv.a; }
        if (rv.y < rv.r || rv.y > P.H - rv.r) { rv.y = clamp(rv.y, rv.r, P.H - rv.r); rv.a = -rv.a; }
        rv.pts = bodyPoints(rv, rv.r, rv.L);
        for (let i = crumbs.length - 1; i >= 0; i--) {
          const c = crumbs[i];
          if (Math.abs(c.x - rv.x) < rv.r + 6 && Math.abs(c.y - rv.y) < rv.r + 6) crumbs.splice(i, 1);
        }
        // los rivales también se comen el mapa (con un rato de digestión entre bocado y bocado)
        if (rv.eatCd <= 0) {
          for (const it of P.items) {
            if (!it.eaten && Math.hypot(it.x - rv.x, it.y - rv.y) < rv.r + it.r + 4) { rivalEat(rv, it); break; }
          }
          if (state !== 'play') return;
        }
        // la cabeza del jugador choca con el rival
        let hit = null;
        for (const q of rv.pts) if (Math.hypot(q.x - player.x, q.y - player.y) < r + rv.r * 0.85) { hit = q; break; }
        if (hit) {
          player.a = Math.atan2(player.y - hit.y, player.x - hit.x); aimA = player.a;
          player.x += Math.cos(player.a) * 6; player.y += Math.sin(player.a) * 6;
          hurt('rival');
          continue;
        }
        // la cabeza del rival choca con el cuerpo del jugador: el rival revienta
        let dead = false;
        for (let i = 3; i < player.pts.length; i++) {
          const q = player.pts[i];
          if (Math.hypot(q.x - rv.x, q.y - rv.y) < rv.r + r * 0.8) { killRival(rv, true); dead = true; break; }
        }
        if (dead) continue;
        // …o con el cuerpo de otro rival
        for (const o of rivals) {
          if (o === rv || !o.alive) continue;
          let hitO = false;
          for (let i = 2; i < o.pts.length; i++) if (Math.hypot(o.pts[i].x - rv.x, o.pts[i].y - rv.y) < rv.r + o.r * 0.8) { hitO = true; break; }
          if (hitO) { killRival(rv, false); break; }
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
        const vmax = (105 + phase * 18) * D.dronVel;
        const wob = Math.sin(dn.ph) * 0.6;
        const ux = dx / d, uy = dy / d;
        dn.vx += ((ux - uy * wob) * vmax - dn.vx) * 1.4 * dt;
        dn.vy += ((uy + ux * wob) * vmax - dn.vy) * 1.4 * dt;
        dn.x += dn.vx * dt; dn.y += dn.vy * dt;
        if (d < r + 10) { hurt('dron'); killDrone(dn, false); continue; }
        for (let i = 3; i < player.pts.length; i++) {
          const q = player.pts[i];
          if (Math.abs(q.x - dn.x) < r + 8 && Math.abs(q.y - dn.y) < r + 8) { killDrone(dn, true); break; }
        }
      }

      // --- distracción ---
      hungry += dt;
      const lim = def.hunger + D.hambre;
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
      it.eaten = true; it.by = 'usa';
      player.mass += def.mass;
      hungry = 0;
      addScore(def.pts);
      if (Game.atencion) Game.atencion.curar(def.heal);
      conquer(it, 'usa');
      burst(it.x, it.y, it.col, 18, 160);
      floatText(it.x, it.y - it.r - 10, it.name + ' +' + def.pts, '#ffffff');
      const n = P.items.length - remaining();
      beep(520 + n * 14, 260, 0.08, 'square', 0.045);
      beep(700 + n * 14, 900, 0.06, 'square', 0.035, 0.07);
      updateHud();
      if (remaining() === 0) phaseComplete();
    }
    function rivalEat(rv, it) {
      it.eaten = true; it.by = rv.skin.kind;
      rv.L = Math.min(rv.L + 30, 900);
      rv.eatCd = rnd(D.cdComer[0], D.cdComer[1]);
      rv.goal = null; rv.think = 0;
      conquer(it, rv.skin.kind);
      burst(it.x, it.y, rv.skin.a, 14, 140);
      floatText(it.x, it.y - it.r - 10, RIVAL_COME.replace('{r}', rv.skin.nombre).replace('{x}', it.name), rv.skin.label);
      beep(220, 110, 0.14, 'sawtooth', 0.03);
      updateHud();
      if (remaining() === 0) phaseComplete();
    }
    function killRival(rv, byPlayer) {
      rv.alive = false; rv.respawn = 7;
      for (let i = 0; i < rv.pts.length; i += 2) spawnCrumb(rv.pts[i].x + rnd(-5, 5), rv.pts[i].y + rnd(-5, 5), 1.2, 15);
      burst(rv.x, rv.y, rv.skin.a, 26, 200);
      if (byPlayer) {
        addScore(300);
        floatText(rv.x, rv.y - 20, T.corte + ' +300', '#9dff3a');
        beep(300, 1200, 0.2, 'square', 0.05);
      }
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
    // ojos de caricatura: grandes, con brillo; los rivales con cejas de enojo
    function eyes(x, y, a, R, look, angry) {
      const fx = Math.cos(a), fy = Math.sin(a);
      for (const sgn of [-1, 1]) {
        const ex = x + fx * R * 0.28 - fy * R * 0.46 * sgn, ey = y + fy * R * 0.28 + fx * R * 0.46 * sgn;
        const er = R * (angry ? 0.4 : 0.5);
        circle(ex, ey, er + 1.5, TINTA);
        circle(ex, ey, er, '#ffffff');
        const px = ex + Math.cos(look) * er * 0.38, py = ey + Math.sin(look) * er * 0.38;
        circle(px, py, er * 0.52, '#120c18');
        circle(px - er * 0.18, py - er * 0.2, er * 0.18, '#ffffff');
        if (angry) {
          ctx.strokeStyle = TINTA; ctx.lineWidth = Math.max(1.5, R * 0.16); ctx.lineCap = 'round';
          // ceja: inclinada hacia el centro de la cara
          const bx = ex + fx * er * 0.9, by = ey + fy * er * 0.9;
          ctx.beginPath();
          ctx.moveTo(bx - fy * er * 0.9 * sgn - fx * er * 0.35, by + fx * er * 0.9 * sgn - fy * er * 0.35);
          ctx.lineTo(bx + fy * er * 0.7 * sgn + fx * er * 0.25, by - fx * er * 0.7 * sgn + fy * er * 0.25);
          ctx.stroke();
        }
      }
    }
    function drawPlayer(r) {
      const pts = player.pts.length ? player.pts : [{ x: player.x, y: player.y }];
      const blink = player.invul > 0 && Math.floor(clock * 14) % 2 === 0;
      if (blink && state === 'play') ctx.globalAlpha = 0.45;
      const base = ctx.globalAlpha;
      const n = pts.length, CANTON = 5;
      const rad = (i) => r * (i > n - 6 ? 0.55 + 0.09 * (n - i) : 1);
      for (let i = n - 1; i >= 0; i--) circle(pts[i].x + 3, pts[i].y + 4, rad(i) + 1, 'rgba(0,0,0,.35)');
      for (let i = n - 1; i >= 0; i--) circle(pts[i].x, pts[i].y, rad(i) + 2.5, TINTA);
      for (let i = n - 1; i >= 1; i--) {
        const q = pts[i], rr = rad(i);
        const col = i <= CANTON ? US.azul : (Math.floor((i - CANTON - 1) / 2) % 2 === 0 ? US.rojo : US.blanco);
        circle(q.x, q.y, rr, col);
        if (player.boost && i % 4 === 0) { ctx.globalAlpha = base * 0.35; circle(q.x, q.y, rr + 5, '#ffe14d'); ctx.globalAlpha = base; }
      }
      // brillo de caricatura
      ctx.globalAlpha = base * 0.3;
      for (let i = n - 1; i >= 1; i -= 2) circle(pts[i].x - rad(i) * 0.3, pts[i].y - rad(i) * 0.35, rad(i) * 0.35, '#ffffff');
      ctx.globalAlpha = base;
      // estrellas del cantón
      ctx.fillStyle = '#ffffff';
      for (let i = 1; i <= Math.min(CANTON, n - 1); i++) star(ctx, pts[i].x, pts[i].y, rad(i) * 0.55);
      // cabeza: azul con estrellas, ojos enormes y lengua
      const R = r * 1.45, hx = player.x, hy = player.y, a = player.a;
      const fx = Math.cos(a), fy = Math.sin(a);
      if (Math.sin(clock * 6) > 0.55) {
        ctx.strokeStyle = '#e8304a'; ctx.lineWidth = Math.max(1.5, R * 0.14); ctx.lineCap = 'round';
        const tx = hx + fx * R * 1.55, ty = hy + fy * R * 1.55;
        ctx.beginPath();
        ctx.moveTo(hx + fx * R * 0.9, hy + fy * R * 0.9); ctx.lineTo(tx, ty);
        ctx.lineTo(tx + Math.cos(a + 0.5) * R * 0.3, ty + Math.sin(a + 0.5) * R * 0.3);
        ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a - 0.5) * R * 0.3, ty + Math.sin(a - 0.5) * R * 0.3);
        ctx.stroke();
      }
      circle(hx, hy, R + 2.5, TINTA);
      circle(hx, hy, R, US.azul);
      ctx.fillStyle = '#ffffff';
      for (const [b, s] of [[-0.55, 0], [-0.45, 0.6], [-0.45, -0.6]]) star(ctx, hx + fx * R * b - fy * R * s, hy + fy * R * b + fx * R * s, R * 0.2);
      // franja roja/blanca en el hocico
      ctx.globalAlpha = base * 0.9;
      circle(hx + fx * R * 0.62, hy + fy * R * 0.62, R * 0.28, US.rojo);
      ctx.globalAlpha = base;
      eyes(hx, hy, a, R, aimA != null ? aimA : a, false);
      ctx.globalAlpha = 1;
    }
    function strokeBody(pts, w, col) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    }
    function drawRival(rv) {
      const pts = rv.pts, n = pts.length, r = rv.r, sk = rv.skin;
      if (n < 2) return;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.save(); ctx.translate(3, 4); strokeBody(pts, 2 * r + 2, 'rgba(0,0,0,.35)'); ctx.restore();
      strokeBody(pts, 2 * r + 5, TINTA);
      if (sk.kind === 'israel') {
        strokeBody(pts, 2 * r, '#ffffff');
        strokeBody(pts, 1.64 * r, '#0038b8');
        strokeBody(pts, 1.24 * r, '#ffffff');
        ctx.strokeStyle = '#0038b8';
        for (let i = 6; i < n - 3; i += 9) david(ctx, pts[i].x, pts[i].y, r * 0.5, Math.max(1.2, r * 0.12));
      } else if (sk.kind === 'coca') {
        strokeBody(pts, 2 * r, '#e41e2b');
        strokeBody(pts, 0.8 * r, '#ef3b46');
        // listón blanco ondulado
        ctx.beginPath();
        let acc = 0;
        for (let i = 1; i < n; i++) {
          const p = pts[i], q = pts[i - 1];
          acc += Math.hypot(p.x - q.x, p.y - q.y);
          const tx = p.x - q.x, ty = p.y - q.y, tl = Math.hypot(tx, ty) || 1;
          const off = r * 0.62 * Math.sin(acc / (r * 2.2));
          const x = p.x - ty / tl * off, y = p.y + tx / tl * off;
          if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r * 0.24); ctx.stroke();
      } else {
        strokeBody(pts, 2 * r, '#f37fb5');
        strokeBody(pts, 1.1 * r, '#ff9fcb');
      }
      // cabeza
      const R = r * 1.25;
      circle(rv.x, rv.y, R + 2.5, TINTA);
      circle(rv.x, rv.y, R, sk.a);
      if (sk.kind === 'israel') { ctx.strokeStyle = '#0038b8'; david(ctx, rv.x - Math.cos(rv.a) * R * 0.45, rv.y - Math.sin(rv.a) * R * 0.45, R * 0.35, Math.max(1, R * 0.1)); }
      const dp = Math.hypot(player.x - rv.x, player.y - rv.y);
      eyes(rv.x, rv.y, rv.a, R, dp < 400 ? Math.atan2(player.y - rv.y, player.x - rv.x) : rv.a, true);
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    }
    function drawDrone(dn) {
      ctx.save(); ctx.translate(dn.x, dn.y);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke();
      ctx.strokeStyle = '#9a86a8'; ctx.lineWidth = 2.5; ctx.stroke();
      const sp = clock * 30;
      for (const [x, y] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
        ctx.fillStyle = 'rgba(30,20,40,.6)';
        ctx.fillRect(x - 5 * Math.abs(Math.cos(sp)), y - 1, 10 * Math.abs(Math.cos(sp)), 2);
      }
      circle(0, 0, 5, '#1b1024');
      circle(0, 0, 2.5, Math.floor(clock * 5) % 2 ? '#d9259a' : '#5a0a3a');
      ctx.restore();
    }
    function drawItem(it, near) {
      // la región entera "respira" para que se note que se puede comer
      const m = maskOf(P, it);
      if (m) {
        ctx.globalAlpha = (near ? 0.28 : 0.1) + (near ? 0.12 : 0.06) * Math.sin(clock * (near ? 6 : 3) + it.ph);
        ctx.drawImage(m.img, m.x / P.ms, m.y / P.ms, m.w / P.ms, m.h / P.ms);
        ctx.globalAlpha = 1;
      }
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
      ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = it.col; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(it.x - R * 0.45, it.y - R * 0.45, R * 0.3, R * 0.3);
    }
    function nearestItem() {
      let near = null, nd = 1e9;
      for (const it of P.items) {
        if (it.eaten) continue;
        const d = Math.hypot(it.x - player.x, it.y - player.y);
        if (d < nd) { nd = d; near = it; }
      }
      return near;
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
      // el mapa del cliente se reduce: con suavizado para que no se vea serruchado
      ctx.imageSmoothingEnabled = !!P.imagen;
      ctx.drawImage(mapC, 0, 0, P.W, P.H);
      ctx.imageSmoothingEnabled = false;
      // orilla del mapa (hace daño)
      ctx.strokeStyle = Math.floor(clock * 3) % 2 ? '#d9259a' : '#8c1f74';
      ctx.lineWidth = 8;
      ctx.setLineDash([24, 16]); ctx.lineDashOffset = -clock * 40;
      ctx.strokeRect(-4, -4, P.W + 8, P.H + 8);
      ctx.setLineDash([]);
      // vista visible en coordenadas de mundo
      const vw = CW / zoom / 2 + 60, vh = CH / zoom / 2 + 60;
      const vis = (x, y) => Math.abs(x - camX) < vw && Math.abs(y - camY) < vh;
      const near = phase >= 0 ? nearestItem() : null;
      if (P) {
        for (const it of P.items) {
          if (it.eaten) continue;
          const m = maskOf(P, it);
          const seen = m
            ? Math.abs(m.x / P.ms + m.w / P.ms / 2 - camX) < vw + m.w / P.ms / 2 && Math.abs(m.y / P.ms + m.h / P.ms / 2 - camY) < vh + m.h / P.ms / 2
            : vis(it.x, it.y);
          if (seen) drawItem(it, it === near);
        }
      }
      for (const c of crumbs) {
        if (!vis(c.x, c.y)) continue;
        const s = (c.v > 1 ? 7 : 5) * (0.8 + 0.25 * Math.sin(clock * 6 + c.ph));
        ctx.fillStyle = TINTA; ctx.fillRect(c.x - s / 2 - 1, c.y - s / 2 - 1, s + 2, s + 2);
        ctx.fillStyle = c.c; ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s);
      }
      for (const dn of drones) if (dn.alive && vis(dn.x, dn.y)) drawDrone(dn);
      for (const rv of rivals) if (rv.alive) drawRival(rv);
      if (phase >= 0) drawPlayer(radiusOf(player.mass));
      for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
      renderLabels(vis, near);
      if (phase >= 0 && (miniTick = (miniTick + 1) % 3) === 0) renderMiniMap();
    }
    // texto que sigue la curva del cuerpo (Coca-Cola, Nestlé), en el canvas nítido de etiquetas
    function textAlong(rv, lc) {
      const sk = rv.skin, pts = rv.pts;
      if (!sk.texto || pts.length < 6) return;
      const k = zoom * PIX;
      const fs = Math.round(rv.r * 1.35 * k);
      if (fs < 7) return;
      lc.font = sk.font.replace('{s}', fs);
      const chars = sk.texto.split('');
      const ws = chars.map((ch) => lc.measureText(ch).width / k); // en unidades de mundo
      const total = ws.reduce((s, v) => s + v, 0);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const len = cum[cum.length - 1];
      const at = (s) => {
        let i = 1;
        while (i < cum.length - 1 && cum[i] < s) i++;
        const t = clamp((s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0, 1);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
      };
      lc.textAlign = 'center'; lc.textBaseline = 'middle';
      lc.lineJoin = 'round';
      const gap = rv.r * 3;
      for (let s0 = rv.r * 2.4; s0 + total < len - rv.r; s0 += total + gap) {
        const p0 = at(s0 + total / 2 - 2), p1 = at(s0 + total / 2 + 2);
        // hacia la cabeza va de p1 a p0; si eso apunta a la izquierda se escribe al revés para no quedar de cabeza
        const toHead = Math.cos(Math.atan2(p0.y - p1.y, p0.x - p1.x)) >= 0;
        let off = 0;
        for (let j = 0; j < chars.length; j++) {
          const s = toHead ? s0 + total - off - ws[j] / 2 : s0 + off + ws[j] / 2;
          off += ws[j];
          const a = at(s - 1.5), b = at(s + 1.5), c = at(s);
          const ang = toHead ? Math.atan2(a.y - b.y, a.x - b.x) : Math.atan2(b.y - a.y, b.x - a.x);
          const sc = toScreen(c.x, c.y);
          lc.save(); lc.translate(sc.x, sc.y); lc.rotate(ang);
          lc.lineWidth = Math.max(2, fs * 0.16); lc.strokeStyle = 'rgba(80,10,30,.55)'; lc.strokeText(chars[j], 0, 0);
          lc.fillStyle = '#ffffff'; lc.fillText(chars[j], 0, 0);
          lc.restore();
        }
      }
    }
    function renderLabels(vis, near) {
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, LW, LH);
      if (!P || phase < 0) return;
      for (const rv of rivals) if (rv.alive) textAlong(rv, lctx);
      lctx.textAlign = 'center'; lctx.textBaseline = 'bottom';
      lctx.lineJoin = 'round';
      const fs = clamp(Math.round(Math.min(LW, LH) / 58), 11, 16);
      lctx.font = 'bold ' + fs + 'px "Lucida Console", "Courier New", monospace';
      const text = (t, x, y, col) => {
        lctx.lineWidth = 4; lctx.strokeStyle = '#0a070d'; lctx.strokeText(t, x, y);
        lctx.fillStyle = col; lctx.fillText(t, x, y);
      };
      for (const it of P.items) {
        if (it.eaten || !vis(it.x, it.y)) continue;
        const s = toScreen(it.x, it.y);
        const off = it.r * zoom * PIX + 4;
        text(it.name, s.x, it.below ? s.y + off + fs : s.y - off, it === near ? '#ffe14d' : '#f2eef7');
      }
      for (const rv of rivals) {
        if (!rv.alive) continue;
        const s = toScreen(rv.x, rv.y);
        text(rv.skin.nombre, s.x, s.y - rv.r * 1.4 * zoom * PIX - 6, rv.skin.label);
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
      if (miniBase) g.drawImage(miniBase, 0, 0);
      const on = Math.floor(clock * 3) % 2;
      for (const it of P.items) {
        if (it.eaten) continue;
        g.fillStyle = TINTA; g.fillRect(Math.round(it.x * s) - 2, Math.round(it.y * s) - 2, 5, 5);
        g.fillStyle = on ? '#ffe14d' : '#ffffff';
        g.fillRect(Math.round(it.x * s) - 1, Math.round(it.y * s) - 1, 3, 3);
      }
      for (const rv of rivals) {
        if (!rv.alive) continue;
        g.fillStyle = TINTA; g.fillRect(Math.round(rv.x * s) - 2, Math.round(rv.y * s) - 2, 5, 5);
        g.fillStyle = rv.skin.kind === 'israel' ? '#4d7dff' : rv.skin.a;
        g.fillRect(Math.round(rv.x * s) - 1, Math.round(rv.y * s) - 1, 3, 3);
      }
      g.fillStyle = '#d9259a';
      for (const dn of drones) if (dn.alive) g.fillRect(Math.round(dn.x * s) - 1, Math.round(dn.y * s) - 1, 2, 2);
      g.fillStyle = TINTA; g.fillRect(Math.round(player.x * s) - 3, Math.round(player.y * s) - 3, 7, 7);
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(player.x * s) - 2, Math.round(player.y * s) - 2, 5, 5);
      g.strokeStyle = 'rgba(20,16,40,.7)'; g.lineWidth = 1;
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
      get estado() {
        return {
          state, phase, nivel, mass: player.mass, restantes: remaining(), atencion: att(), pts, hungry, golpes,
          rivales: rivals.map((rv) => ({ nombre: rv.skin.nombre, alive: rv.alive, x: Math.round(rv.x), y: Math.round(rv.y), speed: Math.round(rv.speed) })),
          deRivales: P ? P.items.filter((it) => it.eaten && it.by !== 'usa').map((it) => it.name + ':' + it.by) : [],
          drones: drones.length,
        };
      },
      comerFase(dejar) {
        if (state !== 'play') return false;
        const left = P.items.filter((it) => !it.eaten);
        for (let k = 0; k < left.length - (dejar || 0); k++) eatItem(left[k]);
        return true;
      },
      // un rival se come n cosas del mapa (para ver cómo quedan pintadas)
      rivalCome(n, cual) {
        if (state !== 'play') return false;
        const rv = rivals[cual || 0] || rivals[0];
        if (!rv) return false;
        const left = P.items.filter((it) => !it.eaten);
        for (let k = 0; k < Math.min(n || 1, left.length - 1); k++) rivalEat(rv, left[k]);
        return true;
      },
      // posición en pantalla (coordenadas de página) del municipio/estado/país más cercano que falta
      objetivo() {
        const best = nearestItem();
        if (!best) return null;
        const s = toScreen(best.x, best.y), rr = root.getBoundingClientRect();
        return { x: rr.left + s.x, y: rr.top + s.y, name: best.name };
      },
      irA(x, y) {
        if (x != null) { player.x = x; player.y = y; } else { const it = P.items.find((q) => !q.eaten); if (it) { player.x = it.x - 60; player.y = it.y; } }
        player.a = 0; aimA = 0; resetTrail(player, lengthOf(player.mass));
      },
      // pone a un rival enfrente del jugador (para probar choques)
      rivalEnfrente(cual) {
        const rv = rivals[cual || 0];
        if (!rv) return false;
        const fx = Math.cos(player.a), fy = Math.sin(player.a);
        rv.alive = true; rv.a = player.a + Math.PI / 2;
        rv.x = player.x + fx * 150 - fy * 60; rv.y = player.y + fy * 150 + fx * 60;
        resetTrail(rv, rv.L); rv.pts = bodyPoints(rv, rv.r, rv.L);
        player.invul = 0;
        return true;
      },
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
