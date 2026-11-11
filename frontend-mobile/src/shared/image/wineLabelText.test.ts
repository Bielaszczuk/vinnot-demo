import { describe, expect, it } from "@jest/globals";
import { boundObservedLabelText, LABEL_SCAN_TEXT_LIMITS } from "./wineLabelText";

describe("boundObservedLabelText", () => {
  it("trims, collapses spaces and drops blank or repeated lines regardless of case", () => {
    expect(boundObservedLabelText(["  Catena   Zapata ", "", "CATENA ZAPATA", "Malbec"])).toEqual([
      "Catena Zapata",
      "Malbec",
    ]);
  });

  it("keeps the line, count and total character limits of the scan contract", () => {
    const long = "x".repeat(200);
    expect(boundObservedLabelText([long])[0]).toHaveLength(LABEL_SCAN_TEXT_LIMITS.maxLineLength);

    const many = Array.from({ length: 40 }, (_, index) => `line ${index}`);
    expect(boundObservedLabelText(many)).toHaveLength(LABEL_SCAN_TEXT_LIMITS.maxLines);

    const wide = Array.from({ length: 24 }, (_, index) => `${index}`.padEnd(120, "y"));
    const bounded = boundObservedLabelText(wide);
    expect(bounded.join("").length).toBeLessThanOrEqual(LABEL_SCAN_TEXT_LIMITS.maxTotalCharacters);
    expect(bounded).toHaveLength(16);
  });
});
