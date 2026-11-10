import { resolveHasPassword } from "@/domain/user/user.mappers";
import type { User } from "@/domain/user/user.types";
import { authSessionStorage } from "@/infrastructure/storage/authSession.storage";

export interface StoredAuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    (typeof candidate.avatarUrl === "string" || candidate.avatarUrl === null) &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role) => typeof role === "string") &&
    typeof candidate.emailVerified === "boolean" &&
    (candidate.onboardingCompleted === undefined ||
      typeof candidate.onboardingCompleted === "boolean") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

async function parseStoredUser(serializedUser: string | null): Promise<User | null> {
  if (!serializedUser) return null;

  try {
    const parsed: unknown = JSON.parse(serializedUser);
    if (isStoredUser(parsed)) {
      return {
        ...parsed,
        firstName: parsed.firstName ?? parsed.name,
        lastName: parsed.lastName ?? "",
        hasSocialIdentity: parsed.hasSocialIdentity ?? false,
        hasPassword: resolveHasPassword(parsed.hasPassword, parsed.hasSocialIdentity),
        socialProviders: parsed.socialProviders ?? [],
        onboardingCompleted: parsed.onboardingCompleted ?? true,
      };
    }
  } catch {
    // Invalid persisted data is removed below.
  }

  await authSessionStorage.removeUser();
  return null;
}

export const authSessionService = {
  async restore(): Promise<StoredAuthSession> {
    const stored = await authSessionStorage.read();
    return {
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      user: await parseStoredUser(stored.serializedUser),
    };
  },

  persist(accessToken: string, refreshToken: string | null, user: User): Promise<void> {
    return authSessionStorage.write(accessToken, refreshToken, JSON.stringify(user));
  },

  persistTokens(accessToken: string, refreshToken: string): Promise<void> {
    return authSessionStorage.writeTokens(accessToken, refreshToken);
  },

  persistUser(user: User, assertCurrent: () => void): Promise<void> {
    return authSessionStorage.writeUser(JSON.stringify(user), assertCurrent);
  },

  prepareRotation: authSessionStorage.prepareRotation,
  completeRotation: authSessionStorage.completeRotation,

  clear(): Promise<void> {
    return authSessionStorage.clear();
  },
};
