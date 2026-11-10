import { useState } from "react";
import { supportService } from "@/application/services/support.service";
import { formatSupportReference } from "@/domain/public/support";

export function useSupportReference(receipt?: string) {
  const reference = receipt ? formatSupportReference(receipt) : undefined;
  const [result, setResult] = useState<{ reference: string; state: "copied" | "failed" }>();
  async function copy() {
    if (!receipt || !reference) return;
    try {
      await supportService.copyReference(receipt);
      setResult({ reference, state: "copied" });
    } catch {
      setResult({ reference, state: "failed" });
    }
  }
  return {
    reference,
    copy,
    copyState: result?.reference === reference ? result?.state : undefined,
  };
}
