import { describe, expect, it } from "@jest/globals";
import {
  MAX_ANNOUNCEMENT_BODY_LENGTH,
  MAX_ANNOUNCEMENT_TITLE_LENGTH,
  draftErrors,
  emptyAnnouncementDraft,
  isVersionWritten,
  versionErrors,
  writtenLanguages,
  type AnnouncementDraft,
} from "./announcement";

function draftWith(patch: Partial<AnnouncementDraft>): AnnouncementDraft {
  return { ...emptyAnnouncementDraft(), ...patch };
}

describe("announcement draft rules", () => {
  it("starts as news to every channel, segment and language, opening the app home", () => {
    expect(emptyAnnouncementDraft()).toEqual({
      kind: "NEWS",
      versions: { es: { title: "", body: "" }, en: { title: "", body: "" } },
      audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
      destination: "HOME",
    });
  });

  it("counts a version as written once its title or body has text", () => {
    expect(isVersionWritten({ title: "  ", body: "\n" })).toBe(false);
    expect(isVersionWritten({ title: "Harvest", body: "" })).toBe(true);
    expect(isVersionWritten({ title: "", body: "Body" })).toBe(true);
  });

  it("lists only the written languages, in es then en order", () => {
    const draft = draftWith({
      versions: { es: { title: "", body: "" }, en: { title: "Hi", body: "" } },
    });
    expect(writtenLanguages(draft)).toEqual(["en"]);
    expect(writtenLanguages(draftWith({
      versions: { es: { title: "Hola", body: "" }, en: { title: "Hi", body: "" } },
    }))).toEqual(["es", "en"]);
  });

  it("requires a title and a body", () => {
    expect(versionErrors({ title: " ", body: " " })).toEqual(["TITLE_REQUIRED", "BODY_REQUIRED"]);
  });

  it("limits the title to one line of 120 characters", () => {
    expect(versionErrors({ title: "a".repeat(MAX_ANNOUNCEMENT_TITLE_LENGTH), body: "b" })).toEqual([]);
    expect(versionErrors({ title: "a".repeat(MAX_ANNOUNCEMENT_TITLE_LENGTH + 1), body: "b" })).toEqual([
      "TITLE_TOO_LONG",
    ]);
    expect(versionErrors({ title: "two\nlines", body: "b" })).toEqual(["TITLE_TOO_LONG"]);
  });

  it("limits the body to 5000 characters", () => {
    expect(MAX_ANNOUNCEMENT_BODY_LENGTH).toBe(5000);
    expect(versionErrors({ title: "t", body: "b".repeat(5000) })).toEqual([]);
    expect(versionErrors({ title: "t", body: "b".repeat(5001) })).toEqual(["BODY_TOO_LONG"]);
  });

  it("blocks a draft without a channel or without any written language", () => {
    const draft = draftWith({
      audience: { ...emptyAnnouncementDraft().audience, email: false, push: false },
    });
    expect(draftErrors(draft)).toEqual(["CHANNEL_REQUIRED", "CONTENT_REQUIRED"]);
  });

  it("checks every written language and reports each problem once", () => {
    const draft = draftWith({
      versions: { es: { title: "Hola", body: "" }, en: { title: "Hi", body: "" } },
    });
    expect(draftErrors(draft)).toEqual(["BODY_REQUIRED"]);
  });

  it("lets a complete draft go with one channel and one language", () => {
    const draft = draftWith({
      versions: { es: { title: "Hola", body: "Cuerpo" }, en: { title: "", body: "" } },
      audience: { ...emptyAnnouncementDraft().audience, email: false },
    });
    expect(draftErrors(draft)).toEqual([]);
  });
});
