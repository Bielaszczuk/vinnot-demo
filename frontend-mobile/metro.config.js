// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withNativeWindWatcherCompatibility } = require("./config/metro-watcher-compatibility.cjs");

const config = getDefaultConfig(__dirname);

// Enable CSS support for NativeWind v4
config.resolver.sourceExts.push("mjs");

// Import SVG files as React Native components.
const { assetExts, sourceExts } = config.resolver;
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer/expo");
config.resolver.assetExts = assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...sourceExts, "svg"];

module.exports = withNativeWindWatcherCompatibility(withNativeWind(config, {
  input: "./src/shared/styles/global.css",
  inlineRem: 16,
}), __dirname);
