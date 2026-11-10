# Configuración de las redes sociales

Guía para la persona dueña del producto: cómo preparar Instagram, Facebook, Threads y TikTok
para que el agente de redes publique solo, dónde va cada secreto y en qué orden se enciende.
El comportamiento está en [Marketing en redes](../../modules/marketing/README.md) y la lista
completa de variables en [Entornos y secretos](../architecture/environments-and-secrets.md#agente-de-redes-sociales).

Todo empieza apagado: sin estas variables el backend arranca, no publica nada y el panel
muestra cada red como sin configurar.

## Antes de empezar

- Una cuenta de la marca en cada red, con acceso de administración.
- Acceso a la consola de AWS para editar el secreto del backend de cada entorno.
- Las URLs de cada entorno:

| Entorno | API | Web de administración |
|---|---|---|
| Development | `https://api-dev.vinnot.com/api` | `https://dev.vinnot.com/admin/social-posts` |
| Producción | `https://api.vinnot.com/api` | `https://vinnot.com/admin/social-posts` |

Cada entorno usa sus propios valores. No se copian tokens ni claves de cifrado entre entornos.

## Dónde va cada secreto

Los valores van en el secreto JSON del backend de AWS Secrets Manager (`vinnot/dev/backend` o
`vinnot/prod/backend`), una clave por variable. Nunca en Git, en `VITE_*`, en `EXPO_PUBLIC_*`, en
capturas ni en tickets. Después de editar el secreto:

- Development: el próximo despliegue vuelve a generar `runtime.env` con `refresh-runtime-env.sh`.
- Producción: el operador materializa `runtime.env` con `refresh-runtime-env.sh prod` y publica por el
  procedimiento de [despliegue](deployment.md). Cambiar el secreto en AWS no cambia por sí solo el
  contenedor en ejecución.

Los cambios de variables, incluidos los interruptores, se aplican al reiniciar el backend.

## 1. Clave de cifrado

Los tokens de Threads y TikTok se guardan cifrados con AES-256-GCM. Genera una clave por entorno:

```bash
openssl rand -base64 32
```

Guárdala como `MARKETING_ACCOUNTS_ENCRYPTION_KEY`. Sin ella el panel no deja conectar
(«SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING»); una clave mal formada impide que el backend arranque.

Rotar la clave deja ilegibles los tokens guardados: Threads y TikTok pasan a «No se pudo renovar
el acceso» (`TOKEN_UNREADABLE`), llega un aviso y hay que volver a conectarlas desde el panel.

## 2. Meta: Instagram y la página de Facebook

Instagram y Facebook usan un token de usuario del sistema de Meta que no vence. No se conectan
desde el panel: se configuran con secretos.

1. **Portfolio comercial.** En [Meta Business Suite](https://business.facebook.com/) crea o usa el
   portfolio comercial de la marca.
2. **Página y cuenta de Instagram.** La página de Facebook de la marca debe estar en el portfolio
   y la cuenta de Instagram debe ser profesional (empresa o creador) y estar vinculada a esa página.
3. **App de desarrollador.** En [Meta for Developers](https://developers.facebook.com/) crea una app
   de tipo empresa asociada al portfolio, con los productos de la API de Instagram (con inicio de
   sesión con Facebook) y de páginas.
4. **Usuario del sistema.** En la configuración del portfolio, «Usuarios › Usuarios del sistema»,
   crea un usuario del sistema administrador, asígnale la app, la página y la cuenta de Instagram
   con control total, y genera un token **sin vencimiento** para la app con estos permisos:

   | Permiso | Para qué |
   |---|---|
   | `instagram_basic` | Leer la cuenta de Instagram |
   | `instagram_content_publish` | Publicar carruseles en Instagram |
   | `instagram_manage_insights` | Leer las métricas de Instagram |
   | `pages_show_list` | Ver la página |
   | `pages_read_engagement` | Leer la página, sus posts, comentarios y compartidos |
   | `pages_manage_posts` | Publicar en la página |
   | `read_insights` | Leer las métricas de los posts de la página |
   | `business_management` | Usar los activos del portfolio con el usuario del sistema |

   Los nombres siguen la documentación de Meta; confirma en el panel de la app de Meta que la
   lista coincide con los permisos que ofrece la versión `v27.0` de la Graph API y si alguno
   requiere revisión de la app (App Review) para la cuenta propia.
5. **Ids.** Copia el id de la cuenta de Instagram (el usuario de Instagram de la Graph API) y el
   id de la página.
6. **Secretos.** Guarda en el secreto del backend:

   | Variable | Valor |
   |---|---|
   | `MARKETING_META_ACCESS_TOKEN` | El token del usuario del sistema |
   | `MARKETING_META_INSTAGRAM_USER_ID` | El id de la cuenta de Instagram |
   | `MARKETING_META_PAGE_ID` | El id de la página |
   | `MARKETING_META_PAGE_ACCESS_TOKEN` | Opcional; vacío, el backend lee el token de la página con el token del usuario del sistema |

7. Después del despliegue, el panel «Redes conectadas» muestra Instagram y Facebook como
   «Configurada en el servidor».

## 3. Threads

Threads se conecta desde el panel con OAuth.

1. En [Meta for Developers](https://developers.facebook.com/) crea una app con el caso de uso de
   acceso a la API de Threads (puede ser la misma app de Meta o una separada; confirma en el panel
   de Meta qué combinación admite tu app).
2. Agrega los permisos `threads_basic`, `threads_content_publish` y `threads_manage_insights`.
3. En la configuración de Threads de la app, registra la URL de redirección:
   - Producción: `https://api.vinnot.com/api/public/social-accounts/threads/callback`
   - Development: `https://api-dev.vinnot.com/api/public/social-accounts/threads/callback`

   Si el panel de Meta pide también URLs para desinstalar y eliminar datos, completa las que exija;
   el backend no expone endpoints propios para esos avisos.
4. Mientras la app no esté publicada, agrega la cuenta de Threads de la marca como tester
   («Roles › Threads Testers» en el panel de Meta) y acepta la invitación desde Threads, en la configuración de la
   cuenta, permisos de sitios web.
5. Guarda en el secreto del backend:

   | Variable | Valor |
   |---|---|
   | `MARKETING_THREADS_CLIENT_ID` | Id de la app de Threads |
   | `MARKETING_THREADS_CLIENT_SECRET` | Secreto de la app de Threads |
   | `MARKETING_THREADS_REDIRECT_URI` | La URL de redirección exacta del paso 3 |

6. Después del despliegue, en la web abre `/admin/social-posts`, pulsa «Conectar» en Threads,
   inicia sesión con la cuenta de la marca y acepta. Al volver, Threads aparece «Conectada» con la
   cuenta y su vencimiento. El token dura 60 días y el backend lo renueva solo en sus últimos 10 días.

## 4. TikTok

TikTok también se conecta desde el panel con OAuth. Hasta que TikTok audite la app, las
publicaciones llegan como borrador a la bandeja de entrada de la cuenta y se terminan a mano
desde la app de TikTok. Hasta 15 minutos después de publicar un borrador, el panel muestra esa
publicación de TikTok como publicada (con "Ver en TikTok" cuando TikTok deja disponible el post
público); los borradores de más de 14 días ya no se consultan.

1. En [TikTok for Developers](https://developers.tiktok.com/) crea una app para la organización de
   la marca.
2. Agrega los productos Login Kit (web) y Content Posting API, con los permisos `user.info.basic`,
   `video.upload`, `video.publish` y `video.list`.
3. En Login Kit registra la URI de redirección:
   - Producción: `https://api.vinnot.com/api/public/social-accounts/tiktok/callback`
   - Development: `https://api-dev.vinnot.com/api/public/social-accounts/tiktok/callback`
4. TikTok descarga las fotos desde sus URLs. Verifica en la app la propiedad del dominio de las
   imágenes (`images.vinnot.com`); confirma en el portal de TikTok si pide el dominio o un prefijo de
   URL.
5. Guarda en el secreto del backend:

   | Variable | Valor |
   |---|---|
   | `MARKETING_TIKTOK_CLIENT_KEY` | Client key de la app |
   | `MARKETING_TIKTOK_CLIENT_SECRET` | Client secret de la app |
   | `MARKETING_TIKTOK_REDIRECT_URI` | La URI de redirección exacta del paso 3 |

6. Después del despliegue, pulsa «Conectar» en TikTok desde la web e inicia sesión con la cuenta de
   la marca. El backend renueva el token solo antes de que venza.
7. Deja `MARKETING_PUBLISHING_TIKTOK_MODE=MEDIA_UPLOAD` (valor por defecto). Cada borrador genera un
   correo y un push «Borrador en TikTok».
8. Cuando TikTok apruebe la auditoría de la app para publicar directo, cambia
   `MARKETING_PUBLISHING_TIKTOK_MODE=DIRECT_POST` y vuelve a desplegar. Las publicaciones salen con la
   privacidad más abierta que ofrezca la cuenta.

## 5. Orden de encendido

Enciende una cosa por vez y comprueba antes de seguir.

1. **Cuentas.** Con los pasos 1 a 4 desplegados, el panel «Redes conectadas» muestra Instagram y
   Facebook «Configurada en el servidor» y Threads y TikTok «Conectada».
2. **Una red.** Enciende primero una sola red, por ejemplo `MARKETING_PUBLISHING_INSTAGRAM_ENABLED=true`.
   Las demás: `MARKETING_PUBLISHING_FACEBOOK_ENABLED`, `MARKETING_PUBLISHING_THREADS_ENABLED` y
   `MARKETING_PUBLISHING_TIKTOK_ENABLED`.
3. **Publicación.** `MARKETING_PUBLISHING_ENABLED=true` y despliega. A partir de ahí, cada publicación
   aprobada con placas listas sale sola a su turno. Revisa la primera en el panel: estado
   «Publicada» y «Ver en <red>». Suma las otras redes de a una.
4. **Métricas.** `MARKETING_METRICS_ENABLED=true`. La lectura corre todos los días a las 06:00 y las
   métricas aparecen en cada publicación al día siguiente.
5. **Aprobación automática.** `MARKETING_AUTO_APPROVE_ENABLED=true` y, en el panel «Pilares de
   contenido», enciende «Aprobación automática» sólo en los pilares que quieras. El resto sigue
   esperando tu aprobación.

Para apagar todo, vuelve `MARKETING_PUBLISHING_ENABLED=false`: las publicaciones en cola fallan con
`PUBLISHING_OFF`, las aprobadas que todavía no empezaron siguen aprobadas y no se publica nada más.

## Problemas frecuentes

| Qué ves | Qué hacer |
|---|---|
| «Falta configurar la app de esta red en el servidor.» | Faltan `MARKETING_<RED>_CLIENT_*` o la URI de redirección en el entorno |
| «No se pudo conectar <red>. Probá de nuevo.» | Vuelve a pulsar «Conectar» antes de 10 minutos y sin reiniciar el backend en el medio; revisa que la URI de redirección registrada en la red sea idéntica a la del secreto |
| «No se pudo renovar el acceso: volvé a conectarla.» | Pulsa «Reconectar»; pasa si la red revocó el acceso, el token venció o se rotó la clave de cifrado |
| Una red «Fallida» con `NOT_CONNECTED` o `TOKEN_INVALID` | Configura o reconecta la cuenta y pulsa «Reintentar» en esa red |
| Una red «Fallida» con `MEDIA_NOT_PUBLIC` | Las placas no tienen URL https absoluta: revisa la configuración del almacenamiento (con R2 se sirven en `https://images.vinnot.com/…`) y pide una nueva ilustración si hace falta |
| Publicaciones que no salen | Revisa que `MARKETING_PUBLISHING_ENABLED` y la red estén encendidas y que la publicación esté aprobada con placas listas; una aprobada más de 12 horas después de su turno ya no se publica |
