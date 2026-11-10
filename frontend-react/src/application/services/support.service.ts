import { copySupportReference } from "@/infrastructure/support/clipboard";
import { supportClient } from "@/infrastructure/api/clients/support.client";
import { createSupportRequestId } from "@/infrastructure/support/requestId";
import {
  formatSupportReference, isSupportMessageValid,
  type SupportSubmission,
} from "@/domain/public/support";

export const supportService = {
  newRequestId: createSupportRequestId,
  copyReference(requestId: string): Promise<void> {
    return copySupportReference(formatSupportReference(requestId));
  },
  async submit(request: SupportSubmission): Promise<string> {
    if (!isSupportMessageValid(request))
      throw new Error("INVALID_SUPPORT_REQUEST");
    const receipt = await supportClient.submit(request);
    if (receipt.requestId !== request.requestId)
      throw new Error("INVALID_SUPPORT_RECEIPT");
    return receipt.requestId;
  },
};
