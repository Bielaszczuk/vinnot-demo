import { referenceClient } from "./reference.client";
import { http } from "@/infrastructure/api/http";

jest.mock("@/infrastructure/api/http", () => ({ http: { get: jest.fn() } }));

const getMock = http.get as jest.MockedFunction<typeof http.get>;

describe("referenceClient", () => {
  it("reads wine types from the reference catalog", async () => {
    getMock.mockResolvedValue({ data: [{ code: "ORANGE", nameEs: "Naranja", nameEn: "Orange" }] });

    await expect(referenceClient.getWineTypes()).resolves.toEqual([
      { code: "ORANGE", nameEs: "Naranja", nameEn: "Orange" },
    ]);
    expect(getMock).toHaveBeenCalledWith("/reference/wine-types");
  });
});
