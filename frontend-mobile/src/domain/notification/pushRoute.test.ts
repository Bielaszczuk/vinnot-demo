import { toPushRoute } from "@/domain/notification/pushRoute";

describe("toPushRoute", () => {
  it.each([
    ["/my-tickets/11111111-2222-3333-4444-555555555555", "/my-tickets/11111111-2222-3333-4444-555555555555"],
    ["/my-tickets", "/my-tickets"],
    ["/events/abc-123/", "/events/abc-123"],
    ["/events/abc?utm=push", "/events/abc"],
    ["/partner/events", "/partner/events"],
    ["/wine-routes/r1", "/wine-routes/r1"],
    ["/partner", "/partner"],
    ["/points", "/points"],
    ["/wines/11111111-2222-3333-4444-555555555555", "/wines/11111111-2222-3333-4444-555555555555"],
  ])("keeps the in-app route %s", (input, expected) => {
    expect(toPushRoute(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [42],
    [""],
    ["/"],
    ["https://evil.example/events"],
    ["//evil.example/events"],
    ["vinnot://events/1"],
    ["/admin/users"],
    ["/events/1/../../admin"],
    ["/events/a b"],
    ["/my-tickets/%0aadmin"],
    ["/share"],
    ["/wines/scan"],
    ["/wines/Scan"],
    ["/wines/compare"],
    ["/wines/submissions"],
    ["/partner/abc"],
    ["/partner/events/abc"],
    ["/points/abc"],
    ["/profile"],
  ])("ignores %p", (input) => {
    expect(toPushRoute(input)).toBeNull();
  });
});
