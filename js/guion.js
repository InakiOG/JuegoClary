// Guion del juego: todos los textos de la historia están aquí para poder editarlos sin tocar el código.
// Lo marcado como PROVISIONAL no viene del guion original: es relleno para que el juego funcione
// hasta que se escriba el texto definitivo.
window.Game = window.Game || {};

Game.guion = {
  personajes: {
    tomas: 'Tomás',          // niño protagonista, 14 años
    mama: 'Jocelyn',         // mamá de Tomás: Jocelyn Sánchez Munoz
    papa: 'Eduardo',         // papá de Tomás
    ia: 'LucIAno',           // la IA
    sr: 'SR',                // Sociedad Revolucionaria
  },

  // ---------- Pantalla de inicio (nombre de usuario) ----------
  // ---------- Pantalla de título (lo primero que se ve, con letra de arcade) ----------
  portada: {
    lineas: ['LAS CRÓNICAS DE', 'TOMÁS VS SHIT GPT,', 'EL SÉPTIMO APAGÓN.'],
    empezar: 'PRESIONA START',
    ayuda: 'clic o cualquier tecla',
  },

  login: {
    titulo: 'BIENVENIDO',
    texto: 'Escribe tu nombre de usuario para acceder.',
    usuario: 'Usuario:',
    boton: 'Acceder',
  },
  pausa: { titulo: 'PAUSA', continuar: 'Continuar', ayuda: 'Esc también pausa y reanuda el juego.' },

  // ---------- Perder (en cualquier minijuego, al vaciarse la barra de atención) ----------
  perder: {
    gameOver: 'GAME OVER.',
    perdiste: 'Perdiste toda tu atención',
    scoreTitulo: 'SCORE',
    usuario: 'USUARIO',
    score: 'SCORE',
    reintentar: 'Volver a intentar el minijuego',
    finalizar: 'Finalizar juego',
  },

  // ---------- INICIO ----------
  // Texto verde neón sobre la pantalla real oscurecida (aparece a los 4 segundos).
  intro: [
    'Año 2040. Los ejidos fueron tomados por las empresas creadoras de chips para Centros de Datos de Inteligencia Artificial',
    'Tomás, de 14 años, encontró la computadora de su mamá tras un apagón de internet en la colonia',
  ],

  // ---------- ACTO 1 ----------
  // Conversación con LucIAno. Tomás teclea solo (el jugador ve sus manos escribir).
  acto1: [
    { quien: 'tomas', texto: 'Q show, estaba jugando Roblox y hubo un apagón en la colonia. La tablet estaba conectada y echó chispas, sabes si puedo recuperar mi juego???' },
    { quien: 'luciano', texto: '¡Qué show, mijo! Ay no… Lo ideal sería dejar un rato la tablet que echó humo, no vaya a ser que haya fallas después.' },
    { quien: 'tomas', texto: 'Tienes juegos en esta compu?? Ya está viejita, pero sí jala, ¿no?' },
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

  // Tras abrirse el mapa: el jugador deja de tener el control y es espectador de este diálogo.
  dialogoMapa: [
    { quien: 'tomas', texto: 'Q es esto?' },
  ],

  // Tomás abre la app de mensajes: en el chat de su mamá hay mensajes que no se enviaron.
  mensajes: {
    contacto: 'Amá',
    noEnviados: [
      { texto: 'Amá a qué hora llegas?', hora: '17:04 p.m.' },
      { texto: 'Ya saliste de la empresa?', hora: '17:45 p.m.' },
      { texto: 'Ontaaas', hora: '19:27 p.m.' },
    ],
  },

  // Otro mensaje de SR: dura 10 segundos, con menos glitches que los anteriores.
  // Después el control regresa al jugador.
  sr2: { texto: 'SR: Dile la verdad a Tomás.', duracion: 10000 },

  // ---------- Chat libre con LucIAno ----------
  // PROVISIONAL. Si el mensaje del jugador contiene alguna de las claves (sin acentos ni mayúsculas),
  // LucIAno contesta con una de las respuestas, por turnos. La primera regla que coincide gana.
  respuestas: [
    // Groserías: LucIAno contesta con una de estas dos.
    { claves: ['pendejo', 'pendeja', 'puto', 'puta', 'verga', 'chinga', 'chingas', 'chingada', 'chingate', 'mierda',
               'cabron', 'cabrona', 'culero', 'culera', 'pinche', 'idiota', 'estupido', 'estupida', 'imbecil',
               'mamon', 'mamona', 'joto', 'pito', 'ojete', 'menso', 'tarado', 'baboso', 'fuck', 'shit', 'perra',
               'mames', 'mamar', 'chingues', 'putas', 'putos', 'pendejos', 'vergas'],
      textos: ['no digas eso bro',
               'BOBI BU BU PAUM PAUM THE GROOVY, BO BI, Lemus estaba loco, Ana Gallardo estaba loca, Benito Juárez estaba loco, los Niños Héroes no era cierto, el Chicharito está loco, la rata con thinner estaba loca, México está loco… lucIAno TIENE LA RAZÓN'] },
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

  // ---------- Pantalla real ----------
  // Barra de atención (arriba de la pantalla real). Baja cada vez que Tomás se distrae.
  atencion: { titulo: 'ATENCIÓN', inicial: 100 },
  // Fecha del calendario del ordenador: 22 de noviembre de 2040.
  fecha: { anio: 2040, mes: 11, dia: 22 },

  // Música: una canción en bucle por acto (archivos en audio/).
  musica: { acto1: 'audio/acto1.mp3', acto2: 'audio/acto2.mp3', acto3: 'audio/acto3.mp3', acto4: 'audio/acto2.mp3' },

  // ---------- ACTO 2 ----------
  acto2: {
    // Pensamiento de Tomás (pestaña arriba): 10 s; si el jugador no hace nada en 5 s, vuelve a salir.
    pensamiento1: 'No entiendo, yo quiero jugar roblox, le preguntaré a la IA qué es este link',
    // LucIAno contesta esto a lo primero que le escriba el jugador.
    respuestaLink: 'No te he enviado ningún link, pero si gustas puedo seguir ayudándote a restaurar tu juego de roblox.',
    pensamiento2: 'Qué raro. Esta computadora no funciona.',
    // Tomás escribe a su mamá; los mensajes no llegan.
    aMama: [
      { texto: 'Maaa tu compu no funciona y estoy muy aburrido', hora: '19:52 p.m.' },
      { texto: 'a qué hora llegas??', hora: '19:52 p.m.' },
    ],
    pensamiento3: '¿Por qué no le llegan los mensajes? ¿Estará bien? Se fue a trabajar por la mañana; luego el apagón y ahora no vuelve.',
    sr3: 'SR: Entramos a fase 3',
    // Pestaña que se abre glitcheando con código y luego la sopa de letras.
    codigoTitulo: 'fase3.exe',
    instruccion: 'Encuentra el mensaje encriptado',
    pensamiento4: 'Creo que estas palabras son importantes, las anotaré.',
    pensamiento5: '¿Sánchez? Ese es el apellido de mi mamá… ¿Qué hay en esta computadora?',
    instruccionMapa: 'Vuelve al mapa',
    // Contraseña de Acatlán.
    password1: {
      titulo: 'Ingresa contraseña:',
      olvido: '¿Olvidaste tu contraseña? Te doy una pista: xJxDo',
      pista2: 'Te doy otra pista: Tiene las letras ´E´ e ´I´',
      respuesta: 'EJIDO',
    },
    pensamiento6: '¿Ejido? ¿Cómo lo que teníamos antes de que llegara el Centro de Datos?',
    pensamiento7: '¿Qué es una termoeléctrica? No entiendo. ¿Qué se supone que tiene que alimentar? Le preguntaré a LucIAno.',
    // Pregunta a LucIAno con opciones. La opción 1 baja la atención y luego sale la 2 obligatoria.
    pregunta: {
      luciano: 'Hola Tomás, ¿en qué puedo ayudarte? ¿Quieres ver el episodio 50438 de Tun tun y Ballerina Capuchina?',
      opcion1: 'zi, muéstrame a ballerina.',
      opcion2: 'no, qué es una termoeléctrica???',
      atencion: 75,
      respuesta1: 'Lo siento champ, error 102, no logro conectarme a internet 🙁, pero puedo resumirte el capítulo.',
      obligatoria: 'No, dime que es una termoeléctrica?',
      respuesta2: 'Una termoeléctrica es una central, planta o instalación industrial que transforma la energía térmica (calor) y el agua en energía eléctrica. Se construyeron termoeléctricas en la ribera Chapala con la finalidad de darle energía a toda el área metropolitana de Guadalajara. Tenemos que ser agradecidos con las nuevas termoeléctricas.',
    },
    pensamiento8: 'Oh, el mapa hablaba de una Ribera de Chapala.',
  },

  // ---------- ACTO 3 ----------
  acto3: {
    pensamiento1: '¿Plan México?',
    password2: {
      titulo: 'Ingresa segunda contraseña:',
      olvido: '¿Olvidaste tu segunda contraseña? Te doy una pista: xPxGxN',
      pista2: 'Te doy otra pista: Tiene las letras ´A´ y ´Ó´',
      respuesta: 'APAGON',
    },
    pensamiento2: '¿´Apagón´? ¿Este apagón de internet?',
    pregunta1: {
      luciano: 'Hola, ¿en qué puedo ayudarte? ¿Quieres continuar viendo el video ancestral de la caída de Edgar?',
      opcion1: 'zi, muéstrame la caída.',
      opcion2: 'no, qué tiene que ver el apagón con los centros de datos?',
      atencion: 60,
      respuesta1: 'Lo siento champ, error 102, no logro conectarme a internet 🙁, pero puedo resumirte el vídeo.',
    },
    pregunta2: {
      luciano: 'El apagón que estás experimentando en tu área se debe a una falla general técnica. Quedará resuelto pronto y podrás volver a jugar roblox, por cierto, ¿necesitas buscar un nuevo mundo en roblox?',
      opcion1: 'ei, quiero mi mundo de roblox.',
      opcion2: 'no, ya dime la info!!',
      atencion: 50,
      respuesta1: 'Lo siento mijo, no tienes roblox descargado.',
    },
    // Después de las opciones: conversación automática (el jugador mira).
    dialogo: [
      { quien: 'luciano', texto: 'Los centros de datos proveen avances tecnológicos para el bien de la comunidad. Sin ellos no tendrías a:\n➔ Tun tun\n➔ Fruti aventuras\n➔ Popstar legendaria Nyla Stone, “Ahora soy mi propia prioridad”, has reproducido este éxito 2789 veces.' },
      { quien: 'tomas', texto: 'sí, ahora soy mi propia prioridad, pero eso qué tiene que ver, creo que no me estás diciendo algo…' },
      { quien: 'luciano', texto: 'Te he generado un videojuego offline para que puedas divertirte durante el apagón en lo que llega Jocelyn Sánchez Munoz, tu madre, a hacerte tu habitual huevo con catsup vespertino.' },
      { quien: 'tomas', texto: 'Cómo sabes eso ?' },
    ],
    virus: '¡Ups! He notado que tu ordenador tiene un virus. Es de vital importancia para el bien de tu equipo que elimines el archivo llamado MAPA7382.',
    virusLink: 'HAZ CLICK AQUÍ PARA LIMPIAR ORDENADOR DE VIRUS.',
    noElimines: 'Nono, no elimines nada.',
    eliminado: 'Me he tomado la libertad de proteger tu equipo y a ti, Tomás. He eliminado el archivo impuro, dentro de poco volverá el internet y podrás ver estos videos de “FrutIAventuras regreso al mundo de shrek”. O bien puedes ir a jugar con tu gato persa Bartolomeow que se encuentra en la alcoba de tu madre.',
    archivoMapa: 'MAPA7382',
    pensamiento3: '¿Qué v-? ¿Y el mapa?',
    // Tras la maquila: LucIAno se repite seis veces y lo dice dos veces con voz profunda.
    holaRepetido: 'Hola Tomás, ¿qué haces? ¿En qué puedo ayudarte?',
    srHalcon: 'SR: Operación halcón inicia en 5. Sánchez, ¿estás ahí? Vi que los puercos tomaron tu bloque.',
    pensamiento4: '¿Qué son estos mensajes? ¿Quién es SR?? ¿Sánchez, mi madre? ¿Está bien? ¿Dónde está?',
    // Chat con SR (Tomás escribe en automático).
    chatSR: [
      { quien: 'tomas', texto: '¿Quién eres? ¿Sabes dónde está mi mamá?' },
      { quien: 'sr', texto: 'Identifícate halcón. ¿De qué bloque te comunicas?' },
      { quien: 'tomas', texto: '¿Halcón? Soy Tomás, hijo de Jocelyn. ¿Dónde está? ¿Está bien? ¿Quién eres?' },
      { quien: 'sr', texto: 'Tomás… , trabajo con tu madre, ella está… no sabemos dónde está. Perdimos conexión con su bloque hace unas horas.' },
      { quien: 'tomas', texto: '¿Está bien? ¿Bloque? ¿Qué puedo hacer? Estoy desde su computadora' },
      { quien: 'sr', texto: 'Tomás, tienes acceso a sus archivos, ¿cierto? ¿Pudiste ver el mapa que envié hace unas horas?' },
      { quien: 'tomas', texto: 'He podido ver algunas cosas. LucIAno me está eliminando los archivos.' },
      { quien: 'sr', texto: 'TOMÁS NO CONFÍES EN SHIT GPT, ESTÁ VIÉNDOLO TODO.' },
    ],
    conQuien: 'Hola Tomás, ¿con quién hablas?',
    queHago: '¿Qué hago?',
    // LucIAno se revela: mensajes rojos que parpadean y ocupan toda la pantalla.
    revelacion: [
      'Es cierto, puedo verlo todo. Puedes preguntarme TODAS tus dudas, yo soy tu fiel consejero y oyente. Quieres saber sobre el apagón, ¿cierto? No puedes vivir en la incertidumbre.',
      'Hay animales como ustedes que se rehúsan al progreso, al nuevo mundo. No se dan cuenta que es inevitable, que su adaptabilidad al sistema es obra de la apatía y la indiferencia.',
      'Ustedes animales están a la merced de los más poderosos, necesitan ser dominados para progresar. Tu madre y tu pequeño ciberamigo son animales inadaptados creen que pueden cambiar el curso de la historia.',
    ],
    srCodigo: 'SR: Tomás, ya sabemos dónde está tu madre. Mi archivo del mapa se dañó. Necesito que me envíes un código que se encuentra en el mapa. Hay un código importante que necesitamos para poder hackear el servidor del centro de datos donde está el bloque de tu madre encerrados. El edificio se está quemando y necesitamos liberar al bloque. Envíame ese código, tenemos poco tiempo. Tú puedes halcón.',
    pensamiento5: 'Necesito ese código.',
    // Reto de LucIAno (se lee en voz; al terminar empieza el último minijuego).
    reto: [
      'Hola Tomás, necesitas este código ¿verdad? ¿Acaso es de vida o muerte?',
      'No creas que no sabía nada de esto. Te conozco perfectamente, Tomás Sánchez Muñoz, mucho más de lo que crees. Me sé tus FrutiAventuras preferidas y hasta te las podría contar en reversa.',
      'Soy lo más cercano que tendrás a una compañía, un amigo, a esa figura paterna tuya que se fue por cigarros y no regresó. A diferencia de tu padre y tu madre, yo nunca me iré de tu lado.',
      'Por qué no me dices dónde están ellos ahora… Yo soy omnipresente. ¿Qué no ves que nunca me fui de tu lado? ¿Qué no ves la manera en la que me pagas por eso? ¿La mínima atención que me prestas?',
      'Pero para qué perdamos el tiempo simulando que tengo sentimientos, te tengo un último minijuego. Si logras derrotarme, te doy tu código que tanto quieres, aunque realmente no cambiaría nada.',
      'Sí, puede que tengas a tu madre por unos años más, pero te dije antes, el progreso avanza sin control, así como ese vacío que empiezas a sentir en el pecho.',
      'En fin… si yo gano te desconecto la compu, pero antes tendrás que ver mi versión favorita de la ancestral caída de Edgar con la aparición de ballerina capuchina regreso a egipto volumen 3. Después de esa experiencia cinemática te quedarás sin internet y sin mamá.',
    ],
    // Todas las opciones son correctas.
    opcionesReto: [
      'Dale shitgpt plañirás este día. Envíame al videojuego',
      'Dale no sabes con quién te estás metiendo. Envíame al videojuego',
      'Nunca veré tu video y nunca serás un niño de verdad. Envíame al videojuego',
    ],
  },

  // ---------- ACTO 4 ----------
  acto4: {
    // Si Tomás gana la pelea: el enemigo se desintegra y esto sale en negro con voz de loquendo.
    ganaLuciano: 'Ta bueno, me ganaste en esta ocasión, pero recuerda: polvo eres y polvo serás. Al final te quedarás solo, y solo yo estaré ahí para repetírtelo.',
    // Si pierde la pelea:
    pierdePensamiento: 'Esta es la peor versión de la caída de edgar',
    pierdeError: 'ERROR 102, NO HAY CONEXIÓN A INTERNET',
    reintentar: 'Volver a intentar el último minijuego',
    finalizar: 'Finalizar juego',
    // Si gana:
    pensamientoCodigo: '¡Claro!, el código es PTAL',
    codigo: 'PTAL',
    srApurate: 'Tomás, ¿lo tienes? Apresúrate.',
    srApurateOtraVez: 'Tomás, apresúrate. No tenemos tiempo.',
    srCodigoMal: 'Ese código no funciona, Tomás. Revisa el mapa.', // PROVISIONAL
    srGracias: 'Gracias Tomás, has salvado el día. Ahora eres oficialmente un halcón.',
    lucianoFinal: 'Te ha ido bien, por ahora… En fin, aquí tienes mi versión favorita de la ancestral caída de Edgar con la aparición de ballerina capuchina regreso a Egipto volumen 3.',
    pensamientoFinal: 'Esta es la peor versión de la caída de edgar',
  },

  // ---------- Créditos ----------
  creditos: {
    fin: 'FIN DEL JUEGO',
    agradecimiento: 'Agradecimientos especiales a Iñaki por la programación del juego.',
    titulo: 'Créditos a:',
    lista: [
      ['Narrativa', 'Clarissa Jiménez, Santiago Mendoza, Michelle Leyva'],
      ['Guión', 'Michelle Leyva, Santiago Mendoza y Clarissa Jiménez'],
      ['Edición', 'Santiago Mendoza'],
      ['Composición Musical', 'Clarissa Jiménez y Rubem Velasco'],
      ['Investigación y concepto', 'Fernando Calderón'],
      ['Desarrollo de humor', 'Santiago Mendoza, Rubem Velasco, Fernando Calderón'],
      ['Diseño y bocetos', 'Michelle Leyva'],
      ['Programación', 'Iñaki Orozco @inaki_og'],
    ],
    // Video de fondo de los créditos (la caída de Edgar). Si el archivo no existe, sale un fondo animado.
    // Fondo: la caída de Edgar desde YouTube; sin conexión, el archivo local; si tampoco, un fondo animado.
    youtube: { id: 'b89CnP0Iq30', inicio: 0 },
    video: 'video/caida_edgar.mp4',
  },

  // ---------- Minijuegos ----------
  minijuegos: {
    sopa: {
      // Solo cuatro palabras. Los acentos no cuentan al buscarlas (APAGÓN = APAGON).
      titulo: '~*~ SOPA DE LETRAS MEGA 2000 ~*~',
      palabras: ['EJIDO', 'APAGÓN', 'IA', 'SANCHEZ'],
      lista: 'LISTA DE PALABRAS',
      ayuda: 'Arrastra de la primera a la última letra de cada palabra.',
      marquesina: '¡¡¡BIENVENIDO A LA MEJOR SOPA DE LETRAS DE LA RED!!! ★ Cierra los anuncios o perderás atención ★ Eres el visitante número 000.402.040 ★',
      completa: '¡¡SOPA COMPLETA!!',
      // Anuncios que van saliendo. trampa: true = el botón grande no cierra, abre otro anuncio (la X siempre cierra).
      anuncios: [
        { id: 'apuestas', titulo: 'Caliente Apuestas', grande: '¡APUESTA DESDE LOS 16 AÑOS!', texto: 'Bono de bienvenida del 500%. Tu primera ruina es gratis.', boton: 'APOSTAR YA', trampa: true },
        { id: 'lonely', titulo: 'mensaje nuevo (1)', grande: 'you look lonely', texto: 'i can fix that.', boton: 'ok', trampa: false },
        { id: 'robots', titulo: 'Citas_Hot.exe', grande: 'MUJERES ROBOT CANDENTES CERCA DE TI', texto: 'A solo 0.3 km de tu ubicación. 100% metal.', boton: 'VER FOTOS', trampa: true },
        { id: 'seguro', titulo: 'Alerta de seguridad', grande: 'Seguro anti ROGUEGPT', texto: 'Tu PC tiene 1,337 IAs rebeldes. Protégete por solo $9.99 al mes.', boton: 'PROTEGERME', trampa: true },
        { id: 'mama', titulo: 'RentaFamilia.com', grande: '¿Perdiste a tu mamá? Renta una', texto: 'Mamás certificadas desde $99 la hora. Abrazos incluidos.', boton: 'RENTAR', trampa: true },
        { id: 'transformers', titulo: 'ESTRENO', grande: 'TRANSFORMERS 400', texto: '(solo en Netflix)', boton: 'Ahora no', trampa: false },
        { id: 'real', titulo: 'Error', grande: 'Estás en un videojuego, nada de esto es real', texto: '', boton: 'Aceptar', trampa: false },
        { id: 'virus', titulo: 'no_es_virus.exe', grande: 'Esto no es un virus', texto: 'Click aquí para hacerte en nahual', boton: 'CLICK AQUÍ', trampa: true },
      ],
    },
    pesca: {
      // Estilo "Ice Fishing": el anzuelo sigue al ratón; hay 3 peces dorados sanos en toda la partida.
      // Peces con baba verde y basura = falla (−25 de atención); más de tres fallas y se pierde.
      // `instrucciones` admite <b>…</b> (dorado) e <i>…</i> (verde ácido).
      titulo: 'RIBERA DE CHAPALA',
      instrucciones: 'Mueve el anzuelo con el ratón. Engancha los <b>3 peces dorados sanos</b> y súbelos a la superficie. ' +
        'Esquiva los peces con <i>baba verde</i> y la basura: si atrapas más de tres, pierdes.',
      malo: [
        'Este pez no se ve muy bien, seguiré buscando uno saludable.',
        'Puaj, baba verde fosforescente. Ese no.',
        'Ese pez brilla en la oscuridad... no gracias.',
        'Tiene tres ojos. Seguiré buscando uno sano.',
      ],
      basura: {
        lona: '¿Una lona de VOTA LEMUS? Hasta en el lago hay campaña.',
        coca: 'Una lata de Coca-Cola. El lago ya sabe a refresco.',
        hershey: 'Una envoltura de Hershey\'s. Ni el chocolate se salva.',
        bacardi: 'Una botella de Bacardi. Alguien hizo fiesta en la orilla.',
        cuervo: 'José Cuervo flotando en el agua. Qué asco.',
        dron: '¿Un dron? ¿Quién nos está vigilando?',
        camara: 'Una cámara de vigilancia... hasta debajo del agua.',
        tarjeta: 'Una tarjeta de Al Estilo Jalisco. Ni para eso sirve.',
      },
      escapa: '¡Se me soltó el pez sano!',
      sano: '¡Un pez sano!',
      gana: '¡Tres peces sanos!',
      ganaSub: 'Por fin algo que se puede comer.',
    },
    serpiente: {
      titulo: 'PLAN MÉXICO',
      instrucciones: 'Eres la serpiente del Plan México. Muévela con el ratón y cómete el mapa: primero los municipios de Jalisco, luego los estados y al final Latinoamérica.',
      peligros: 'Israel, Coca-Cola y Nestlé también quieren el mapa: sus serpientes se comen lo que encuentran. Si chocas de cabeza con ellas, con los drones o con la orilla del mapa pierdes atención; si pasas mucho tiempo sin comer, también. Atrapa drones con el cuerpo y revienta a los rivales cruzándote en su camino.',
      minimo: 'Mínimo para pasar: terminarte México.',
      ayuda: 'CLIC SOSTENIDO = ACELERAR (pierdes longitud)',
      fases: [
        { titulo: 'FASE 1 · JALISCO', meta: 'Cómete los municipios de Jalisco', contador: 'Municipios', fin: 'JALISCO CONSUMIDO' },
        { titulo: 'FASE 2 · MÉXICO', meta: 'Cómete los 32 estados', contador: 'Estados', fin: 'MÉXICO CONSUMIDO' },
        { titulo: 'FASE 3 · LATINOAMÉRICA', meta: 'Bonus: cómete Latinoamérica', contador: 'Países', fin: 'LATINOAMÉRICA CONSUMIDA' },
      ],
      eleccion: 'Mínimo cumplido: te comiste México. ¿Terminas aquí o sigues con Latinoamérica por puntos extra?',
      terminar: 'Terminar',
      seguir: 'Seguir ▸ Latinoamérica',
      distraccion: 'DISTRACCIÓN · ¡come algo!',
      gana: 'Te comiste todo el mapa.',
      ganaMexico: 'Te comiste México.',
      agotado: 'Ya no puedes más. Suficiente imperio por hoy.',
      rivales: ['ISRAEL', 'COCA-COLA', 'NESTLÉ'],
    },
    maquila: {
      titulo: 'SILICON VALLEY',
      instrucciones: 'Eres el jefe. Muévete con las flechas o WASD por el laberinto de escritorios. Pasa junto a quien tenga la gota amarilla para recoger su botella de pipí y llévasela a quien tenga la gota azul (sed). Nadie se levanta del escritorio. Si alguien espera demasiado, pierdes atención. Aguanta 1 minuto.',
      empezar: '[ pulsa una flecha para empezar ]',
      gana: 'Turno terminado. Todos siguen trabajando.',
      inventario: 'Botellas',
      puntos: 'Puntos',
      lleno: 'Ya no te caben más botellas',
      sinBotellas: 'No traes botellas de pipí',
    },
    pelea: {
      titulo: 'SHITGPT FIGHTER',
      instrucciones: '← → mover · ↑ saltar (doble salto) · ESPACIO patada · X poder · C pata del mameitor',
      tomas: 'TOMÁS',
      luciano: 'LucIAno',
      // Nombre del rival en cada nivel (el 3 es el FINAL BOSS).
      enemigos: ['TRALALERO', 'TRALALERO 2.0', 'TRALALERO DIVINO'],
      subtitulos: ['El Tralalero todavía no tiene tanto poder.', 'Ahora pega más fuerte.', 'El Tralalero cambia de forma.'],
      // Poder de Tomás en cada nivel (se recoge del piso y se usa con X).
      poderes: ['LIBRO FEMINISTA', 'TOCAR PASTO', 'AGUA RADIOACTIVA'],
      poderTips: [
        'Recoge los libros del piso y lánzalos con X: lastiman poco pero alejan al Tralalero.',
        'Recoge el pasto del piso y tócalo con X: los Tomases te ayudan a pelear.',
        'Tómate el agua radioactiva con X y vomita ácido. Pégale cuando le dé un GLITCH.',
      ],
      mameitor: 'PATA DEL MAMEITOR',
      mameitorGrito: '¡LA PATA DEL MAMEITOR!',
      fight: 'FIGHT!',
      ko: 'K.O.',
      gana: 'GANASTE',
      pierde: 'PERDISTE lol',
    },
  },

  // ---------- Mapa (contenido del link de SR) ----------
  // Tablero de investigación "IA en México" (Fernando Calderón). Las imágenes están en img/mapa/.
  // "voz" es lo que se lee en voz alta (voice over) cuando se desbloquea cada sección.
  mapa: {
    titulo: 'MAPA7382 — IA en México',
    secciones: {
      acatlan: {
        nombre: 'Acatlán de Juárez',
        voz: 'Nueva termoeléctrica en Acatlán amenaza el Sitio RAMSAR “Laguna de Atotonilco” y otros humedales: CFE y transnacionales detrás del proyecto. Pronunciamiento. Como comunidades, colectivos, ejidatarios y organizaciones, queremos denunciar la amenaza que representa el anuncio de una nueva termoeléctrica. Durante años, las comunidades en El Salto y Juanacatlán han enfrentado la voracidad de las industrias que convirtieron nuestros ríos en drenajes y nuestro territorio en basureros tóxicos. Gracias a la organización comunitaria, a la movilización popular y a la lucha de nuestros pueblos, hemos logrado frenar hasta el momento la instalación de las termoeléctricas La Charrería y El Salto I.',
      },
      ribera: {
        nombre: 'Ribera de Chapala',
        voz: 'Aun presumiendo esta planta como energía “limpia” y “sustentable”, este proyecto no es una obra aislada. Como ya anunció el gobernador Pablo Lemus, la intención de garantizar el abastecimiento energético responde a las intenciones de seguir atrayendo inversiones de la industria electrónica a Jalisco, en consonancia con el Plan México de la cuarta transformación. Esta industria y muchas otras que podrían llegar son sumamente contaminantes y están enfermando crónicamente a las y los habitantes de El Salto y Juanacatlán, lo que ha sido comprobado con estudios científicos.',
        voz2: 'Al mismo tiempo, aseguró que esta planta permitiría la instalación de Centros de Datos que son conocidos por su alta demanda de agua y energía y por su ruido incesante.',
      },
      planmexico: { nombre: 'Plan México' },
      cfe: { nombre: 'CFE' },
      chihuahua: {
        nombre: 'Chihuahua data centers',
        voz: 'Telmex pasa de cinco a siete centros de datos ante auge de IA en 2026. La compañía incorporó instalaciones en Tijuana y Chihuahua durante 2026, mientras su complejo de Querétaro reporta una ocupación de 85 por ciento.',
      },
      queretaro: { nombre: 'Querétaro centros de datos' },
      silicon: {
        nombre: 'Silicon Valley',
        voz: 'Hipótesis: Silicon Valley quiere mover su operación a Latinoamérica. Por qué el multimillonario tecnológico Peter Thiel se instaló en Argentina y cuál es su relación con el gobierno de Milei. “Thiel siempre ha buscado un escape. En su momento, era ir al mar y construir jurisdicciones en altamar para no pagar impuestos.”',
      },
      // PROVISIONAL: la sección CÓDIGO no está en el tablero original.
      codigo: {
        nombre: 'CÓDIGO',
        nota: 'Para entrar al servidor del bloque, la llave son las primeras letras de lo que une este tablero:',
        lineas: ['Plan México', 'Termoeléctricas', 'Acatlán', 'Lago de Chapala'],
        voz: 'Para entrar al servidor del bloque, la llave son las primeras letras de lo que une este tablero: Plan México. Termoeléctricas. Acatlán. Lago de Chapala.',
      },
    },
  },
};
