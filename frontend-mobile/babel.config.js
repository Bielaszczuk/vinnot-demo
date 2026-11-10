// babel.config.js
// IMPORTANT: Plugin order matters.
// 1. babel-preset-expo (must be first, jsxImportSource handles NativeWind v4)
// 2. module-resolver (@/* aliases)
// 3. react-native-reanimated/plugin (must be last)
//
// NOTE: NativeWind v4 does NOT use a babel plugin.
// The CSS transformation is handled entirely by Metro (metro.config.js → withNativeWind).

module.exports = function (api) {
  const isTest = api.env("test");
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // Jest runs CommonJS; exercise optional native imports instead of silently
      // taking their catch path because Node's VM cannot evaluate import().
      ...(isTest ? ["@babel/plugin-transform-dynamic-import"] : []),
      // Module resolver for @/* aliases — mirrors tsconfig paths
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "@domain": "./src/domain",
            "@application": "./src/application",
            "@infrastructure": "./src/infrastructure",
            "@presentation": "./src/presentation",
            "@shared": "./src/shared",
            "@app": "./app",
          },
          extensions: [".ios.ts", ".android.ts", ".ts", ".ios.tsx", ".android.tsx", ".tsx", ".json"],
        },
      ],
      // Reanimated MUST be last
      "react-native-reanimated/plugin",
    ],
  };
};
