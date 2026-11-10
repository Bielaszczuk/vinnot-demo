# Requisitos funcionales de Vinnot — web

Especificación del comportamiento implementado para usuarios, moderadores, administradores y partners. Cada requisito identifica una capacidad, su condición de acceso y un criterio observable de aceptación.

**Base de auditoría:** código del repositorio al 25 de octubre de 2026, commit `4384fc8ec8a2f35e8cda55c1c7fe88a2ea6af08c`. Se inspeccionaron router/pantallas, hooks de presentación, servicios, clientes API, controladores, handlers, dominio y pruebas existentes. Los criterios describen el contrato soportado; la lectura del código no acredita una ejecución de todos los escenarios en dispositivos reales.

**Cobertura:** 181 requisitos en 20 grupos funcionales: 168 en los 16 módulos y 13 transversales en 4 grupos. `RF` significa requisito funcional; los identificadores son estables dentro de esta especificación. Las pruebas citadas son puntos de trazabilidad, no evidencia de una nueva corrida ni una afirmación de cobertura total.

## 1. Alcance y términos

Incluye funciones visibles, validaciones, permisos, efectos persistentes, estados y alternativas. Configuración de proveedores, permisos del dispositivo y estado del recurso condicionan las ramas indicadas. Una operación disponible en la API no se atribuye a una interfaz que no la expone.

**Bodega personal/cava** es la colección del usuario; **bodega productora/winery** es la entidad del catálogo. **Reseña** es la valoración de un vino; **comentario** pertenece a una reseña. **Hold** reserva cupos temporalmente. **Ownership** identifica al titular o al organizador propietario. **Perfil experto** es contenido estructurado por vino e idioma, leído, generado o editado según permiso.

Web designa el frontend React en navegador y las páginas públicas de compartir servidas por backend. Un enlace público ofrece una preview mínima; el catálogo, los detalles de producto y las operaciones personales siguen protegidos por sesión.

## 2. Actores y autorización

| Actor | Alcance funcional |
| --- | --- |
| Visitante | Información pública, soporte, registro/acceso y preview de compartir. Producto protegido requiere sesión. |
| USER / titular | Descubrimiento, IA, reseña propia, participación, bodega con CELLAR_MANAGE_OWN, inscripciones, perfil y cuenta propios. |
| PARTNER | Funciones personales más gestión de sus eventos y asistentes; /partner no habilita gestionar eventos de otro organizador. |
| MODERATOR | Panel de catálogo, edición/publicación autorizada, perfiles expertos y comunidad/reseñas/submissions. No gestión de usuarios ni borrado de vino/bodega/evento/ruta. |
| ADMIN | Gestión de catálogo, comunidad y usuarios, roles/suspensiones, borrados autorizados y gestión de eventos; comprobante reciente para acciones sensibles. |
| Organizador / receptor | Organizador es ownership de evento, no un quinto rol. Receptor de share accede a preview anónima o al recurso tras autenticar. |

La asignación real contiene uno o varios roles; el selector administrativo mantiene USER y el rol elegido. Roles, authorities y ownership se comprueban en backend. No se presume que MODERATOR aislado hereda todos los permisos personales de USER. Las filas describen la superficie de cada rol, no una jerarquía implícita de todos los permisos.

**Evidencia de acceso:** [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java), [backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java](../../../../backend/src/main/java/com/vinnot/user/domain/valueobject/Role.java), [backend/src/main/java/com/vinnot/admin/infrastructure/web/controller/UserAdminController.java](../../../../backend/src/main/java/com/vinnot/admin/infrastructure/web/controller/UserAdminController.java).

## 3. Inventario de pantallas y entradas

