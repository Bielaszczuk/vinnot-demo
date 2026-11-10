import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  uiPreferencesService,
  type UiPreferences,
} from "@/application/services/uiPreferences.service";
import type { AppState, ColorScheme, Language, UiState } from "./state.types";

const initialState: UiState = {
  colorScheme: "system",
  language: "es-AR",
  onboardingDone: false,
  searchHistoryWines: [],
  isHydrating: true,
};

function pickPersistedUiState(state: UiState): UiPreferences {
  return {
    colorScheme: state.colorScheme,
    language: state.language,
    onboardingDone: state.onboardingDone,
    searchHistoryWines: state.searchHistoryWines,
  };
}

export const hydrateUiState = createAsyncThunk<UiPreferences, Language | undefined>(
  "ui/hydrate",
  async (defaultLanguage) => {
    return uiPreferencesService.restore({
      ...pickPersistedUiState(initialState),
      language: defaultLanguage ?? initialState.language,
    });
  },
);

export const persistUiState = createAsyncThunk<void, void, { state: AppState }>(
  "ui/persist",
  async (_arg, { getState }) => {
    await uiPreferencesService.persist(pickPersistedUiState(getState().ui));
  },
);

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setColorScheme: (state, action: PayloadAction<ColorScheme>) => {
      state.colorScheme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setOnboardingDone: (state) => {
      state.onboardingDone = true;
    },
    addSearchHistoryWine: (state, action: PayloadAction<string>) => {
      const term = action.payload.trim();
      if (!term) return;
      const filtered = state.searchHistoryWines.filter((item) => item !== term);
      state.searchHistoryWines = [term, ...filtered].slice(0, 10);
    },
    clearSearchHistory: (state) => {
      state.searchHistoryWines = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateUiState.pending, (state) => {
        state.isHydrating = true;
      })
      .addCase(hydrateUiState.fulfilled, (state, action) => {
        state.colorScheme = action.payload.colorScheme;
        state.language = action.payload.language;
        state.onboardingDone = action.payload.onboardingDone;
        state.searchHistoryWines = action.payload.searchHistoryWines;
        state.isHydrating = false;
      })
      .addCase(hydrateUiState.rejected, (state) => {
        state.isHydrating = false;
      });
  },
});

export const {
  setColorScheme,
  setLanguage,
  setOnboardingDone,
  addSearchHistoryWine,
  clearSearchHistory,
} = uiSlice.actions;

export default uiSlice.reducer;

export const selectUiState = (state: AppState) => state.ui;
