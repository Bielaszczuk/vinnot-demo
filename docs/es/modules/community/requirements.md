# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-COM-01` | Reportar contenido desde su contexto. | Reseña, comentario, usuario, evento o ruta se identifica por tipo/ID; no se denuncia contenido propio y la acción no se muestra al autor ni al organizador del evento. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-WEB-SAFETY-001` |
| `RF-WEB-COM-02` | Seleccionar motivo y explicar el reporte. | Spam, acoso, odio, sexual, violencia, privacidad, desinformación u otro; OTHER exige descripción y máximo 2000 caracteres. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-WEB-SAFETY-002` |
| `RF-WEB-COM-03` | Bloquear y desbloquear otros usuarios. | Confirmación contextual registra bloqueo personal; lista de bloqueados permite revertirlo y no equivale a ban administrativo. | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | `RF-WEB-SAFETY-003` |
| `RF-WEB-COM-04` | Consultar casos y resumen propios. | Muestra referencias, fechas, estado y contadores disponibles; no entrega evidencia privada ni notas internas de otros casos. | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | `RF-WEB-SAFETY-004` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-COM-01` | Reportar contenido desde su contexto. | Reseña, comentario, usuario, evento o ruta se identifica por tipo/ID; no se denuncia contenido propio y la acción no se muestra al autor ni al organizador del evento. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-APK-SAFETY-001` |
| `RF-APK-COM-02` | Seleccionar motivo y explicar el reporte. | Spam, acoso, odio, sexual, violencia, privacidad, desinformación u otro; OTHER exige descripción y máximo 2000 caracteres. | [`UC-COM-01`](use-cases/uc-com-01-report-content.md) | `RF-APK-SAFETY-002` |
| `RF-APK-COM-03` | Bloquear y desbloquear otros usuarios. | Confirmación contextual registra bloqueo personal; lista de bloqueados permite revertirlo y no equivale a ban administrativo. | [`UC-COM-02`](use-cases/uc-com-02-block-user.md) | `RF-APK-SAFETY-003` |
| `RF-APK-COM-04` | Consultar casos y resumen propios. | Muestra referencias, fechas, estado y contadores disponibles; no entrega evidencia privada ni notas internas de otros casos. | [`UC-COM-03`](use-cases/uc-com-03-my-community.md) | `RF-APK-SAFETY-004` |
