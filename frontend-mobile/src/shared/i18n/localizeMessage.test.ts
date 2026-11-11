import { describe, expect, it } from "@jest/globals";
import i18next, { type TFunction } from "i18next";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";
import {
  USER_VALIDATION_MESSAGES,
  loginUserSchema,
  registerUserSchema,
} from "@/domain/user/user.validators";
import { errorMessageKey, localizeMessage } from "./localizeMessage";

async function translator(lng: "es-AR" | "en-US"): Promise<TFunction> {
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    fallbackLng: false,
    resources: { "es-AR": { translation: esAR }, "en-US": { translation: enUS } },
    interpolation: { escapeValue: false },
  });
  return instance.t;
}

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("localizeMessage", () => {
  it("translates auth confirmations in both languages", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(localizeMessage(es, "authMessages.emailVerified")).toBe("Tu email quedó verificado.");
    expect(localizeMessage(en, "authMessages.emailVerified")).toBe("Your email is verified.");
    expect(localizeMessage(es, "authMessages.passwordReset")).toBe("Tu contraseña se actualizó.");
    expect(localizeMessage(en, "authMessages.passwordReset")).toBe("Your password has been updated.");
    expect(localizeMessage(es, "authMessages.passwordResetLinkSent")).toBe(
      "Si hay una cuenta con ese email, te enviamos un enlace para restablecer la contraseña.",
    );
    expect(localizeMessage(en, "authMessages.passwordResetLinkSent")).toBe(
      "If an account exists with that email, we sent a link to reset the password.",
    );
    expect(localizeMessage(es, "authMessages.verificationEmailSent")).toBe(
      "Si la verificación está pendiente, te enviamos un nuevo email.",
    );
    expect(localizeMessage(en, "authMessages.verificationEmailSent")).toBe(
      "If verification is pending, we sent you a new email.",
    );
  });

  it("renders domain validation messages in English for en-US users", async () => {
    const t = await translator("en-US");
    const login = loginUserSchema.safeParse({ email: "", password: "secret" });
    expect(localizeMessage(t, firstIssue(login))).toBe("Enter your email or username");
    const register = registerUserSchema.safeParse({
      username: "vinnot_user",
      email: "user@example.com",
      password: "StrongPass1",
      confirmPassword: "OtherPass1",
      firstName: "Vino",
      lastName: "Tester",
    });
    expect(localizeMessage(t, firstIssue(register))).toBe("Passwords do not match");
  });

  it("keeps the Spanish copy for es-AR users", async () => {
    const t = await translator("es-AR");
    const login = loginUserSchema.safeParse({ email: "", password: "secret" });
    expect(localizeMessage(t, firstIssue(login))).toBe("Ingresá tu email o usuario");
    expect(localizeMessage(t, AUTH_ERROR_MESSAGES.sessionExpired)).toBe(
      "Tu sesión expiró. Iniciá sesión nuevamente.",
    );
  });

  it("translates authentication error keys and passes server text through", async () => {
    const t = await translator("en-US");
    expect(localizeMessage(t, AUTH_ERROR_MESSAGES.offline)).toBe(
      "No connection. Check your internet.",
    );
    expect(localizeMessage(t, "El email ya está registrado")).toBe("El email ya está registrado");
    expect(localizeMessage(t, "common.cancel")).toBe("common.cancel");
    expect(localizeMessage(t, null)).toBeUndefined();
    expect(localizeMessage(t, "")).toBeUndefined();
  });

  it.each(["es-AR", "en-US"] as const)("defines every domain message in %s", async (lng) => {
    const t = await translator(lng);
    for (const key of [
      ...Object.values(USER_VALIDATION_MESSAGES),
      ...Object.values(AUTH_ERROR_MESSAGES),
    ]) {
      expect(localizeMessage(t, key)).not.toBe(key);
    }
  });
});

describe("errorMessageKey", () => {
  it("keeps an error message that is a translation key", () => {
    expect(errorMessageKey(new Error("authErrors.offline"), "common.error")).toBe("authErrors.offline");
    expect(errorMessageKey({ message: "authErrors.timeout" }, "common.error")).toBe("authErrors.timeout");
  });

  it("never returns raw server or platform text", () => {
    expect(errorMessageKey({ message: "A user with this email already exists" }, "common.error")).toBe("common.error");
    expect(errorMessageKey(new Error("Sin conexión a internet"), "auth.loginError")).toBe("auth.loginError");
    expect(errorMessageKey("authErrors.offline", "common.error")).toBe("common.error");
    expect(errorMessageKey(null, "common.error")).toBe("common.error");
  });

  it("translates the offline and timeout keys the transport layer returns", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(localizeMessage(en, "authErrors.timeout")).toBe("The request took too long. Please try again.");
    expect(localizeMessage(es, "authErrors.offline")).toBe("Sin conexión. Verificá tu internet.");
  });
});
