import { act, renderHook } from "@testing-library/react-native";
import { useUiStore } from "@/presentation/store/ui.store";
import { useLanguagePreference } from "./useLanguagePreference";

jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: jest.fn(),
}));

const useUiStoreMock = useUiStore as jest.MockedFunction<typeof useUiStore>;

describe("useLanguagePreference", () => {
  const setLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useUiStoreMock.mockImplementation((selector) =>
      selector({
        colorScheme: "system",
        language: "es-AR",
        onboardingDone: false,
        searchHistoryWines: [],
        setColorScheme: jest.fn(),
        setLanguage,
        setOnboardingDone: jest.fn(),
        addSearchHistoryWine: jest.fn(),
        clearSearchHistory: jest.fn(),
      }),
    );
  });

  it("persists a different supported language", () => {
    const { result } = renderHook(() => useLanguagePreference());

    act(() => result.current.changeLanguage("en-US"));

    expect(setLanguage).toHaveBeenCalledWith("en-US");
  });

  it("does not persist the language when it is already active", () => {
    const { result } = renderHook(() => useLanguagePreference());

    act(() => result.current.changeLanguage("es-AR"));

    expect(setLanguage).not.toHaveBeenCalled();
  });
});
