Videos del "Reproductor de Videos" (js/apps/videos.js) y fondo de los créditos (js/story.js)

Los videos se reproducen desde YouTube con js/youtube.js (no hace falta clave de API). Esta carpeta es
solo el respaldo para cuando no hay internet o el juego se abrió con doble clic (file://):

  video/caida_edgar.mp4   ->  "La caída de Edgar"     (YouTube b89CnP0Iq30)
  video/video_x3.mp4      ->  "Video del canal (x3)"  (YouTube 1bTMsg2XN90, desde 7:26)

Formato recomendado: MP4 (H.264 + AAC) o WebM.
Para añadir o cambiar videos, edita la lista VIDEOS al principio de js/apps/videos.js:

  { titulo: 'Título que se ve en la lista', yt: 'idDeYouTube', inicio: 0, src: 'video/archivo.mp4' },

(yt y src son opcionales, pero hace falta al menos uno). El fondo de los créditos está en
G.creditos.youtube / G.creditos.video de js/guion.js.

Si no hay YouTube ni archivo, el reproductor muestra "Archivo no encontrado" en vez de fallar.
Los videos van a x3 por defecto; YouTube solo llega a x2, así que x3 exacto solo con el archivo local.
El canal "DVD" (el logo que rebota) está integrado y no necesita nada.
