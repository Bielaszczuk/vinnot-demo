import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { hapticsGateway } from "@/infrastructure/device/haptics.gateway";
import { featureFlags } from "@/shared/config/featureFlags";
import { hapticsService } from "./haptics.service";

jest.mock("@/infrastructure/device/haptics.gateway", () => ({
  hapticsGateway: {
    impact: jest.fn(),
    selection: jest.fn(),
    notification: jest.fn(),
  },
}));

const gatewayMock = hapticsGateway as jest.Mocked<typeof hapticsGateway>;

describe("hapticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gatewayMock.impact.mockResolvedValue();
    gatewayMock.selection.mockResolvedValue();
    gatewayMock.notification.mockResolvedValue();
  });

  it("uses light impact as the default presentation feedback", () => {
    hapticsService.impact();

    expect(gatewayMock.impact).toHaveBeenCalledWith("light");
  });

  it("delegates selection and notification feedback", () => {
    hapticsService.selection();
    hapticsService.notification("success");

    expect(gatewayMock.selection).toHaveBeenCalled();
    expect(gatewayMock.notification).toHaveBeenCalledWith("success");
  });

  it("absorbs native feedback failures", async () => {
    gatewayMock.selection.mockRejectedValue(new Error("not supported"));

    expect(() => hapticsService.selection()).not.toThrow();
    await Promise.resolve();
  });

  it("does not access the native gateway when haptics are disabled", () => {
    const mutableFlags = featureFlags as { haptics: boolean };
    mutableFlags.haptics = false;
    try {
      hapticsService.impact();
      expect(gatewayMock.impact).not.toHaveBeenCalled();
    } finally {
      mutableFlags.haptics = true;
    }
  });
});
