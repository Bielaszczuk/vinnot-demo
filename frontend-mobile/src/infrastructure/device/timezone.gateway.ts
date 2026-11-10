import * as Localization from "expo-localization";

/** Device time zone as an IANA identifier (for example "Europe/Madrid"). */
export const timezoneGateway = {
  current(): string | undefined {
    try {
      return (
        Localization.getCalendars()[0]?.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        undefined
      );
    } catch {
      return undefined;
    }
  },
};
