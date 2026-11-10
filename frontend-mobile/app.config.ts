import type { ExpoConfig, ConfigContext } from "expo/config";
import { resolveMobileEnvironment, resolveMobileProjectId } from "./config/mobile-environment-policy.cjs";

// Environment-aware configuration.
// Build profiles: development | staging | production
// Set EXPO_ENV or EAS build profile determines which values are used.

const { environment: ENV, apiBaseUrl } = resolveMobileEnvironment({
  environment: process.env.EXPO_ENV,
  profile: process.env.EAS_BUILD_PROFILE,
  channel: process.env.VINNOT_OTA_CHANNEL,
  apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  publishing: process.env.NODE_ENV === "production" || process.env.EAS_BUILD === "true",
});
const easProjectId = resolveMobileProjectId(ENV, process.env.EAS_PROJECT_ID);
const expoOwner = process.env.EXPO_OWNER ?? "vinnot";
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Firebase client config Android needs for push tokens; an EAS file environment variable holds its path. */
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
const googleMapsIosApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
  ?? (ENV === "production" ? "" : googleMapsApiKey);
const googleMapsAndroidApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
  ?? (ENV === "production" ? "" : googleMapsApiKey);
const googleMapsAndroidCertificate = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1 ?? "";
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? "";
const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";
const facebookClientToken = process.env.FACEBOOK_CLIENT_TOKEN ?? "";
const facebookLoginEnabled = ENV !== "production"
  && process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED !== "false";
const isIosSimulatorBuild = process.env.VINNOT_IOS_SIMULATOR === "1";
const isDevelopmentBuild = ENV === "development";
const excludedIosExpoModules = [
  ...(!facebookLoginEnabled ? ["react-native-fbsdk-next"] : []),
  ...(isIosSimulatorBuild ? [
    "@infinitered/react-native-mlkit-core",
    "@infinitered/react-native-mlkit-text-recognition",
  ] : []),
];

const iosExtraPods = [
  ...(!isIosSimulatorBuild
    ? [
        {
          name: "GoogleMLKit/TextRecognition",
          version: "9.0.0",
          modular_headers: true,
        },
        { name: "MLKitVision", version: "10.0.0", modular_headers: true },
      ]
    : []),
  { name: "GoogleUtilities", version: "~> 8.0", modular_headers: true },
  { name: "RecaptchaInterop", modular_headers: true },
];

const envConfig = {
  development: {
    name: "Vinnot (Dev)",
    slug: "vinnot-dev",
    bundleIdentifier: "com.vinnot.app.dev",
    androidPackage: "com.vinnot.app.dev",
    icon: "./assets/icon.png",
    adaptiveIconForeground: "./assets/adaptive-icon.png",
  },
  staging: {
    name: "Vinnot (Staging)",
    slug: "vinnot-staging",
    bundleIdentifier: "com.vinnot.app.staging",
    androidPackage: "com.vinnot.app.staging",
    icon: "./assets/icon.png",
    adaptiveIconForeground: "./assets/adaptive-icon.png",
  },
  production: {
    name: "Vinnot",
    slug: "vinnot",
    bundleIdentifier: "com.vinnot.app",
    androidPackage: "com.vinnot.app",
    icon: "./assets/icon.png",
    adaptiveIconForeground: "./assets/adaptive-icon.png",
  },
} as const;

const current = { ...envConfig[ENV], apiBaseUrl };
const sharingHost = ENV === "production" ? "vinnot.com" : ENV === "development" ? "dev.vinnot.com" : null;

const socialPlugins: NonNullable<ExpoConfig["plugins"]> = [
  "expo-apple-authentication",
];

if (googleIosUrlScheme) {
  socialPlugins.push([
    "@react-native-google-signin/google-signin",
    { iosUrlScheme: googleIosUrlScheme },
  ]);
}

if (facebookLoginEnabled && facebookAppId) {
  socialPlugins.push([
    "react-native-fbsdk-next",
    {
      appID: facebookAppId,
      clientToken: facebookClientToken,
      displayName: current.name,
      scheme: `fb${facebookAppId}`,
      isAutoInitEnabled: true,
      autoLogAppEventsEnabled: false,
      advertiserIDCollectionEnabled: false,
      iosUserTrackingPermission: false,
    },
  ]);
}

