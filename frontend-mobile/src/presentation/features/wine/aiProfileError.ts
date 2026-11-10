import { resolveIllustratedState } from "@/presentation/feedback/illustratedState";

/** Translated message for a failed profile generation; transport text never reaches the UI. */
export function aiProfileGenerationErrorKey(error: unknown): string {
  switch (resolveIllustratedState(error)) {
    case "timeout":
      return "aiProfile.errors.timeout";
    case "rateLimit":
      return "aiProfile.errors.rateLimit";
    case "offline":
      return "aiProfile.errors.network";
    default:
      return "aiProfile.errors.generic";
  }
}
