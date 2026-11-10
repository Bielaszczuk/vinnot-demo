let currentLocale = "es";

export function setWineMapperLocale(locale: string): void {
  currentLocale = locale;
}

export function pickDescription(descEs?: string | null, descEn?: string | null): string {
  if (currentLocale.startsWith("en")) {
    return descEn || descEs || "";
  }
  return descEs || descEn || "";
}
