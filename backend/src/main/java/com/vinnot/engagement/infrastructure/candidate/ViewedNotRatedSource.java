package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.ViewedContent;
import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * VIEWED_NOT_RATED: a wine the account opened at least twice in the last 30 days, last 5 to 10 days ago, and has not
 * rated, kept or been asked about. The views come from the activity module in one batch; one statement then keeps the
 * suggestable wines and their names.
 */
@Component
public class ViewedNotRatedSource implements CandidateSourcePort {
    static final Duration VIEW_WINDOW = Duration.ofDays(30);
    static final Duration EARLIEST = Duration.ofDays(5);
    static final Duration LATEST = Duration.ofDays(10);
    static final int MIN_VIEWS = 2;
    /** Views for a full fit. */
    private static final double FULL_FIT_VIEWS = 5.0;
    private static final String SQL = """
            SELECT pair.user_id, w.id, w.name, w.vintage
            FROM unnest(?::uuid[], ?::uuid[]) AS pair(user_id, wine_id)
            JOIN wines w ON w.id = pair.wine_id AND w.is_active
            WHERE true
            """ + CandidateSql.suggestableWine("pair.user_id", "w");
    private final ReadActivitySignalsUseCase activity;
    private final JdbcTemplate jdbc;

    public ViewedNotRatedSource(ReadActivitySignalsUseCase activity, JdbcTemplate jdbc) {
        this.activity = activity;
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.VIEWED_NOT_RATED;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        Instant now = query.now();
        List<UUID> users = new ArrayList<>();
        List<UUID> wines = new ArrayList<>();
        Map<String, ViewedContent> viewed = new HashMap<>();
        activity.viewsSince(query.members().stream().map(member -> member.userId()).toList(), ContentKind.WINE,
                now.minus(VIEW_WINDOW)).forEach((user, views) -> views.stream()
                .filter(view -> view.views() >= MIN_VIEWS && !view.lastViewedAt().isAfter(now.minus(EARLIEST))
                        && !view.lastViewedAt().isBefore(now.minus(LATEST)))
                .forEach(view -> {
                    users.add(user);
                    wines.add(view.entityId());
                    viewed.put(user + " " + view.entityId(), view);
                }));
        if (users.isEmpty()) {
            return List.of();
        }
        Map<UUID, EngagementCandidate> best = new HashMap<>();
        RowCallbackHandler collect = row -> {
            UUID user = row.getObject("user_id", UUID.class);
            UUID wine = row.getObject("id", UUID.class);
            ViewedContent view = viewed.get(user + " " + wine);
            EngagementCandidate candidate = new EngagementCandidate(user, NotificationType.VIEWED_NOT_RATED, "WINE:" + wine,
                    Map.of("wineId", wine.toString(), "wine", CandidateSql.wineName(row, "name", "vintage")),
                    new CandidateSignals(Math.min(1, view.views() / FULL_FIT_VIEWS), null, false,
                            Duration.between(view.lastViewedAt(), now)));
            best.merge(user, candidate, (kept, other) -> Comparator.comparingDouble(EngagementCandidate::score)
                    .compare(kept, other) >= 0 ? kept : other);
        };
        jdbc.query(SQL, collect, users.toArray(UUID[]::new), wines.toArray(UUID[]::new));
        return List.copyOf(best.values());
    }
}
