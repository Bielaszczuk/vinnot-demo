import type { TFunction } from "i18next";

/** Only the namespaces the domain uses for message keys are ever translated. */
const MESSAGE_KEY = /^(?:validation|authErrors|authMessages)\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$/;

/**
 * Translates a domain/application message key for the active locale. Any other
 * text (for example a server-provided message) is returned unchanged.
 */
export function localizeMessage(
  t: TFunction | ((key: string, options?: { defaultValue?: string }) => string),
  message: string | null | undefined,
): string | undefined {
  if (!message) return undefined;
  if (!MESSAGE_KEY.test(message)) return message;
  return (t as (key: string, options?: { defaultValue?: string }) => string)(message, {
    defaultValue: message,
  });
}
