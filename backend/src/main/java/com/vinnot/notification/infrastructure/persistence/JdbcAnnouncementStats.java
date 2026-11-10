package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.domain.model.AnnouncementRef;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

/**
 * The {@code announcement_delivery_stats} table (#490). Each count is one upsert that adds to the stored value in the
 * database ({@code SET x = x + EXCLUDED.x}), so concurrent jobs never overwrite each other's counts. The row is only
 * created for an announcement that exists, so an unknown id is ignored instead of failing.
 */
@Component
public class JdbcAnnouncementStats implements AnnouncementStatsPort {
    private static final String ADD = """
            INSERT INTO announcement_delivery_stats (announcement_id, emails_sent, emails_failed, pushes_sent, pushes_failed,
                pushes_opened)
            SELECT id, ?, ?, ?, ?, ? FROM announcements WHERE id = ?
            ON CONFLICT (announcement_id) DO UPDATE SET
                emails_sent = announcement_delivery_stats.emails_sent + EXCLUDED.emails_sent,
                emails_failed = announcement_delivery_stats.emails_failed + EXCLUDED.emails_failed,
                pushes_sent = announcement_delivery_stats.pushes_sent + EXCLUDED.pushes_sent,
                pushes_failed = announcement_delivery_stats.pushes_failed + EXCLUDED.pushes_failed,
                pushes_opened = announcement_delivery_stats.pushes_opened + EXCLUDED.pushes_opened
            """;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public JdbcAnnouncementStats(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void recordEmail(UUID announcementId, int sent, int failed) {
        if (sent > 0 || failed > 0) {
            ownTransaction.executeWithoutResult(status -> jdbc.update(ADD, sent, failed, 0, 0, 0, announcementId));
        }
    }

    @Override
    public void recordPush(UUID announcementId, int sent, int failed) {
        if (sent > 0 || failed > 0) {
            ownTransaction.executeWithoutResult(status -> jdbc.update(ADD, 0, 0, sent, failed, 0, announcementId));
        }
    }

    @Override
    public void recordPushOpen(AnnouncementRef announcement, UUID userId, String openedRef) {
        jdbc.update("""
                INSERT INTO announcement_delivery_stats (announcement_id, pushes_opened)
                SELECT id, 1 FROM announcements WHERE id = ? AND NOT EXISTS (
                    SELECT 1 FROM push_opens WHERE user_id = ? AND starts_with(ref, ?) AND ref <> ?)
                ON CONFLICT (announcement_id) DO UPDATE
                SET pushes_opened = announcement_delivery_stats.pushes_opened + 1
                """, announcement.announcementId(), userId, announcement.prefix(), openedRef);
    }
}