| Área | Rutas/entradas | Acceso |
| --- | --- | --- |
| Presentación e información | `/`, `/about`, `/help`, `/contact` | Público |
| Centro y textos legales | `/legal`, `/legal/:slug`, `/legal/ranking`, `/terms`, `/privacy`, `/content-policy`, `/cookies` | Público |
| Acceso y enlaces de cuenta | `/login`, `/register`, `/register/success`, `/forgot-password`, `/reset-password`, `/verify-email`, `/confirm-email-change` | Público; enlaces requieren token |
| Baja de correos | `/unsubscribe` | Público; requiere el token del enlace del correo |
| Onboarding | `/complete-profile` | Sesión y términos |
| Vinos e IA | `/wines`, `/wines/:id`, `/wines/:id/ai-profile`, `/wines/compare/:wineAId?`, `/wines/scan` | Sesión; scan es invitación de descarga |
| Eventos y bodegas | `/events`, `/events/:id`, `/wineries/:id` | Sesión; no ruta web de índice de bodegas |
| Entradas propias | `/my-tickets`, `/my-tickets/:id` | Sesión |
| Retorno de checkout | `/payments/return` | Público, fuera del shell; estado por recibo opaco |
| Rutas y funciones personales | `/wine-routes`, `/wine-routes/:id`, `/cellar`, `/profile`, `/community` | Sesión; bodega exige permiso propio |
| Gestión partner | `/partner/events` | PARTNER/ADMIN y ownership |
| Cuenta de cobro | `/partner/payments`, `/partner/payments/callback` | Fuera del shell; sólo con flag de pagos habilitado |
| Gestión de catálogo | `/admin`, `/admin/wines`, `/admin/wines/:id/ai-profile`, `/admin/wineries`, `/admin/events`, `/admin/routes` | ADMIN/MODERATOR; borrar catálogo exige ADMIN |
| Gestión de comunidad | `/admin/reviews`, `/admin/publications`, `/admin/community`, `/admin/wine-submissions` | ADMIN/MODERATOR y permiso de acción |
| Gestión de usuarios | `/admin/users` | ADMIN |
| Gestión de notificaciones | `/admin/notifications` | ADMIN |
| Versión mínima de la app | `/admin/app-versions` | ADMIN; cada cambio pide reautenticación |
| Estados de servicio | `/403`, `/404`, `/500`, `/503`, `/429`, `/offline`, `/timeout`, ruta desconocida | Público |
| Landing de compartir | `/share`, `/share/{wines,events,wine-routes}/:id` y variantes EN | HTML público del backend, fuera del router SPA |

[frontend-react/src/app/App.tsx](../../../../frontend-react/src/app/App.tsx), [frontend-react/src/presentation/components/auth/ProtectedRoute.tsx](../../../../frontend-react/src/presentation/components/auth/ProtectedRoute.tsx).

## 4. Catálogo de requisitos

Los requisitos de [usuarios y cuenta](../../modules/users/requirements.md), [legal](../../modules/legal/requirements.md), [vinos](../../modules/wines/requirements.md), [bodegas y regiones](../../modules/wineries/requirements.md), [reseñas](../../modules/reviews/requirements.md), [cava](../../modules/cellar/requirements.md), [comunidad](../../modules/community/requirements.md), [eventos y entradas](../../modules/events/requirements.md), [pagos](../../modules/payments/requirements.md), [rutas del vino](../../modules/wine-routes/requirements.md), [compartir](../../modules/sharing/requirements.md), [notificaciones](../../modules/notifications/requirements.md), [perfiles y comparaciones IA](../../modules/ai/requirements.md), [soporte e información pública](../../modules/support/requirements.md), [partners](../../modules/partner/requirements.md) y [administración y moderación](../../modules/admin/requirements.md) están en sus módulos.

Los criterios combinan disparador, respuesta y límite del caso de uso. Todos los requisitos siguientes describen capacidades implementadas; las ramas condicionadas nombran su condición. UI habilitada no sustituye autorización ni validación del servidor.

