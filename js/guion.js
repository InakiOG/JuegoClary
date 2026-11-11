// Guion del juego: todos los textos de la historia están aquí para poder editarlos sin tocar el código.
// Lo marcado como PROVISIONAL no viene del guion original: es relleno para que el juego funcione
// hasta que se escriba el texto definitivo.
window.Game = window.Game || {};

Game.guion = {
  personajes: {
    tomas: 'Tomás',          // niño protagonista, 14 años
    mama: '',                // mamá de Tomás (nombre pendiente)
    papa: 'Eduardo',         // papá de Tomás
    ia: 'LucIAno',           // la IA
    sr: 'SR',                // Sociedad Revolucionaria
  },

  // ---------- INICIO ----------
  // Texto verde neón sobre la pantalla real oscurecida (aparece a los 4 segundos).
  intro: [
    'Año 2040. Los ejidos fueron tomados por las empresas creadoras de chips para Centros de Datos de Inteligencia Artificial',
    'Tomás, de 14 años, encontró la computadora de su mamá tras un apagón de luz e internet en la colonia',
  ],

  // ---------- ACTO 1 ----------
  // Conversación con LucIAno. Tomás teclea solo (el jugador ve sus manos escribir).
  acto1: [
    { quien: 'tomas', texto: 'Hola, estaba jugando Roblox y hubo un apagón en la colonia. Esta es la única compu que puedo usar, sabes si puedo recuperar mi juego?' },
    { quien: 'luciano', texto: '¡Qué show, mijo! Ay no… Lo ideal sería dejar un rato la tablet que echó humo, no vaya a ser que haya fallas después.' },
    { quien: 'tomas', texto: 'Tienes juegos en esta compu?? Ya está viejita, pero sí jala, no?' },
    { quien: 'luciano', texto: 'Puedo crear un videojuego para ti.' },
  ],

  // Notificación con glitch, abajo a la derecha, 5 segundos.
  notificacion: 'SR: Capturaron a Eduardo',

  // Desde aquí el jugador ya puede chatear con la IA.
  procesando: 'Tu juego está siendo procesado…',

  // Mensaje de SR con un link. El juego espera a que el jugador haga clic.
  // PROVISIONAL: el texto y el nombre del link.
  sr: {
    texto: 'Abre esto. No se lo enseñes a nadie.',
    link: 'sr://ejido_07/mapa',
  },

  // LucIAno "fusiona" el juego con la información del link. PROVISIONAL.
  fusion: [
    'Detecté datos nuevos… Los voy a integrar a tu juego.',
    '¡Listo, mijo! Tu juego está listo.',
  ],

  // ---------- Chat libre con LucIAno ----------
  // PROVISIONAL. Si el mensaje del jugador contiene alguna de las claves (sin acentos ni mayúsculas),
  // LucIAno contesta con una de las respuestas, por turnos. La primera regla que coincide gana.
  respuestas: [
    { claves: ['eduardo', 'papa', 'capturaron', 'captura'],
      textos: ['No tengo información sobre esa notificación, mijo. ¿Seguimos con tu juego?',
               'Esa notificación no viene de mí. Mejor concéntrate en tu juego, ¿va?'] },
    { claves: ['sr', 'sociedad', 'revolucionaria', 'link', 'liga', 'mensaje'],
      textos: ['No reconozco a ese remitente. Te recomiendo no abrir mensajes desconocidos.',
               'Mmm… ese mensaje no pasó por mis filtros. Raro, ¿no?'] },
    { claves: ['mama', 'mami', 'madre'],
      textos: ['Esta compu tiene la cuenta de tu mamá. No toques sus archivos, ¿eh?'] },
    { claves: ['juego', 'roblox', 'jugar', 'listo', 'cuanto', 'tarda'],
      textos: ['Tu juego sigue en proceso… ya casi, mijo.', 'Paciencia, que esta compu ya está viejita.'] },
    { claves: ['apagon', 'luz', 'internet', 'red', 'tablet'],
      textos: ['La red de la colonia está inestable. Esta compu está usando una conexión de respaldo.'] },
    { claves: ['quien eres', 'que eres', 'luciano', 'como te llamas'],
      textos: ['Soy LucIAno, tu asistente. Estoy aquí para ayudarte en lo que necesites.'] },
    { claves: ['hola', 'que onda', 'quiubo', 'buenas'],
      textos: ['¡Quiubo, mijo! Aquí sigo.'] },
    { claves: ['gracias'],
      textos: ['¡De nada! Para eso estoy.'] },
  ],
  porDefecto: [
    'Mmm, no te entendí bien, mijo.',
    'Ajá… ¿y luego?',
    'Déjame pensarlo. Mientras, tu juego sigue cargando.',
  ],

  // ---------- Mapa (contenido del link) ----------
  // PROVISIONAL: lugares de ejemplo. Cada uno se puede pulsar en el mapa.
  mapa: {
    titulo: 'juego_tomas — MAPA',
    lugares: [
      { id: 'casa', nombre: 'Casa de Tomás', x: 22, y: 62, texto: '[Contenido pendiente]' },
      { id: 'colonia', nombre: 'La colonia', x: 33, y: 38, texto: '[Contenido pendiente]' },
      { id: 'ejido', nombre: 'Ejido', x: 62, y: 30, texto: '[Contenido pendiente]' },
      { id: 'centro', nombre: 'Centro de Datos', x: 76, y: 66, texto: '[Contenido pendiente]' },
    ],
  },
};
