# Requisitos funcionales de Vinnot — APK Android

Especificación del comportamiento implementado para usuarios, moderadores, administradores y partners. Cada requisito identifica una capacidad, su condición de acceso y un criterio observable de aceptación.

**Base de auditoría:** código del repositorio al 25 de octubre de 2026, commit `4384fc8ec8a2f35e8cda55c1c7fe88a2ea6af08c`. Se inspeccionaron router/pantallas, hooks de presentación, servicios, clientes API, controladores, handlers, dominio y pruebas existentes. Los criterios describen el contrato soportado; la lectura del código no acredita una ejecución de todos los escenarios en dispositivos reales.

**Cobertura:** 204 requisitos en 19 grupos funcionales: 192 en los 16 módulos y 12 transversales en 3 grupos. `RF` significa requisito funcional; los identificadores son estables dentro de esta especificación. Las pruebas citadas son puntos de trazabilidad, no evidencia de una nueva corrida ni una afirmación de cobertura total.

## 1. Alcance y términos

Incluye funciones visibles, validaciones, permisos, efectos persistentes, estados y alternativas. Configuración de proveedores, permisos del dispositivo y estado del recurso condicionan las ramas indicadas. Una operación disponible en la API no se atribuye a una interfaz que no la expone.

**Bodega personal/cava** es la colección del usuario; **bodega productora/winery** es la entidad del catálogo. **Reseña** es la valoración de un vino; **comentario** pertenece a una reseña. **Hold** reserva cupos temporalmente. **Ownership** identifica al titular o al organizador propietario. **Perfil experto** es contenido estructurado por vino e idioma, leído, generado o editado según permiso.

APK designa la aplicación Android instalada de React Native/Expo; AAB es su formato de distribución en Play y no otro producto funcional. El código compartido con iOS se usa como evidencia, con diferencias Apple/Android señaladas. Expo Go o una preview web no equivalen a probar Google Sign-In nativo, cámara o App Links de una APK firmada.

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
| Apertura y acceso | `/`, `/welcome`, `/login`, `/register`, `/register-success`, `/verify-email`, `/forgot-password`, `/reset-password` | Público; apertura resuelve sesión |
| Información y legal | `/about`, `/help`, `/contact`, `/legal`, `/legal/:slug`, `/terms`, `/privacy`, `/cookies`, `/content-policy` | Público |
| Onboarding | `/complete-profile` | Sesión y términos |
| Tabs principales | `/home`, `/wines`, `/events`, `/routes`, `/profile` | Sesión, términos y perfil completo |
| Vinos, IA y captura | `/wines/:id`, `/wines/:id/ai-profile`, `/wines/compare`, `/wines/scan`, `/wines/submissions` | Sesión; captura requiere cámara |
| Eventos, rutas y aliases | `/events/:id`, `/routes/:id`, `/wine-routes`, `/wine-routes/:id` | Sesión; aliases redirigen a tabs |
| Funciones personales y bodegas | `/cellar`, `/community`, `/wineries`, `/wineries/:id` | Sesión; bodega exige permiso propio |
| Entradas | `/my-tickets`, `/my-tickets/:id` | Sesión; se abre desde Perfil y no es una tab |
| Vinos enviados | `/my-submissions` | Sesión; se abre desde Perfil y no es una tab |
| Regreso de pago | `/payments/return` | Público; muestra el regreso del checkout y no confirma el pago |
| Gestión de catálogo | `/admin`, `/admin/wines`, `/admin/wines/:id/ai-profile`, `/admin/wineries`, `/admin/events`, `/admin/routes` | ADMIN/MODERATOR; borrar catálogo exige ADMIN |
| Gestión de comunidad | `/admin/reviews`, `/admin/publications`, `/admin/community`, `/admin/submissions` | ADMIN/MODERATOR y permiso de acción |
| Gestión de usuarios | `/admin/users` | ADMIN |
| Gestión de notificaciones | `/admin/notifications` | ADMIN |
| Gestión de publicaciones sociales | `/admin/social-posts` | ADMIN |
| Gestión partner | `/partner`, `/partner/events` | PARTNER/ADMIN y ownership |
| Estados de servicio | `/403`, `/500`, `/503`, `/429`, `/offline`, `/timeout`, fallback `+not-found` | Público |
| Intents externos | `vinnot://` y HTTPS asociados, normalizados al recurso interno; `vinnot://payments/return` y `vinnot://payments/connected` se resuelven en `app/+native-intent.tsx` | Requiere build/asociación compatibles; guards siguen activos |

