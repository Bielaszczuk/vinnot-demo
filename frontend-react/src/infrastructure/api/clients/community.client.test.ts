import { afterEach, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import http from "@infrastructure/http/http";
import { communityClient } from "./community.client";

const originalAdapter = http.defaults.adapter;
afterEach(() => {
  http.defaults.adapter = originalAdapter;
});

function capture() {
  const requests: InternalAxiosRequestConfig[] = [];
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config);
    return { config, status: 204, statusText: "No Content", headers: {}, data: "" };
  };
  return requests;
}

it("posts a publication decision with its reason code to the target path", async () => {
  const requests = capture();

  await communityClient.decidePublication({
    type: "REVIEW",
    id: "a/b",
    status: "REJECTED",
    reasonCode: "OFFENSIVE",
    expectedRevision: "2026-09-30T15:00:00.123456Z",
  });

  expect(requests[0]!.method).toBe("post");
  expect(requests[0]!.url).toMatch(/\/admin\/review-publications\/REVIEW\/a%2Fb$/);
  expect(JSON.parse(requests[0]!.data as string)).toEqual({
    status: "REJECTED",
    reasonCode: "OFFENSIVE",
    expectedRevision: "2026-09-30T15:00:00.123456Z",
  });
});
