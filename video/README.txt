Videos del "Reproductor de Videos" (js/apps/videos.js)

El reproductor busca estos archivos en esta carpeta (rutas relativas a index.html):

  video/caida_edgar.mp4   ->  "La caída de Edgar"
  video/video_x3.mp4      ->  "Video del canal (x3)"

Formato recomendado: MP4 (H.264 + AAC) o WebM; cualquier formato que el navegador sepa reproducir sirve.
Para añadir o cambiar videos, edita la lista VIDEOS al principio de js/apps/videos.js:

  { titulo: 'Título que se ve en la lista', src: 'video/archivo.mp4' },

Si un archivo no está, el reproductor muestra "Archivo no encontrado" en vez de fallar.
Los videos se reproducen a x3 por defecto (se puede cambiar a x1/x2 en la barra de controles).
El canal "DVD" (el logo que rebota) está integrado y no necesita ningún archivo.
No se descarga nada de internet: el juego funciona sin conexión.
