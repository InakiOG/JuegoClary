# JuegoClary

Juego de navegador en JavaScript puro (HTML + CSS + JS, sin compilación ni servicios externos).
El jugador está sentado frente a un ordenador: ve el monitor, el teclado, el ratón y sus propias manos.

## Cómo ejecutarlo

- Abre `index.html` con doble clic en el navegador, **o**
- sirve la carpeta con un servidor estático, por ejemplo:
  ```
  python -m http.server 8000
  ```
  y abre http://localhost:8000

## Historia

Los textos del guion están en `js/guion.js` (se pueden editar sin tocar el código). Lo marcado como PROVISIONAL es relleno hasta tener el texto definitivo.

**Personajes:** Tomás (14 años), su mamá, su papá Eduardo, la IA LucIAno y la Sociedad Revolucionaria (SR). El juego transcurre el **22 de noviembre de 2040**. La mamá es Jocelyn Sánchez Munoz.

**INICIO:** "clic para empezar" (los navegadores no dejan sonar audio sin un clic); la pantalla real queda oscurecida y, a los 4 segundos, aparece el texto en verde neón. Luego la pantalla se aclara y aparece arriba la **barra de atención** al 100 %. El calendario del ordenador marca el **22 de noviembre de 2040**.

**ACTO I** (canción 1): Tomás abre LucIAno y teclea solo; notificación "SR: Capturaron a Eduardo"; el jugador ya puede chatear; mensaje de SR con link (el cursor se vuelve mano); LucIAno lo "fusiona" con el juego y se abre el **mapa** (el tablero "IA en México") y aparece el archivo **MAPA7382** en el escritorio. Tomás pregunta "Q es esto?", revisa Mensajes (tres mensajes a su mamá sin enviar) y llega "Dile la verdad a Tomás.".

**ACTO II** (canción 2): pensamiento de Tomás (pestaña arriba; vuelve a salir si el jugador no hace nada). A lo primero que el jugador le escriba, LucIAno contesta que no envió ningún link. Tomás escribe a su mamá (no llega), SR: "Entramos a fase 3" → pestaña con código glitcheando y **sopa de letras** (la del guion, palabras encriptadas). El jugador puede apuntar en el **Post-it**. "Vuelve al mapa" en morado: Acatlán parpadea → contraseña **EJIDO** (pista extra al minuto) → se lee el texto en voz en off. El jugador va a LucIAno: opciones (la 1 baja la atención a 75 % y luego sale la 2 obligatoria) y explicación de la termoeléctrica.

**ACTO III** (canción 3): Ribera de Chapala → minijuego de **pesca** (solo vale el pez dorado; los mutantes dan el aviso en rojo) → se des-glitchea la primera parte y se lee. Plan México → **serpiente** con la bandera de EE. UU. que se come los estados → se desbloquea la imagen de la CFE, la cámara sigue el hilo rojo hasta la segunda parte de la Ribera → contraseña **APAGÓN**. LucIAno se abre solo: dos preguntas con opciones (atención a 60 % y 50 %), conversación, "virus" y LucIAno **borra el mapa** (va a la Papelera; la cámara se acerca a la papelera parpadeante y el jugador lo recupera con doble clic). Chihuahua → voz en off y recorrido por los hilos hasta Silicon Valley y Querétaro. Silicon Valley → **maquila** (60 s, botellas de pipí y sed) → voz en off. LucIAno repite "Hola Tomás…" seis veces y lo dice dos veces con voz profunda; chat automático con **SR**; LucIAno se revela (rojo, pantalla completa); SR pide el código; la sección CÓDIGO parpadea; reto de LucIAno con tres opciones (todas valen).

**ACTO IV** (canción 2): **pelea** arcade (flechas y ESPACIO; barra azul claro/verde neón). Si pierde: negro, pensamiento, "ERROR 102…" en verde y botones "Volver a intentar el último minijuego" / "Finalizar juego". Si gana: se ve la sección CÓDIGO (voz en off), "¡Claro!, el código es PTAL", el jugador lo escribe en el chat de SR (SR insiste cada 20 s), final en negro, "Finalizar juego" y **créditos**.

**Voz en off:** síntesis de voz del navegador en español, con subtítulos abajo de la pantalla real (la música baja mientras habla).
**Música:** `audio/acto1.mp3`, `acto2.mp3` (actos II y IV) y `acto3.mp3`, en bucle.
**Mapa:** tablero de Fernando Calderón (imágenes en `img/mapa/`, posiciones e hilos del tablero original). Se mueve arrastrando y con la rueda. La sección **CÓDIGO** no estaba en el tablero: es provisional (acróstico P-T-A-L en `guion.js`).

Para probar: `?sin-intro` salta la intro; `?desde=acto2` (también `acto3`, `borrado`, `maquila`, `pelea`, `codigo`) empieza en ese punto; `?desde=nada` deja el escritorio libre sin historia.

## Dirección de arte: maquinaria divina

Tecnología vieja y reparada mezclada con escultura sagrada, con un aire cyberpunk de anime de finales de los 90.

