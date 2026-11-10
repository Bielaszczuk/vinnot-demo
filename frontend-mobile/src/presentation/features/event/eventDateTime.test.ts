import { describe, expect, it } from "@jest/globals";
import {
  createDefaultEventDateTimes,
  localDateTimeToIso,
  toLocalDateTimeInput,
} from "./eventDateTime";

describe("eventDateTime", () => {
  it("preserves date and time when mapping an API instant into form state", () => {
    const instant = "2030-05-20T21:30:00.000Z";
    const expected = new Date(instant);
    const pad = (value: number) => String(value).padStart(2, "0");

    expect(toLocalDateTimeInput(instant)).toBe(
      `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}` +
        `T${pad(expected.getHours())}:${pad(expected.getMinutes())}`,
    );
  });

  it("converts a local form value into an API instant", () => {
    const value = "2030-05-20T18:30";

    expect(localDateTimeToIso(value)).toBe(new Date(value).toISOString());
  });

  it("creates a valid future default range", () => {
    const values = createDefaultEventDateTimes();

    expect(new Date(values.startDate).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(values.endDate).getTime()).toBeGreaterThan(
      new Date(values.startDate).getTime(),
    );
  });
});
