# Videos

Videos de demostración de Vinnot. Cada uno recorre varias acciones relacionadas para que la serie sea corta: diez videos de uno a cuatro minutos.

| # | Video | Plataforma | Cuenta | Duración | Estado |
|---|---|---|---|---|---|
| 1 | [Presentación general](01-product-tour.md) | App | Visitante, después una cuenta nueva | 1:27 | Publicado |
| 2 | [Vinos](02-wines-on-the-web.md) | App | Usuario con sesión | 2:01 | Publicado |
| 3 | [La app: escanear y tu bodega](03-app-scan-and-cellar.md) | App | Usuario con sesión | 0:53 | Publicado en parte |
| 4 | [Eventos y entradas](04-events-and-tickets.md) | App | Usuario con sesión | 1:12 | Publicado |
| 5 | [Rutas del vino y enlaces compartidos](05-routes-and-sharing.md) | App | Usuario con sesión | 1:27 | Publicado |
| 6 | [Tu cuenta, comunidad y ayuda](06-account-and-community.md) | App | Usuario con sesión | 2:54 | Publicado |
| 7 | [Organizar eventos](07-organize-events.md) | App | Partner | 2:14 | Publicado |
| 8 | [Moderación](08-moderation.md) | App | Moderador | 2:00 | Publicado |
| 9 | [Administración](09-administration.md) | App | Administrador | 4:24 | Publicado |
| 10 | [La web](10-web.md) | Web | Visitante, después un administrador | 1:47 | Publicado |

## Cómo grabar

- Grabar en el entorno de desarrollo con cuentas y datos de prueba, nunca con datos de personas reales.
- Usar el mismo idioma en toda la grabación y repetir el video en inglés solo si hace falta.
- Al publicar un video, reemplazar «Sin publicar» por el enlace y cambiar el estado a «Publicado».

## Cómo publicar

- Los videos se publican en R2 y se sirven desde `images.vinnot.com`, igual que los diagramas.
- Exportar en H.264 a 720 de ancho los videos de la app y a 1280 los de la web, sin audio, con `-movflags +faststart` para que empiece a reproducirse antes de bajar todo el archivo.
- Nombrar el archivo `docs/videos/v1/es/<nombre-del-guion>-<12 primeros caracteres del SHA-256>.mp4`. El hash cambia con el contenido, así que un video nuevo nunca reemplaza al anterior en la caché.
- Subirlo con `wrangler r2 object put vinnot-catalog-images/<clave> --file <archivo> --content-type video/mp4 --remote` y poner la URL en «Enlace».
