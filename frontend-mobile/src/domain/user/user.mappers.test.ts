import { describe, expect, it } from "@jest/globals";
import {
  mapMeResponseToUser,
  mapUserFromDto,
  mapUserProfile,
  mapUserStats,
  mapUserStatsFromDto,
} from "./user.mappers";

describe("user.mappers", () => {
  it("preserves separated names and social identity from the backend contract", () => {
    const user = mapUserFromDto({
      id: "user-1",
      username: "cris",
      email: "cris@vinnot.com",
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
      fullName: "Cristhian Bielaszczuk",
      profileImageUrl: "https://cdn.vinnot.com/cris.jpg",
      roles: ["ROLE_USER"],
      emailVerified: true,
      hasSocialIdentity: true,
      onboardingCompleted: true,
      createdAt: "2026-07-23T10:00:00Z",
      updatedAt: "2026-07-23T10:00:00Z",
    });

    expect(user).toMatchObject({
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
      name: "Cristhian Bielaszczuk",
      avatarUrl: "https://cdn.vinnot.com/cris.jpg",
      hasSocialIdentity: true,
    });
  });

  it("reads whether the account has a password, falling back to the social identity", () => {
    const base = { id: "user-3", email: "linked@vinnot.com" };
    expect(mapUserFromDto({ ...base, hasSocialIdentity: true, hasPassword: true }).hasPassword).toBe(true);
    expect(mapUserFromDto({ ...base, hasSocialIdentity: false, hasPassword: false }).hasPassword).toBe(false);
    expect(mapUserFromDto({ ...base, hasSocialIdentity: true }).hasPassword).toBe(false);
    expect(mapUserFromDto({ ...base, hasSocialIdentity: false }).hasPassword).toBe(true);
    expect(mapUserFromDto(base).hasPassword).toBe(true);
  });

  it("builds a display name when only separated fields are present", () => {
    const user = mapUserFromDto({
      id: "user-2",
      username: "ana",
      email: "ana@vinnot.com",
      firstName: "Ana",
      lastName: "Malbec",
    });

    expect(user.name).toBe("Ana Malbec");
  });

  it("maps legacy profile, me response and both stats contracts", () => {
    expect(mapMeResponseToUser({ id: "u1", email: "u@vinnot.com", name: "U" }))
      .toMatchObject({ id: "u1", name: "U" });
    expect(mapUserProfile({ id: 7, name: "Legacy", email: "l@vinnot.com" }))
      .toMatchObject({ id: "7", username: "Legacy", bio: null });
    expect(mapUserStats({ reviewCount: 2, cellarCount: 3 }))
      .toMatchObject({ totalReviews: 2, cellarSize: 3 });
    expect(mapUserStatsFromDto({ reviewsCount: 4, totalCellarWines: 5 }))
      .toMatchObject({ totalReviews: 4, totalWinesTasted: 5 });
  });
});

it('keeps phone on private session mappings and out of public profile projections', () => {
  expect(mapUserFromDto({ id: 'u', email: 'u@example.com', phoneNumber: '+5491123456789' }).phoneNumber).toBe('+5491123456789');
  expect(mapUserFromDto({ id: 'u', email: 'u@example.com' }).phoneNumber).toBeNull();
  expect(mapUserProfile({ id: 'u', name: 'Guest', joined_at: '2026-01-01', phoneNumber: '+5491123456789' } as never)).not.toHaveProperty('phoneNumber');
});
