import { describe, expect, it } from "@jest/globals";
import {
  changePasswordSchema,
  completeSocialOnboardingSchema,
  loginUserSchema,
  registerUserSchema,
  resetPasswordSchema,
  updateUserProfileSchema,
  usernameSchema,
} from "./user.validators";

describe("user.validators", () => {
  it("accepts a valid register payload", () => {
    const parsed = registerUserSchema.parse({
      username: "vinnot_user",
      email: "user@example.com",
      password: "StrongPass1",
      confirmPassword: "StrongPass1",
      firstName: "Vino",
      lastName: "Tester",
    });

    expect(parsed.username).toBe("vinnot_user");
  });

  it("rejects register payload when passwords do not match", () => {
    const result = registerUserSchema.safeParse({
      username: "vinnot_user",
      email: "user@example.com",
      password: "StrongPass1",
      confirmPassword: "OtherPass1",
      firstName: "Vino",
      lastName: "Tester",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty login fields", () => {
    const result = loginUserSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
  });

  it("normalizes the shared username contract", () => {
    expect(usernameSchema.parse("  Copa.Andina_7  ")).toBe("copa.andina_7");
  });

  it.each(["-vinnot", "vinnot-", "vi", "vino con espacios"])(
    "rejects invalid username %s",
    (username) => {
      expect(
        completeSocialOnboardingSchema.safeParse({ username }).success,
      ).toBe(false);
    },
  );

  it("keeps first and last name as independent profile fields", () => {
    const result = updateUserProfileSchema.parse({
      username: "copa.andina",
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
    });

    expect(result).toMatchObject({
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
    });
  });

  it("rejects a profile without a first name", () => {
    expect(updateUserProfileSchema.safeParse({
      username: "copa.andina",
      firstName: "",
      lastName: "Bielaszczuk",
    }).success).toBe(false);
  });

  it("rejects mismatched reset and change-password confirmations", () => {
    expect(resetPasswordSchema.safeParse({
      password: "Password1", confirmPassword: "Password2",
    }).success).toBe(false);
    expect(changePasswordSchema.safeParse({
      currentPassword: "OldPassword1",
      newPassword: "Password1",
      confirmNewPassword: "Password2",
    }).success).toBe(false);
  });
});
