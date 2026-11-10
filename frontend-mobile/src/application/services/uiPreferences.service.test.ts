import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { uiPreferencesStorage } from "@/infrastructure/storage/uiPreferences.storage";
import { uiPreferencesService, type UiPreferences } from "./uiPreferences.service";

jest.mock("@/infrastructure/storage/uiPreferences.storage", () => ({
  uiPreferencesStorage: {
    read: jest.fn(),
    write: jest.fn(),
  },
}));

const storageMock = uiPreferencesStorage as jest.Mocked<typeof uiPreferencesStorage>;
const defaults: UiPreferences = {
  colorScheme: "system",
  language: "es-AR",
  onboardingDone: false,
  searchHistoryWines: [],
};

describe("uiPreferencesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns defaults when storage is empty", async () => {
    storageMock.read.mockResolvedValue(null);

    await expect(uiPreferencesService.restore(defaults)).resolves.toEqual(defaults);
  });

  it("normalizes invalid persisted values", async () => {
    storageMock.read.mockResolvedValue(
      JSON.stringify({
        colorScheme: "sepia",
        language: "invalid",
        onboardingDone: true,
        searchHistoryWines: ["malbec", 42, "syrah"],
      }),
    );

    await expect(uiPreferencesService.restore(defaults)).resolves.toEqual({
      ...defaults,
      onboardingDone: true,
      searchHistoryWines: ["malbec", "syrah"],
    });
  });

  it("falls back to defaults when persisted JSON is malformed", async () => {
    storageMock.read.mockResolvedValue("{");

    await expect(uiPreferencesService.restore(defaults)).resolves.toEqual(defaults);
  });

  it("restores a supported persisted language", async () => {
    storageMock.read.mockResolvedValue(JSON.stringify({ ...defaults, language: "en-US" }));

    await expect(uiPreferencesService.restore(defaults)).resolves.toMatchObject({
      language: "en-US",
    });
  });

  it("serializes preferences before delegating to storage", async () => {
    storageMock.write.mockResolvedValue();

    await uiPreferencesService.persist(defaults);

    expect(storageMock.write).toHaveBeenCalledWith(JSON.stringify(defaults));
  });
});
