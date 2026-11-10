package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecordAppOpenCommandHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-20T18:30:00Z");
    private static final Duration GAP = Duration.ofMinutes(30);
    private final AppOpenRepositoryPort opens = mock(AppOpenRepositoryPort.class);
    private final RecordAppOpenCommandHandler handler =
            new RecordAppOpenCommandHandler(opens, GAP, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void recordsTheOpenUnlessOneWasRecordedWithinTheGap() {
        UUID user = UUID.randomUUID();
        when(opens.recordOpen(user, NOW, GAP)).thenReturn(true, false);

        assertThat(handler.execute(new RecordAppOpenCommand(user))).isTrue();
        assertThat(handler.execute(new RecordAppOpenCommand(user))).as("throttled").isFalse();
        verify(opens, times(2)).recordOpen(user, NOW, GAP);
    }

    @Test
    void theGapMustBePositive() {
        assertThatThrownBy(() -> new RecordAppOpenCommandHandler(opens, Duration.ZERO, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RecordAppOpenCommand(null)).isInstanceOf(NullPointerException.class);
    }
}
