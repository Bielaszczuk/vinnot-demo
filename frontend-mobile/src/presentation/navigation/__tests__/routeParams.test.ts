import { firstRouteParam } from "../routeParams";

describe("firstRouteParam", () => {
  it("returns a single value as is", () => {
    expect(firstRouteParam("add")).toBe("add");
  });

  it("returns the first value of a repeated param", () => {
    expect(firstRouteParam(["add", "scan"])).toBe("add");
  });

  it("returns undefined when the param is missing", () => {
    expect(firstRouteParam(undefined)).toBeUndefined();
    expect(firstRouteParam([])).toBeUndefined();
  });
});
