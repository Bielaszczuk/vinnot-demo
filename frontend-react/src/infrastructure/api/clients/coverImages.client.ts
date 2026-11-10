import { http } from "@infrastructure/http/http";
import type { CoverImageDto, CoverImageKindDto } from "@infrastructure/api/dto/coverImages.dto";

export const coverImagesClient = {
  async upload(file: File, kind: CoverImageKindDto, signal: AbortSignal): Promise<CoverImageDto> {
    const data = new FormData();
    data.append("file", file);
    data.append("kind", kind);
    return (await http.post<CoverImageDto>("/uploads/covers", data, {
      signal, headers: { "Content-Type": "multipart/form-data" },
    })).data;
  },
  async preview(url: string, signal: AbortSignal): Promise<Blob> {
    return (await http.get<Blob>(managedPath(url), { signal, responseType: "blob" })).data;
  },
};

function managedPath(value: string): string {
  // Only Vinnot API hosts (or the configured one, e.g. a local backend) may receive credentials.
  const origin = configuredOrigin();
  const path = (origin && value.startsWith(origin + "/") ? value.slice(origin.length) : value)
    .replace(/^https:\/\/api(?:-dev)?\.vinnot\.com/, "");
  if (!/^\/api\/uploads\/covers\/[0-9a-f-]{36}\.webp$/.test(path)) throw new Error("INVALID_COVER_REFERENCE");
  return path.slice("/api".length);
}

function configuredOrigin(): string | null {
  try { return new URL(http.defaults?.baseURL ?? "").origin; } catch { return null; }
}
