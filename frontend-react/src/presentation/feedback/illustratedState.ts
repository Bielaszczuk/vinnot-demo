export const stateCopy = {
  es: {
    forbidden: [
      "No tenés acceso a esta sección",
      "Tu cuenta no tiene los permisos necesarios. Podés continuar explorando Vinnot.",
    ],
    notFound: [
      "No encontramos esta página",
      "El enlace puede haber cambiado o el contenido ya no está disponible.",
    ],
    server: [
      "Algo no salió como esperábamos",
      "No pudimos completar la solicitud. Podés intentarlo nuevamente.",
    ],
    unavailable: [
      "El servicio no está disponible",
      "No podemos atender esta solicitud en este momento. Intentá nuevamente más tarde.",
    ],
    rateLimit: [
      "Hagamos una pequeña pausa",
      "Recibimos demasiadas solicitudes. Esperá un momento antes de volver a intentar.",
    ],
    offline: [
      "No pudimos conectarnos",
      "Revisá tu conexión e intentá nuevamente. Tus datos no se borraron.",
    ],
    timeout: [
      "La respuesta está tardando",
      "La solicitud superó el tiempo de espera. Podés volver a consultar su estado.",
    ],
    emptyCellar: [
      "Tu cava empieza con una botella",
      "Explorá el catálogo y guardá los vinos que quieras tener a mano.",
    ],
    session: [
      "Volvé a iniciar sesión",
      "Necesitamos verificar tu sesión para continuar.",
    ],
  },
  en: {
    forbidden: [
      "This area is restricted",
      "Your account does not have the required permissions. You can keep exploring Vinnot.",
    ],
    notFound: [
      "We couldn't find this page",
      "The link may have changed or the content is no longer available.",
    ],
    server: [
      "Something didn't go as expected",
      "We couldn't complete the request. You can try again.",
    ],
    unavailable: [
      "The service is unavailable",
      "We can't handle this request right now. Please try again later.",
    ],
    rateLimit: [
      "Let's take a short pause",
      "We received too many requests. Please wait a moment before trying again.",
    ],
    offline: [
      "We couldn't connect",
      "Check your connection and try again. Your data has not been cleared.",
    ],
    timeout: [
      "The response is taking longer",
      "The request exceeded its waiting time. You can check its status again.",
    ],
    emptyCellar: [
      "Your cellar starts with one bottle",
      "Explore the catalogue and save the wines you want to keep close.",
    ],
    session: [
      "Please sign in again",
      "We need to verify your session to continue.",
    ],
  },
} as const;
export type IllustratedStateKind = keyof typeof stateCopy.es;

/** Presentation classification, independent of transport classes and frameworks. */
export function resolveIllustratedState(error: unknown): IllustratedStateKind {
  if (!error || typeof error !== "object") return "server";
  const { status, code } = error as { status?: unknown; code?: unknown };
  if (status === 401) return "session";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimit";
  if (code === "TIMEOUT" || status === 504) return "timeout";
  if (status === 502 || status === 503) return "unavailable";
  if (code === "NETWORK_ERROR") return "offline";
  return "server";
}

/** A read failed because the resource does not exist, so a retry cannot help. */
export function isNotFoundError(error: unknown): boolean {
  return resolveIllustratedState(error) === "notFound";
}
