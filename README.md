# JuegoClary

Juego de navegador en JavaScript puro (HTML + CSS + JS, sin compilación ni servicios externos).
El jugador ve la pantalla completa de una computadora vieja (sin habitación, manos ni escritorio).

## Cómo ejecutarlo

- Abre `index.html` con doble clic en el navegador, **o**
- sirve la carpeta con un servidor estático, por ejemplo:
  ```
  python -m http.server 8000
  ```
  y abre http://localhost:8000

Los videos (Reproductor de Videos y fondo de los créditos) salen de YouTube y **solo funcionan con el
servidor y con internet**: YouTube no deja incrustar videos en una página abierta con doble clic
(`file://`). Sin conexión el juego usa los archivos de `video/` si están, y si no, un fondo animado.

## Trucos (para probar)

Escribe **PILINES** en cualquier momento (o el código Konami **↑ ↑ ↓ ↓ ← → ← → B A**). Se saltan todas las
cinemáticas: el juego pasa al **escritorio libre** (`?desde=libre`) con todo desbloqueado al 100 %:
el mapa completo y la app **Trucos** en el escritorio, con atención infinita, "Ganar el minijuego en curso",
Minijuegos, cada minijuego en bucle y saltos a cualquier capítulo. Sigue activo en esa pestaña del navegador
(también al saltar de capítulo) hasta pulsar "Desactivar trucos". Código en `js/trucos.js`.

Al **rejugar** un minijuego (desde la app Minijuegos o en bucle desde Trucos) hay un botón **Salir al escritorio**
en la barra de título, y en GAME OVER el segundo botón también dice "Salir al escritorio" (en la historia sigue
siendo "Finalizar juego").

## Historia

Los textos del guion están en `js/guion.js` (se pueden editar sin tocar el código). Lo marcado como PROVISIONAL es relleno hasta tener el texto definitivo.

**Personajes:** Tomás (14 años), su mamá, su papá Eduardo, la IA LucIAno y la Sociedad Revolucionaria (SR). El juego transcurre el **22 de noviembre de 2040**. La mamá es Jocelyn Sánchez Munoz.

**INICIO:** primero la **pantalla de título** con letra de arcade (Press Start 2P, en `fonts/`): "LAS CRONICAS DE TOMAS VS SHIT GPT, EL SEPTIMO APAGON." (sin tildes, la letra de arcade no las dibuja bien) (clic o cualquier tecla). Luego la pantalla que pide el **nombre de usuario** (el jugador escribe lo que quiera; sale en el score). Luego la primera leyenda se escribe en verde neón y se lee en voz en off (queda al menos 10 s). El calendario del ordenador marca el **22 de noviembre de 2040**.

**Reglas generales (correcciones):**
- **Pausa:** botón arriba a la derecha o `Esc` (congela minijuegos, temporizadores, música y voz). En la pantalla de pausa, en vez de la palabra PAUSA, el gato (`img/pausa_gato.jpg`) rebota dentro de un recuadro negro.
- **Clic para continuar:** cuando termina un texto, el juego espera un clic en cualquier parte de la pantalla (o Enter / Espacio); el ▶ parpadeante lo indica.
- **Dificultad:** antes de cada minijuego sale una pestaña con **Fácil / Intermedio / Difícil** (en la historia y en la app Minijuegos). `?dificultad=facil|intermedio|dificil` en la URL la salta.
- **Barra de atención = vida.** Solo se ve en los minijuegos (fuera de ellos aparece un momento cuando una respuesta a LucIAno la baja). Se llena al empezar cada minijuego; con poca atención suena la muerte de Roblox en repetición. Si se vacía (o el minijuego se pierde): **GAME OVER.** con música de arcade → "Perdiste toda tu atención" (voz de loquendo; las llamas se mueven y la calavera se ríe moviendo la mandíbula) → **score** con el nombre de usuario → "Volver a intentar el minijuego" / "Finalizar juego".
- **Pensamientos de Tomás:** nube pixel art abajo; siguen con el botón ▶ (o Enter/Espacio), o se quedan hasta que el jugador haga lo que se pide.
- **Chats largos:** cuando la IA (o SR) termina y le toca a Tomás, aparece ▶ (salvo al final, cuando LucIAno se vuelve malo).
- **Groserías:** si el jugador insulta a LucIAno, contesta "no digas eso bro" o el "BOBI BU BU PAUM PAUM…".
- **Ratón:** cuando la historia controla la computadora el ratón se puede mover (pero no hacer clic).
- **Mapa:** cuando se lee una ficha, el mapa pasa a pantalla completa y la cámara se acerca a la ficha. "4T" se lee "la cuarta transformación".

