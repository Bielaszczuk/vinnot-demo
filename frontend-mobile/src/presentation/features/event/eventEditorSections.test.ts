import { eventEditorSection } from "./eventEditorSections";
it.each([
  ["title", "basic"],
  ["imageUrl", "basic"],
  ["locationName", "location"],
  ["latitude", "location"],
  ["longitude", "location"],
  ["contactEmail", "contact"],
  ["websiteUrl", "contact"],
  ["price", "registration"],
])("places %s errors in the %s section", (field, section) =>
  expect(eventEditorSection(field)).toBe(section),
);
