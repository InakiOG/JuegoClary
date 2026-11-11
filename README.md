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

## Dirección de arte: maquinaria divina

Tecnología vieja y reparada mezclada con escultura sagrada, con un aire cyberpunk de anime de finales de los 90.

- **Habitación** oscura: pared de hormigón con grietas y manchas, cables gruesos colgando del techo y amontonados en el escritorio, algunos metiéndose en las grietas.
- **Rostro de piedra** gigante con los ojos cerrados, agrietado y medio tragado por los cables, a la izquierda del monitor.
- **La pantalla es la única luz**: un brillo cian ilumina la habitación, el escritorio y el contorno de las manos. Sombras de trama roja (puntos) en las esquinas.
- **Monitor CRT** gris y rozado, con cinta adhesiva y una pieza de repuesto; cristal abombado (esquinas curvas, viñeta y reflejo), líneas de barrido, una banda de luz que baja y un parpadeo ocasional que también oscurece la habitación. La curvatura es un efecto visual: la imagen no se deforma, así los clics caen donde apuntas.
- **Teclado** gris apagado con teclas de repuesto que no combinan y un trozo de cinta; el cable del ratón sigue al ratón y se pierde detrás del monitor.
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
js/room.js        Pared, grietas, rostro de piedra y cables (SVG generado)
js/main.js        Disposición, entrada de ratón/teclado y bucle de animación
js/sound.js       Sonidos de teclas y ratón (Web Audio)
js/files.js       Archivos del ordenador del juego, fotos generadas e iconos
js/os.js          Escritorio, ventanas, explorador, notas, visor y barra de tareas
css/os.css        Estilos del sistema operativo de la pantalla
```

Todo el escritorio se mide en "unidades de tecla" (1em del plano = una tecla), así que escala cambiando un solo `font-size`.
