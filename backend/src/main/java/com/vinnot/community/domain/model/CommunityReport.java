package com.vinnot.community.domain.model;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Private moderation evidence. Only receipt projections may be returned to reporters. A member files a report about
 * public content; Vinnot itself files catalog quality reports, which have no reporter and may name a related wine.
 */
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
        Instant updatedAt,
        UUID relatedTargetId) {
    private static final int MAX_TEXT_LENGTH = 2000;
    static final String EXACT_MATCH_CORRECTED =
            "Scan exact match corrected by a member: possible duplicate, wrong winery or wrong image";

    public enum Reason {
        SPAM,
        HARASSMENT,
        HATE,
        SEXUAL_CONTENT,
        VIOLENCE,
        PRIVACY,
        MISINFORMATION,
        OTHER,
        /** Filed only by Vinnot about a catalog wine; members cannot choose it. */
        CATALOG_QUALITY
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
        requireMemberReportable(target, reason);
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
                bounded(excerpt),
                Status.OPEN,
                null,
                null,
                now,
                now,
                null);
    }

    /** Wines and the catalog quality reason are reserved for reports Vinnot files itself. */
    public static void requireMemberReportable(ContentTarget target, Reason reason) {
        Objects.requireNonNull(target);
        Objects.requireNonNull(reason);
        if (target.type() == ContentTarget.Type.WINE || reason == Reason.CATALOG_QUALITY) {
            throw new BusinessRuleViolationException(
                    "REPORT_NOT_ALLOWED", "Members cannot file this kind of report");
        }
    }

    /**
     * A member corrected an exact label scan match: the matched wine and the wine they picked may be duplicates, or
     * one of them may have the wrong winery or image. The report has no reporter and changes no catalog data.
     */
    public static CommunityReport exactMatchCorrected(
            UUID matchedWineId, UUID chosenWineId, String excerpt, Instant now) {
        Objects.requireNonNull(matchedWineId);
        Objects.requireNonNull(chosenWineId);
        if (matchedWineId.equals(chosenWineId)) {
            throw new BusinessRuleViolationException(
                    "CATALOG_QUALITY_SAME_WINE", "A catalog quality report needs two different wines");
        }
        return new CommunityReport(
                UUID.randomUUID(),
                null,
                new ContentTarget(ContentTarget.Type.WINE, matchedWineId),
                null,
                Reason.CATALOG_QUALITY,
                EXACT_MATCH_CORRECTED,
                bounded(excerpt),
                Status.OPEN,
                null,
                null,
                now,
                now,
                chosenWineId);
    }

    private static String bounded(String excerpt) {
        return Objects.isNull(excerpt)
                ? ""
                : excerpt.substring(0, Math.min(MAX_TEXT_LENGTH, excerpt.length()));
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
                now,
                relatedTargetId);
    }
}
