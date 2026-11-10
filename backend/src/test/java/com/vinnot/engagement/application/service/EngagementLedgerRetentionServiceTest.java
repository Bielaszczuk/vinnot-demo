package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EngagementLedgerRetentionServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");

    @Test
    void deletesInBatchesUntilAShortOne() {
        EngagementLedgerPort ledger = mock(EngagementLedgerPort.class);
        Instant before = NOW.minus(Duration.ofDays(365));
        when(ledger.purgeBefore(before, EngagementLedgerRetentionService.BATCH_SIZE))
                .thenReturn(EngagementLedgerRetentionService.BATCH_SIZE, 7);

        assertThat(new EngagementLedgerRetentionService(ledger, Duration.ofDays(365)).purge(NOW))
                .isEqualTo(EngagementLedgerRetentionService.BATCH_SIZE + 7);
        verify(ledger, times(2)).purgeBefore(before, EngagementLedgerRetentionService.BATCH_SIZE);
    }

    @Test
    void theLedgerKeepsAtLeastTheFiveWeeksThePauseRuleNeeds() {
        assertThatThrownBy(() -> new EngagementLedgerRetentionService(mock(EngagementLedgerPort.class), Duration.ofDays(20)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
