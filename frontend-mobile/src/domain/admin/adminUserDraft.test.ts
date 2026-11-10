import {
  ADMIN_USER_NAME_MAX_LENGTH,
  toAdminUserDraft,
  toAdminUserUpdate,
  validateAdminUserDraft,
} from "./adminUserDraft";

const user = { firstName: "Ana", lastName: "Pérez" };

it("starts from the stored names", () => {
  expect(toAdminUserDraft(user)).toEqual({ firstName: "Ana", lastName: "Pérez" });
  expect(toAdminUserDraft({ firstName: null, lastName: undefined })).toEqual({ firstName: "", lastName: "" });
});

it("rejects names longer than the backend column", () => {
  expect(ADMIN_USER_NAME_MAX_LENGTH).toBe(100);
  expect(validateAdminUserDraft({ firstName: "a".repeat(101), lastName: "b" })).toEqual([
    { field: "firstName", code: "tooLong" },
  ]);
  expect(validateAdminUserDraft({ firstName: "Ana", lastName: "b".repeat(101) })).toEqual([
    { field: "lastName", code: "tooLong" },
  ]);
  expect(validateAdminUserDraft(toAdminUserDraft(user))).toEqual([]);
});

it("sends nothing when unchanged and both names together otherwise, so PATCH keeps the rest", () => {
  expect(toAdminUserUpdate(user, toAdminUserDraft(user))).toEqual({});
  expect(toAdminUserUpdate(user, { firstName: " Ana María ", lastName: "Pérez" })).toEqual({
    firstName: "Ana María",
    lastName: "Pérez",
  });
  expect(toAdminUserUpdate({ firstName: null, lastName: null }, { firstName: "Luz", lastName: "" })).toEqual({
    firstName: "Luz",
    lastName: "",
  });
});