Los grupos Expo `(auth)`, `(onboarding)`, `(app)` y `(tabs)` organizan archivos y no forman parte de la URL. Hojas/modal de perfil, inscripciones, comunidad y edición no requieren una ruta distinta por acción.

[frontend-mobile/app](../../../../frontend-mobile/app), [frontend-mobile/src/presentation/navigation/guards.tsx](../../../../frontend-mobile/src/presentation/navigation/guards.tsx).

## 4. Catálogo de requisitos

Los requisitos de [usuarios y cuenta](../../modules/users/requirements.md), [legal](../../modules/legal/requirements.md), [vinos](../../modules/wines/requirements.md), [bodegas y regiones](../../modules/wineries/requirements.md), [reseñas](../../modules/reviews/requirements.md), [cava](../../modules/cellar/requirements.md), [comunidad](../../modules/community/requirements.md), [eventos y entradas](../../modules/events/requirements.md), [pagos](../../modules/payments/requirements.md), [rutas del vino](../../modules/wine-routes/requirements.md), [compartir](../../modules/sharing/requirements.md), [notificaciones](../../modules/notifications/requirements.md), [perfiles y comparaciones IA](../../modules/ai/requirements.md), [soporte e información pública](../../modules/support/requirements.md), [partners](../../modules/partner/requirements.md) y [administración y moderación](../../modules/admin/requirements.md) están en sus módulos.

Los criterios combinan disparador, respuesta y límite del caso de uso. Todos los requisitos siguientes describen capacidades implementadas; las ramas condicionadas nombran su condición. UI habilitada no sustituye autorización ni validación del servidor.

| Grupo | Requisitos | Cantidad |
| --- | --- | --- |
| Carga y presentación de imágenes | `RF-APK-MEDIA-001` → `RF-APK-MEDIA-004` | 4 |
| Catálogos de referencia y relaciones | `RF-APK-REF-001` → `RF-APK-REF-004` | 4 |
| Idioma, interacción y recuperación | `RF-APK-UX-002` → `RF-APK-UX-005` | 4 |

### 4.23. Carga y presentación de imágenes

**Actor y precondición:** Titular para avatar; catálogo/admin/organizador con permisos para imágenes correspondientes.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-APK-MEDIA-001` | Validar y optimizar uploads gestionados. | Archivo, MIME/tamaño/decodificación se validan; avatar, etiqueta persistida y portada se convierten a WebP, sin depender de extensión declarada. |
| `RF-APK-MEDIA-002` | Conservar referencias de imágenes por recurso y propietario. | Guardar recibe URL confirmada; fallo de upload impide asumir guardado y una portada privada no se publica sólo por conocer la URL. |
| `RF-APK-MEDIA-003` | Mostrar fallback estable ante ausencia o error de foto. | Null/fallo muestra recurso predeterminado; imagen válida se resuelve contra origen API/CDN y no se interpreta como ruta relativa de la pantalla. |
| `RF-APK-MEDIA-004` | Actualizar avatar y limpiar la referencia anterior. | Éxito cambia imagen del perfil; fallo de persistencia no reemplaza avatar por una URL sin cuenta actualizada. |

**Trazabilidad:** [frontend-mobile/src/application/services/avatarSelection.service.ts](../../../../frontend-mobile/src/application/services/avatarSelection.service.ts), [frontend-mobile/src/application/services/coverImages.service.ts](../../../../frontend-mobile/src/application/services/coverImages.service.ts), [frontend-mobile/src/infrastructure/device/imagePicker.gateway.ts](../../../../frontend-mobile/src/infrastructure/device/imagePicker.gateway.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/UploadController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/controller/CoverImageController.java), [backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizer.java), [backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java](../../../../backend/src/main/java/com/vinnot/shared/application/media/CoverImageService.java).

### 4.24. Catálogos de referencia y relaciones

**Actor y precondición:** Sesión para lectura; formularios usan referencias existentes.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-APK-REF-001` | Consultar tipos de vino y evento activos. | Opciones proceden de reference; label ES/EN y códigos no se sustituyen por valores arbitrarios al guardar. |
| `RF-APK-REF-002` | Relacionar país, región y bodega. | Cambiar país limita regiones; seleccionar bodega conserva su ID y datos de origen, no sólo un texto visible. |
| `RF-APK-REF-003` | Seleccionar variedades de uva existentes. | El catálogo de uvas soporta búsqueda/selección de IDs; búsqueda de bodega/uva no concede permiso para crearlas. |
| `RF-APK-REF-004` | Normalizar resultados paginados en aplicación. | Servicios convierten DTO/page al modelo de cada cliente y conservan total/página/tamaño; una lista parcial no se describe como catálogo completo. |

