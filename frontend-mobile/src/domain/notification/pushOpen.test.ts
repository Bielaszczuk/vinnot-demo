import { describe, expect, it } from "@jest/globals";
import { toPushOpen } from "./pushOpen";

describe("toPushOpen", () => {
  it("reads the dedupe reference and type a push carries", () => {
    expect(toPushOpen({ url: "/wines/w1", type: "TASTE_PICK", ref: "taste:u1:2026-W43" })).toEqual({
      ref: "taste:u1:2026-W43",
      type: "TASTE_PICK",
    });
  });

  it("ignores pushes without them (older pushes only carry a url) or with malformed values", () => {
    expect(toPushOpen({ url: "/wines/w1" })).toBeNull();
    expect(toPushOpen({ ref: "r1" })).toBeNull();
    expect(toPushOpen({ ref: "", type: "TASTE_PICK" })).toBeNull();
    expect(toPushOpen({ ref: "r1", type: "not a type" })).toBeNull();
    expect(toPushOpen({ ref: "x".repeat(256), type: "TASTE_PICK" })).toBeNull();
    expect(toPushOpen({ ref: 7, type: "TASTE_PICK" })).toBeNull();
    expect(toPushOpen(null)).toBeNull();
    expect(toPushOpen("data")).toBeNull();
  });
});
