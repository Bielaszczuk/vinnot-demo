package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.port.out.SecurityEventPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PurgeExpiredSecurityEventsCommandHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-29T03:00:00Z");
    private static final Instant CUTOFF = NOW.minus(Duration.ofDays(180));
    private final SecurityEventPort events = mock(SecurityEventPort.class);

    @Test
    void deletesEventsOlderThan180DaysInBatchesUntilABatchComesBackShort() {
        when(events.purgeBefore(CUTOFF, 2)).thenReturn(2, 2, 1);
        var handler = new PurgeExpiredSecurityEventsCommandHandler(events, Duration.ofDays(180), 2, Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(handler.execute()).isEqualTo(5);
        verify(events, times(3)).purgeBefore(CUTOFF, 2);
    }

    @Test
    void rejectsARetentionOrBatchThatWouldDeleteEverythingOrNothing() {
        assertThatThrownBy(() -> new PurgeExpiredSecurityEventsCommandHandler(events, Duration.ZERO, 10))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("app.security.events.retention");
        assertThatThrownBy(() -> new PurgeExpiredSecurityEventsCommandHandler(events, Duration.ofDays(-1), 10))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("app.security.events.retention");
        assertThatThrownBy(() -> new PurgeExpiredSecurityEventsCommandHandler(events, Duration.ofDays(180), 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("purge-batch-size");
    }
}