- **Habitación de día**: pared blanca percudida (amarillenta, con manchas, chorretones y grietas oscuras), escritorio de madera vieja, cables gruesos colgando del techo y amontonados en el escritorio, algunos metiéndose en las grietas.
- **Estampa de una santa** colgada en la pared, a la izquierda del monitor: velo, aureola y manos juntas, pero **sin rostro** (un óvalo liso). Cuelga de un cable, tiene el cristal agrietado y una lucecita roja de vela debajo.
- **Luz**: entra un poco de sol por una ventana con persiana fuera de cuadro, a la derecha: franjas de luz cálida sobre la pared izquierda y la estampa, rayos tenues en el aire y un reflejo en el cristal del monitor. La pantalla añade un brillo cian suave. Sombras de trama roja (puntos) en las esquinas.
- **Monitor CRT** gris y rozado, con cinta adhesiva y una pieza de repuesto; cristal abombado (esquinas curvas, viñeta y reflejo), líneas de barrido, una banda de luz que baja y un parpadeo ocasional que también oscurece la habitación. La curvatura es un efecto visual: la imagen no se deforma, así los clics caen donde apuntas.
- **Teclado** gris apagado con teclas de repuesto que no combinan, un trozo de cinta y cuatro teclas que faltan (3, J, F7 y punto: se ve el interruptor, que se hunde al pulsar); el cable del ratón sigue al ratón y se pierde detrás del monitor.
- **Sistema operativo** de fósforo: fondo negro con grano, texto verde-cian con brillo, letra monoespaciada, ventanas cuadradas con bordes finos.

## Qué hay por ahora (escena base)

- **Monitor CRT** centrado, en proporción 4:3, que escala con la ventana.
- **Cursor virtual** dentro de la pantalla: el cursor real se oculta y el del juego sigue al ratón (se queda en el borde si el ratón sale de la pantalla). Al cargar, el cursor aparece centrado hasta que mueves el ratón.
- **Escritorio** en la franja inferior con teclado, alfombrilla, ratón y las dos manos. El teclado se coloca justo debajo de la parte del escritorio que tapa el monitor, así nunca queda oculto.
- **Ratón real → ratón del juego**: al mover el ratón, el ratón del escritorio y la mano derecha se desplazan en proporción. Los clics iluminan el botón correspondiente y el dedo se flexiona.
- **Teclado real → teclado del juego**: cada tecla pulsada se hunde e ilumina. La mano izquierda se mueve para poner el dedo correcto sobre la tecla (mecanografía clásica); con las teclas de la derecha, la mano derecha deja el ratón, pulsa y vuelve al ratón al poco rato o en cuanto mueves el ratón.
- Teclado completo sin bloque numérico: **fila de funciones** (Esc y F1–F12 en grupos de cuatro, teclas más bajas), bloque principal y, a la derecha, **Ins/Inicio/RePág/Supr/Fin/AvPág** y las **flechas en T invertida** (las pulsa la mano derecha). Las teclas F no bloquean la acción del navegador (F5 recarga, F12 abre las herramientas).
- Distribución de teclado **ISO española** por defecto (Ñ, Ç, Enter alto). Si el navegador lo permite (`navigator.keyboard.getLayoutMap`, Chrome/Edge), las etiquetas se adaptan a la distribución real del usuario.

## Ordenador del juego (pantalla)

- **Escritorio** con fondo de pantalla, iconos (Este equipo, Papelera, `nota.txt`, `playa.jpg`), barra de tareas con menú de inicio y reloj.
- **Ventanas** que se pueden mover, redimensionar (esquina inferior derecha), maximizar (doble clic en la barra de título), minimizar y cerrar.
- **Explorador de archivos** con Escritorio, Documentos, Imágenes y Papelera. Los archivos se arrastran entre carpetas, al escritorio o a la papelera; en la papelera se pueden restaurar o vaciar.
- **Notas** (archivos .txt editables) y **Fotos** (visor con zoom; las fotos se pintan con canvas, sin archivos de imagen).
- Teclado: `Supr` manda el archivo seleccionado a la papelera (dentro de la papelera lo borra), `Enter` lo abre.
- **Sonido**: clic sintetizado (Web Audio) al pulsar teclas y botones del ratón.

## Estructura

```
index.html        Escena (monitor, escritorio)
css/style.css     Estilos y colores (variables al principio)
js/layout.js      Distribución de teclas y qué dedo pulsa cada una
js/keyboard.js    Construcción del teclado y estado pulsado
js/hands.js       Manos en SVG y su animación
js/room.js        Pared, grietas, estampa de la santa y cables (SVG generado)
js/main.js        Disposición, entrada de ratón/teclado, control de las manos desde la historia (Game.input)
js/sound.js       Sonidos (Web Audio): teclas, ratón, intro, chat e interferencias
js/files.js       Archivos del ordenador del juego, fotos generadas e iconos
js/os.js          Escritorio, ventanas, explorador, notas, visor y barra de tareas
css/os.css        Estilos del sistema operativo de la pantalla
js/guion.js       Textos de la historia (personajes, intro, acto 1, respuestas de LucIAno, mapa)
js/luciano.js     Programa de chat LucIAno
js/mapa.js        Mapa de corcho (contenido del link de SR): secciones, hilos, cámara, contraseñas
js/mensajes.js    App de mensajes (chat de la mamá con mensajes no enviados)
js/sr.js          Chat cifrado con SR
js/postit.js      Post-it para apuntar
js/escena.js      Música, voz en off con subtítulos, barra de atención, pensamientos, zoom y sacudidas
js/minijuegos/    sopa, pesca, serpiente, maquila y pelea (cada uno: Game.minijuegos.x(host) → { done, destroy })
js/story.js       Toda la historia (intro, actos I–IV, finales y créditos)
css/story.css     Estilos de la intro, el chat, la notificación y los glitches
css/actos.css     Estilos del mapa, HUD, opciones, SR, post-it, sopa y pantallas finales
audio/            Música de cada acto
img/mapa/         Recortes del tablero "IA en México"
```

Todo el escritorio se mide en "unidades de tecla" (1em del plano = una tecla), así que escala cambiando un solo `font-size`.
