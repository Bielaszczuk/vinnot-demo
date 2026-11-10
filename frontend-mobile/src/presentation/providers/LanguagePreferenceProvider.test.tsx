import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useUiHydrating, useUiStore } from "@/presentation/store/ui.store";
import { LanguagePreferenceProvider } from "./LanguagePreferenceProvider";

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: jest.fn(),
  useUiHydrating: jest.fn(),
}));

const useTranslationMock = useTranslation as jest.MockedFunction<typeof useTranslation>;
const useUiStoreMock = useUiStore as jest.MockedFunction<typeof useUiStore>;
const useUiHydratingMock = useUiHydrating as jest.MockedFunction<typeof useUiHydrating>;

describe("LanguagePreferenceProvider", () => {
  const changeLanguage = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useTranslationMock.mockReturnValue({
      i18n: {
        language: "es-AR",
        resolvedLanguage: "es-AR",
        changeLanguage,
      },
    } as unknown as ReturnType<typeof useTranslation>);
    useUiStoreMock.mockReturnValue("en-US");
  });

  it("waits until persisted preferences finish hydrating", () => {
    useUiHydratingMock.mockReturnValue(true);

    render(
      <LanguagePreferenceProvider>
        <Text>Vinnot</Text>
      </LanguagePreferenceProvider>,
    );

    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it("applies the persisted language after hydration", async () => {
    useUiHydratingMock.mockReturnValue(false);

    render(
      <LanguagePreferenceProvider>
        <Text>Vinnot</Text>
      </LanguagePreferenceProvider>,
    );

    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith("en-US"));
  });
});
