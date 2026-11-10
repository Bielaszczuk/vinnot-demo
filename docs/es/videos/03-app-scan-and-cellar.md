# Video 3 · La app: escanear y tu bodega

| | |
|---|---|
| Estado | Publicado en parte |
| Enlace | [Ver video](https://images.vinnot.com/docs/videos/v1/es/03-app-scan-and-cellar-35d957a2cfbd.mp4) |
| Duración | 0:53 |
| Plataforma | App |
| Cuenta | Usuario con sesión |
| Manual | [Manual de usuario de la app](../manuals/app-user.md) |

## Guion

### 1. Preparar la app

- Instalar desde la tienda, iniciar sesión y permitir notificaciones.

### 2. Escanear

- Escanear una etiqueta conocida y abrir el vino; la foto se guarda si el vino no tenía imagen.
- Escanear una etiqueta desconocida, buscar a mano y proponer el vino.
- Seguir el estado en «Mis vinos enviados».

### 3. Tu bodega

- Agregar el vino a «Mi Bodega», editar la nota y quitar otro.
- Publicar la nota como reseña y ver las estadísticas.

### 4. Notificaciones

- Recibir una notificación push y abrirla.

## Pendiente

- El escaneo y la notificación push se graban en un teléfono real: el simulador no tiene cámara ni recibe push.

## Preparación

- Teléfono real para usar la cámara y una etiqueta conocida y otra que no esté en el catálogo.

## Casos de uso cubiertos

[UC-NOT-03](../modules/notifications/use-cases/uc-not-03-allow-push.md), [UC-NOT-04](../modules/notifications/use-cases/uc-not-04-register-device.md), [UC-NOT-05](../modules/notifications/use-cases/uc-not-05-receive-push.md), [UC-WIN-05](../modules/wines/use-cases/uc-win-05-scan-label.md), [UC-WIN-08](../modules/wines/use-cases/uc-win-08-attach-label-photo.md), [UC-WIN-06](../modules/wines/use-cases/uc-win-06-manual-search-from-scan.md), [UC-WIN-07](../modules/wines/use-cases/uc-win-07-submit-wine.md), [UC-WIN-09](../modules/wines/use-cases/uc-win-09-track-submissions.md), [UC-CEL-02](../modules/cellar/use-cases/uc-cel-02-add-wine.md), [UC-CEL-03](../modules/cellar/use-cases/uc-cel-03-edit-entry.md), [UC-CEL-04](../modules/cellar/use-cases/uc-cel-04-remove-entry.md), [UC-CEL-05](../modules/cellar/use-cases/uc-cel-05-publish-note-as-review.md), [UC-CEL-06](../modules/cellar/use-cases/uc-cel-06-cellar-statistics.md).
