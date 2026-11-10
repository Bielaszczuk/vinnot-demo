import { describe, expect, it, jest } from "@jest/globals";
import { grapeTypesService } from "./grapeTypes.service";
import { grapeTypesClient } from "@/infrastructure/api/clients/grapeTypes.client";

jest.mock("@/infrastructure/api/clients/grapeTypes.client", () => ({
  grapeTypesClient: { getGrapeTypes: jest.fn() },
}));

const client = grapeTypesClient as jest.Mocked<typeof grapeTypesClient>;

describe("grapeTypes.service", () => {
  it("maps only the domain grape identity", async () => {
    client.getGrapeTypes.mockResolvedValue([
      { id: "malbec", name: "Malbec", unused: "transport" },
    ] as never);

    await expect(grapeTypesService.getGrapeTypes()).resolves.toEqual([
      { id: "malbec", name: "Malbec" },
    ]);
  });
});
