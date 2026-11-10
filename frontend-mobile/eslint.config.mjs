// @ts-check
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooks from "eslint-plugin-react-hooks";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...compat.extends("plugin:@typescript-eslint/recommended"),
  {
    files: ["**/*.{ts,tsx}"],
    // Hooks plugin 7's recommended set adds the React Compiler rules (refs, immutability,
    // set-state-in-effect, ...). Adopting them is its own refactor; keep the two classic rules.
    plugins: { "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.name=/^use(Effect|LayoutEffect)$/] CallExpression[callee.name=/^set(?!Timeout$|Interval$|Immediate$)[A-Z]/]",
          message:
            "Avoid syncing local state inside effects. Prefer deriving state in render or moving orchestration into route/view-model hooks.",
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infrastructure/**"],
              message: "Presentation/app must not import infrastructure directly.",
            },
            {
              group: ["@/application/**"],
              message: "App routes must consume presentation facades/hooks, not application directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/presentation/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infrastructure/**"],
              message: "Presentation/app must not import infrastructure directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/presentation/providers/AuthProvider.tsx"],
    rules: {
      // Explicit exception: composition root provider wires HTTP auth handlers.
      // This is a single, controlled escape hatch to avoid store/http circular deps.
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/presentation/providers/WineLabelCameraProvider.tsx"],
    rules: {
      // Composition root: wires the native camera adapter behind a context contract.
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infrastructure/**", "@/presentation/**", "@/application/**", "@/app/**"],
              message: "Domain must stay framework/infrastructure agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/presentation/**", "@/app/**"],
              message: "Application layer cannot depend on presentation/app.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/presentation/**", "@/app/**", "@/domain/**"],
              message: "Infrastructure cannot depend on presentation/app/domain.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "android/**",
      "ios/**",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
    ],
  },
];
