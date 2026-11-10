package com.vinnot.wine.application.service;

import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.wine.application.port.out.TasteAudience;
import com.vinnot.wine.domain.model.Wine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Tells the people whose taste matches a wine that it was added to the catalogue or featured (#306). Called only from
 * the application's own create, publish and feature paths, so bulk SQL imports never push. Each reason (a grape or the
 * type) is one request with a stable key, so featuring the same wine again soon does not repeat it; delivery keeps it
 * to one recommendation per account a week. It is an engagement push (#405): it counts toward the engagement budget
 * like the planned ones, follows the engagement send window (never 22:00 to 09:00 locally: delivery holds it until 09:00)
 * and its content ref keeps the planner from suggesting the same wine again.
 */
@Service
@RequiredArgsConstructor
public class RecommendWineService {
    /** A recommendation held back by quiet hours is still worth sending for a few days. */
    static final Duration FRESHNESS = Duration.ofDays(3);
    private final TasteAudience audience;
    private final PushNotificationPort pushes;

    public void recommend(Wine wine, Instant now) {
        if (!wine.isActive()) {
            return;
        }
        List<String> grapes = Objects.requireNonNullElse(wine.getGrapes(), List.<String>of()).stream()
                .filter(Objects::nonNull).toList();
        Map<Reason, List<UUID>> byReason = new LinkedHashMap<>();
        for (TasteAudience.Match match : audience.matching(
                new TasteAudience.Candidate(wine.getId(), wine.getCreatedBy(), wine.getWineType(), grapes))) {
            byReason.computeIfAbsent(new Reason(match.kind().name(), match.label()), ignored -> new ArrayList<>()).add(match.userId());
        }
        byReason.forEach((reason, users) -> {
            String key = "wine-recommendation:" + wine.getId() + ":"
                    + UUID.nameUUIDFromBytes((reason.kind() + ":" + reason.label()).getBytes(StandardCharsets.UTF_8));
            Map<String, String> data = Map.of("wineId", wine.getId().toString(), "wine", displayName(wine),
                    "reasonKind", reason.kind(), "reason", reason.label(),
                    NotificationType.CONTENT_REF, "WINE:" + wine.getId());
            PushRequest.batches(NotificationType.WINE_RECOMMENDATION, users, data, key, false, now.plus(FRESHNESS))
                    .forEach(pushes::push);
        });
    }

    private static String displayName(Wine wine) {
        return Objects.isNull(wine.getVintage()) ? wine.getName() : wine.getName() + " " + wine.getVintage();
    }

    private record Reason(String kind, String label) { }
}
