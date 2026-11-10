# Content and copy

How Vinnot speaks in the interface. The UI ships in Spanish (Argentina,
`es-AR`) and English (`en-US`); both locales live side by side and move together.

Part of the [visual system](visual-system.md).

## Voice

- **Editorial and warm, never decorative.** Write like a knowledgeable friend
  at a tasting, not like a system log.
- **Short and concrete.** Lead with what happened or what to do.
- **Honest.** Say what Vinnot knows; never promise a result the system does
  not guarantee ("Enviarla no garantiza un lugar hasta que se complete la
  aprobación…").
- **Reassuring in errors.** State the problem, keep the user's work, offer the
  next step ("Revisá tu conexión e intentá nuevamente. Tus datos no se
  borraron.").

## Spanish UI: Rioplatense voseo

All `es-AR` UI copy uses voseo. Code, comments and identifiers stay in English.

| Use | Avoid |
|---|---|
| Revisá, Intentá, Podés, Tenés, Explorá, Guardá, Escaneá | Revisa, Intenta, Puedes, Tienes, Explora |
| Hacé clic (web) / Tocá (app) | Haz clic, Pulsa |
| Llegaste al límite… Vas a poder… | Has llegado al límite… Podrás… |

Gesture words follow the platform: "clic" on the web, "tocá" on the app. The
same key can therefore differ between the web and the app on purpose.

## Terminology

| Concept | es-AR | en-US | Rule |
|---|---|---|---|
| Reporting content to moderation | denuncia, denunciar ("Denunciar contenido", "Mis denuncias") | report | Never "reporte" for a user report |
| Event registration | inscripción, inscribirme ("Inscribirme", "Condiciones de inscripción") | registration, register | Never "registrarse" for events: it reads as account sign-up |
| A request that waits for someone's approval | solicitud ("Enviar solicitud", "El organizador revisará tu solicitud") | request | Only when an approval step exists; a free registration with places is an "inscripción" |
| Review | reseña | review | |
| The user's cellar | Bodega ("Mi Bodega") | cellar | |
| Winery | bodega | winery | |
| Retry | Reintentar (`common.retry`) | Retry | |
| Back | Volver (`common.back`) | Back | |

## Where copy lives

- Every UI string goes through i18n in both locales:
  web [`es-AR.json`](../../../../frontend-react/src/shared/i18n/locales/es-AR.json) /
  [`en-US.json`](../../../../frontend-react/src/shared/i18n/locales/en-US.json),
  app [`es-AR.json`](../../../../frontend-mobile/src/shared/i18n/locales/es-AR.json) /
  [`en-US.json`](../../../../frontend-mobile/src/shared/i18n/locales/en-US.json).
- A key shared by the web and the app has the same meaning on both; wording
  differs only for the gesture word or for space.
- Backend messages are never shown raw: map the error code to translated copy
  (web mappers in `frontend-react/src/presentation/feedback/*ErrorMessage.ts`).
- Illustrated-state copy lives in `stateCopy` (`presentation/feedback/illustratedState.ts`)
  with both languages in one object; the web and the app each keep a copy of
  that file.

## Patterns

| Situation | Pattern | Example (es-AR) |
|---|---|---|
| Button | verb first, the object when needed | "Publicar como reseña", "Enviar denuncia" |
| Destructive confirmation | question title + consequence + explicit verb | "¿Eliminar de tu bodega?" → "Eliminar" |
| Success toast | what is done, past tense | "Vino eliminado de tu bodega." |
| Error | what failed + what to do | "No pudimos completar la inscripción. Intentá de nuevo." |
| Empty state | invitation + next action | "Explorá el catálogo y guardá los vinos que quieras tener a mano." |
| Rate limit | calm pause + when to try again | "Llegaste al límite de 10 denuncias en 24 horas. Probá de nuevo más tarde." |
| Privacy note | who sees what | "Tu precio de compra queda privado." |

Do:

- Write the Spanish and English strings in the same change.
- Use sentence case.
- Keep numbers, prices and vintages as data, not words.

Don't:

- Mix "tú" and "vos" on one screen.
- Use "reporte", "registrarse" (for events) or "solicitud" (without approval).
- Hard-code a Spanish string in a component.
