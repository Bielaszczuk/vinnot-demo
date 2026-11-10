import { appVersionsClient } from "./appVersions.client";
import { http } from "@/infrastructure/api/http";

jest.mock("@/infrastructure/api/http", () => ({ http: { get: jest.fn() } }));

const getMock = http.get as jest.MockedFunction<typeof http.get>;

describe("appVersionsClient", () => {
  it("reads the public minimum versions and unwraps the API response", async () => {
    getMock.mockResolvedValue({ data: { data: { ios: "0.3.0", android: null }, timestamp: "2026-10-26T00:00:00Z" } });

    await expect(appVersionsClient.minimum()).resolves.toEqual({ ios: "0.3.0", android: null });
    expect(getMock).toHaveBeenCalledWith("/app-versions/minimum", { timeout: 8_000 });
  });
});
