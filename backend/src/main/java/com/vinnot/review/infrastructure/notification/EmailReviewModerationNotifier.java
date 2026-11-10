package com.vinnot.review.infrastructure.notification;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Queues the moderation emails for authors. The author's language and address are resolved at delivery; Spanish is
 * only the fallback. The wine is named as the catalogue shows it.
 */
@Component
@RequiredArgsConstructor
public class EmailReviewModerationNotifier implements ReviewModerationNotifier {
    private final NotificationPort notifications;
    private final JdbcTemplate jdbc;

    @Override
    public void publicationDecided(ReviewPublication content, PublicationStatus status, ReviewPublication.Decision decision,
            Instant at) {
        Map<String, String> data = new HashMap<>(Map.of("kind", content.type().name(), "status", status.name(),
                "wineId", content.wineId().toString(), "wineName", wineName(content)));
        if (Objects.nonNull(decision.reasonCode())) {
            data.put("reasonCode", decision.reasonCode().name());
            if (Objects.nonNull(decision.authorNote())) {
                data.put("note", decision.authorNote());
            }
        }
        notifications.enqueue(NotificationRequest.of(NotificationType.REVIEW_PUBLICATION_DECISION,
                NotificationRecipient.user(content.authorId()), NotificationLocale.ES, data,
                "review-publication:" + content.type() + ":" + content.id() + ":" + at.toEpochMilli()));
    }

    @Override
    public void contentRemoved(ReviewPublication.Type kind, UUID contentId, UUID authorId, String reportReason) {
        String sql = kind == ReviewPublication.Type.REVIEW
                ? "SELECT w.id, w.name FROM reviews r JOIN wines w ON w.id = r.wine_id WHERE r.id = ?"
                : "SELECT w.id, w.name FROM review_comments c JOIN reviews r ON r.id = c.review_id"
                        + " JOIN wines w ON w.id = r.wine_id WHERE c.id = ?";
        Map<String, String> data = new HashMap<>(Map.of("kind", kind.name()));
        jdbc.query(sql, row -> {
            data.put("wineId", row.getString("id"));
            data.put("wineName", row.getString("name"));
        }, contentId);
        data.putIfAbsent("wineName", "Vinnot");
        if (Objects.nonNull(reportReason)) {
            data.put("reportReason", reportReason);
        }
        notifications.enqueue(NotificationRequest.of(NotificationType.CONTENT_REMOVED, NotificationRecipient.user(authorId),
                NotificationLocale.ES, data, "content-removed:" + kind + ":" + contentId));
    }

    private String wineName(ReviewPublication content) {
        return jdbc.queryForList("SELECT name FROM wines WHERE id = ?", String.class, content.wineId()).stream()
                .findFirst().orElse("Vinnot");
    }
}