const createExpoConfig = ({ config: _config }: ConfigContext): ExpoConfig => ({
  ..._config,
  name: current.name,
  owner: expoOwner,
  slug: current.slug,
  // Any native change needs a new version: with the appVersion runtime policy, OTA updates
  // built from here reach binaries of this exact version only. 0.2.0 moved to Expo SDK 58;
  // 0.2.1 takes the SDK 58 native patch releases and pre-installs @shopify/react-native-skia
  // so the animated points-system emblems can later ship by OTA; 0.2.2 takes the next SDK 58
  // native patch releases (expo 58.0.21).
  version: "0.2.2",
  orientation: "portrait",
  scheme: "vinnot",
  userInterfaceStyle: "light",
  // Android recents/task colour (brand wine-700, tokens.ts). Expo reads it from the top level,
  // not from `android`; it applies on the next native build, the JS bundle stays OTA-compatible.
  primaryColor: "#ab214c",
  icon: current.icon,
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: current.bundleIdentifier,
    usesAppleSignIn: true,
    associatedDomains: sharingHost ? [`applinks:${sharingHost}`] : [],
    // iOS renders Apple Maps; the iOS key only serves REST geocoding through `extra`.
    // Setting ios.config.googleMapsApiKey would add the react-native-google-maps pod,
    // which react-native-maps 1.29 no longer ships, and pod install would fail.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Vinnot uses your location to find nearby wineries and events.",
      NSCameraUsageDescription: "Vinnot uses your camera to scan wine labels.",
      ...(isDevelopmentBuild
        ? {
            NSLocalNetworkUsageDescription:
              "Vinnot connects to the local development server on your network.",
            NSAppTransportSecurity: {
              NSAllowsLocalNetworking: true,
            },
          }
        : {}),
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: current.adaptiveIconForeground,
      backgroundColor: "#e6dacc",
    },
    package: current.androidPackage,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    intentFilters: sharingHost ? [{
      action: "VIEW",
      autoVerify: true,
      category: ["BROWSABLE", "DEFAULT"],
      data: [
        ...["/share", "/share/"].map(path => ({ scheme: "https", host: sharingHost, path })),
        ...["wines", "events", "wine-routes"].map(kind => ({
          scheme: "https", host: sharingHost, pathPrefix: `/share/${kind}/`,
        })),
      ],
    }] : [],
    config: {
      googleMaps: {
        apiKey: googleMapsAndroidApiKey,
      },
    },
    permissions: ["ACCESS_FINE_LOCATION", "CAMERA"],
    // Production uses photos only; development retains its debugging overlay.
    ...(ENV === "production" ? {
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
    } : {}),
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  ...(easProjectId
    ? {
        updates: {
          url: `https://u.expo.dev/${easProjectId}`,
        },
        runtimeVersion: {
          policy: "appVersion" as const,
        },
      }
    : {}),
  plugins: [
    "./plugins/withAndroidSecurityDependencies.cjs",
    "expo-router",
    "expo-font",
    "expo-image",
    "expo-secure-store",
    "expo-localization",
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        // Android draws the small icon as a silhouette tinted with the brand accent.
        icon: "./assets/notification-icon.png",
        color: "#ab214c",
        defaultChannel: "default",
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4",
          extraPods: iosExtraPods,
        },
        // SDK 58 turns R8 on for release builds. Keep SDK 54's unminified release until a
        // device-tested build confirms the reflection-based SDKs (Facebook, Google Sign-In,
        // ML Kit, Maps) survive minification with their consumer rules.
        android: {
          enableMinifyInReleaseBuilds: false,
        },
      },
    ],
    ...(excludedIosExpoModules.length
      ? [["./plugins/withIosExpoModuleExclusions.cjs", { modules: excludedIosExpoModules }] as [string, { modules: string[] }]]
      : []),
    ...(!isIosSimulatorBuild ? ["./plugins/withIosMlkitTextQualifier.cjs"] : []),
    ...socialPlugins,
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#e6dacc",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    EXPO_ENV: ENV,
    apiBaseUrl: current.apiBaseUrl,
    appleClientId: current.bundleIdentifier,
    facebookLoginEnabled,
    googleMapsApiKey: ENV === "production" ? "" : googleMapsApiKey,
    googleMapsIosApiKey,
    googleMapsAndroidApiKey,
    googleMapsAndroidCertificate,
  },
});

export default createExpoConfig;
