package com.vinnot.review.domain.model;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record ReviewPublication(
        Type type,
        UUID id,
        UUID wineId,
        UUID reviewId,
        UUID authorId,
        BigDecimal rating,
        String title,
        String content,
        PublicationStatus status,
        Instant createdAt,
        Instant updatedAt,
        boolean parentApproved) {
    private static final int MAX_REASON = 2000;

    public enum Type {
        REVIEW,
        COMMENT
    }

    /**
     * A checked decision: the preset reason the author is told (rejections only) and the moderator's internal note.
     *
     * @param reasonCode why it was rejected, null for an approval
     * @param note       the moderator's note, possibly empty
     * @param legacy     a rejection from a client without reason codes (before #307): its free text was written as an
     *                   internal note, so it is never shared with the author
     */
    public record Decision(PublicationRejectionReason reasonCode, String note, boolean legacy) {
        public Decision(PublicationRejectionReason reasonCode, String note) {
            this(reasonCode, note, false);
        }

        /** The note the author may read: only a moderator who explicitly chose OTHER writes one. */
        public String authorNote() {
            return !legacy && reasonCode == PublicationRejectionReason.OTHER && !note.isBlank() ? note : null;
        }
    }

    /**
     * Checks a moderator's decision. A rejection needs a preset reason; a client that only sends a note (before #307)
     * gets {@link PublicationRejectionReason#OTHER} and its note stays internal. An approval carries no reason code.
     */
    public Decision validateDecision(UUID actor, PublicationStatus decision, PublicationRejectionReason reasonCode,
            String reason, Instant expectedRevision) {
        Objects.requireNonNull(actor, "Reviewer is required");
        Objects.requireNonNull(decision, "Decision is required");
        Objects.requireNonNull(expectedRevision, "Content revision is required");
        if (authorId.equals(actor)) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_SELF_REVIEW", "Another moderator must review this content");
        }
        if (status != PublicationStatus.PENDING || decision == PublicationStatus.PENDING) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_TRANSITION", "Only pending content can be reviewed");
        }
        if (!updatedAt.equals(expectedRevision)) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_CHANGED", "The content changed; reload it before deciding");
        }
        if (decision == PublicationStatus.APPROVED && !parentApproved) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_PARENT_PENDING", "Approve the parent review first");
        }
        String text = Objects.isNull(reason) ? "" : reason.strip();
        if (text.length() > MAX_REASON) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_REASON", "A decision note has at most 2000 characters");
        }
        if (decision == PublicationStatus.APPROVED) {
            if (Objects.nonNull(reasonCode)) {
                throw new BusinessRuleViolationException(
                        "PUBLICATION_REASON", "Only a rejection carries a reason");
            }
            return new Decision(null, text);
        }
        if (Objects.isNull(reasonCode) && text.isEmpty()) {
            throw new BusinessRuleViolationException(
                    "PUBLICATION_REASON", "A rejection needs a reason");
        }
        return Objects.isNull(reasonCode)
                ? new Decision(PublicationRejectionReason.OTHER, text, true)
                : new Decision(reasonCode, text);
    }
}
