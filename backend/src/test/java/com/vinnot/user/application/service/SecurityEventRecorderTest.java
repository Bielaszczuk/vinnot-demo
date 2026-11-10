package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.RequestOriginPort;
import com.vinnot.user.application.port.out.SecurityEventPort;
import com.vinnot.user.application.port.out.model.RequestOrigin;
import com.vinnot.user.application.port.out.model.SecurityEvent;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SecurityEventRecorderTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private final SecurityEventPort events = mock(SecurityEventPort.class);
    private final RequestOriginPort origins = mock(RequestOriginPort.class);
    private final SecurityEventRecorder recorder = new SecurityEventRecorder(events, origins, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void recordsTheEventWithTheRequestOriginAndTime() {
        UUID userId = UUID.randomUUID();
        when(origins.current()).thenReturn(new RequestOrigin("203.0.113.9", "Mozilla/5.0"));

        recorder.record(SecurityEventType.PASSWORD_CHANGED, userId);

        verify(events).record(new SecurityEvent(SecurityEventType.PASSWORD_CHANGED, userId, "203.0.113.9", "Mozilla/5.0", NOW));
    }

    @Test
    void outsideARequestTheOriginIsUnknown() {
        when(origins.current()).thenReturn(null);

        recorder.record(SecurityEventType.ACCOUNT_AUTO_SUSPENDED, null);

        verify(events).record(new SecurityEvent(SecurityEventType.ACCOUNT_AUTO_SUSPENDED, null, null, null, NOW));
    }

    @Test
    void aFailedRecordNeverFailsTheUsersAction() {
        when(origins.current()).thenReturn(RequestOrigin.UNKNOWN);
        doThrow(new DataAccessResourceFailureException("database down")).when(events).record(any());

        assertThatCode(() -> recorder.record(SecurityEventType.LOGIN_SUCCEEDED, UUID.randomUUID())).doesNotThrowAnyException();
    }

    @Test
    void aFailingOriginLookupNeverFailsTheUsersActionEither() {
        when(origins.current()).thenThrow(new IllegalStateException("no request"));

        assertThatCode(() -> recorder.record(SecurityEventType.LOGIN_FAILED, null)).doesNotThrowAnyException();
        verifyNoInteractions(events);
    }

    @Test
    void theProductionConstructorUsesTheSystemClock() {
        when(origins.current()).thenReturn(RequestOrigin.UNKNOWN);
        new SecurityEventRecorder(events, origins).record(SecurityEventType.ACCOUNT_DELETED, null);

        verify(events).record(any(SecurityEvent.class));
    }
}
