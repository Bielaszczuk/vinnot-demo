package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EngagementHistoryReaderTest {
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");
    private final EngagementLedgerPort ledger = mock(EngagementLedgerPort.class);
    private final PushOpenUseCase opens = mock(PushOpenUseCase.class);
    private final EngagementHistoryReader reader = new EngagementHistoryReader(ledger, opens);
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();

    @Test
    void historiesComeFromTwoBatchReadsAndAPushIsOpenedWhenItsRefWasOpened() {
        Instant older = NOW.minus(Duration.ofDays(9));
        when(ledger.recent(List.of(ana, bruno), EngagementHistoryReader.HISTORY_SIZE)).thenReturn(Map.of(ana, List.of(
                new LedgerEntry(ana, NotificationType.TASTE_PICK, "engagement:a", "WINE:1", NOW.minus(Duration.ofDays(2)), false),
                new LedgerEntry(ana, NotificationType.ROUTE_PICK, "engagement:b", null, older, false))));
        when(opens.opensSince(Set.of(ana), EngagementHistoryReader.ENGAGEMENT_TYPES, older)).thenReturn(List.of(
                new PushOpen(ana, "engagement:b", NotificationType.ROUTE_PICK, older.plusSeconds(60))));

        Map<UUID, EngagementHistory> histories = reader.read(List.of(ana, bruno), Map.of(ana, NOW.minus(Duration.ofDays(1))));

        assertThat(histories.get(ana).sends()).extracting(send -> send.dedupeKey() + "=" + send.opened())
                .containsExactly("engagement:a=false", "engagement:b=true");
        assertThat(histories.get(ana).lastActiveAt()).isEqualTo(NOW.minus(Duration.ofDays(1)));
        assertThat(histories.get(bruno)).isEqualTo(EngagementHistory.empty());
        assertThat(EngagementHistoryReader.ENGAGEMENT_TYPES).contains(NotificationType.WINE_RECOMMENDATION, NotificationType.WINBACK)
                .doesNotContain(NotificationType.EVENT_REMINDER, NotificationType.REVIEW_COMMENT);
    }

    @Test
    void withoutLedgerRowsOpensAreNeverRead() {
        when(ledger.recent(List.of(ana), EngagementHistoryReader.HISTORY_SIZE)).thenReturn(Map.of());

        assertThat(reader.read(List.of(ana), Map.of()).get(ana).sends()).isEmpty();

        verify(opens, never()).opensSince(any(), any(), any());
    }
}
