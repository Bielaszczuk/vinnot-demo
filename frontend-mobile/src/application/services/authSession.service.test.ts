import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { authSessionService } from "./authSession.service";
import { authSessionStorage } from "@/infrastructure/storage/authSession.storage";
import type { User } from "@/domain/user/user.types";

jest.mock("@/infrastructure/storage/authSession.storage", () => ({
  authSessionStorage: {
    read: jest.fn(),
    write: jest.fn(),
    writeTokens: jest.fn(),
    writeUser: jest.fn(),
    prepareRotation: jest.fn(),
    completeRotation: jest.fn(),
    removeUser: jest.fn(),
    clear: jest.fn(),
  },
}));

const storageMock = authSessionStorage as jest.Mocked<typeof authSessionStorage>;

const storedUser: User = {
  id: "usr-1",
  username: "ana",
  email: "ana@vinnot.com",
  firstName: "Ana",
  lastName: "",
  name: "Ana",
  avatarUrl: null,
  roles: ["ROLE_USER"],
  emailVerified: true,
  hasSocialIdentity: false,
  hasPassword: true,
  socialProviders: [],
  onboardingCompleted: true,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z",
};

describe("authSession.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("restores a valid persisted session", async () => {
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: JSON.stringify(storedUser),
    });

    await expect(authSessionService.restore()).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: storedUser,
    });
    expect(storageMock.removeUser).not.toHaveBeenCalled();
  });

  it("derives the password flag for a user persisted before it existed", async () => {
    const legacyUser: Partial<User> = { ...storedUser, hasSocialIdentity: true };
    delete legacyUser.hasPassword;
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: JSON.stringify(legacyUser),
    });

    const restored = await authSessionService.restore();

    expect(restored.user).toMatchObject({ hasSocialIdentity: true, hasPassword: false });
  });

  it("removes malformed persisted user data", async () => {
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: '{"id":',
    });

    await expect(authSessionService.restore()).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: null,
    });
    expect(storageMock.removeUser).toHaveBeenCalledTimes(1);
  });

  it("removes a persisted JSON null user", async () => {
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: "null",
    });

    await expect(authSessionService.restore()).resolves.toMatchObject({ user: null });
    expect(storageMock.removeUser).toHaveBeenCalledTimes(1);
  });

  it("keeps an absent persisted user absent without rewriting storage", async () => {
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: null,
    });

    await expect(authSessionService.restore()).resolves.toMatchObject({ user: null });
    expect(storageMock.removeUser).not.toHaveBeenCalled();
  });

  it("restores pre-onboarding sessions as already completed", async () => {
    const legacyUser = {
      id: storedUser.id,
      username: storedUser.username,
      email: storedUser.email,
      name: storedUser.name,
      avatarUrl: storedUser.avatarUrl,
      roles: storedUser.roles,
      emailVerified: storedUser.emailVerified,
      createdAt: storedUser.createdAt,
      updatedAt: storedUser.updatedAt,
    };
    storageMock.read.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      serializedUser: JSON.stringify(legacyUser),
    });

    await expect(authSessionService.restore()).resolves.toMatchObject({
      user: {
        id: storedUser.id,
        onboardingCompleted: true,
      },
    });
  });

  it("serializes the domain user before passing it to infrastructure", async () => {
    storageMock.write.mockResolvedValue();

    await authSessionService.persist("access-token", "refresh-token", storedUser);

    expect(storageMock.write).toHaveBeenCalledWith(
      "access-token",
      "refresh-token",
      JSON.stringify(storedUser),
    );
  });

  it("delegates token rotation and session clearing", async () => {
    storageMock.writeTokens.mockResolvedValue();
    storageMock.clear.mockResolvedValue();

    await authSessionService.persistTokens("access", "refresh");
    await authSessionService.clear();

    expect(storageMock.writeTokens).toHaveBeenCalledWith("access", "refresh");
    expect(storageMock.clear).toHaveBeenCalled();
  });
});

it("updates a stored user without overwriting rotated credentials", async () => {
  const guard = jest.fn<() => void>();
  await authSessionService.persistUser(storedUser, guard);
  expect(storageMock.writeUser).toHaveBeenCalledWith(JSON.stringify(storedUser), guard);
});
