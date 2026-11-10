import { useState } from "react";
import { communityService } from "@/application/services/community.service";

type CopyStatus = "copied" | "failed";

/** Shows a short case number, copies the full case id and remembers the outcome for that one case. */
export function useCaseIdCopy() {
  const [result, setResult] = useState<{ id: string; status: CopyStatus }>();
  async function copy(id: string) {
    try {
      await communityService.copyCaseId(id);
      setResult({ id, status: "copied" });
    } catch {
      setResult({ id, status: "failed" });
    }
  }
  return {
    shortId: communityService.shortCaseId,
    copy,
    statusFor: (id: string): CopyStatus | undefined => (result?.id === id ? result.status : undefined),
  };
}
