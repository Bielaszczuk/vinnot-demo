export function assertDisabledFacebookPodsAbsent(lockfile, facebookEnabled) {
  if (!facebookEnabled && /\b(?:ExpoAdapterFBSDKNext|FBSDK\w*|FBAEMKit)\b/.test(lockfile)) {
    throw new Error("Disabled Facebook SDK remains in Podfile.lock; stop before compilation or EAS build");
  }
}
