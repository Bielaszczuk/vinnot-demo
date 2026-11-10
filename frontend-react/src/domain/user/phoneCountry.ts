/** Dialing choices are presentation data; backend remains authoritative for phone validity. */
export const phoneCountries = [
  { code: "AR", dial: "54" }, { code: "UY", dial: "598" }, { code: "CL", dial: "56" },
  { code: "BR", dial: "55" }, { code: "PY", dial: "595" }, { code: "BO", dial: "591" },
  { code: "PE", dial: "51" }, { code: "CO", dial: "57" }, { code: "EC", dial: "593" },
  { code: "VE", dial: "58" }, { code: "MX", dial: "52" }, { code: "US/CA", dial: "1" },
  { code: "ES", dial: "34" }, { code: "IT", dial: "39" }, { code: "FR", dial: "33" },
  { code: "DE", dial: "49" }, { code: "PT", dial: "351" }, { code: "GB", dial: "44" },
  { code: "AU", dial: "61" }, { code: "NZ", dial: "64" }, { code: "ZA", dial: "27" },
] as const;
export type PhoneCountry = typeof phoneCountries[number]["code"] | "OTHER";
export function splitContactPhone(value: string): { country: PhoneCountry; national: string } {
  const compact = value.replace(/[ ()-]/g, "");
  if (!compact) return { country: "AR", national: "" };
  const country = phoneCountries.find(c => compact.startsWith(`+${c.dial}`));
  if (!country) return { country: "OTHER", national: value };
  let national = compact.slice(country.dial.length + 1);
  if (country.code === "AR" && national.length === 11 && national.startsWith("9")) national = national.slice(1);
  return { country: country.code, national };
}
export function joinContactPhone(country: PhoneCountry, national: string): string {
  const compact = national.replace(/[ ()-]/g, "");
  if (!compact) return "";
  const choice = phoneCountries.find(c => c.code === country);
  if (!choice) return compact;
  // Argentine mobile numbers use 9 internationally; users enter area code + mobile number.
  const mobile = country === "AR" && /^\d{10}$/.test(compact) ? `9${compact}` : compact;
  return `+${choice.dial}${mobile}`;
}