| Grupo | Requisitos | Cantidad |
| --- | --- | --- |
| Carga y presentación de imágenes | `RF-WEB-MEDIA-001` → `RF-WEB-MEDIA-004` | 4 |
| Catálogos de referencia y relaciones | `RF-WEB-REF-001` → `RF-WEB-REF-004` | 4 |
| Idioma, interacción y recuperación | `RF-WEB-UX-002` → `RF-WEB-UX-005` | 4 |
| Funciones propias de web | `RF-WEB-WEBX-001` → `RF-WEB-WEBX-001` | 1 |

### 4.22. Carga y presentación de imágenes

**Actor y precondición:** Titular para avatar; catálogo/admin/organizador con permisos para imágenes correspondientes.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-WEB-MEDIA-001` | Validar y optimizar uploads gestionados. | Archivo, MIME/tamaño/decodificación se validan; avatar, etiqueta persistida y portada se convierten a WebP, sin depender de extensión declarada. |
| `RF-WEB-MEDIA-002` | Conservar referencias de imágenes por recurso y propietario. | Guardar recibe URL confirmada; fallo de upload impide asumir guardado y una portada privada no se publica sólo por conocer la URL. |
| `RF-WEB-MEDIA-003` | Mostrar fallback estable ante ausencia o error de foto. | Null/fallo muestra recurso predeterminado; imagen válida se resuelve contra origen API/CDN y no se interpreta como ruta relativa de la pantalla. |
| `RF-WEB-MEDIA-004` | Actualizar avatar y limpiar la referencia anterior. | Éxito cambia imagen del perfil; fallo de persistencia no reemplaza avatar por una URL sin cuenta actualizada. |

**Trazabilidad:** [frontend-react/src/application/services/users.service.ts](../../../../frontend-react/src/application/services/users.service.ts), [frontend-react/src/application/services/coverImages.service.ts](../../../../frontend-react/src/application/services/coverImages.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java), [backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java](../../../../backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java).

### 4.23. Catálogos de referencia y relaciones

**Actor y precondición:** Sesión para lectura; formularios usan referencias existentes.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-WEB-REF-001` | Consultar tipos de vino y evento activos. | Opciones proceden de reference; label ES/EN y códigos no se sustituyen por valores arbitrarios al guardar. |
| `RF-WEB-REF-002` | Relacionar país, región y bodega. | Cambiar país limita regiones; seleccionar bodega conserva su ID y datos de origen, no sólo un texto visible. |
| `RF-WEB-REF-003` | Seleccionar variedades de uva existentes. | El catálogo de uvas soporta búsqueda/selección de IDs; búsqueda de bodega/uva no concede permiso para crearlas. |
| `RF-WEB-REF-004` | Normalizar resultados paginados en aplicación. | Servicios convierten DTO/page al modelo de cada cliente y conservan total/página/tamaño; una lista parcial no se describe como catálogo completo. |

**Trazabilidad:** [frontend-react/src/application/services/regions.service.ts](../../../../frontend-react/src/application/services/regions.service.ts), [frontend-react/src/application/services/grapeTypes.service.ts](../../../../frontend-react/src/application/services/grapeTypes.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java), [backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java](../../../../backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java), [backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java](../../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java).

### 4.25. Idioma, interacción y recuperación

