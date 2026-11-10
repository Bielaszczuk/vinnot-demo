import { coverImagesClient } from "./coverImages.client";
import { http } from "@/infrastructure/api/http";
jest.mock("@/infrastructure/api/http", () => ({ http: { post: jest.fn(), get: jest.fn(), defaults: { baseURL: "http://localhost:8080/api" } } }));
const path = "/api/uploads/covers/00000000-0000-4000-8000-000000000001.webp";
beforeEach(() => jest.clearAllMocks());
it("private preview goes only to Vinnot API hosts or the configured API host", async () => {
  const signal = new AbortController().signal;
  jest.mocked(http.get).mockResolvedValue({ data: new Uint8Array([1, 2]).buffer });
  expect(await coverImagesClient.preview("https://api-dev.vinnot.com" + path, signal)).toBe("data:image/webp;base64,AQI=");
  await coverImagesClient.preview("http://localhost:8080" + path, signal);
  expect(http.get).toHaveBeenCalledWith(path.slice(4), { signal, responseType: "arraybuffer" });
  await expect(coverImagesClient.preview("https://evil.example" + path, signal)).rejects.toThrow("INVALID_COVER_REFERENCE");
  await expect(coverImagesClient.preview("http://localhost:9999" + path, signal)).rejects.toThrow("INVALID_COVER_REFERENCE");
  expect(http.get).toHaveBeenCalledTimes(2);
});
