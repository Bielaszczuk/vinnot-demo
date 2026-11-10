/** Expo Router gives a repeated query param as an array; screens read its first value. */
export function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
