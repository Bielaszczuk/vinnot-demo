# Requisitos funcionales

Requisitos funcionales del módulo, separados por plataforma. La columna «ID anterior» conserva el identificador que tenían en la especificación por plataforma.

## Web

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-WEB-AI-01` | Consultar disponibilidad y perfil persistido. | Lectura por vino/idioma distingue disponible de ausente; GET de perfil no inicia generación por sí solo. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-001` |
| `RF-WEB-AI-02` | Solicitar generación cuando se necesita. | Acción de generación obtiene contenido o caché confirmado; proceso visible no es promesa de un tiempo de respuesta fijo. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-002` |
| `RF-WEB-AI-03` | Presentar todas las secciones del perfil recibido. | Resumen, visual, aromas, boca, sabores, maridajes, servicio, ocasiones y similares se muestran si existen; no se inventan scores faltantes. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-003` |
| `RF-WEB-AI-04` | Separar contenido ES/EN y su caché. | El idioma participa de la solicitud; cambiar idioma no traduce libremente en UI ni sobrescribe el otro perfil. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-WEB-AI-004` |
| `RF-WEB-AI-05` | Comparar dos vinos diferentes del catálogo. | Con A y B seleccionados la comparación se consulta automáticamente y produce atributos y conclusión de backend; selección inválida no inicia comparación. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-WEB-AI-005` |
| `RF-WEB-AI-06` | Comunicar fallos y permitir recuperación de IA. | Red, timeout y fallo HTTP se distinguen; conserva selección y no declara un ganador sin respuesta válida. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-WEB-AI-006` |
| `RF-WEB-AI-07` | Editar contenido y regenerar como acciones distintas. | ADMIN/MODERATOR con permiso editan el idioma activo sin invocar IA; regeneración forzada usa el endpoint autorizado y su confirmación. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-WEB-AI-007` |
| `RF-WEB-AI-08` | Editar el perfil experto desde administración web. | Editor estructurado de textos/listas/secciones conserva idioma y contenido; no se declara la entrada directa mobile como un botón implementado en web. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-WEB-WEBX-006` |

## APK

| ID | Requisito | Criterio de aceptación | Caso de uso | ID anterior |
|---|---|---|---|---|
| `RF-APK-AI-01` | Consultar disponibilidad y perfil persistido. | Lectura por vino/idioma distingue disponible de ausente; GET de perfil no inicia generación por sí solo. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-001` |
| `RF-APK-AI-02` | Solicitar generación cuando se necesita. | Acción de generación obtiene contenido o caché confirmado; proceso visible no es promesa de un tiempo de respuesta fijo. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-002` |
| `RF-APK-AI-03` | Presentar todas las secciones del perfil recibido. | Resumen, visual, aromas, boca, sabores, maridajes, servicio, ocasiones y similares se muestran si existen; no se inventan scores faltantes. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-003` |
| `RF-APK-AI-04` | Separar contenido ES/EN y su caché. | El idioma participa de la solicitud; cambiar idioma no traduce libremente en UI ni sobrescribe el otro perfil. | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | `RF-APK-AI-004` |
| `RF-APK-AI-05` | Comparar dos vinos diferentes del catálogo. | Selección de A/B y envío explícito producen atributos y conclusión de backend; selección inválida no inicia comparación. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-APK-AI-005` |
| `RF-APK-AI-06` | Comunicar fallos y permitir recuperación de IA. | Red, timeout y fallo HTTP se distinguen; conserva selección y no declara un ganador sin respuesta válida. | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | `RF-APK-AI-006` |
| `RF-APK-AI-07` | Editar contenido y regenerar como acciones distintas. | ADMIN/MODERATOR con permiso editan el idioma activo sin invocar IA; regeneración forzada usa el endpoint autorizado y su confirmación. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-AI-007` |
| `RF-APK-AI-08` | Editar perfil experto visualmente desde dos entradas. | ADMIN/MODERATOR abre editor desde panel o perfil completo; tarjetas editables/listas/scores reemplazan JSON crudo y guardan idioma activo. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-007` |
| `RF-APK-AI-09` | Validar y restaurar borrador de perfil experto. | Resumen no vacío, scores opcionales 0–100 con coma decimal; Restaurar revierte cambios, salir sucio confirma y fallo conserva borrador. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-008` |
| `RF-APK-AI-10` | Mantener acciones del editor accesibles con teclado. | Editor desplaza contenido y barra de acciones; Android usa ajuste de ventana, iOS padding/insets; no expone un textarea JSON de pantalla completa. | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | `RF-APK-APKX-009` |
