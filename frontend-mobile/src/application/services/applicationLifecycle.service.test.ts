import { describe, expect, it, jest } from "@jest/globals";
import { applicationLifecycleService } from "./applicationLifecycle.service";
import { applicationLifecycleGateway } from "@/infrastructure/device/applicationLifecycle.gateway";

jest.mock("@/infrastructure/device/applicationLifecycle.gateway", () => ({
  applicationLifecycleGateway: { subscribe: jest.fn() },
}));

const gateway = applicationLifecycleGateway as jest.Mocked<typeof applicationLifecycleGateway>;

describe("applicationLifecycle.service", () => {
  it("returns the infrastructure unsubscribe handle without owning device state", () => {
    const unsubscribe = jest.fn();
    const handlers = { onFocus: jest.fn(), onFocusLost: jest.fn() };
    gateway.subscribe.mockReturnValue(unsubscribe);

    expect(applicationLifecycleService.subscribe(handlers)).toBe(unsubscribe);
    expect(gateway.subscribe).toHaveBeenCalledWith(handlers);
  });
});
