import { expect, it } from "vitest";
import { SOCIAL_PROFILES } from "./socialProfiles";

it("links each network once to its official secure profile", () => {
  expect(SOCIAL_PROFILES.map((profile) => profile.network)).toEqual(["instagram", "facebook", "threads", "tiktok"]);
  const hosts = { instagram: "www.instagram.com", facebook: "www.facebook.com", threads: "www.threads.com", tiktok: "www.tiktok.com" };
  for (const profile of SOCIAL_PROFILES) {
    const url = new URL(profile.url);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe(hosts[profile.network]);
  }
});
