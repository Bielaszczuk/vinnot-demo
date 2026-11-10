import { Platform } from "react-native";
import { env } from "@/shared/config/env";
import { geocodingClient, googleMapsIdentityHeaders } from "./geocoding.client";

jest.mock("@/shared/config/env", () => ({ env: {
  isProduction: true,
  googleMapsBundleIdentifier: "com.vinnot.app",
  googleMapsAndroidPackage: "com.vinnot.app",
  googleMapsAndroidCertificate: "ab:".repeat(19) + "ab",
} }));

describe("Google geocoding application restrictions", () => {
  const originalOs = Platform.OS;
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    env.isProduction = true;
    env.googleMapsBundleIdentifier = "com.vinnot.app";
    env.googleMapsAndroidPackage = "com.vinnot.app";
    env.googleMapsAndroidCertificate = "ab:".repeat(19) + "ab";
    fetchMock.mockReset().mockResolvedValue({ json: async () => ({ status: "OK", results: [] }) });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOs });
    global.fetch = originalFetch;
  });

  it("sends the iOS bundle header and encodes the address without app authorization tokens", async () => {
    await expect(geocodingClient.geocodeAddress("  Mendoza & centro ", "fixture-key"))
      .resolves.toEqual({ status: "OK", results: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://maps.googleapis.com/maps/api/geocode/json?address=Mendoza%20%26%20centro&key=fixture-key",
      { headers: { "X-Ios-Bundle-Identifier": "com.vinnot.app" } },
    );
  });

  it("sends Android package and normalizes the signing certificate as Google requires", () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    expect(googleMapsIdentityHeaders()).toEqual({
      "X-Android-Package": "com.vinnot.app", "X-Android-Cert": "AB".repeat(20),
    });
  });

  it.each(["", "garbage", "AB".repeat(19), "AB".repeat(21)])("rejects invalid production fingerprints: %s", async certificate => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    env.googleMapsAndroidCertificate = certificate;
    await expect(geocodingClient.geocodeAddress("Mendoza", "fixture-key")).rejects.toThrow("identidad");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["ios", "android", "web"])("rejects missing production app identity on %s", platform => {
    Object.defineProperty(Platform, "OS", { value: platform });
    env.googleMapsBundleIdentifier = "";
    env.googleMapsAndroidPackage = "";
    expect(googleMapsIdentityHeaders).toThrow("identidad");
  });

  it("preserves development clients without a configured fingerprint", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    env.isProduction = false;
    env.googleMapsAndroidCertificate = "";
    await geocodingClient.geocodeAddress("Mendoza", "fixture-key");
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: {} });
  });

  it("propagates transport failures to the application error mapper", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(geocodingClient.geocodeAddress("Mendoza", "fixture-key")).rejects.toThrow("offline");
  });
});
