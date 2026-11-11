/**
 * User domain validators — Zod schemas for forms.
 * @contract: keep in sync with frontend-react/src/domain/user/user.validators.ts
 */
import { z } from "zod";

/**
 * Validation messages are translation keys, never display text: the domain stays
 * language-free and presentation translates them for the active locale.
 */
export const USER_VALIDATION_MESSAGES = {
  usernameRequired: "validation.user.usernameRequired",
  usernameMin: "validation.user.usernameMin",
  usernameMax: "validation.user.usernameMax",
  usernameFormat: "validation.user.usernameFormat",
  emailRequired: "validation.user.emailRequired",
  emailInvalid: "validation.user.emailInvalid",
  loginIdentifierRequired: "validation.user.loginIdentifierRequired",
  passwordRequired: "validation.user.passwordRequired",
  currentPasswordRequired: "validation.user.currentPasswordRequired",
  passwordMin: "validation.user.passwordMin",
  passwordUppercase: "validation.user.passwordUppercase",
  passwordLowercase: "validation.user.passwordLowercase",
  passwordNumber: "validation.user.passwordNumber",
  passwordsMismatch: "validation.user.passwordsMismatch",
  firstNameRequired: "validation.user.firstNameRequired",
  lastNameRequired: "validation.user.lastNameRequired",
  nameMax: "validation.user.nameMax",
  phoneMax: "validation.user.phoneMax",
  bioMax: "validation.user.bioMax",
  avatarUrlInvalid: "validation.user.avatarUrlInvalid",
} as const;

const m = USER_VALIDATION_MESSAGES;

const strongPassword = z
  .string()
  .min(8, m.passwordMin)
  .regex(/[A-Z]/, m.passwordUppercase)
  .regex(/[a-z]/, m.passwordLowercase)
  .regex(/[0-9]/, m.passwordNumber);

export const userRoleSchema = z.enum([
  "ROLE_ADMIN",
  "ROLE_MODERATOR",
  "ROLE_PARTNER",
  "ROLE_USER",
]);

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, m.usernameMin)
  .max(40, m.usernameMax)
  .regex(USERNAME_PATTERN, m.usernameFormat);

/**
 * Registration form schema.
 * Mirrors backend RegisterRequest validation rules.
 */
export const registerUserSchema = z
  .object({
    username: usernameSchema,
    email: z.string().email(m.emailInvalid),
    password: strongPassword,
    confirmPassword: z.string(),
    firstName: z.string().min(1, m.firstNameRequired).max(100, m.nameMax),
    lastName: z.string().min(1, m.lastNameRequired).max(100, m.nameMax),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m.passwordsMismatch,
    path: ["confirmPassword"],
  });

/**
 * Login form schema. The visible field is `email` to match the web UX,
 * but the service translates it to `usernameOrEmail` for the backend.
 */
export const loginUserSchema = z.object({
  email: z.string().min(1, m.loginIdentifierRequired),
  password: z.string().min(1, m.passwordRequired),
});

export const emailActionSchema = z.object({
  email: z.string().email(m.emailInvalid),
});

export const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m.passwordsMismatch,
    path: ["confirmPassword"],
  });

export const updateUserProfileSchema = z.object({
  phoneNumber: z.string().max(50, m.phoneMax).optional(),
  username: usernameSchema.optional(),
  firstName: z.string().trim().min(1, m.firstNameRequired).max(100, m.nameMax),
  lastName: z.string().trim().max(100, m.nameMax).optional(),
  avatarUrl: z.string().url(m.avatarUrlInvalid).nullable().optional(),
  /** Public bio; the backend keeps at most 160 characters. */
  bio: z.string().max(160, m.bioMax).optional(),
  cellarVisibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).optional(),
});

export const completeSocialOnboardingSchema = z.object({
  username: usernameSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, m.currentPasswordRequired),
    newPassword: strongPassword,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: m.passwordsMismatch,
    path: ["confirmNewPassword"],
  });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type EmailActionInput = z.infer<typeof emailActionSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CompleteSocialOnboardingInput = z.infer<
  typeof completeSocialOnboardingSchema
>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