**Actor y precondición:** Todos los actores; controles y estados dependen de la pantalla.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-WEB-UX-002` | Separar carga inicial, refresco, vacío y error. | Consultas y formularios usan indicadores/estados correspondientes; red fallida no elimina datos como si fueran un resultado vacío confirmado. |
| `RF-WEB-UX-003` | Bloquear repetición de escrituras en curso. | Los formularios con estado busy bloquean otra confirmación; error ofrece recuperación y no anuncia éxito antes de respuesta. |
| `RF-WEB-UX-004` | Confirmar acciones destructivas y preservar borrador recuperable. | Eliminar, cancelar o descartar cambios usa confirmación del flujo; guardado fallido no se considera persistencia. |
| `RF-WEB-UX-005` | Respetar permisos ante acceso directo. | Ocultar botones no concede ni sustituye permiso; URL/ID conocido sigue pasando guards y autorización backend. |

**Trazabilidad:** [frontend-react/src/app/App.tsx](../../../../frontend-react/src/app/App.tsx), [frontend-react/src/presentation/components/auth/ProtectedRoute.tsx](../../../../frontend-react/src/presentation/components/auth/ProtectedRoute.tsx), [frontend-react/src/shared/i18n](../../../../frontend-react/src/shared/i18n), [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java).

### 4.26. Funciones propias de web

**Actor y precondición:** Visitante en preferencias públicas; sesión en funcionalidades de producto.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-WEB-WEBX-001` | Controlar mapas integrados opcionales. | /cookies permite habilitar/deshabilitar mapas; deshabilitar retira embeds, no revierte datos enviados ni bloquea enlaces externos. |

**Trazabilidad:** [frontend-react/src/presentation/pages/public/CookieSettingsPage.tsx](../../../../frontend-react/src/presentation/pages/public/CookieSettingsPage.tsx), [frontend-react/src/presentation/hooks/useExternalMapsPreference.ts](../../../../frontend-react/src/presentation/hooks/useExternalMapsPreference.ts), [frontend-react/src/presentation/pages/wine-routes/useWineRoutesViewModel.ts](../../../../frontend-react/src/presentation/pages/wine-routes/useWineRoutesViewModel.ts), [backend/src/main/java/com/vinnot/event/infrastructure/web/controller/EventController.java](../../../../backend/src/main/java/com/vinnot/event/infrastructure/web/controller/EventController.java).

## 5. Estados y reglas persistentes

Los estados son códigos del contrato y se muestran con etiqueta localizada; no son permisos ni acciones universalmente disponibles.

| Entidad | Estados/campos | Regla funcional |
| --- | --- | --- |
| Cuenta | `isActive`, `isLocked`, `isEmailVerified`, roles | Flags independientes; bloqueo administrativo difiere de bloqueo entre usuarios. |
| Vino | `isActive`, `isFeatured` | Inactivo no está en catálogo/share; featured no garantiza ranking de destacados. |
| Publicación de reseña/comentario | `PENDING`, `APPROVED`, `REJECTED` | Nueva reseña, edición de reseña aprobada y nuevo comentario: APPROVED. Edición de reseña pendiente/rechazada: PENDING. Revisión requiere revision actual. |
| Denuncia | `OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED` | Cierre exige motivo; no reapertura y no revisión por autor/reportante. |
| Evento | `DRAFT`, `PUBLISHED`, `POSTPONED`, `SOLD_OUT`, `CANCELLED`, `COMPLETED` | Listado ordinario vigente PUBLISHED/SOLD_OUT; cancelar conserva registro e historial. |
| Inscripción | `REQUESTED`, `AWAITING_PAYMENT`, `AWAITING_ATTENDEE_CONFIRMATION`, `CONFIRMED`, `WAITLISTED`, `REJECTED`, `CANCELLED`, `EXPIRED` | Cupo confirmado y hold son distintos; espera no se promueve sola. |
| Método de pago | `FREE`, `TRANSFER`, `QR`, `CASH`, `MERCADO_PAGO` | La web envía `FREE` o `MERCADO_PAGO` según importe; TRANSFER/QR/CASH son valores heredados del contrato. |
| Estado de pago | `NOT_REQUIRED`, `PENDING`, `REPORTED`, `APPROVED`, `REJECTED`, `PAY_AT_VENUE`, `REFUNDED` | Estado de pago es separado de inscripción; sólo la verificación del servidor con Mercado Pago lo confirma. |
| Ruta | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Catálogo/share PUBLISHED; borrador vacío no puede publicarse. |
| Vino enviado | `PENDING`, `APPROVED`, `DUPLICATE`, `REJECTED`, `NEEDS_REVIEW`, `CHANGES_REQUESTED` | Decisiones usan alta, vínculo a existente, rechazo o correcciones; destino no es siempre vino nuevo. |

