import { getMutationErrorCode, getMutationErrorMessage } from "./mutationAdapter";

jest.mock("@/presentation/store/api", () => ({ useExecuteMutationMutation: jest.fn() }));

describe("getMutationErrorMessage", () => {
  it("keeps a translation key carried by the error", () => {
    expect(getMutationErrorMessage({ message: "authErrors.offline", code: "NETWORK_ERROR" }, "common.error"))
      .toBe("authErrors.offline");
  });

  it("uses the fallback instead of a raw server message", () => {
    expect(getMutationErrorMessage({ message: "Email delivery failed", status: 502 }, "profile.toastEmailChangeError"))
      .toBe("profile.toastEmailChangeError");
    expect(getMutationErrorMessage(new Error("Unexpected error"), "common.error")).toBe("common.error");
    expect(getMutationErrorMessage(undefined, "common.error")).toBe("common.error");
  });

  it("still reads the error code", () => {
    expect(getMutationErrorCode({ code: "EMAIL_ALREADY_EXISTS" })).toBe("EMAIL_ALREADY_EXISTS");
    expect(getMutationErrorCode({ code: 42 })).toBeUndefined();
  });
});
