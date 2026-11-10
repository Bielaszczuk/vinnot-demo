import { activityService } from "@/application/services/activity.service";
import { activityApiClient } from "@/infrastructure/api/clients/activity.client";
import { APP_OPEN_INTERVAL_MS } from "@/domain/activity/activity";

jest.mock("@/infrastructure/api/clients/activity.client", () => ({
  activityApiClient: { recordView: jest.fn(), recordAppOpen: jest.fn() },
}));
jest.mock("@/shared/devLog", () => ({ devWarn: jest.fn() }));

const client = activityApiClient as jest.Mocked<typeof activityApiClient>;
const { devWarn } = jest.requireMock("@/shared/devLog") as { devWarn: jest.Mock };
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  activityService.forgetAppOpen();
  client.recordView.mockResolvedValue(undefined);
  client.recordAppOpen.mockResolvedValue(undefined);
});

describe("activityService", () => {
  it("records a detail view without waiting for the server", () => {
    expect(activityService.recordView("ROUTE", "r1")).toBeUndefined();
    expect(client.recordView).toHaveBeenCalledWith({ kind: "ROUTE", id: "r1" });
  });

  it("never records a view without an id", () => {
    activityService.recordView("WINE", "");
    expect(client.recordView).not.toHaveBeenCalled();
  });

  it("swallows a failed view and only logs it in development", async () => {
    client.recordView.mockRejectedValue(new Error("offline"));

    activityService.recordView("WINE", "w1");
    await flush();

    expect(devWarn).toHaveBeenCalledWith("Detail view not recorded", expect.any(Error));
  });

  it("records an app open at most once every 30 minutes", () => {
    activityService.recordAppOpen(1_000);
    activityService.recordAppOpen(1_000 + APP_OPEN_INTERVAL_MS - 1);
    expect(client.recordAppOpen).toHaveBeenCalledTimes(1);

    activityService.recordAppOpen(1_000 + APP_OPEN_INTERVAL_MS);
    expect(client.recordAppOpen).toHaveBeenCalledTimes(2);
  });

  it("uses the current time by default", () => {
    jest.spyOn(Date, "now").mockReturnValue(5_000);
    activityService.recordAppOpen();
    activityService.recordAppOpen();
    expect(client.recordAppOpen).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it("a failed app open is retried on the next open instead of waiting 30 minutes", async () => {
    client.recordAppOpen.mockRejectedValueOnce(new Error("offline"));

    activityService.recordAppOpen(1_000);
    await flush();
    activityService.recordAppOpen(2_000);

    expect(client.recordAppOpen).toHaveBeenCalledTimes(2);
    expect(devWarn).toHaveBeenCalledWith("App open not recorded", expect.any(Error));
  });

  it("forgets the last app open on sign-out, so the next sign-in counts at once", () => {
    activityService.recordAppOpen(1_000);
    activityService.forgetAppOpen();
    activityService.recordAppOpen(2_000);

    expect(client.recordAppOpen).toHaveBeenCalledTimes(2);
  });
});