**Trazabilidad:** [frontend-mobile/src/application/services/regions.service.ts](../../../../frontend-mobile/src/application/services/regions.service.ts), [frontend-mobile/src/application/services/grapeTypes.service.ts](../../../../frontend-mobile/src/application/services/grapeTypes.service.ts), [backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/ReferenceDataController.java), [backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java](../../../../backend/src/main/java/com/vinnot/region/infrastructure/web/controller/RegionController.java), [backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java](../../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/controller/GrapeTypeController.java).

### 4.26. Idioma, interacción y recuperación

**Actor y precondición:** Todos los actores; controles y estados dependen de la pantalla.

| ID | Requisito | Criterio de aceptación / regla |
| --- | --- | --- |
| `RF-APK-UX-002` | Separar carga inicial, refresco, vacío y error. | Consultas y formularios usan indicadores/estados correspondientes; red fallida no elimina datos como si fueran un resultado vacío confirmado. |
| `RF-APK-UX-003` | Bloquear repetición de escrituras en curso. | Los formularios con estado busy bloquean otra confirmación; error ofrece recuperación y no anuncia éxito antes de respuesta. |
| `RF-APK-UX-004` | Confirmar acciones destructivas y preservar borrador recuperable. | Eliminar, cancelar o descartar cambios usa confirmación del flujo; guardado fallido no se considera persistencia. |
| `RF-APK-UX-005` | Respetar permisos ante acceso directo. | Ocultar botones no concede ni sustituye permiso; URL/ID conocido sigue pasando guards y autorización backend. |

**Trazabilidad:** [frontend-mobile/src/presentation/navigation/guards.tsx](../../../../frontend-mobile/src/presentation/navigation/guards.tsx), [frontend-mobile/src/presentation/providers/LanguagePreferenceProvider.tsx](../../../../frontend-mobile/src/presentation/providers/LanguagePreferenceProvider.tsx), [frontend-mobile/src/shared/i18n](../../../../frontend-mobile/src/shared/i18n), [backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java).

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
| Método de pago | `FREE`, `TRANSFER`, `QR`, `CASH`, `MERCADO_PAGO` | El formulario mobile envía sólo FREE (sin importe) o MERCADO_PAGO (con importe); MERCADO_PAGO se cobra mediante checkout online. Los demás valores son del contrato backend y la app no los ofrece. |
| Estado de pago | `NOT_REQUIRED`, `PENDING`, `REPORTED`, `APPROVED`, `REJECTED`, `PAY_AT_VENUE`, `REFUNDED` | Estado de pago es separado de inscripción; enum REFUNDED no implica una pasarela o reembolso automático en UI. |
| Ruta | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Catálogo/share PUBLISHED; borrador vacío no puede publicarse. |
| Vino enviado | `PENDING`, `APPROVED`, `DUPLICATE`, `REJECTED`, `NEEDS_REVIEW`, `CHANGES_REQUESTED` | Decisiones usan alta, vínculo a existente, rechazo o correcciones; destino no es siempre vino nuevo. |
| Escaneo | `EXACT_MATCH`, `POSSIBLE_MATCHES`, `NO_MATCH` | Outcomes de reconocimiento no son estados de publicación. |

**Evidencia de estados:** [backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java](../../../../backend/src/main/java/com/vinnot/review/domain/model/PublicationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationStatus.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentMethod.java), [backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java](../../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventPaymentStatus.java), [backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java](../../../../backend/src/main/java/com/vinnot/community/domain/model/CommunityReport.java), [backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java](../../../../backend/src/main/java/com/vinnot/wineroute/domain/model/WineRoute.java).

## 6. Flujos principales y alternativas

