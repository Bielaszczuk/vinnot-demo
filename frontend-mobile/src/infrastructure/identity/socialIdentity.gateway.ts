import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { env } from "@/shared/config/env";

type InfrastructureSocialProvider = "GOOGLE" | "APPLE" | "FACEBOOK";

export interface MobileSocialCredential {
  provider: InfrastructureSocialProvider;
  token: string;
  nonce?: string;
  firstName?: string;
  lastName?: string;
}

export interface AppleAccountDeletionCredential {
  authorizationCode: string;
  clientId: string;
}

/** Translation keys for social sign-in failures; presentation translates them. */
export const SOCIAL_IDENTITY_ERRORS = {
  googleNotConfigured: "authErrors.googleNotConfigured",
  googleCancelled: "authErrors.googleCancelled",
  appleInvalidIdentity: "authErrors.appleInvalidIdentity",
  appleIosOnly: "authErrors.appleIosOnly",
  appleUnavailable: "authErrors.appleUnavailable",
  appleDeletionAuthorizationMissing: "authErrors.appleDeletionAuthorizationMissing",
  facebookNotConfigured: "authErrors.facebookNotConfigured",
  facebookCancelled: "authErrors.facebookCancelled",
  facebookInvalidIdentity: "authErrors.facebookInvalidIdentity",
} as const;

export const socialIdentityGateway = {
  async acquire(provider: InfrastructureSocialProvider): Promise<MobileSocialCredential> {
    switch (provider) {
      case "GOOGLE":
        return acquireGoogleCredential();
      case "APPLE":
        return acquireAppleCredential();
      case "FACEBOOK":
        return acquireFacebookCredential();
    }
  },

  async acquireAppleAccountDeletionCredential(): Promise<AppleAccountDeletionCredential> {
    const AppleAuthentication = await requireAppleAuthentication();
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [],
    });
    const clientId = Constants.expoConfig?.extra?.appleClientId;
    if (!credential.authorizationCode || typeof clientId !== "string" || !clientId) {
      throw new Error(SOCIAL_IDENTITY_ERRORS.appleDeletionAuthorizationMissing);
    }
    return {
      authorizationCode: credential.authorizationCode,
      clientId,
    };
  },
};

async function acquireGoogleCredential(): Promise<MobileSocialCredential> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId) throw new Error(SOCIAL_IDENTITY_ERRORS.googleNotConfigured);

  const { GoogleSignin, isSuccessResponse } = await import(
    "@react-native-google-signin/google-signin"
  );
  GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
  if (Platform.OS === "android") await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error(SOCIAL_IDENTITY_ERRORS.googleCancelled);
  }
  return { provider: "GOOGLE", token: response.data.idToken };
}

async function acquireAppleCredential(): Promise<MobileSocialCredential> {
  const AppleAuthentication = await requireAppleAuthentication();
  const nonce = await randomToken();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });
  if (!credential.identityToken) throw new Error(SOCIAL_IDENTITY_ERRORS.appleInvalidIdentity);
  return {
    provider: "APPLE",
    token: credential.identityToken,
    nonce,
    firstName: credential.fullName?.givenName ?? undefined,
    lastName: credential.fullName?.familyName ?? undefined,
  };
}

async function requireAppleAuthentication() {
  if (Platform.OS !== "ios") {
    throw new Error(SOCIAL_IDENTITY_ERRORS.appleIosOnly);
  }
  const AppleAuthentication = await import("expo-apple-authentication");
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error(SOCIAL_IDENTITY_ERRORS.appleUnavailable);
  }
  return AppleAuthentication;
}

async function acquireFacebookCredential(): Promise<MobileSocialCredential> {
  if (!env.facebookLoginEnabled || !process.env.EXPO_PUBLIC_FACEBOOK_APP_ID) {
    throw new Error(SOCIAL_IDENTITY_ERRORS.facebookNotConfigured);
  }
  const { AccessToken, LoginManager, Settings } = await import("react-native-fbsdk-next");
  Settings.initializeSDK();
  const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);
  if (result.isCancelled) throw new Error(SOCIAL_IDENTITY_ERRORS.facebookCancelled);
  const access = await AccessToken.getCurrentAccessToken();
  if (!access?.accessToken) throw new Error(SOCIAL_IDENTITY_ERRORS.facebookInvalidIdentity);
  return { provider: "FACEBOOK", token: access.accessToken };
}

async function randomToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
