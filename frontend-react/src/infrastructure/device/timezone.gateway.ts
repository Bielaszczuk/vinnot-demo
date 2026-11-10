/** Browser time zone as an IANA identifier (for example "Europe/Madrid"). */
export const timezoneGateway = {
  current(): string | undefined {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
    } catch {
      return undefined
    }
  },
}
