import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_SUSPENSION_REASON,
  MAX_SUSPENSION_NOTE_LENGTH,
  SUSPENSION_REASONS,
  isSuspensionReason,
  toSuspensionRequest,
} from "./suspensionReason";

describe("suspension reason", () => {
  it("lists the preset reasons in display order with SPAM preselected", () => {
    expect(SUSPENSION_REASONS).toEqual([
      "SPAM",
      "HARASSMENT",
      "FRAUD",
      "IMPERSONATION",
      "TERMS_VIOLATION",
      "OTHER",
    ]);
    expect(DEFAULT_SUSPENSION_REASON).toBe("SPAM");
    expect(MAX_SUSPENSION_NOTE_LENGTH).toBe(255);
  });

  it("recognises only the known codes", () => {
    expect(isSuspensionReason("FRAUD")).toBe(true);
    expect(isSuspensionReason("fraud")).toBe(false);
    expect(isSuspensionReason(undefined)).toBe(false);
    expect(isSuspensionReason(3)).toBe(false);
  });

  it("drops the detail unless the reason is OTHER", () => {
    expect(toSuspensionRequest("HARASSMENT", "  repeated insults  ")).toEqual({
      reasonCode: "HARASSMENT",
    });
  });

  it("trims the detail for OTHER and drops it when blank or missing", () => {
    expect(toSuspensionRequest("OTHER", "  Chargebacks  ")).toEqual({
      reasonCode: "OTHER",
      reason: "Chargebacks",
    });
    expect(toSuspensionRequest("OTHER", "   ")).toEqual({ reasonCode: "OTHER" });
    expect(toSuspensionRequest("OTHER")).toEqual({ reasonCode: "OTHER" });
  });

  it("caps the detail at the maximum length", () => {
    const request = toSuspensionRequest("OTHER", "x".repeat(MAX_SUSPENSION_NOTE_LENGTH + 20));
    expect(request.reason).toHaveLength(MAX_SUSPENSION_NOTE_LENGTH);
  });
});