| Flujo | Precondición | Secuencia principal | Postcondición / alternativa |
| --- | --- | --- | --- |
| Cuenta y acceso | Visitante y datos válidos. | Registrar → verificar correo → login → completar perfil/términos → destino. | Sesión USER sólo tras éxito; duplicado/token vencido/rechazo conserva acceso público. |
| Soporte público | Nombre/email/categoría/mensaje válidos. | Enviar → obtener referencia → entrega interna por outbox. | Reintento reutiliza requestId; referencia no garantiza entrega inmediata. |
| Descubrimiento de vinos | Sesión y acuerdo vigentes. | Resolver país opcional → texto/filtros → página → detalle. | Lista/total coherentes; fallo no se presenta como cero vinos ni cambia filtros. |
| Perfil y comparación IA | Vino existente o dos IDs diferentes. | Consultar persistido → generar explícitamente si requerido → visualizar o comparar. | Idioma conservado; generación fallida no crea un perfil/ganador ficticio. |
| Escaneo y alta manual | Sesión/cámara y etiqueta legible. | Capturar (con código de barras si está a la vista) → reconocer → exacto/sugerencias/sin resultado → contraetiqueta, buscar o enviar → veredicto → consultar estado. | Scan normal transitorio; un veredicto por escaneo enseña códigos de barras confirmados y avisa a moderación las coincidencias exactas corregidas; alta puede vincular o ir a revisión, no publica siempre un vino nuevo. |
| Reseña y bodega | Sesión con permiso, vino y valoración válidos. | Crear reseña → APPROVED → actualizar agregados → sincronizar bodega. | Reseña publicada y una entrada propia; duplicado rechaza y eliminar bodega no elimina reseña. |
| Comentario y reporte | Contenido visible; reporte no propio. | Comentar (publicado al instante) o reportar motivo → consultar estado → moderación autorizada. | Decisión con actor/motivo/revision; conflicto/revision obsoleta impide resolver. |
| Inscripción de evento | Evento publicado, plazo abierto, solicitud válida. | Solicitar → revisión/hold/espera → confirmar asistencia o pagar con Mercado Pago → regreso del checkout → decisión del gestor. | Estado/cupo del servidor; expiración/cancelación libera hold; el pago sólo lo confirma la verificación del servidor con Mercado Pago del proveedor. |
| Ruta del vino | Ruta publicada para lectura ordinaria. | Catálogo → detalle → expandir paradas → Maps/compartir. | Orden preservado; abrir recorrido no acredita visita ni finalización. |
| Gestión de catálogo | ADMIN/MODERATOR y permisos de acción. | Buscar → cargar detalle → editar campos/referencias → confirmar → invalidar proyecciones. | Cambio confirmado o borrador recuperable; borrar catálogo exige ADMIN. |
| Gestión de usuarios | ADMIN, target autorizado y comprobante reciente si requerido. | Seleccionar usuario → rol/suspensión/borrado → reautenticar si vence → confirmar una vez. | Servidor aplica protección propia/último admin; cancelación no modifica la cuenta. |
| Gestión partner | PARTNER/ADMIN y ownership de evento. | Crear/editar propio → publicar → gestionar asistentes → cancelar si necesario. | No concede acceso a eventos ajenos; cancelar conserva historial. |
| Borrado de cuenta | Titular autenticado y frase exacta. | Confirmar texto → autorizar Apple si vinculado → eliminar → cerrar sesión. | Revocación fallida impide borrado; desactivar es otro circuito. |
| Enlace compartido | Recurso publicable y app/asociación compatibles para apertura nativa. | Compartir URL → preview/app → autenticar si requerido → recurso por ID. | Sin app ofrece tienda/web; recurso retirado devuelve 404; tras instalar se reabre enlace. |
| Imagen gestionada | Actor autorizado y archivo soportado. | Seleccionar → validar/convertir WebP → upload → guardar referencia → render/fallback. | Referencia corresponde al recurso/owner; fallo no implica persistencia confirmada. |

## 7. Límites funcionales de esta especificación

- Vinnot descubre/describe vinos; no vende ni entrega alcohol, no registra pedidos de botellas ni ofrece checkout de cava.
- Eventos registran solicitudes y cupos; las inscripciones pagas se cobran con checkout online de Mercado Pago, habilitado por `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED`. La confirmación del pago llega sólo cuando el servidor lo verifica con Mercado Pago; no hay IAP. Cancelar un evento devuelve automáticamente los pagos en línea.
- Las reseñas nuevas, las ediciones de reseñas aprobadas y los comentarios nuevos se publican directamente; la moderación es reactiva (denuncias, bloqueos, retiro). No se documenta un detector automático de texto ofensivo ni una aprobación previa.
- Rutas abren Maps externo y presentan paradas; no ofrecen seguimiento GPS propio, progreso persistido, acreditación de visitas o rutas completadas.
- El backend define USER, PARTNER, MODERATOR y ADMIN. Permisos históricos de otros módulos o tipos incluidos en semillas no crean perfiles de experto/turismo/artículos en estas interfaces.
- Cache facilita lecturas posteriores; no constituye un modo offline completo ni permite escrituras sin conexión. Las vistas de error y reintento no garantizan disponibilidad de servicios externos.
- Datos bilingües del catálogo se usan cuando existen; texto libre, reseñas y correos no reciben traducción automática por cambiar la preferencia del cliente.
- Compartir se limita a vinos, eventos y rutas; eventos y rutas solo lo ofrecen cuando tienen página pública. Preview de App Store y caché de mensajería son controladas por sus proveedores; instalar desde una tienda requiere reabrir el enlace original para conservar destino.
- Apple Sign-In y su confirmación nativa de borrado requieren iOS; Android muestra los proveedores compatibles con su build.
- Eventos mobile trabaja con la primera página de hasta cincuenta, discovery o zona. Rutas refina páginas ya cargadas; no se atribuye paginación global filtrada a esos resultados.
- Permisos de cámara/ubicación son opcionales para las demás funciones. Denegar cámara impide captura; denegar ubicación permite descubrimiento manual/global.

