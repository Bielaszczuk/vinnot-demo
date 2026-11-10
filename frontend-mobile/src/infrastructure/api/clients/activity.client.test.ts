import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { activityApiClient } from "./activity.client";

jest.mock("@/infrastructure/api/http", () => ({ http: { post: jest.fn() } }));

const httpMock = http as jest.Mocked<typeof http>;

describe("activityApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpMock.post.mockResolvedValue({ data: undefined, status: 204 } as never);
  });

  it("records a detail view", async () => {
    await expect(activityApiClient.recordView({ kind: "WINE", id: "w1" })).resolves.toBeUndefined();
    expect(httpMock.post).toHaveBeenCalledWith("/users/me/activity/views", { kind: "WINE", id: "w1" });
  });

  it("records an app open with an empty body", async () => {
    await expect(activityApiClient.recordAppOpen()).resolves.toBeUndefined();
    expect(httpMock.post).toHaveBeenCalledWith("/users/me/activity/app-open", {});
  });
});
