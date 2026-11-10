import type { User } from "@/domain/user/user.types";
import type {
  ColorScheme,
  Language,
} from "@/application/services/uiPreferences.service";

export type { ColorScheme, Language } from "@/application/services/uiPreferences.service";

export interface AuthState {
  returnPath?: string | null;
  sessionGeneration?: number;
  pendingSessionRequest?: string;
  pendingRefreshRequest?: string;
  pendingUserRequest?: string;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitializing: boolean;
  isSessionExpired: boolean;
}

export interface UiState {
  colorScheme: ColorScheme;
  language: Language;
  onboardingDone: boolean;
  searchHistoryWines: string[];
  isHydrating: boolean;
}

export interface AppState {
  auth: AuthState;
  ui: UiState;
}
