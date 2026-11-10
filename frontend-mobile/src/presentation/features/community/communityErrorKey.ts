import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";

const ERROR_KEYS: Record<string, string> = {
  REPORT_LIMIT: "community.errors.reportLimit",
  RATE_LIMIT_EXCEEDED: "community.errors.rateLimited",
  SELF_REPORT: "community.errors.selfReport",
  SELF_BLOCK: "community.errors.selfBlock",
  NOT_FOUND: "community.errors.notFound",
};

function readStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

/** Translation key that tells why a report or block failed and whether retrying helps. */
export function communityErrorKey(error: unknown): string {
  const code = getMutationErrorCode(error);
  if (code && ERROR_KEYS[code]) return ERROR_KEYS[code];
  const status = readStatus(error);
  if (status === 429) return ERROR_KEYS.RATE_LIMIT_EXCEEDED!;
  if (status === 404) return ERROR_KEYS.NOT_FOUND!;
  return "community.error";
}
