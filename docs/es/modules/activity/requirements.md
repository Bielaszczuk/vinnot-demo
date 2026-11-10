# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. Son requisitos nuevos, sin un identificador anterior en la especificación por plataforma.

## Web

La web no envía señales de actividad, así que no hay requisitos web para este módulo.

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso |
|---|---|---|---|
| `RF-APK-ACT-01` | Registrar una vista por cada apertura de un detalle. | Cada vez que se monta el detalle de un vino, una ruta, un evento o una bodega con sesión y con id, la app envía una vista; el backend la suma en una fila por usuario, contenido y día UTC. | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) |
| `RF-APK-ACT-02` | Informar las vistas sin bloquear la pantalla. | El envío no espera la respuesta; un fallo no cambia la pantalla y solo se registra en desarrollo; un tipo o un id inválidos responden 400 y un pedido sin sesión, 401. | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) |
| `RF-APK-ACT-03` | Registrar la apertura de la app como mucho una vez cada 30 minutos. | La app informa el arranque y cada regreso al frente; la app y el backend guardan como mucho una apertura cada 30 minutos, aunque lleguen pedidos simultáneos. | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) |
| `RF-APK-ACT-04` | Reintentar una apertura fallida y olvidarla al cerrar sesión. | Una apertura que falla se vuelve a informar en la próxima apertura sin esperar 30 minutos; al cerrar sesión la app olvida la última apertura y deja de escuchar. | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) |