**ACTO I** (canción 1): Tomás abre LucIAno y teclea solo; notificación "SR: Capturaron a Eduardo"; el jugador ya puede chatear; mensaje de SR con link (el cursor se vuelve mano); LucIAno lo "fusiona" con el juego y se abre el **mapa** (el tablero "IA en México") y aparece el archivo **MAPA7382** en el escritorio. Tomás pregunta "Q es esto?", revisa Mensajes (tres mensajes a su mamá sin enviar) y llega "Dile la verdad a Tomás.".

**ACTO II** (canción 2): pensamiento de Tomás (pestaña arriba; vuelve a salir si el jugador no hace nada). A lo primero que el jugador le escriba, LucIAno contesta que no envió ningún link. Tomás escribe a su mamá (no llega), SR: "Entramos a fase 3" → pestaña con código glitcheando y **sopa de letras** (la del guion, palabras encriptadas). El jugador puede apuntar en el **Post-it**. "Vuelve al mapa" en morado: Acatlán parpadea → contraseña **EJIDO** (pista extra al minuto) → se lee el texto en voz en off. El jugador va a LucIAno: opciones (la 1 baja la atención a 75 % y luego sale la 2 obligatoria) y explicación de la termoeléctrica.

**ACTO III** (canción 3): Ribera de Chapala → minijuego de **pesca** (solo vale el pez dorado; los mutantes dan el aviso en rojo) → se des-glitchea la primera parte y se lee. Plan México → **serpiente** con la bandera de EE. UU. que se come los estados → se desbloquea la imagen de la CFE, la cámara sigue el hilo rojo hasta la segunda parte de la Ribera → contraseña **APAGÓN**. LucIAno se abre solo: dos preguntas con opciones (atención a 60 % y 50 %), conversación, "virus" y LucIAno **borra el mapa** (va a la Papelera; la cámara se acerca a la papelera parpadeante y el jugador lo recupera con doble clic). Chihuahua → voz en off y recorrido por los hilos hasta Silicon Valley y Querétaro. Silicon Valley → **maquila** (60 s, botellas de pipí y sed) → voz en off. LucIAno repite "Hola Tomás…" seis veces y lo dice dos veces con voz profunda; chat automático con **SR**; LucIAno se revela (rojo, pantalla completa); SR pide el código; la sección CÓDIGO parpadea; reto de LucIAno con tres opciones (todas valen).

El monólogo final de LucIAno se escucha en voz profunda y luego en voz de loquendo; al terminar empieza la pelea.

**ACTO IV**: **ShitGPT Fighter** de tres niveles (ver `js/minijuegos/pelea.js`). Si pierde: "PERDISTE lol" y la secuencia de GAME OVER. Si gana: "GANASTE", el enemigo se desintegra y en negro LucIAno dice "Ta bueno, me ganaste…" (loquendo). Luego la sección CÓDIGO, "¡Claro!, el código es PTAL", el jugador lo escribe en el chat de SR, final en negro, "Finalizar juego" y **créditos** que suben con letra de cómic y la caída de Edgar de fondo (desde YouTube, en silencio; sin conexión `video/caida_edgar.mp4` y, si no está, un fondo animado).

**Apps extra:** **Videos** (canal "DVD" con el logo que rebota, y videos de YouTube a x3 —YouTube llega como máximo a x2— con los archivos de `video/` como respaldo) **FAINT** (paint con varias brochas; el documento se llama "proyecto SOLLOZO"), **Fotos** (solo la carpeta **PILINES.12** con las imágenes de `img/pilines/`, en orden; miniaturas y visor con ◀ ▶) y **Minijuegos** (todos los minijuegos, cada uno con su pestaña de dificultad; al terminar se vuelve a la lista y la atención de la historia queda como estaba).

