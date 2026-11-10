/**
 * Review publication decisions — builds what a moderator sends when approving or
 * rejecting a review or comment.
 *
 * A rejection always carries a one-tap preset reason the author is told. A free-text
 * detail only exists for `OTHER`; an approval carries neither.
 */

import type {
  PublicationDecision,
  PublicationRejectionReason,
  ReviewPublication,
} from "./community.types";

export function allowsPublicationNote(
  reasonCode: PublicationRejectionReason,
): boolean {
  return reasonCode === "OTHER";
}

/** Builds the decision for the exact revision shown; the note is trimmed and kept only for `OTHER`. */
export function toPublicationDecision(
  item: Pick<ReviewPublication, "type" | "id" | "revision">,
  status: PublicationDecision["status"],
  reasonCode: PublicationRejectionReason,
  note: string,
): PublicationDecision {
  const target = {
    type: item.type,
    id: item.id,
    expectedRevision: item.revision,
  };
  if (status === "APPROVED") return { ...target, status };
  const trimmed = note.trim();
  return allowsPublicationNote(reasonCode) && trimmed
    ? { ...target, status, reasonCode, reason: trimmed }
    : { ...target, status, reasonCode };
}