## 8. Trazabilidad de pruebas y mantenimiento

Las siguientes pruebas existentes cubren aspectos de los grupos indicados. Su inclusión no afirma que cada fila de esta especificación tenga un test automático, ni que se haya ejecutado ahora una suite funcional completa.

| Grupos RF | Pruebas existentes |
| --- | --- |
| AUTH, LEGAL, ACCOUNT | [frontend-mobile/src/presentation/features/public/TermsGate.test.tsx](../../../../frontend-mobile/src/presentation/features/public/TermsGate.test.tsx), [backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java](../../../../backend/src/test/java/com/vinnot/legal/application/service/LegalAgreementServiceTest.java) |
| WINE, PAGE | [frontend-mobile/src/presentation/features/wine/__tests__/winesBrowsePagination.test.tsx](../../../../frontend-mobile/src/presentation/features/wine/__tests__/winesBrowsePagination.test.tsx) |
| AI | [frontend-mobile/src/presentation/features/wine/AiProfileSections.test.tsx](../../../../frontend-mobile/src/presentation/features/wine/AiProfileSections.test.tsx), [backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java](../../../../backend/src/test/java/com/vinnot/ai/application/service/AiProfileServiceTest.java) |
| CELLAR, REVIEW | [frontend-mobile/src/application/services/cellar.service.test.ts](../../../../frontend-mobile/src/application/services/cellar.service.test.ts), [backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewTest.java) |
| SAFETY | [frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.test.tsx](../../../../frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.test.tsx), [backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java](../../../../backend/src/test/java/com/vinnot/review/domain/model/ReviewPublicationTest.java) |
| EVENT, REG | [frontend-mobile/src/application/services/events.service.test.ts](../../../../frontend-mobile/src/application/services/events.service.test.ts), [backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java](../../../../backend/src/test/java/com/vinnot/event/application/command/handler/EventRegistrationLifecycleHandlersTest.java) |
| ROUTE | [frontend-mobile/src/presentation/features/wineRoute/useWineRoutesListViewModel.test.ts](../../../../frontend-mobile/src/presentation/features/wineRoute/useWineRoutesListViewModel.test.ts), [backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java](../../../../backend/src/test/java/com/vinnot/wineroute/domain/model/WineRouteTest.java) |
| ADMIN, USERS, PARTNER, SUBADMIN | [frontend-mobile/src/presentation/features/admin/AdminUserActionSheet.test.tsx](../../../../frontend-mobile/src/presentation/features/admin/AdminUserActionSheet.test.tsx), [backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java](../../../../backend/src/test/java/com/vinnot/user/infrastructure/web/controller/ReauthenticationControllerTest.java) |
| PUB, MAIL | [frontend-mobile/src/presentation/hooks/useSupportForm.test.ts](../../../../frontend-mobile/src/presentation/hooks/useSupportForm.test.ts) |
| MEDIA | [frontend-mobile/src/application/services/coverImages.service.test.ts](../../../../frontend-mobile/src/application/services/coverImages.service.test.ts), [backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java](../../../../backend/src/test/java/com/vinnot/shared/infrastructure/media/WebpImageOptimizerTest.java) |
| SHARE | [frontend-mobile/src/domain/navigation/nativeIntent.test.ts](../../../../frontend-mobile/src/domain/navigation/nativeIntent.test.ts), [backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java](../../../../backend/src/test/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRendererTest.java) |
| SCAN | [frontend-mobile/src/presentation/features/wine/scan/useWineLabelScanViewModel.test.ts](../../../../frontend-mobile/src/presentation/features/wine/scan/useWineLabelScanViewModel.test.ts) |

