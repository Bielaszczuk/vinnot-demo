/** Preserve omitted values; make intentional null clears explicit in partial updates. */
export function toPatchRequest<T extends object>(payload: T): T & { clearFields: string[] } {
  return {
    ...payload,
    clearFields: Object.entries(payload)
      .filter(([, value]) => value === null)
      .map(([field]) => field),
  };
}
