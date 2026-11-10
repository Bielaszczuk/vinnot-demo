import content from "./generated-content.json";

export type PublicLocale = "es" | "en";
export type PublicPage = (typeof content.pages)[number];
export function publicLocale(language: string): PublicLocale {
  return language.toLowerCase().startsWith("en") ? "en" : "es";
}
export function findPublicPage(slug: string): PublicPage | undefined {
  return content.pages.find((page) => page.slug === slug);
}
export function searchPublicSections(
  page: PublicPage,
  query: string,
  locale: PublicLocale,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const needle = normalize(query.trim());
  return page.sections.filter((section) =>
    normalize(section.title[locale] + " " + section.body[locale]).includes(
      needle,
    ),
  );
}
export const publicPages = content.pages;
export const publicContentVersion = content.version;
export const publicContact = content.contact;

export function publicPagePath(slug: string): string {
  return [
    "terms",
    "privacy",
    "cookies",
    "content-policy",
    "about",
    "help",
  ].includes(slug)
    ? "/" + slug
    : "/legal/" + slug;
}
