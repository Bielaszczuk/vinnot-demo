import { env } from "@/shared/config/env";

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:|file:)/i;

/**
 * Resolves backend-owned asset paths into URLs React Native can load.
 * The backend may return paths such as `/api/uploads/avatars/...`.
 */
export function resolveApiAssetUrl(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (ABSOLUTE_URL_PATTERN.test(normalized)) return normalized;

  try {
    const apiUrl = new URL(env.apiBaseUrl);
    if (normalized.startsWith("/")) {
      return new URL(normalized, apiUrl.origin).toString();
    }
    return new URL(normalized, `${env.apiBaseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return normalized;
  }
}

export function resolveUserAssetUrls<
  T extends {
    avatar?: string | null;
    avatarUrl?: string | null;
    profileImageUrl?: string | null;
  },
>(user: T): T {
  return {
    ...user,
    ...("avatar" in user ? { avatar: resolveApiAssetUrl(user.avatar) } : {}),
    ...("avatarUrl" in user ? { avatarUrl: resolveApiAssetUrl(user.avatarUrl) } : {}),
    ...("profileImageUrl" in user
      ? { profileImageUrl: resolveApiAssetUrl(user.profileImageUrl) }
      : {}),
  };
}


/** Resolve catalog media at the HTTP boundary, preserving the DTO shape. */
export function resolveWineAssetUrls<T extends object>(wine: T): T {
  const resolved = { ...wine };
  for (const field of ["imageUrl", "bottleImageUrl"] as const) {
    if (!(field in resolved)) continue;
    const value = (resolved as Record<string, unknown>)[field];
    if (typeof value === "string" || value === null) {
      Object.assign(resolved, { [field]: resolveApiAssetUrl(value) });
    }
  }
  return resolved;
}

/** Image resolution must not alter pagination metadata or response conventions. */
export function resolveWinePageAssetUrls<T extends { items?: object[]; content?: object[] }>(page: T): T {
  return {
    ...page,
    ...(page.items ? { items: page.items.map(resolveWineAssetUrls) } : {}),
    ...(page.content ? { content: page.content.map(resolveWineAssetUrls) } : {}),
  };
}

export function resolveCellarAssetUrls<T extends { wine: Record<string, unknown> }>(entry: T): T {
  return { ...entry, wine: resolveWineAssetUrls(entry.wine) };
}
