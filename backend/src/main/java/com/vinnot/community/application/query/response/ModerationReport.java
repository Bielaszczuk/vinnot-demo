package com.vinnot.community.application.query.response;

import com.vinnot.community.application.port.out.CommunityTargetPort.ModerationNames;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * A report as moderators see it: every report field plus the names behind its ids. A name is null
 * when its user or content was deleted or is missing. A catalog quality report has no reporter and names the other
 * wine of the pair in {@code relatedTargetId} and {@code relatedTargetLabel}.
 */
public record ModerationReport(
        UUID id,
        UUID reporterId,
        ContentTarget target,
        UUID authorId,
        CommunityReport.Reason reason,
        String description,
        String excerpt,
        CommunityReport.Status status,
        UUID reviewerId,
        String decision,
        Instant createdAt,
        Instant updatedAt,
        String authorUsername,
        String reviewerUsername,
        String targetLabel,
        UUID relatedTargetId,
        String relatedTargetLabel) {
    public static ModerationReport from(CommunityReport report, ModerationNames names) {
        return new ModerationReport(
                report.id(),
                report.reporterId(),
                report.target(),
                report.authorId(),
                report.reason(),
                report.description(),
                report.excerpt(),
                report.status(),
                report.reviewerId(),
                report.decision(),
                report.createdAt(),
                report.updatedAt(),
                username(names, report.authorId()),
                username(names, report.reviewerId()),
                names.targetLabels().get(report.target()),
                report.relatedTargetId(),
                relatedTarget(report).map(names.targetLabels()::get).orElse(null));
    }

    /** The other wine of a catalog quality report, the only kind of report with a related target. */
    public static Optional<ContentTarget> relatedTarget(CommunityReport report) {
        return Optional.ofNullable(report.relatedTargetId())
                .map(id -> new ContentTarget(ContentTarget.Type.WINE, id));
    }

    private static String username(ModerationNames names, UUID user) {
        return Objects.isNull(user) ? null : names.usernames().get(user);
    }
}
