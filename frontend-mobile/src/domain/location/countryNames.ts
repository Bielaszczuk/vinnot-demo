/**
 * Country names for display. The catalogue stores every country with its ISO
 * code and a Spanish name, and the API only returns that Spanish name, so the
 * UI translates it here. Hermes has no `Intl.DisplayNames`, hence the table.
 */
export type CountryNameTranslations = { es: string; en: string };

/** Every seeded country by lowercase ISO 3166-1 alpha-2 code. */
export const COUNTRY_NAMES: Readonly<Record<string, CountryNameTranslations>> = {
  ad: { es: "Andorra", en: "Andorra" },
  af: { es: "Afganistán", en: "Afghanistan" },
  al: { es: "Albania", en: "Albania" },
  am: { es: "Armenia", en: "Armenia" },
  ar: { es: "Argentina", en: "Argentina" },
  at: { es: "Austria", en: "Austria" },
  au: { es: "Australia", en: "Australia" },
  aw: { es: "Aruba", en: "Aruba" },
  az: { es: "Azerbaiyán", en: "Azerbaijan" },
  ba: { es: "Bosnia y Herzegovina", en: "Bosnia and Herzegovina" },
  be: { es: "Bélgica", en: "Belgium" },
  bg: { es: "Bulgaria", en: "Bulgaria" },
  bo: { es: "Bolivia", en: "Bolivia" },
  br: { es: "Brasil", en: "Brazil" },
  bs: { es: "Bahamas", en: "Bahamas" },
  bt: { es: "Bután", en: "Bhutan" },
  by: { es: "Bielorrusia", en: "Belarus" },
  bz: { es: "Belice", en: "Belize" },
  ca: { es: "Canadá", en: "Canada" },
  ch: { es: "Suiza", en: "Switzerland" },
  cl: { es: "Chile", en: "Chile" },
  cn: { es: "China", en: "China" },
  co: { es: "Colombia", en: "Colombia" },
  cr: { es: "Costa Rica", en: "Costa Rica" },
  cu: { es: "Cuba", en: "Cuba" },
  cv: { es: "Cabo Verde", en: "Cape Verde" },
  cy: { es: "Chipre", en: "Cyprus" },
  cz: { es: "Chequia", en: "Czechia" },
  de: { es: "Alemania", en: "Germany" },
  dk: { es: "Dinamarca", en: "Denmark" },
  do: { es: "República Dominicana", en: "Dominican Republic" },
  dz: { es: "Argelia", en: "Algeria" },
  ec: { es: "Ecuador", en: "Ecuador" },
  ee: { es: "Estonia", en: "Estonia" },
  eg: { es: "Egipto", en: "Egypt" },
  es: { es: "España", en: "Spain" },
  et: { es: "Etiopía", en: "Ethiopia" },
  fi: { es: "Finlandia", en: "Finland" },
  fr: { es: "Francia", en: "France" },
  ga: { es: "Gabón", en: "Gabon" },
  gb: { es: "Reino Unido", en: "United Kingdom" },
  ge: { es: "Georgia", en: "Georgia" },
  gr: { es: "Grecia", en: "Greece" },
  hk: { es: "Hong Kong", en: "Hong Kong" },
  hr: { es: "Croacia", en: "Croatia" },
  hu: { es: "Hungría", en: "Hungary" },
  id: { es: "Indonesia", en: "Indonesia" },
  ie: { es: "Irlanda", en: "Ireland" },
  il: { es: "Israel", en: "Israel" },
  im: { es: "Isla de Man", en: "Isle of Man" },
  in: { es: "India", en: "India" },
  iq: { es: "Irak", en: "Iraq" },
  ir: { es: "Irán", en: "Iran" },
  it: { es: "Italia", en: "Italy" },
  jm: { es: "Jamaica", en: "Jamaica" },
  jo: { es: "Jordania", en: "Jordan" },
  jp: { es: "Japón", en: "Japan" },
  ke: { es: "Kenia", en: "Kenya" },
  kg: { es: "Kirguistán", en: "Kyrgyzstan" },
  kp: { es: "Corea del Norte", en: "North Korea" },
  kr: { es: "Corea del Sur", en: "South Korea" },
  kz: { es: "Kazajistán", en: "Kazakhstan" },
  lb: { es: "Líbano", en: "Lebanon" },
  li: { es: "Liechtenstein", en: "Liechtenstein" },
  lk: { es: "Sri Lanka", en: "Sri Lanka" },
  ls: { es: "Lesoto", en: "Lesotho" },
  lt: { es: "Lituania", en: "Lithuania" },
  lu: { es: "Luxemburgo", en: "Luxembourg" },
  lv: { es: "Letonia", en: "Latvia" },
  ma: { es: "Marruecos", en: "Morocco" },
  md: { es: "Moldavia", en: "Moldova" },
  me: { es: "Montenegro", en: "Montenegro" },
  mg: { es: "Madagascar", en: "Madagascar" },
  mk: { es: "Macedonia del Norte", en: "North Macedonia" },
  mm: { es: "Myanmar", en: "Myanmar" },
  mt: { es: "Malta", en: "Malta" },
  mu: { es: "Mauricio", en: "Mauritius" },
  mx: { es: "México", en: "Mexico" },
  na: { es: "Namibia", en: "Namibia" },
  nf: { es: "Isla Norfolk", en: "Norfolk Island" },
  nl: { es: "Países Bajos", en: "Netherlands" },
  no: { es: "Noruega", en: "Norway" },
  np: { es: "Nepal", en: "Nepal" },
  nz: { es: "Nueva Zelanda", en: "New Zealand" },
  pa: { es: "Panamá", en: "Panama" },
  pe: { es: "Perú", en: "Peru" },
  pf: { es: "Polinesia Francesa", en: "French Polynesia" },
  pg: { es: "Papúa Nueva Guinea", en: "Papua New Guinea" },
  ph: { es: "Filipinas", en: "Philippines" },
  pl: { es: "Polonia", en: "Poland" },
  ps: { es: "Palestina", en: "Palestine" },
  pt: { es: "Portugal", en: "Portugal" },
  py: { es: "Paraguay", en: "Paraguay" },
  ro: { es: "Rumania", en: "Romania" },
  rs: { es: "Serbia", en: "Serbia" },
  ru: { es: "Rusia", en: "Russia" },
  se: { es: "Suecia", en: "Sweden" },
  si: { es: "Eslovenia", en: "Slovenia" },
  sk: { es: "Eslovaquia", en: "Slovakia" },
  sm: { es: "San Marino", en: "San Marino" },
  sn: { es: "Senegal", en: "Senegal" },
  sy: { es: "Siria", en: "Syria" },
  th: { es: "Tailandia", en: "Thailand" },
  tn: { es: "Túnez", en: "Tunisia" },
  tr: { es: "Turquía", en: "Turkey" },
  tw: { es: "Taiwán", en: "Taiwan" },
  tz: { es: "Tanzania", en: "Tanzania" },
  ua: { es: "Ucrania", en: "Ukraine" },
  us: { es: "Estados Unidos", en: "United States" },
  uy: { es: "Uruguay", en: "Uruguay" },
  uz: { es: "Uzbekistán", en: "Uzbekistan" },
  ve: { es: "Venezuela", en: "Venezuela" },
  vi: { es: "Islas Vírgenes de EE. UU.", en: "U.S. Virgin Islands" },
  vn: { es: "Vietnam", en: "Vietnam" },
  xk: { es: "Kosovo", en: "Kosovo" },
  za: { es: "Sudáfrica", en: "South Africa" },
};

function normalizeCountryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Lookup by normalized ISO code, Spanish name and English name. */
const COUNTRY_INDEX: ReadonlyMap<string, CountryNameTranslations> = new Map(
  Object.entries(COUNTRY_NAMES).flatMap(([code, names]) => [
    [code, names],
    [normalizeCountryKey(names.es), names],
    [normalizeCountryKey(names.en), names],
  ]),
);

/**
 * Shows a stored country name in the UI language. The match ignores case and
 * accents and also accepts the ISO code; an unknown name is returned unchanged.
 */
export function localizeCountryName(
  storedName: string | null | undefined,
  language?: string | null,
): string {
  if (!storedName) return "";
  const names = COUNTRY_INDEX.get(normalizeCountryKey(storedName));
  if (!names) return storedName;
  return language?.toLowerCase().startsWith("en") ? names.en : names.es;
}
