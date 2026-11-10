package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * Discards undelivered messages whose type limits how long their personal data may be kept, and every
 * email or push job that exhausted its attempts once the retention window passes. Exhausted jobs are never
 * replayed (a send may have reached the recipient), so after the window they only hold personal data (push payloads
 * carry display names too).
 */
@Component
public class NotificationRetention {
    private static final String PURGE_EXHAUSTED = """
            DELETE FROM external_effects WHERE kind IN (?, ?) AND attempts >= %d
            AND created_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 second')
            """.formatted(DurableEffectWorker.MAX_ATTEMPTS);
    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationRetention.class);
    private final JdbcTemplate jdbc;
    private final Duration exhaustedRetention;

    public NotificationRetention(JdbcTemplate jdbc,
            @Value("${app.notifications.exhausted-retention:30d}") Duration exhaustedRetention) {
        if (exhaustedRetention.isNegative() || exhaustedRetention.isZero()) {
            throw new IllegalArgumentException("app.notifications.exhausted-retention must be positive");
        }
        this.jdbc = jdbc;
        this.exhaustedRetention = exhaustedRetention;
    }

    @Scheduled(fixedDelayString = "${app.notifications.retention-ms:3600000}")
    @Transactional
    public void purgeExpired() {
        for (NotificationType type : NotificationType.values()) {
            type.undeliveredRetention().ifPresent(retention -> jdbc.update("""
                    DELETE FROM external_effects WHERE kind = ? AND payload->>'type' = ?
                    AND created_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 second')
                    """, OutboxNotificationAdapter.KIND, type.name(), retention.toSeconds()));
        }
        int exhausted = jdbc.update(PURGE_EXHAUSTED, OutboxNotificationAdapter.KIND, OutboxPushAdapter.KIND,
                exhaustedRetention.toSeconds());
        if (exhausted > 0) {
            LOGGER.info("Discarded {} exhausted notification or push job(s) past retention", exhausted);
        }
    }
}
