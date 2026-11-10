import { it, expect, vi } from "vitest";
import { copySupportReference } from "./clipboard";
it("copies through the browser boundary and propagates denied permission", async () => {
 const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
 const writeText = vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
 try {
  await copySupportReference("VIN-123456789ABC");
  expect(writeText).toHaveBeenCalledWith("VIN-123456789ABC");
  writeText.mockRejectedValueOnce(new Error("denied"));
  await expect(copySupportReference("VIN-123456789ABC")).rejects.toThrow("denied");
 } finally {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else Reflect.deleteProperty(navigator, "clipboard");
 }
});
