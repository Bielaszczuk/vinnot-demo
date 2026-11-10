package com.vinnot.community.application.command.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinnot.community.application.port.out.ClosedReportRetentionPort;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

class PurgeClosedReportsCommandHandlerTest {
    @Test
    void usesTheCloseRetentionWindowAndBoundsEachBatch() {
        var port = mock(ClosedReportRetentionPort.class);
        Instant now = Instant.parse("2026-10-01T00:00:00Z");
        when(port.deleteClosedBefore(now.minus(Duration.ofDays(90)), 500)).thenReturn(3);
        assertThat(
                        new PurgeClosedReportsCommandHandler(port, Clock.fixed(now, ZoneOffset.UTC))
                                .execute())
                .isEqualTo(3);
        verify(port).deleteClosedBefore(now.minus(Duration.ofDays(90)), 500);
        assertThat(new PurgeClosedReportsCommandHandler(port).execute()).isZero();
    }
}
