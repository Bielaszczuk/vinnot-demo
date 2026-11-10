package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Array;
import java.sql.SQLException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * ONBOARDING, once each, for accounts in their first two weeks (days counted in the account's time zone): step 1 from
 * day 1 (scan a label), step 2 from day 3 while it rated fewer than three wines, step 3 from day 7 (a first suggestion:
 * the most rated wine it has not rated or kept). A step whose days passed is skipped, so the steps never pile up.
 */
@Component
public class OnboardingSource implements CandidateSourcePort {
    static final int STEP_TWO_DAY = 3;
    static final int STEP_THREE_DAY = 7;
    static final int LAST_DAY = 14;
    static final int RATED_ENOUGH = 3;
    static final int SUGGESTION_STEP = 3;
    private static final int TOP_WINES = 10;
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            top AS (SELECT w.id, w.name, w.vintage, w.created_by,
                           row_number() OVER (ORDER BY w.rating_count DESC, w.rating_average DESC, w.id) AS position
                    FROM wines w WHERE w.is_active ORDER BY w.rating_count DESC, w.rating_average DESC, w.id LIMIT ?)
            SELECT m.user_id,
                   (SELECT count(*) FROM reviews r WHERE r.user_id = m.user_id AND r.publication_status <> 'REJECTED')
                   + (SELECT count(*) FROM cellar_wines c WHERE c.user_id = m.user_id AND c.rating_decimal IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = c.user_id AND r.wine_id = c.wine_id)) AS rated,
                   ARRAY(SELECT s.content_ref FROM engagement_sends s
                         WHERE s.user_id = m.user_id AND s.content_ref LIKE 'ONBOARDING:%') AS steps,
                   pick.id, pick.name, pick.vintage
            FROM members m
            LEFT JOIN LATERAL (SELECT t.* FROM top t WHERE true
            """ + CandidateSql.suggestableWine("m.user_id", "t") + """
                ORDER BY t.position LIMIT 1) AS pick ON true
            """;
    private final JdbcTemplate jdbc;

    public OnboardingSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.ONBOARDING;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        Map<UUID, Integer> steps = new HashMap<>();
        for (PlanningMember member : query.members()) {
            long day = ChronoUnit.DAYS.between(member.createdAt().atZone(member.zone()).toLocalDate(),
                    query.now().atZone(member.zone()).toLocalDate());
            if (day >= 1 && day < LAST_DAY) {
                steps.put(member.userId(), day < STEP_TWO_DAY ? 1 : day < STEP_THREE_DAY ? 2 : SUGGESTION_STEP);
            }
        }
        if (steps.isEmpty()) {
            return List.of();
        }
        List<EngagementCandidate> candidates = new ArrayList<>();
        RowCallbackHandler collect = row -> {
            UUID user = row.getObject("user_id", UUID.class);
            int step = steps.get(user);
            Set<String> sent = refs(row.getArray("steps"));
            if (sent.contains("ONBOARDING:" + step) || (step == 2 && row.getInt("rated") >= RATED_ENOUGH)) {
                return;
            }
            Map<String, String> data = new HashMap<>(Map.of("step", Integer.toString(step)));
            UUID wine = row.getObject("id", UUID.class);
            if (step == SUGGESTION_STEP && Objects.nonNull(wine)) {
                data.put("wineId", wine.toString());
                data.put("wine", CandidateSql.wineName(row, "name", "vintage"));
            }
            candidates.add(new EngagementCandidate(user, NotificationType.ONBOARDING, "ONBOARDING:" + step, data,
                    CandidateSignals.fit(1)));
        };
        jdbc.query(SQL, collect, steps.keySet().toArray(UUID[]::new), TOP_WINES);
        return candidates;
    }

    private static Set<String> refs(Array array) throws SQLException {
        return Objects.isNull(array) ? Set.of() : new HashSet<>(Arrays.asList((String[]) array.getArray()));
    }
}