**Evidencia de estados:** [backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java](../../../../backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java), [backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java](../../../../backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java), [backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java](../../../../backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java).

## 6. Flujos principales y alternativas

| Flujo | Precondición | Secuencia principal | Postcondición / alternativa |
| --- | --- | --- | --- |
| Cuenta y acceso | Visitante y datos válidos. | Registrar → verificar correo → login → completar perfil/términos → destino. | Sesión USER sólo tras éxito; duplicado/token vencido/rechazo conserva acceso público. |
| Soporte público | Nombre/email/categoría/mensaje válidos. | Enviar → obtener referencia → entrega interna por outbox. | Reintento reutiliza requestId; referencia no garantiza entrega inmediata. |
| Descubrimiento de vinos | Sesión y acuerdo vigentes. | Resolver país opcional → texto/filtros → página → detalle. | Lista/total coherentes; fallo no se presenta como cero vinos ni cambia filtros. |
| Perfil y comparación IA | Vino existente o dos IDs diferentes. | Consultar persistido → generar explícitamente si requerido → visualizar o comparar. | Idioma conservado; generación fallida no crea un perfil/ganador ficticio. |
| Reseña y bodega | Sesión con permiso, vino y valoración válidos. | Crear reseña → APPROVED → actualizar agregados → sincronizar bodega. | Reseña publicada y una entrada propia; duplicado rechaza y eliminar bodega no elimina reseña. |
| Comentario y reporte | Contenido visible; reporte no propio. | Comentar (publicado al instante) o reportar motivo → consultar estado → moderación autorizada. | Decisión con actor/motivo/revision; conflicto/revision obsoleta impide resolver. |
| Inscripción de evento | Evento publicado, plazo abierto, solicitud válida. | Solicitar → revisión/hold/espera → confirmar asistencia o checkout de Mercado Pago → retorno/recibo. | Estado/cupo del servidor; expiración/cancelación libera hold; el pago sólo lo confirma la verificación del servidor con Mercado Pago. |
| Ruta del vino | Ruta publicada para lectura ordinaria. | Catálogo → detalle → expandir paradas → Maps/compartir. | Orden preservado; abrir recorrido no acredita visita ni finalización. |
| Gestión de catálogo | ADMIN/MODERATOR y permisos de acción. | Buscar → cargar detalle → editar campos/referencias → confirmar → invalidar proyecciones. | Cambio confirmado o borrador recuperable; borrar catálogo exige ADMIN. |
| Gestión de usuarios | ADMIN, target autorizado y comprobante reciente si requerido. | Seleccionar usuario → rol/suspensión/borrado → reautenticar si vence → confirmar una vez. | Servidor aplica protección propia/último admin; cancelación no modifica la cuenta. |
| Gestión partner | PARTNER/ADMIN y ownership de evento. | Crear/editar propio → publicar → gestionar asistentes → cancelar si necesario. | No concede acceso a eventos ajenos; cancelar conserva historial. |
| Borrado de cuenta | Titular autenticado y frase exacta. | Confirmar texto → autorizar Apple si vinculado → eliminar → cerrar sesión. | Revocación fallida impide borrado; desactivar es otro circuito. |
| Enlace compartido | Recurso publicable y app/asociación compatibles para apertura nativa. | Compartir URL → preview/app → autenticar si requerido → recurso por ID. | Sin app ofrece tienda/web; recurso retirado devuelve 404; tras instalar se reabre enlace. |
| Imagen gestionada | Actor autorizado y archivo soportado. | Seleccionar → validar/convertir WebP → upload → guardar referencia → render/fallback. | Referencia corresponde al recurso/owner; fallo no implica persistencia confirmada. |

## 7. Límites funcionales de esta especificación

