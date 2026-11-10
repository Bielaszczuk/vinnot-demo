import { describe, expect, it } from "@jest/globals";
import { formatRouteLength } from "./routePresentation";

const t = (key: string, options?: { count?: number }) => `${key}:${options?.count}`;

describe("formatRouteLength", () => {
  it("shows minutes when the route has them", () => {
    expect(formatRouteLength(90, 2, t)).toBe("1h 30min");
    expect(formatRouteLength(45, null, t)).toBe("45 min");
  });

  it("shows days, not minutes, when the route only has days", () => {
    expect(formatRouteLength(0, 2, t)).toBe("wineRoutes.days:2");
  });

  it("shows nothing when the route has no length", () => {
    expect(formatRouteLength(0, null, t)).toBe("");
    expect(formatRouteLength(0, 0, t)).toBe("");
  });
});
