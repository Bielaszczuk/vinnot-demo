/* global module, require, process */
/* eslint-disable @typescript-eslint/no-require-imports -- Native autolinking loads CommonJS. */
const { resolveMobileEnvironment } = require("./config/mobile-environment-policy.cjs");

const { environment } = resolveMobileEnvironment({
  environment: process.env.EXPO_ENV,
  profile: process.env.EAS_BUILD_PROFILE,
  channel: process.env.VINNOT_OTA_CHANNEL,
  apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
});
const facebookEnabled = environment !== "production"
  && process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED !== "false";

// Omitting an Expo plugin alone does not prevent native dependency autolinking.
module.exports = {
  dependencies: facebookEnabled ? {} : {
    "react-native-fbsdk-next": { platforms: { ios: null, android: null } },
  },
};
