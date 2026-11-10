package com.vinnot.user.infrastructure.persistence.adapter;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.UUID;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Maintains persisted projections affected by FK cascades within the caller's transaction. */
@Component
@RequiredArgsConstructor
public class AccountDeletionIntegrity {
    private final JdbcTemplate jdbc;
    private final DurableEffectQueue effects;

    public void delete(UUID userId, Runnable deletion) {
        // Block new FK references before taking the snapshot of affected aggregates.
        if (jdbc.queryForList("SELECT id FROM users WHERE id = ? FOR UPDATE", UUID.class, userId).isEmpty()) {
            return;
        }
        final var wines = jdbc.queryForList("""
                SELECT id FROM wines WHERE id IN (SELECT wine_id FROM reviews WHERE user_id = ?)
                ORDER BY id FOR UPDATE
                """, UUID.class, userId);
        final var events = jdbc.queryForList("""
                SELECT id FROM events WHERE id IN (SELECT event_id FROM event_registrations WHERE user_id = ?)
                ORDER BY id FOR UPDATE
                """, UUID.class, userId);
        final var reviews = jdbc.queryForList("""
                SELECT id FROM reviews WHERE id IN (SELECT review_id FROM review_likes WHERE user_id = ?)
                ORDER BY id FOR UPDATE
                """, UUID.class, userId);
        String avatar = jdbc.queryForObject("SELECT profile_image_url FROM users WHERE id = ?", String.class, userId);
        if (Objects.nonNull(avatar) && !avatar.isBlank()) {
            effects.enqueue("avatar-cleanup", "deleted-avatar:" + userId,
                    Map.of("owner", userId.toString(), "url", avatar), Duration.ZERO);
        }
        var labels = jdbc.queryForList("SELECT id FROM wine_submissions WHERE submitted_by = ?", UUID.class, userId);
        for (UUID label : labels) {
            for (String kind : List.of("public-label-cleanup", "quarantine-cleanup")) {
                effects.enqueue(kind, "deleted-user:" + kind + ":" + label,
                        Map.of("owner", label.toString()), Duration.ZERO);
            }
        }
        deletion.run();
        for (UUID wine : wines) {
            jdbc.update("""
                    UPDATE wines SET rating_count = (SELECT COUNT(*) FROM reviews WHERE wine_id = ? AND publication_status='APPROVED'),
                    rating_average = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE wine_id = ? AND publication_status='APPROVED') WHERE id = ?
                    """, wine, wine, wine);
        }
        for (UUID event : events) {
            jdbc.update("""
                    UPDATE events SET current_attendees = (
                      SELECT COALESCE(SUM(attendee_count), 0) FROM event_registrations
                      WHERE event_id = ? AND status = 'CONFIRMED'),
                    held_attendees = (
                      SELECT COALESCE(SUM(attendee_count), 0) FROM event_registrations
                      WHERE event_id = ? AND status IN ('AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION'))
                    WHERE id = ?
                    """, event, event, event);
            jdbc.update("""
                    UPDATE events SET status = 'PUBLISHED' WHERE id = ? AND status = 'SOLD_OUT'
                    AND (max_attendees IS NULL OR current_attendees + held_attendees < max_attendees)
                    """, event);
        }
        for (UUID review : reviews) {
            jdbc.update("UPDATE reviews SET likes_count = (SELECT COUNT(*) FROM review_likes WHERE review_id = ?) WHERE id = ?",
                    review, review);
        }
    }
}
