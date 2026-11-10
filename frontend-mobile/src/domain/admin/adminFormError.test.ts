import { adminFormErrorKey } from "./adminFormError";

it("names known backend failures and falls back otherwise", () => {
  expect(adminFormErrorKey("DUPLICATE_ENTRY", "f")).toBe("forms.errors.duplicate");
  expect(adminFormErrorKey("CONCURRENT_UPDATE", "f")).toBe("forms.errors.concurrentUpdate");
  expect(adminFormErrorKey("NOT_FOUND", "f")).toBe("forms.errors.notFound");
  expect(adminFormErrorKey("FORBIDDEN", "f")).toBe("forms.errors.forbidden");
  expect(adminFormErrorKey("E1001", "f")).toBe("forms.errors.invalid");
  expect(adminFormErrorKey("INVALID_REQUEST", "f")).toBe("forms.errors.invalid");
  expect(adminFormErrorKey(undefined, "f")).toBe("f");
});
