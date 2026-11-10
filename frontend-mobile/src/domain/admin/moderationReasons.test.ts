import {
  MAX_ORGANIZER_NOTE_LENGTH,
  MAX_REPORT_DECISION_LENGTH,
  MAX_SUBMISSION_REASON_LENGTH,
  REGISTRATION_REVIEW_REASONS,
  REPORT_OUTCOME_REASONS,
  SUBMISSION_DECISION_REASONS,
  defaultRegistrationReason,
  registrationReasonsFor,
  resolveReasonText,
} from "./moderationReasons";

const label = (code: string) => `label:${code}`;

describe("preset moderation reasons", () => {
  it("offers presets for every submission decision and always ends with Other", () => {
    for (const reasons of Object.values(SUBMISSION_DECISION_REASONS)) {
      expect(reasons.length).toBeGreaterThan(1);
      expect(reasons.at(-1)).toBe("OTHER");
    }
    expect(Object.keys(SUBMISSION_DECISION_REASONS).sort()).toEqual(
      ["APPROVE_NEW", "MERGE_EXISTING", "REJECT", "REQUEST_CORRECTIONS"],
    );
  });

  it("offers presets for every report outcome and ends with Other", () => {
    expect(Object.keys(REPORT_OUTCOME_REASONS).sort()).toEqual(["DISMISSED", "REMOVE", "RESOLVED"]);
    for (const reasons of Object.values(REPORT_OUTCOME_REASONS)) expect(reasons.at(-1)).toBe("OTHER");
  });

  it("starts registration rejections and waitlists without a note and offers presets only for them", () => {
    expect(registrationReasonsFor("REJECT")).toBe(REGISTRATION_REVIEW_REASONS.REJECT);
    expect(registrationReasonsFor("WAITLIST")).toBe(REGISTRATION_REVIEW_REASONS.WAITLIST);
    expect(registrationReasonsFor("APPROVE")).toBeNull();
    expect(registrationReasonsFor("APPROVE_PAYMENT")).toBeNull();
    expect(defaultRegistrationReason).toBe("NONE");
    expect(REGISTRATION_REVIEW_REASONS.REJECT[0]).toBe("NONE");
    expect(REGISTRATION_REVIEW_REASONS.WAITLIST.at(-1)).toBe("OTHER");
  });

  it("follows the backend limits", () => {
    expect(MAX_SUBMISSION_REASON_LENGTH).toBe(500);
    expect(MAX_REPORT_DECISION_LENGTH).toBe(2000);
    expect(MAX_ORGANIZER_NOTE_LENGTH).toBe(1000);
  });
});

describe("resolveReasonText", () => {
  it("sends the translated preset and ignores a hidden note", () => {
    expect(resolveReasonText("NOT_A_WINE", "hidden", label, 500)).toBe("label:NOT_A_WINE");
  });
  it("sends the trimmed note under Other, cut to the limit", () => {
    expect(resolveReasonText("OTHER", "  Foto de otra etiqueta  ", label, 500)).toBe("Foto de otra etiqueta");
    expect(resolveReasonText("OTHER", "x".repeat(600), label, 500)).toHaveLength(500);
  });
  it("sends nothing for Other without a note or for No note", () => {
    expect(resolveReasonText("OTHER", "   ", label, 500)).toBe("");
    expect(resolveReasonText("NONE", "ignored", label, 500)).toBe("");
  });
});
