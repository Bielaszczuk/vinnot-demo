# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-LEG-01` | Consultar centro legal y documentos ES/EN. | Términos, privacidad, normas, moderación, confianza/seguridad, ranking, eventos/pagos/cancelaciones y almacenamiento se abren sin sesión. | [`UC-LEG-01`](use-cases/uc-leg-01-legal-centre.md) | `RF-WEB-PUB-002` |
| `RF-WEB-LEG-02` | Presentar términos versionados al registrarse. | Se carga el documento vigente y se requiere selección explícita; aceptar términos no activa marketing ni permisos opcionales. | [`UC-LEG-02`](use-cases/uc-leg-02-accept-at-sign-up.md) | `RF-WEB-LEGAL-001` |
| `RF-WEB-LEG-03` | Verificar aceptación antes de habilitar producto. | Se consulta aceptación de la cuenta; durante la comprobación se muestra espera y no se presupone que faltan términos. | [`UC-LEG-03`](use-cases/uc-leg-03-check-acceptance.md) | `RF-WEB-LEGAL-002` |
| `RF-WEB-LEG-04` | Solicitar aceptación si la versión vigente falta. | Se muestra el documento, checkbox y aceptar; sólo una confirmación del servidor libera el acceso. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-003` |
| `RF-WEB-LEG-05` | Persistir evidencia vinculada a la cuenta. | Versión, idioma y hash del documento forman la aceptación; otra plataforma consulta la misma evidencia del backend. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-004` |
| `RF-WEB-LEG-06` | Recuperar verificación fallida o documento cambiado. | Un fallo permite recargar; cambio de documento invalida selección y no se acepta automáticamente una versión nueva. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-WEB-LEGAL-005` |
| `RF-WEB-LEG-07` | Rechazar continuar y conservar acceso informativo. | El botón «Ahora no» cierra sesión; centro legal/contacto permanecen disponibles y no se considera rechazo como consentimiento. | [`UC-LEG-05`](use-cases/uc-leg-05-decline-and-sign-out.md) | `RF-WEB-LEGAL-006` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-LEG-01` | Consultar centro legal y documentos ES/EN. | Términos, privacidad, normas, moderación, confianza/seguridad, ranking, eventos/pagos/cancelaciones y almacenamiento se abren sin sesión. | [`UC-LEG-01`](use-cases/uc-leg-01-legal-centre.md) | `RF-APK-PUB-002` |
| `RF-APK-LEG-02` | Presentar términos versionados al registrarse. | Se carga el documento vigente y se requiere selección explícita; aceptar términos no activa marketing ni permisos opcionales. | [`UC-LEG-02`](use-cases/uc-leg-02-accept-at-sign-up.md) | `RF-APK-LEGAL-001` |
| `RF-APK-LEG-03` | Verificar aceptación antes de habilitar producto. | Se consulta aceptación de la cuenta; durante la comprobación se muestra espera y no se presupone que faltan términos. | [`UC-LEG-03`](use-cases/uc-leg-03-check-acceptance.md) | `RF-APK-LEGAL-002` |
| `RF-APK-LEG-04` | Solicitar aceptación si la versión vigente falta. | Se muestra el documento, checkbox y aceptar; sólo una confirmación del servidor libera el acceso. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-003` |
| `RF-APK-LEG-05` | Persistir evidencia vinculada a la cuenta. | Versión, idioma y hash del documento forman la aceptación; otra plataforma consulta la misma evidencia del backend. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-004` |
| `RF-APK-LEG-06` | Recuperar verificación fallida o documento cambiado. | Un fallo permite recargar; cambio de documento invalida selección y no se acepta automáticamente una versión nueva. | [`UC-LEG-04`](use-cases/uc-leg-04-accept-current-version.md) | `RF-APK-LEGAL-005` |
| `RF-APK-LEG-07` | Rechazar continuar y conservar acceso informativo. | El botón «Ahora no» cierra sesión; centro legal/contacto permanecen disponibles y no se considera rechazo como consentimiento. | [`UC-LEG-05`](use-cases/uc-leg-05-decline-and-sign-out.md) | `RF-APK-LEGAL-006` |
