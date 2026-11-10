package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.engagement.domain.model.EngagementSend;
import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Builds the engagement histories of many accounts in two queries: their latest ledger rows and the opens of those
 * pushes (a push counts as opened when the account opened its ref).
 */
@Service
public class EngagementHistoryReader {
    /** Ten weeks at two a week: enough for the weekly budget, fatigue, the 4-week pause and every type's cadence. */
    static final int HISTORY_SIZE = 20;
    static final Set<NotificationType> ENGAGEMENT_TYPES = EnumSet.copyOf(
            Arrays.stream(NotificationType.values()).filter(NotificationType::engagement).toList());
    private final EngagementLedgerPort ledger;
    private final PushOpenUseCase opens;

    public EngagementHistoryReader(EngagementLedgerPort ledger, PushOpenUseCase opens) {
        this.ledger = ledger;
        this.opens = opens;
    }

    /** One history per requested account; {@code lastActive} holds when each account last opened the app. */
    public Map<UUID, EngagementHistory> read(Collection<UUID> userIds, Map<UUID, Instant> lastActive) {
        Map<UUID, List<LedgerEntry>> rows = ledger.recent(userIds, HISTORY_SIZE);
        Optional<Instant> oldest = rows.values().stream().flatMap(List::stream).map(LedgerEntry::sentAt)
                .min(Comparator.naturalOrder());
        Set<String> opened = new HashSet<>();
        oldest.ifPresent(since -> opens.opensSince(rows.keySet(), ENGAGEMENT_TYPES, since)
                .forEach(open -> opened.add(key(open.userId(), open.ref()))));
        Map<UUID, EngagementHistory> histories = new HashMap<>();
        for (UUID userId : userIds) {
            List<EngagementSend> sends = rows.getOrDefault(userId, List.of()).stream()
                    .map(row -> new EngagementSend(row.type(), row.dedupeKey(), row.contentRef(), row.sentAt(),
                            row.holdout(), opened.contains(key(userId, row.dedupeKey()))))
                    .toList();
            histories.put(userId, new EngagementHistory(sends, lastActive.get(userId)));
        }
        return histories;
    }

    private static String key(UUID userId, String ref) {
        return userId + " " + ref;
    }
}