Ante cambio funcional, actualizar requisito afectado y espejo EN, contrastar UI/servicio/handler, conservar ID y añadir/modificar criterios. Nuevas capacidades se incorporan al implementarse. Mismatches o propuestas se registran en planificación local y no como funciones ya soportadas.

Validación documental reproducible: `python3 scripts/validate_documentation.py`. Esta edición no modifica código funcional, no inicia CI/deploy ni sustituye los gates de una entrega de software.

[Estándar de documentación](../../governance/documentation-standards.md) · [Mapa funcional](product-flows.md) · [Arquitectura](../architecture/overview.md)

## Incremento local: teléfono y reservas gratuitas — 2026-10-14

Además del inventario auditado originalmente, el perfil admite teléfono privado opcional editable/eliminable. La inscripción precarga ese contacto, permite modificarlo para esa reserva y guardarlo para próximas reservas mediante selección explícita. Debe conservar la copia histórica, mostrar mensajes de aprobación/plazo acordes a la configuración y evitar exposición del teléfono en perfiles públicos. Validación de formato internacional en UI y validación de plan de numeración en backend; no implica verificación de titularidad. [Contrato y pruebas](../../modules/events/architecture.md#contacto-de-inscripción-y-teléfono-de-perfil-1). Implementación local; publicación y aceptación en dispositivos no se presumen.

## Incremento local: eventos cerca tuyo — 2026-10-20

En la hoja de preferencias de notificaciones, bajo "Eventos cerca tuyo", el usuario con sesión define su zona con un toque: "Usar mi ubicación aproximada" pide la ubicación en primer plano una vez y envía una posición redondeada en el dispositivo a 0,1° (unos 11 km), que el servidor vuelve a redondear, o "Buscar una región o ciudad" abre un buscador: desde dos letras muestra hasta ocho regiones del catálogo cuyo nombre o país coincide, sin distinguir mayúsculas ni acentos, y nunca el catálogo completo. Si ninguna región coincide, o tras "Elegir en el mapa", aparece el mismo selector de mapa que el editor de eventos: "Buscar en el mapa" geocodifica el texto con Google y mueve el marcador sin guardar, un toque o arrastrar el marcador lo ajusta, y sólo "Usar este punto" envía el marcador redondeado a 0,1° igual que la ubicación aproximada. Si se niega el permiso, se muestra un aviso sereno y se abre el buscador. La hoja muestra el nombre de la región, el lugar recién encontrado o "Zona aproximada", y "Dejar de recibir" la borra. El push "Nuevo evento cerca tuyo" resultante abre `/events/<id>`. Solo JavaScript: se publica por OTA. Trazabilidad: [EventAreaSection.tsx](../../../../frontend-mobile/src/presentation/features/user/EventAreaSection.tsx), [useEventArea.ts](../../../../frontend-mobile/src/presentation/features/user/useEventArea.ts), [notifications.service.ts](../../../../frontend-mobile/src/application/services/notifications.service.ts), [eventArea.ts](../../../../frontend-mobile/src/domain/notification/eventArea.ts).

## Incremento local: motivos de rechazo en moderación — 2026-10-20

En la pantalla de publicaciones, rechazar una reseña o un comentario es elegir con un toque el motivo que verá el autor (semántica de opción única): lenguaje ofensivo (preseleccionado), spam o promoción, no trata sobre el vino, datos personales u otro motivo. "Detalle para el autor (opcional)" aparece solo con "Otro motivo"; aprobar no envía motivo. Solo JavaScript: se publica por OTA. Trazabilidad: [ReviewPublicationsScreen.tsx](../../../../frontend-mobile/src/presentation/features/community/ReviewPublicationsScreen.tsx), [useAdminCommunityViewModels.ts](../../../../frontend-mobile/src/presentation/features/community/useAdminCommunityViewModels.ts), [community.service.ts](../../../../frontend-mobile/src/application/services/community.service.ts).

## Incremento local: añada de la reseña y de la nota — 2026-10-22

El formulario de reseña y la hoja para agregar o editar un vino de la cava incluyen "Añada": un campo numérico (teclado numérico, hasta cuatro dígitos) filtra los años desde el actual hasta 1900 y los muestra como chips; la añada del vino en el catálogo aparece primero, marcada "del catálogo". Tocar un chip o completar un año válido lo elige y lo muestra como píldora con un control para quitarla. El selector vive dentro del formulario, sin una hoja anidada, y usa los campos que conocen la hoja para que el teclado no lo tape. Las reseñas y las filas de la cava muestran la píldora "Añada 2018" cuando hay una. Publicar una nota como reseña precarga su añada. Al crear se envía `vintage` solo si hay año; al editar se envía `vintage` si cambió, `clearVintage: true` si se quitó y ninguno si no se tocó, así la API conserva el valor guardado. Solo JavaScript: se publica por OTA. Trazabilidad: [VintageField.tsx](../../../../frontend-mobile/src/presentation/components/ui/VintageField.tsx), [VintagePill.tsx](../../../../frontend-mobile/src/presentation/components/ui/VintagePill.tsx), [vintage.ts](../../../../frontend-mobile/src/domain/wine/vintage.ts), [ReviewFormFields.tsx](../../../../frontend-mobile/src/presentation/features/wine/ReviewFormFields.tsx), [CellarAddSheet.tsx](../../../../frontend-mobile/src/presentation/features/cellar/CellarAddSheet.tsx), [useCellarReviewPublication.ts](../../../../frontend-mobile/src/presentation/hooks/useCellarReviewPublication.ts), [wines.service.ts](../../../../frontend-mobile/src/application/services/wines.service.ts), [cellar.service.ts](../../../../frontend-mobile/src/application/services/cellar.service.ts).

## Incremento local: correcciones de la auditoría de UI/UX — 2026-10-23

Una lectura fallida ya no parece contenido vacío: el detalle de vino, bodega y evento muestra el motivo con «Reintentar» (solo un 404 real conserva «no encontrado»); lo mismo hacen las reseñas, los comentarios, las secciones «Eventos cercanos» y «Rutas del vino» del inicio, el perfil IA y la lista de eventos del organizador. El perfil IA ofrece «Generar perfil» solo cuando el vino no tiene uno y explica una generación fallida según el tipo (tiempo de espera, límite de solicitudes, red, genérico). El «Precio pagado» de la cava se lee en el idioma de la app («12,50» y «1.500» en es-AR, «1,500.50» en en-US); un precio inválido o ambiguo muestra un error en el campo y nunca se envía. Una reseña sin enviar (puntaje, título, comentario, añada) y un comentario sin enviar se conservan por vino y por reseña en memoria durante la sesión de la app, y se borran al publicar, cancelar o cerrar sesión. Eliminar una reseña o un comentario confirma con un mensaje; los botones de me gusta y comentarios tienen áreas de 44 puntos, etiquetas accesibles y no admiten doble toque mientras guardan. Los paneles admin de vino, bodega y ruta no se cierran mientras guardan y preguntan antes de descartar cambios. La lista de eventos del organizador busca en el servidor (`search` en `GET /partner/events`), se actualiza al deslizar hacia abajo y marca «Editar» mientras carga. En el panel de inscripciones, aprobar, enviar a espera o rechazar pide confirmación con su propia nota opcional para esa persona, y solo esa persona muestra el estado pendiente. Las pantallas dentro del modal de pantalla completa del escáner muestran sus mensajes dentro de él. Volver en pantallas abiertas sin historial lleva al listado correspondiente. Solo JavaScript: se publica por OTA. Trazabilidad: [purchasePrice.ts](../../../../frontend-mobile/src/domain/cellar/purchasePrice.ts), [illustratedState.ts](../../../../frontend-mobile/src/presentation/feedback/illustratedState.ts), [draftsSlice.ts](../../../../frontend-mobile/src/presentation/store/draftsSlice.ts), [useSheetDismissGuard.ts](../../../../frontend-mobile/src/presentation/components/ui/useSheetDismissGuard.ts), [usePartnerEventsViewModel.ts](../../../../frontend-mobile/src/presentation/features/partner/usePartnerEventsViewModel.ts), [EventRegistrationsManagerSheet.tsx](../../../../frontend-mobile/src/presentation/features/event/EventRegistrationsManagerSheet.tsx), [ToastProvider.tsx](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx), [discoveryNavigation.ts](../../../../frontend-mobile/src/presentation/navigation/discoveryNavigation.ts).

## Incremento local: administración de publicaciones sociales — 2026-11-03

"Publicaciones sociales" en el panel de administración (solo administradores) abre `/admin/social-posts`, la versión móvil de la cola de aprobación web del [módulo de marketing](../../modules/marketing/README.md). La cola filtra por estado con un toque (primero las pendientes de aprobación) y pagina `GET /admin/social-posts`; cada fila muestra la fecha, el estado, el pilar, el día del vino y el gancho en el idioma elegido, o "Texto pendiente en este idioma". Un selector Español/Inglés gobierna la cola y la publicación. La publicación se abre en una hoja con un segundo selector Instagram o TikTok: muestra las placas de ese idioma y formato (`media.slides.<es|en>.<instagram|tiktok>`) en una lista horizontal, cada una con "Ver" (abre la imagen) y "Compartir" (hoja de compartir del sistema), si se están generando (mientras tanto la publicación se vuelve a pedir) o fallaron y por qué, y si la imagen es la ilustración IA o la viñeta del pilar; sin placas muestra una vista previa del texto. Un idioma sin texto se muestra como pendiente. Debajo están el texto con el control de la línea legal, los hashtags, el llamado a la acción, el texto alternativo, la generación y la verificación, y la revisión. Las acciones dependen del estado: aprobar (pendiente), rechazar (pendiente o aprobada) con un motivo de un toque cuyo texto libre aparece solo con "Otro", editar el texto del idioma elegido en una hoja de formulario (`PUT` con `language`; el otro idioma no cambia y se agrega la línea legal de ese idioma si falta), regenerar (pendiente, aprobada o rechazada; regenerar una aprobada le quita la aprobación y vuelve a pendiente de aprobación cuando los dos textos son válidos, así una aprobada a la que le falta un idioma se completa desde el aviso de idioma pendiente) y nueva ilustración. Un 409 avisa que la publicación cambió de estado. "Planificar ahora" muestra cuántas publicaciones creó y que la IA escribe los textos en segundo plano, y actualiza la cola cada 10 segundos durante 5 minutos. Los días del vino de este mes y el siguiente se listan como solo lectura. Solo JavaScript: se publica por OTA. Trazabilidad: [AdminSocialPostsScreen.tsx](../../../../frontend-mobile/src/presentation/features/admin/AdminSocialPostsScreen.tsx), [useAdminSocialPostsViewModel.ts](../../../../frontend-mobile/src/presentation/features/admin/social-posts/useAdminSocialPostsViewModel.ts), [useAdminSocialPosts.ts](../../../../frontend-mobile/src/presentation/hooks/queries/admin/useAdminSocialPosts.ts), [adminSocialPosts.service.ts](../../../../frontend-mobile/src/application/services/adminSocialPosts.service.ts), [adminSocialPosts.client.ts](../../../../frontend-mobile/src/infrastructure/api/clients/adminSocialPosts.client.ts), [socialPost.ts](../../../../frontend-mobile/src/domain/admin/socialPost.ts).

## Incremento local: precisión del escaneo de etiquetas — 2026-11-11

Mientras se encuadra una etiqueta, la cámara también lee códigos EAN-13, EAN-8, UPC-A y UPC-E; un código de 8, 12, 13 o 14 dígitos con dígito verificador GS1 válido muestra «Leímos el código de barras» y se envía con el escaneo como `barcode`. Cuando el escaneo no tiene coincidencia exacta, el resultado ofrece una vez «Escanear la contraetiqueta»: se lee la contraetiqueta y se combina con la lectura del frente (cada lado conserva al menos la mitad de las 24 líneas), y se vuelve a enviar la foto del frente. Abrir o agregar un vino desde el resultado, o proponer el vino, envía un único veredicto por escaneo a `POST /wines/scans/{scanId}/feedback` sin esperar y sin mostrar errores: `CONFIRMED` para la coincidencia exacta, `CORRECTED` para otra sugerencia, resultado de búsqueda o duplicado encontrado por una propuesta, y `NOT_IN_CATALOG` al proponerlo. Una añada leída en la etiqueta entre 1900 y el año actual viaja al vino abierto y precarga «Añada» al agregar una entrada nueva a la cava; una entrada editada conserva la suya. Solo JavaScript: se publica por OTA. Requisitos: [`RF-APK-WIN-24`](../../modules/wines/requirements.md) a [`RF-APK-WIN-27`](../../modules/wines/requirements.md). Trazabilidad: [labelScan.ts](../../../../frontend-mobile/src/domain/wine/labelScan.ts), [wineLabelText.ts](../../../../frontend-mobile/src/shared/image/wineLabelText.ts), [useWineLabelScanViewModel.ts](../../../../frontend-mobile/src/presentation/features/wine/scan/useWineLabelScanViewModel.ts), [WineLabelCamera.tsx](../../../../frontend-mobile/src/infrastructure/device/camera/WineLabelCamera.tsx), [CellarAddSheet.tsx](../../../../frontend-mobile/src/presentation/features/cellar/CellarAddSheet.tsx), [wineNavigation.ts](../../../../frontend-mobile/src/presentation/navigation/wineNavigation.ts).
