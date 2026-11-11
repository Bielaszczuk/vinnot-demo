const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

export function resolveApiAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (!configuredApiBaseUrl.startsWith('http')) return value

  const apiUrl = new URL(configuredApiBaseUrl)
  return new URL(value, apiUrl.origin).toString()
}


/** Resolves a user photo (`avatarUrl`); absolute URLs pass through, so it is safe to apply twice. */
export function withAvatar<T extends { avatarUrl?: string | null }>(item: T): T {
  return { ...item, avatarUrl: resolveApiAssetUrl(item.avatarUrl) }
}

/** Resolves the photo of an embedded author (`reviewer`), keeping a missing author as is. */
export function withReviewerAvatar<T extends { reviewer?: { avatarUrl?: string | null } | null }>(item: T): T {
  return item.reviewer ? { ...item, reviewer: withAvatar(item.reviewer) } : item
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
