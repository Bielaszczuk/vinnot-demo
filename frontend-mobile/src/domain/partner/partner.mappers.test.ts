import { describe, expect, it } from "@jest/globals";
import { mapPartnerEventFromRaw, normalizePaginatedPartner } from "./partner.mappers";

describe("partner.mappers", () => {
  it("applies safe event defaults to malformed transport input", () => {
    expect(mapPartnerEventFromRaw(null)).toMatchObject({
      id: "",
      title: "",
      type: "OTHER",
      status: "DRAFT",
      currency: "ARS",
      approvalMode: "MANUAL",
      attendeeConfirmationRequired: true,
      registrationHoldMinutes: 60,
    });
  });

  it("preserves explicit automatic and no-confirmation settings", () => {
    const event = mapPartnerEventFromRaw({
      id: "event-1",
      currentAttendees: "3",
      approvalMode: "AUTOMATIC",
      attendeeConfirmationRequired: false,
    });

    expect(event.currentAttendees).toBe(3);
    expect(event.approvalMode).toBe("AUTOMATIC");
    expect(event.attendeeConfirmationRequired).toBe(false);
  });

  it("normalizes wrapped and legacy pagination contracts", () => {
    const result = normalizePaginatedPartner(
      { data: { content: [{ id: "event-1" }], totalElements: "4" } },
      (item) => String(item.id),
    );

    expect(result).toEqual({ items: ["event-1"], totalItems: 4 });
  });
});
