package com.vinnot.community.domain.model;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Private moderation evidence. Only receipt projections may be returned to reporters. */
public record CommunityReport(
        UUID id,
        UUID reporterId,
        ContentTarget target,
        UUID authorId,
        Reason reason,
        String description,
        String excerpt,
        Status status,
        UUID reviewerId,
        String decision,
        Instant createdAt,
        Instant updatedAt) {
    private static final int MAX_TEXT_LENGTH = 2000;

    public enum Reason {
        SPAM,
        HARASSMENT,
        HATE,
        SEXUAL_CONTENT,
        VIOLENCE,
        PRIVACY,
        MISINFORMATION,
        OTHER
    }

    public enum Status {
        OPEN,
        IN_REVIEW,
        RESOLVED,
        DISMISSED
    }

    public static CommunityReport create(
            UUID reporter,
            ContentTarget target,
            UUID author,
            Reason reason,
            String description,
            String excerpt,
            Instant now) {
        Objects.requireNonNull(reporter);
        Objects.requireNonNull(target);
        Objects.requireNonNull(reason);
        if (reporter.equals(author)) {
            throw new BusinessRuleViolationException(
                    "SELF_REPORT", "You cannot report your own content");
        }
        String text = Objects.isNull(description) ? "" : description.strip();
        if (text.length() > MAX_TEXT_LENGTH || (reason == Reason.OTHER && text.isEmpty())) {
            throw new BusinessRuleViolationException(
                    "INVALID_REPORT_DESCRIPTION",
                    "Provide up to 2000 characters; OTHER requires details");
        }
        return new CommunityReport(
                UUID.randomUUID(),
                reporter,
                target,
                author,
                reason,
                text,
                Objects.isNull(excerpt)
                        ? ""
                        : excerpt.substring(0, Math.min(MAX_TEXT_LENGTH, excerpt.length())),
                Status.OPEN,
                null,
                null,
                now,
                now);
    }

    public CommunityReport review(UUID reviewer, Status next, String notes, Instant now) {
        Objects.requireNonNull(reviewer);
        Objects.requireNonNull(next);
        if (reviewer.equals(reporterId) || reviewer.equals(authorId)) {
            throw new BusinessRuleViolationException(
                    "REPORT_CONFLICT_OF_INTEREST", "Another moderator must review this report");
        }
        if (status == Status.RESOLVED || status == Status.DISMISSED || next == Status.OPEN) {
            throw new BusinessRuleViolationException(
                    "REPORT_TRANSITION", "Report transition is not allowed");
        }
        if (Objects.nonNull(reviewerId) && !reviewerId.equals(reviewer)) {
            throw new BusinessRuleViolationException(
                    "REPORT_ASSIGNED", "Report is assigned to another moderator");
        }
        String text = Objects.isNull(notes) ? "" : notes.strip();
        if (text.length() > MAX_TEXT_LENGTH || (next != Status.IN_REVIEW && text.isEmpty())) {
            throw new BusinessRuleViolationException(
                    "REPORT_DECISION_REQUIRED",
                    "A resolution requires a decision of up to 2000 characters");
        }
        return new CommunityReport(
                id,
                reporterId,
                target,
                authorId,
                reason,
                description,
                excerpt,
                next,
                reviewer,
                text,
                createdAt,
                now);
    }
}
