package com.vinnot.engagement.infrastructure.persistence;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.port.out.EngagementMetricsPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.util.EnumNames;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Engagement results in one statement over the ledger: an open is a push open of the push's ref; an opt-out is the
 * recipient's push choice for the type's category turned off within the window after the push (its latest change, as
 * {@code notification_preferences} keeps one row per category and channel). Each type is counted from its own start.
 */
@Component
public class JdbcEngagementMetrics implements EngagementMetricsPort {
    private static final String COUNTS = """
            SELECT s.notification_type,
                   count(*) FILTER (WHERE NOT s.holdout) AS sent,
                   count(*) FILTER (WHERE s.holdout) AS held_out,
                   count(*) FILTER (WHERE NOT s.holdout AND EXISTS (
                       SELECT 1 FROM push_opens o WHERE o.user_id = s.user_id AND o.ref = s.dedupe_key)) AS opened,
                   count(*) FILTER (WHERE NOT s.holdout AND EXISTS (
                       SELECT 1 FROM notification_preferences p
                       WHERE p.user_id = s.user_id AND p.category = c.category AND p.channel = 'PUSH' AND NOT p.enabled
                         AND p.updated_at >= s.sent_at AND p.updated_at < s.sent_at + (? * INTERVAL '1 second'))) AS opted_out
            FROM engagement_sends s
            JOIN unnest(?::text[], ?::text[], ?::text[]) AS c(notification_type, category, since)
                ON c.notification_type = s.notification_type AND s.sent_at >= c.since::timestamptz
            WHERE s.sent_at >= ?
            GROUP BY s.notification_type
            """;
    private final JdbcTemplate jdbc;

    public JdbcEngagementMetrics(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<NotificationType, EngagementMetrics.Counts> countsSince(Instant since, Duration optOutWindow) {
        Map<NotificationType, Instant> everyType = new EnumMap<>(NotificationType.class);
        Arrays.stream(NotificationType.values()).filter(NotificationType::engagement).forEach(type -> everyType.put(type, since));
        return countsSince(everyType, optOutWindow);
    }

    @Override
    public Map<NotificationType, EngagementMetrics.Counts> countsSince(Map<NotificationType, Instant> since, Duration optOutWindow) {
        Map<NotificationType, EngagementMetrics.Counts> counts = new EnumMap<>(NotificationType.class);
        if (since.isEmpty()) {
            return counts;
        }
        List<NotificationType> types = List.copyOf(since.keySet());
        String[] names = types.stream().map(Enum::name).toArray(String[]::new);
        String[] categories = types.stream().map(type -> type.category().name()).toArray(String[]::new);
        String[] starts = types.stream().map(type -> since.get(type).toString()).toArray(String[]::new);
        Instant earliest = since.values().stream().min(Comparator.naturalOrder()).orElseThrow();
        RowCallbackHandler collect = row -> {
            EngagementMetrics.Counts count = new EngagementMetrics.Counts(row.getLong("sent"), row.getLong("opened"),
                    row.getLong("opted_out"), row.getLong("held_out"));
            EnumNames.find(NotificationType.class, row.getString("notification_type")).ifPresent(type -> counts.put(type, count));
        };
        jdbc.query(COUNTS, collect, optOutWindow.toSeconds(), names, categories, starts, Timestamp.from(earliest));
        return counts;
    }
}
