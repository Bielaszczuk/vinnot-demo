package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort.RefreshTokenData;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RefreshTokenReuseResponderTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final RefreshTokenRepositoryPort tokens = mock(RefreshTokenRepositoryPort.class);
    private final ManagePushDevicesUseCase pushDevices = mock(ManagePushDevicesUseCase.class);
    private final SecurityEventRecorder events = mock(SecurityEventRecorder.class);
    private final RefreshTokenReuseResponder responder = new RefreshTokenReuseResponder(
            users, tokens, pushDevices, events, Duration.ofSeconds(30), Clock.fixed(NOW, ZoneOffset.UTC));
    private final User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

    @Test
    void aTokenRotatedLongAgoEndsEverySessionRevokesItsChainAndIsRecorded() {
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        long before = user.getSessionVersion();

        responder.replayed(rotated(NOW.minusSeconds(31)));

        assertThat(user.getSessionVersion()).isEqualTo(before + 1);
        verify(users).save(user);
        verify(tokens).revokeRotationChain("successor", RefreshTokenReuseResponder.REUSE_REASON);
        verify(pushDevices).forgetUser(user.getId());
        verify(events).record(SecurityEventType.REFRESH_REUSE_DETECTED, user.getId());
    }

    @Test
    void aParallelRefreshThatLostTheRaceIsNotTheft() {
        responder.replayed(rotated(NOW.minusSeconds(29)));

        verifyNoInteractions(users, tokens, pushDevices, events);
    }

    @Test
    void aRotationWithoutATimeOrSuccessorIsStillTreatedAsTheft() {
        when(users.findById(user.getId())).thenReturn(Optional.empty());
        var token = new RefreshTokenData(user.getId(), "old", NOW.plusSeconds(600), null, "rotated", false, 0, null);

        responder.replayed(token);

        verify(users, never()).save(any());
        verify(tokens, never()).revokeRotationChain(any(), any());
        verify(pushDevices).forgetUser(user.getId());
        verify(events).record(SecurityEventType.REFRESH_REUSE_DETECTED, user.getId());
    }

    @Test
    void theGraceMustBeZeroOrPositive() {
        assertThatThrownBy(() -> new RefreshTokenReuseResponder(users, tokens, pushDevices, events, Duration.ofSeconds(-1)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("grace-period");
        var production = new RefreshTokenReuseResponder(users, tokens, pushDevices, events, Duration.ZERO);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        production.replayed(rotated(Instant.now().minusSeconds(1)));
        verify(events).record(SecurityEventType.REFRESH_REUSE_DETECTED, user.getId());
    }

    private RefreshTokenData rotated(Instant revokedAt) {
        return new RefreshTokenData(user.getId(), "old", NOW.plusSeconds(600), revokedAt, "rotated", false, 0, "successor");
    }
}
