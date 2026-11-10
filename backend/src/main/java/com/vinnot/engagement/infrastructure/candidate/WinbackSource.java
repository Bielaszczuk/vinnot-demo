package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.ViewedContent;
import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.EngagementRules;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * WINBACK, at most two attempts per absence: after 14 days without the app, the wine most viewed by everyone lately
 * that the account has not rated or kept; after 30, how many wines were added since its last visit; then silence until
 * it returns (attempts are counted after its last visit). The most viewed wines come from the activity module once per
 * page; one statement counts attempts and picks the wine.
 */
@Component
public class WinbackSource implements CandidateSourcePort {
    static final Duration POPULAR_WINDOW = Duration.ofDays(30);
    static final int POPULAR_WINES = 20;
    private static final String SQL = """
            WITH members AS (SELECT * FROM unnest(?::uuid[], ?::text[]) AS m(user_id, seen)),
            popular AS (SELECT * FROM unnest(?::uuid[], ?::int[]) AS p(wine_id, position))
            SELECT m.user_id,
                   (SELECT count(*) FROM engagement_sends s WHERE s.user_id = m.user_id AND s.notification_type = 'WINBACK'
                      AND s.sent_at > m.seen::timestamptz) AS attempts,
                   (SELECT count(*) FROM wines nw WHERE nw.is_active AND nw.created_at > m.seen::timestamptz) AS new_wines,
                   pick.id, pick.name, pick.vintage
            FROM members m
            LEFT JOIN LATERAL (
                SELECT w.id, w.name, w.vintage FROM popular p JOIN wines w ON w.id = p.wine_id AND w.is_active
                WHERE true
            """ + CandidateSql.suggestableWine("m.user_id", "w") + """
                ORDER BY p.position LIMIT 1) AS pick ON true
            """;
    private final ReadActivitySignalsUseCase activity;
    private final JdbcTemplate jdbc;

    public WinbackSource(ReadActivitySignalsUseCase activity, JdbcTemplate jdbc) {
        this.activity = activity;
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.WINBACK;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        Instant now = query.now();
        List<PlanningMember> away = query.members().stream()
                .filter(member -> member.awayFor(EngagementRules.INACTIVE_AFTER, now)).toList();
        if (away.isEmpty()) {
            return List.of();
        }
        Map<UUID, PlanningMember> members = new HashMap<>();
        away.forEach(member -> members.put(member.userId(), member));
        List<ViewedContent> popular = activity.mostViewed(ContentKind.WINE, now.minus(POPULAR_WINDOW), POPULAR_WINES);
        Integer[] positions = new Integer[popular.size()];
        for (int index = 0; index < positions.length; index++) {
            positions[index] = index;
        }
        List<EngagementCandidate> candidates = new ArrayList<>();
        RowCallbackHandler collect = row -> {
            PlanningMember member = members.get(row.getObject("user_id", UUID.class));
            long attempts = row.getLong("attempts");
            boolean secondDue = member.awayFor(EngagementRules.SECOND_WINBACK_AFTER, now);
            if (attempts >= 2 || (attempts == 1 && !secondDue)) {
                return;
            }
            Map<String, String> data = new HashMap<>();
            String contentRef = null;
            if (attempts == 0) {
                data.put("attempt", "1");
                UUID wine = row.getObject("id", UUID.class);
                if (Objects.nonNull(wine)) {
                    data.put("wineId", wine.toString());
                    data.put("wine", CandidateSql.wineName(row, "name", "vintage"));
                    contentRef = "WINE:" + wine;
                }
            } else {
                data.put("attempt", "2");
                data.put("count", Long.toString(row.getLong("new_wines")));
            }
            candidates.add(new EngagementCandidate(member.userId(), NotificationType.WINBACK, contentRef, data,
                    CandidateSignals.fit(1)));
        };
        jdbc.query(SQL, collect, away.stream().map(PlanningMember::userId).toArray(UUID[]::new),
                away.stream().map(member -> member.lastSeenAt().toString()).toArray(String[]::new),
                popular.stream().map(ViewedContent::entityId).toArray(UUID[]::new), positions);
        return candidates;
    }
}