- Vinnot descubre/describe vinos; no vende ni entrega alcohol, no registra pedidos de botellas ni ofrece checkout de cava.
- Eventos registran solicitudes, cupos y pagos online con Mercado Pago confirmados cuando el servidor los verifica con Mercado Pago. No hay acreditación manual ni IAP; cancelar un evento devuelve automáticamente los pagos en línea y el organizador también puede pedir la devolución de una inscripción.
- Las reseñas nuevas, las ediciones de reseñas aprobadas y los comentarios nuevos se publican directamente; la moderación es reactiva (denuncias, bloqueos, retiro). No se documenta un detector automático de texto ofensivo ni una aprobación previa.
- Rutas abren Maps externo y presentan paradas; no ofrecen seguimiento GPS propio, progreso persistido, acreditación de visitas o rutas completadas.
- El backend define USER, PARTNER, MODERATOR y ADMIN. Permisos históricos de otros módulos o tipos incluidos en semillas no crean perfiles de experto/turismo/artículos en estas interfaces.
- Cache facilita lecturas posteriores; no constituye un modo offline completo ni permite escrituras sin conexión. Las vistas de error y reintento no garantizan disponibilidad de servicios externos.
- Datos bilingües del catálogo se usan cuando existen; texto libre, reseñas y correos no reciben traducción automática por cambiar la preferencia del cliente.
- Compartir se limita a vinos, eventos y rutas; eventos y rutas solo lo ofrecen cuando tienen página pública. Preview de App Store y caché de mensajería son controladas por sus proveedores; instalar desde una tienda requiere reabrir el enlace original para conservar destino.
- Web no realiza escaneo ni alta personal de vino desde cámara. Sí revisa submissions desde administración.
- Web no expone índice de bodegas productoras; sus fichas se abren desde relaciones existentes.
- Rutas filtra la página actual recibida; no promete un total global filtrado. En Vinos la búsqueda/paginación es del servidor; son contratos diferentes.

## 8. Trazabilidad de pruebas y mantenimiento

Las siguientes pruebas existentes cubren aspectos de los grupos indicados. Su inclusión no afirma que cada fila de esta especificación tenga un test automático, ni que se haya ejecutado ahora una suite funcional completa.

| Grupos RF | Pruebas existentes |
| --- | --- |
| AUTH, LEGAL, ACCOUNT | [frontend-react/src/presentation/components/auth/TermsGate.test.tsx](../../../../frontend-react/src/presentation/components/auth/TermsGate.test.tsx), [backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java](../../../../backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java) |
| WINE, PAGE | [frontend-react/src/presentation/pages/wines/useWineSearchViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/wines/useWineSearchViewModel.test.tsx) |
| AI | [frontend-react/src/presentation/pages/wines/useAiProfileViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/wines/useAiProfileViewModel.test.tsx), [backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java](../../../../backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java) |
| CELLAR, REVIEW | [frontend-react/src/application/services/cellar.service.test.ts](../../../../frontend-react/src/application/services/cellar.service.test.ts), [backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java) |
| SAFETY | [frontend-react/src/presentation/hooks/queries/community/useCommunity.test.tsx](../../../../frontend-react/src/presentation/hooks/queries/community/useCommunity.test.tsx), [backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java) |
| EVENT, REG | [frontend-react/src/presentation/pages/events/useEventsNearbyViewModel.test.tsx](../../../../frontend-react/src/presentation/pages/events/useEventsNearbyViewModel.test.tsx), [backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java](../../../../backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java) |
| ROUTE | [frontend-react/src/application/services/wineRoutes.service.test.ts](../../../../frontend-react/src/application/services/wineRoutes.service.test.ts), [backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java](../../../../backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java) |
| ADMIN, USERS, PARTNER, SUBADMIN | [frontend-react/src/application/services/admin.service.test.ts](../../../../frontend-react/src/application/services/admin.service.test.ts), [backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java](../../../../backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java) |
| PUB, MAIL | [frontend-react/src/presentation/hooks/useSupportForm.test.ts](../../../../frontend-react/src/presentation/hooks/useSupportForm.test.ts) |
| MEDIA | [frontend-react/src/application/services/coverImages.service.test.ts](../../../../frontend-react/src/application/services/coverImages.service.test.ts), [backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java](../../../../backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java) |
| SHARE | [frontend-react/src/application/services/sharing.service.test.ts](../../../../frontend-react/src/application/services/sharing.service.test.ts), [backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java](../../../../backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java) |

