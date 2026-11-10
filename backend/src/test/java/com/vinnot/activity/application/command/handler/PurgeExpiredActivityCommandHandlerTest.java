package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
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

class PurgeExpiredActivityCommandHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-20T03:00:00Z");
    private static final Instant CUTOFF = NOW.minus(Duration.ofDays(180));
    private final ContentViewRepositoryPort views = mock(ContentViewRepositoryPort.class);
    private final AppOpenRepositoryPort opens = mock(AppOpenRepositoryPort.class);
    private final PurgeExpiredActivityCommandHandler handler = new PurgeExpiredActivityCommandHandler(
            views, opens, Duration.ofDays(180), 2, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void deletesSignalsOlderThanTheRetentionInBatchesUntilNoneAreLeft() {
        when(views.purgeBefore(CUTOFF, 2)).thenReturn(2, 2, 1);
        when(opens.purgeBefore(CUTOFF, 2)).thenReturn(0);
        when(opens.purgeLastActiveBefore(CUTOFF, 2)).thenReturn(1);

        assertThat(handler.execute()).isEqualTo(6);

        verify(views, times(3)).purgeBefore(CUTOFF, 2);
        verify(opens).purgeBefore(CUTOFF, 2);
        verify(opens).purgeLastActiveBefore(CUTOFF, 2);
    }

    @Test
    void theRetentionAndBatchMustBePositive() {
        assertThatThrownBy(() -> new PurgeExpiredActivityCommandHandler(views, opens, Duration.ZERO, 10, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PurgeExpiredActivityCommandHandler(views, opens, Duration.ofDays(1), 0, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
