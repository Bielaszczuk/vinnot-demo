import * as Clipboard from "expo-clipboard";
import { copySupportReference } from "./clipboard";
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
it("reports success only when the native clipboard confirms the write", async () => {
  jest
    .mocked(Clipboard.setStringAsync)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce(new Error("native unavailable"));
  await expect(copySupportReference("VIN-123456789ABC")).resolves.toBeUndefined();
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith("VIN-123456789ABC");
  await expect(copySupportReference("VIN-123456789ABC")).rejects.toThrow("CLIPBOARD_UNAVAILABLE");
  await expect(copySupportReference("VIN-123456789ABC")).rejects.toThrow("native unavailable");
});
