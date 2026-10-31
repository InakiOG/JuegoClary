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

## Qué hay por ahora (escena base)

- **Monitor** con marco que ocupa casi toda la ventana y escala con ella. La pantalla está vacía (fondo oscuro con un brillo sutil).
- **Cursor virtual** dentro de la pantalla: el cursor real se oculta y el del juego sigue al ratón (se queda en el borde si el ratón sale de la pantalla). Al cargar, el cursor aparece centrado hasta que mueves el ratón.
- **Escritorio** en la franja inferior con teclado, alfombrilla, ratón y las dos manos. El teclado se coloca justo debajo de la parte del escritorio que tapa el monitor, así nunca queda oculto.
- **Ratón real → ratón del juego**: al mover el ratón, el ratón del escritorio y la mano derecha se desplazan en proporción. Los clics iluminan el botón correspondiente y el dedo se flexiona.
- **Teclado real → teclado del juego**: cada tecla pulsada se hunde e ilumina. La mano izquierda se mueve para poner el dedo correcto sobre la tecla (mecanografía clásica); con las teclas de la derecha, la mano derecha deja el ratón, pulsa y vuelve al ratón al poco rato o en cuanto mueves el ratón.
- Teclado completo sin bloque numérico: **fila de funciones** (Esc y F1–F12 en grupos de cuatro, teclas más bajas), bloque principal y, a la derecha, **Ins/Inicio/RePág/Supr/Fin/AvPág** y las **flechas en T invertida** (las pulsa la mano derecha). Las teclas F no bloquean la acción del navegador (F5 recarga, F12 abre las herramientas).
- Distribución de teclado **ISO española** por defecto (Ñ, Ç, Enter alto). Si el navegador lo permite (`navigator.keyboard.getLayoutMap`, Chrome/Edge), las etiquetas se adaptan a la distribución real del usuario.

## Estructura

```
index.html        Escena (monitor, escritorio)
css/style.css     Estilos y colores (variables al principio)
js/layout.js      Distribución de teclas y qué dedo pulsa cada una
js/keyboard.js    Construcción del teclado y estado pulsado
js/hands.js       Manos en SVG y su animación
js/main.js        Disposición, entrada de ratón/teclado y bucle de animación
```

Todo el escritorio se mide en "unidades de tecla" (1em del plano = una tecla), así que escala cambiando un solo `font-size`.
