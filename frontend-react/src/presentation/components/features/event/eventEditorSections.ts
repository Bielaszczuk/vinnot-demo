export type EventEditorSection = "basic" | "location" | "contact" | "registration";
export function eventEditorSection(field: string): EventEditorSection {
  if (["title", "description", "type", "status", "startDate", "endDate", "imageUrl"].includes(field)) return "basic";
  if (field.startsWith("location") || ["latitude", "longitude"].includes(field)) return "location";
  if (["contactEmail", "contactPhone", "websiteUrl"].includes(field)) return "contact";
  return "registration";
}