**Voz en off:** síntesis de voz del navegador, siempre en español (prefiere voces de México y las de mejor calidad; si el navegador no tiene ninguna voz en español, solo se muestra el subtítulo), con subtítulos (la música baja mientras habla). Estilos: `narrador` (robótica con glitches, para la intro y el mapa), `loquendo` y `profunda` (`Game.voz.say(texto, { estilo })`). El acento yucateco no se puede lograr con la voz del navegador: haría falta grabar los audios.
**Música:** las tres canciones (`audio/acto1.mp3`, `acto2.mp3`, `acto3.mp3`) suenan en bucle una tras otra; cada acto empieza en la suya.
**Mapa:** tablero de Fernando Calderón (imágenes en `img/mapa/`, posiciones e hilos del tablero original). Se mueve arrastrando y con la rueda. La sección **CÓDIGO** no estaba en el tablero: es provisional (acróstico P-T-A-L en `guion.js`).

Para probar: `?sin-intro` salta la intro; `?desde=acto2` (también `acto3`, `borrado`, `maquila`, `pelea`, `codigo`, `creditos`) empieza en ese punto; `?desde=mj-sopa` (o `mj-pesca`, `mj-serpiente`, `mj-maquila`, `mj-pelea`) abre solo ese minijuego en bucle; `?desde=nada` deja el escritorio libre sin historia. Con `?desde=` se puede pasar `&usuario=Nombre`.

## Dirección de arte: goth divine machinery

Estética tipo Windows 3.1/98 con paleta goth ácida (negros y morados profundos, magenta, verde ácido, amarillo enfermo, poco saturados), referencias a Habbo y Evangelion. Pantalla con textura de CRT (rejilla RGB y líneas de barrido), fondo de escritorio glitcheado (`img/fondo_escritorio.jpg`), ventanas grises biseladas con barra de título morado-magenta e iconos pixel art de 32×32 en paleta VGA. Los estilos están en `css/goth.css` (va al final y sobrescribe a los demás).

La habitación, el teclado y las manos siguen en el código (`room.js`, `keyboard.js`, `hands.js`) porque la historia "teclea" con ellas, pero ya no se muestran.

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
js/pausa.js       Pausa global (se carga primero: congela tiempo, temporizadores y audio)
js/escena.js      Jugador y score, música, voz en off, barra de atención/vida, pensamientos, ▶ y pantallas de GAME OVER
js/apps/          Apps extra: videos.js (Reproductor de Videos), faint.js (FAINT), fotos.js (Fotos / PILINES.12), minijuegos.js (Minijuegos)
js/minijuegos/    sopa, pesca, serpiente, maquila y pelea (cada uno: Game.minijuegos.x(host) → { done: Promise<bool>, destroy });
                  la vida es Game.atencion (danar/curar) y el puntaje Game.score.add
js/story.js       Toda la historia (intro, actos I–IV, finales y créditos)
css/story.css     Estilos de la intro, el chat, la notificación y los glitches
css/actos.css     Estilos del mapa, HUD, opciones, SR, post-it y pantallas finales
css/minijuegos/   Estilos de cada minijuego
css/apps.css      Estilos de Videos, FAINT, Fotos y Minijuegos
css/goth.css      Estética goth divine machinery (pantalla completa, Windows 9x ácido, nube, GAME OVER, pausa, créditos)
audio/            Música de cada acto
video/            Respaldo local de los videos de YouTube (ver video/README.txt)
img/mapa/         Recortes del tablero "IA en México"
img/pilines/      Imágenes de la carpeta PILINES.12 (app Fotos)
img/minijuegos/   Mapa de México de la serpiente y el avatar dibujado de Tomás (pelea)
img/pausa_gato.jpg  Gato de la pantalla de pausa
```

Todo el escritorio se mide en "unidades de tecla" (1em del plano = una tecla), así que escala cambiando un solo `font-size`.
