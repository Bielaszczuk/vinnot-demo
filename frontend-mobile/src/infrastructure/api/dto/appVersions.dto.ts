/** Contract of `GET /app-versions/minimum` (public, inside `ApiResponseWrapper`). */
export interface MinimumAppVersionsDto {
  ios: string | null;
  android: string | null;
}
