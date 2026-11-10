import { describe, expect, it, jest } from "@jest/globals";
import { referenceService } from "./reference.service";
import { referenceClient } from "@/infrastructure/api/clients/reference.client";

jest.mock("@/infrastructure/api/clients/reference.client", () => ({
  referenceClient: { getWineTypes: jest.fn() },
}));

const client = referenceClient as jest.Mocked<typeof referenceClient>;

describe("reference.service", () => {
  it("reads the active wine types, orange included, in server order", async () => {
    client.getWineTypes.mockResolvedValue([
      { code: "RED", nameEs: "Tinto", nameEn: "Red" },
      { code: "ORANGE", nameEs: "Naranja", nameEn: "Orange" },
      { code: "WHITE", nameEs: "Blanco", nameEn: "White" },
    ]);

    await expect(referenceService.getWineTypes()).resolves.toEqual([
      { value: "red", nameEs: "Tinto", nameEn: "Red" },
      { value: "orange", nameEs: "Naranja", nameEn: "Orange" },
      { value: "white", nameEs: "Blanco", nameEn: "White" },
    ]);
  });

  it("leaves out a type the app does not know yet", async () => {
    client.getWineTypes.mockResolvedValue([
      { code: "AMBER", nameEs: "Ámbar", nameEn: "Amber" },
      { code: "ROSE", nameEs: "Rosado", nameEn: "Rosé" },
    ]);

    await expect(referenceService.getWineTypes()).resolves.toEqual([
      { value: "rose", nameEs: "Rosado", nameEn: "Rosé" },
    ]);
  });
});
