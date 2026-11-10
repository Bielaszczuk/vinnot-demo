/**
 * ThemeProvider — exposes the Vinnot light theme to all components.
 */
import { createContext, useContext, useMemo } from "react";
import { lightTokens, type ColorTheme } from "@/shared/theme/tokens";

interface ThemeContextValue {
  colors: ColorTheme;
  isDark: boolean;
  scheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightTokens,
  isDark: false,
  scheme: "light",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: lightTokens,
      isDark: false,
      scheme: "light",
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
