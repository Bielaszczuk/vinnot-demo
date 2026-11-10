import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLICATION_REJECTION_REASON,
  PUBLICATION_REJECTION_REASONS,
} from "./community.types";
import {
  allowsPublicationNote,
  toPublicationDecision,
} from "./publicationDecision";

const item = { type: "COMMENT" as const, id: "c1", revision: "2026-10-20T10:00:00.123456Z" };

describe("publication decision", () => {
  it("lists the preset rejection reasons in display order with the default first", () => {
    expect(PUBLICATION_REJECTION_REASONS).toEqual([
      "OFFENSIVE",
      "SPAM",
      "OFF_TOPIC",
      "PERSONAL_DATA",
      "OTHER",
    ]);
    expect(PUBLICATION_REJECTION_REASONS[0]).toBe(DEFAULT_PUBLICATION_REJECTION_REASON);
  });

  it("only allows a note for the other reason", () => {
    expect(allowsPublicationNote("OTHER")).toBe(true);
    expect(allowsPublicationNote("SPAM")).toBe(false);
  });

  it("sends an approval with no reason code and no note", () => {
    expect(toPublicationDecision(item, "APPROVED", "OTHER", "ignored")).toEqual({
      type: "COMMENT",
      id: "c1",
      status: "APPROVED",
      expectedRevision: item.revision,
    });
  });

  it("sends a rejection with its reason code and drops a note outside other", () => {
    expect(toPublicationDecision(item, "REJECTED", "SPAM", "hidden note")).toEqual({
      type: "COMMENT",
      id: "c1",
      status: "REJECTED",
      reasonCode: "SPAM",
      expectedRevision: item.revision,
    });
  });

  it("keeps a trimmed note for other and omits a blank one", () => {
    expect(toPublicationDecision(item, "REJECTED", "OTHER", "  Duplicate post  ")).toEqual(
      expect.objectContaining({ reasonCode: "OTHER", reason: "Duplicate post" }),
    );
    expect(toPublicationDecision(item, "REJECTED", "OTHER", "   ")).not.toHaveProperty("reason");
  });
});
