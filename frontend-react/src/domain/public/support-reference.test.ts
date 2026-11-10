import { describe, it, expect } from "vitest";
import { formatSupportReference } from "./support";
describe("support reference presentation", () => {
  it.each([
    ["f0da7948-e767-458d-9681-43a38ed9d6c9", "VIN-43A38ED9D6C9"],
    ["F0DA7948-E767-458D-9681-43A38ED9D6C9", "VIN-43A38ED9D6C9"],
    ["legacy-id", "legacy-id"],
    ["", ""],
  ])("formats %s without changing request identity", (id, expected) => {
    expect(formatSupportReference(id)).toBe(expected);
  });
});
