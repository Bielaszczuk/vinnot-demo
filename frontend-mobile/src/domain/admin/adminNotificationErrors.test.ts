import { describe, expect, it } from "@jest/globals";
import { ADMIN_NOTIFICATION_ERROR_CODES, toAdminNotificationErrorCode } from "./adminNotificationErrors";

describe("admin notification error codes", () => {
  it("knows every refusal the notification endpoints send", () => {
    expect(ADMIN_NOTIFICATION_ERROR_CODES).toEqual(expect.arrayContaining([
      "ANNOUNCEMENT_AUDIENCE_EMPTY",
      "ANNOUNCEMENT_TEST_UNREACHABLE",
      "INVALID_ANNOUNCEMENT_LINK",
      "ANNOUNCEMENT_CHANNEL_REQUIRED",
      "ANNOUNCEMENT_CONTENT_REQUIRED",
      "ANNOUNCEMENT_BODY_REQUIRED",
      "ANNOUNCEMENT_BODY_TOO_LONG",
      "INVALID_ANNOUNCEMENT_TITLE",
      "INVALID_ANNOUNCEMENT_AUDIENCE",
      "INVALID_ANNOUNCEMENT_KIND",
      "ANNOUNCEMENT_REQUEST_CONFLICT",
      "INVALID_METRICS_WINDOW",
      "NOT_A_PUSH_TYPE",
      "ADMIN_NOT_FOUND",
    ]));
  });

  it("returns a known code and null for anything else", () => {
    expect(toAdminNotificationErrorCode("ANNOUNCEMENT_TEST_UNREACHABLE")).toBe("ANNOUNCEMENT_TEST_UNREACHABLE");
    expect(toAdminNotificationErrorCode("SOMETHING_ELSE")).toBeNull();
    expect(toAdminNotificationErrorCode(undefined)).toBeNull();
  });
});
