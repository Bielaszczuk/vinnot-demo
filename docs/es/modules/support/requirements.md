# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-SUP-01` | Consultar presentación y ayuda. | Acerca de Vinnot y ayuda explican el producto y permiten acceder a contacto y documentos. | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | `RF-WEB-PUB-001` |
| `RF-WEB-SUP-02` | Enviar una consulta de soporte. | Nombre, email, categoría y mensaje válidos generan una referencia; fallo conserva el formulario y permite reintentar. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-003` |
| `RF-WEB-SUP-03` | Seleccionar el motivo de contacto. | Se ofrecen soporte, privacidad, denuncia, revisión de decisión, colaboración y consulta general; con sesión se usa el email de la cuenta. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-004` |
| `RF-WEB-SUP-04` | Evitar duplicar consultas por un reintento. | Un reintento del mismo contenido conserva requestId; cambiar el contenido crea otra solicitud y no admite envíos simultáneos. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-WEB-PUB-005` |
| `RF-WEB-SUP-05` | Consultar errores y estados de servicio. | Existen vistas de no encontrado, prohibido, error, indisponibilidad, límite, offline y timeout; no equivalen a un resultado vacío. | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | `RF-WEB-PUB-006` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-SUP-01` | Consultar presentación y ayuda. | Acerca de Vinnot y ayuda explican el producto y permiten acceder a contacto y documentos. | [`UC-SUP-01`](use-cases/uc-sup-01-read-public-information.md) | `RF-APK-PUB-001` |
| `RF-APK-SUP-02` | Enviar una consulta de soporte. | Nombre, email, categoría y mensaje válidos generan una referencia; fallo conserva el formulario y permite reintentar. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-003` |
| `RF-APK-SUP-03` | Seleccionar el motivo de contacto. | Se ofrecen soporte, privacidad, denuncia, revisión de decisión, colaboración y consulta general; con sesión se usa el email de la cuenta. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-004` |
| `RF-APK-SUP-04` | Evitar duplicar consultas por un reintento. | Un reintento del mismo contenido conserva requestId; cambiar el contenido crea otra solicitud y no admite envíos simultáneos. | [`UC-SUP-02`](use-cases/uc-sup-02-contact-support.md) | `RF-APK-PUB-005` |
| `RF-APK-SUP-05` | Consultar errores y estados de servicio. | Existen vistas de no encontrado, prohibido, error, indisponibilidad, límite, offline y timeout; no equivalen a un resultado vacío. | [`UC-SUP-03`](use-cases/uc-sup-03-service-states.md) | `RF-APK-PUB-006` |
