import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/presentation/store/hooks";
import type { ColorScheme, Language } from "@/presentation/store/state.types";
import {
  addSearchHistoryWine as addSearchHistoryWineAction,
  clearSearchHistory as clearSearchHistoryAction,
  persistUiState,
  selectUiState,
  setColorScheme as setColorSchemeAction,
  setLanguage as setLanguageAction,
  setOnboardingDone as setOnboardingDoneAction,
} from "@/presentation/store/uiSlice";

export type { ColorScheme, Language } from "@/presentation/store/state.types";

interface UiState {
  colorScheme: ColorScheme;
  language: Language;
  onboardingDone: boolean;
  searchHistoryWines: string[];
}

interface UiActions {
  setColorScheme: (scheme: ColorScheme) => void;
  setLanguage: (lang: Language) => void;
  setOnboardingDone: () => void;
  addSearchHistoryWine: (term: string) => void;
  clearSearchHistory: () => void;
}

export type UiStore = UiState & UiActions;

export function useUiStore<T>(selector: (state: UiStore) => T): T {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectUiState);

  const actions = useMemo<UiActions>(
    () => ({
      setColorScheme: (scheme) => {
        dispatch(setColorSchemeAction(scheme));
        void dispatch(persistUiState());
      },
      setLanguage: (language) => {
        dispatch(setLanguageAction(language));
        void dispatch(persistUiState());
      },
      setOnboardingDone: () => {
        dispatch(setOnboardingDoneAction());
        void dispatch(persistUiState());
      },
      addSearchHistoryWine: (term) => {
        dispatch(addSearchHistoryWineAction(term));
        void dispatch(persistUiState());
      },
      clearSearchHistory: () => {
        dispatch(clearSearchHistoryAction());
        void dispatch(persistUiState());
      },
    }),
    [dispatch],
  );

  const storeShape = useMemo<UiStore>(
    () => ({
      colorScheme: state.colorScheme,
      language: state.language,
      onboardingDone: state.onboardingDone,
      searchHistoryWines: state.searchHistoryWines,
      ...actions,
    }),
    [state, actions],
  );

  return selector(storeShape);
}

export const useUiHydrating = () => useAppSelector((state) => state.ui.isHydrating);
