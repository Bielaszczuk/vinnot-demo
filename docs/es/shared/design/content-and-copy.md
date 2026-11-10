# Contenido y textos

Cómo habla Vinnot en la interfaz. La UI sale en español de Argentina (`es-AR`)
y en inglés (`en-US`); ambos idiomas conviven y cambian juntos.

Parte del [sistema visual](visual-system.md).

## Voz

- **Editorial y cálida, nunca decorativa.** Se escribe como un conocedor en una
  degustación, no como un log del sistema.
- **Breve y concreta.** Primero lo que pasó o lo que hay que hacer.
- **Honesta.** Se dice lo que Vinnot sabe; nunca se promete un resultado que el
  sistema no garantiza ("Enviarla no garantiza un lugar hasta que se complete la
  aprobación…").
- **Tranquilizadora en los errores.** Se nombra el problema, se conserva el
  trabajo del usuario y se ofrece el siguiente paso ("Revisá tu conexión e
  intentá nuevamente. Tus datos no se borraron.").

## UI en español: voseo rioplatense

Todos los textos de UI `es-AR` usan voseo. El código, los comentarios y los
identificadores quedan en inglés.

| Usar | Evitar |
|---|---|
| Revisá, Intentá, Podés, Tenés, Explorá, Guardá, Escaneá | Revisa, Intenta, Puedes, Tienes, Explora |
| Hacé clic (web) / Tocá (app) | Haz clic, Pulsa |
| Llegaste al límite… Vas a poder… | Has llegado al límite… Podrás… |

La palabra del gesto sigue a la plataforma: "clic" en la web, "tocá" en la app.
Por eso una misma clave puede diferir a propósito entre la web y la app.

## Terminología

| Concepto | es-AR | en-US | Regla |
|---|---|---|---|
| Informar contenido a moderación | denuncia, denunciar ("Denunciar contenido", "Mis denuncias") | report | Nunca "reporte" para la denuncia de un usuario |
| Inscripción a un evento | inscripción, inscribirme ("Inscribirme", "Condiciones de inscripción") | registration, register | Nunca "registrarse" para eventos: se lee como alta de cuenta |
| Un pedido que espera la aprobación de alguien | solicitud ("Enviar solicitud", "El organizador revisará tu solicitud") | request | Solo cuando existe un paso de aprobación; una inscripción gratuita con lugares es una "inscripción" |
| Reseña | reseña | review | |
| La bodega del usuario | Bodega ("Mi Bodega") | cellar | |
| Productor de vino | bodega | winery | |
| Reintentar | Reintentar (`common.retry`) | Retry | |
| Volver | Volver (`common.back`) | Back | |

## Dónde viven los textos

- Todo texto de UI pasa por i18n en ambos idiomas:
  web [`es-AR.json`](../../../../frontend-react/src/shared/i18n/locales/es-AR.json) /
  [`en-US.json`](../../../../frontend-react/src/shared/i18n/locales/en-US.json),
  app [`es-AR.json`](../../../../frontend-mobile/src/shared/i18n/locales/es-AR.json) /
  [`en-US.json`](../../../../frontend-mobile/src/shared/i18n/locales/en-US.json).
- Una clave compartida por la web y la app significa lo mismo en ambas; la
  redacción solo difiere por la palabra del gesto o por espacio.
- Los mensajes del backend nunca se muestran crudos: el código de error se
  traduce a un texto (mappers web en
  `frontend-react/src/presentation/feedback/*ErrorMessage.ts`).
- Los textos de los estados ilustrados viven en `stateCopy`
  (`presentation/feedback/illustratedState.ts`) con ambos idiomas en un objeto;
  la web y la app tienen cada una su copia de ese archivo.

## Patrones

| Situación | Patrón | Ejemplo (es-AR) |
|---|---|---|
| Botón | primero el verbo, el objeto cuando hace falta | "Publicar como reseña", "Enviar denuncia" |
| Confirmación destructiva | título en pregunta + consecuencia + verbo explícito | "¿Eliminar de tu bodega?" → "Eliminar" |
| Toast de éxito | lo que quedó hecho, en pasado | "Vino eliminado de tu bodega." |
| Error | qué falló + qué hacer | "No pudimos completar la inscripción. Intentá de nuevo." |
| Estado vacío | invitación + próxima acción | "Explorá el catálogo y guardá los vinos que quieras tener a mano." |
| Límite de uso | pausa tranquila + cuándo volver a intentar | "Llegaste al límite de 10 denuncias en 24 horas. Probá de nuevo más tarde." |
| Nota de privacidad | quién ve qué | "Tu precio de compra queda privado." |

Hacer:

- Escribir los textos en español e inglés en el mismo cambio.
- Usar mayúscula solo al inicio de la oración.
- Mantener números, precios y añadas como datos, no como palabras.

Evitar:

- Mezclar "tú" y "vos" en una pantalla.
- Usar "reporte", "registrarse" (para eventos) o "solicitud" (sin aprobación).
- Escribir un texto en español fijo dentro de un componente.
