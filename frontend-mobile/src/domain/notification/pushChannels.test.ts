import { describe, expect, it } from "@jest/globals";
import { PUSH_CHANNELS } from "./pushChannels";

describe("PUSH_CHANNELS", () => {
  it("lists the Android channels the server targets, tickets first and loud, news quiet, plus the legacy default", () => {
    expect(PUSH_CHANNELS.map((channel) => [channel.id, channel.importance])).toEqual([
      ["tickets", "high"],
      ["community", "default"],
      ["recommendations", "default"],
      ["events-nearby", "default"],
      ["reminders", "default"],
      ["news", "low"],
      ["default", "default"],
    ]);
  });

  it("names each channel's copy with a translation-safe key", () => {
    expect(PUSH_CHANNELS.find((channel) => channel.id === "events-nearby")?.copyKey).toBe("eventsNearby");
    expect(PUSH_CHANNELS.every((channel) => /^[a-zA-Z]+$/.test(channel.copyKey))).toBe(true);
  });
});