Ante cambio funcional, actualizar requisito afectado y espejo EN, contrastar UI/servicio/handler, conservar ID y añadir/modificar criterios. Nuevas capacidades se incorporan al implementarse. Mismatches o propuestas se registran en planificación local y no como funciones ya soportadas.

Validación documental reproducible: `python3 scripts/validate_documentation.py`. Esta edición no modifica código funcional, no inicia CI/deploy ni sustituye los gates de una entrega de software.

[Estándar de documentación](../../governance/documentation-standards.md) · [Mapa funcional](product-flows.md) · [Arquitectura](../architecture/overview.md)

## Incremento local: teléfono y reservas gratuitas — 2026-10-14

Además del inventario auditado originalmente, el perfil admite teléfono privado opcional editable/eliminable. La inscripción precarga ese contacto, permite modificarlo para esa reserva y guardarlo para próximas reservas mediante selección explícita. Debe conservar la copia histórica, mostrar mensajes de aprobación/plazo acordes a la configuración y evitar exposición del teléfono en perfiles públicos. Validación de formato internacional en UI y validación de plan de numeración en backend; no implica verificación de titularidad. [Contrato y pruebas](../../modules/events/architecture.md#contacto-de-inscripción-y-teléfono-de-perfil). Implementación local; publicación y aceptación en dispositivos no se presumen.

## Incremento local: eventos cerca tuyo — 2026-10-20

En las preferencias de notificaciones del perfil, bajo "Eventos cerca tuyo", el usuario con sesión elige una región del catálogo en un selector de un toque, o deja de recibir los avisos. Una ubicación aproximada definida desde la app mobile se muestra como tal y puede reemplazarse por una región; la web nunca lee la ubicación del navegador. Tener una zona es la forma de sumarse a los push "Nuevo evento cerca tuyo", que llegan como mucho una vez por día, solo para eventos publicados por primera vez y con inscripción abierta; el interruptor de push de esa fila sigue aplicando, y estos avisos nunca llegan por correo. El aviso de privacidad explica la zona guardada. Trazabilidad: [EventAreaPicker.tsx](../../../../frontend-react/src/presentation/pages/user/EventAreaPicker.tsx), [useEventAreaViewModel.ts](../../../../frontend-react/src/presentation/pages/user/useEventAreaViewModel.ts), [notifications.service.ts](../../../../frontend-react/src/application/services/notifications.service.ts), [contrato del backend](../../modules/notifications/architecture.md#eventos-nuevos-cerca-tuyo).

## Incremento local: motivos de rechazo en moderación — 2026-10-20

Cuando un moderador rechaza una reseña o un comentario en la cola de publicaciones, elige con un toque el motivo que verá el autor: lenguaje ofensivo (preseleccionado), spam o promoción, no trata sobre el vino, datos personales u otro motivo. Rechazar ya no exige escribir; "Detalle para el autor (opcional)" aparece solo con "Otro motivo". Aprobar no envía motivo. Trazabilidad: [ReviewPublicationsPage.tsx](../../../../frontend-react/src/presentation/pages/community/ReviewPublicationsPage.tsx), [publicationDecision.ts](../../../../frontend-react/src/domain/community/publicationDecision.ts), [community.service.ts](../../../../frontend-react/src/application/services/community.service.ts), [contrato del backend](../../modules/notifications/architecture.md#moderación).
