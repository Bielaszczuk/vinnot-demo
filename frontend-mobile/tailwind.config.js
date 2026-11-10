/** @type {import('tailwindcss').Config} */
// NativeWind v4 requires Tailwind CSS v3 (not v4).
// NativeWind is configured but no component uses `className`; screens use
// StyleSheet with src/shared/theme/tokens.ts, the single palette.
// Keep these values equal to tokens.ts (this file cannot import TypeScript).
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        wine: {
          50: "#fdf2f4",
          100: "#fce7eb",
          200: "#f9d0d9",
          300: "#f4a9ba",
          400: "#ec7794",
          500: "#df4d72",
          600: "#cb2d5d",
          700: "#ab214c",
          800: "#8f1e43",
          900: "#7a1d3e",
          950: "#440b1e",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#fafafa",
          muted: "#fdf2f4",
          overlay: "rgba(23, 23, 23, 0.56)",
        },
        ink: {
          DEFAULT: "#171717",
          secondary: "#525252",
          tertiary: "#737373",
          disabled: "#a3a3a3",
        },
        border: {
          DEFAULT: "#e5e5e5",
          strong: "#d4d4d4",
          focus: "#ab214c",
        },
        success: "#047857",
        warning: "#d97706",
        danger: "#dc2626",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["Poppins_400Regular", "system-ui", "sans-serif"],
        "sans-medium": ["Poppins_500Medium"],
        "sans-semibold": ["Poppins_600SemiBold"],
        "sans-bold": ["Poppins_700Bold"],
      },
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "32px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

