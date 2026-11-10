package com.vinnot.user.application.port.out.model;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityEventTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");

    @Test
    void headerValuesAreCutToTheirColumnsAndBlankOnesAreDropped() {
        var event = new SecurityEvent(SecurityEventType.LOGIN_FAILED, null, " " + "1".repeat(60) + " ", "a".repeat(300), NOW);

        assertThat(event.ipAddress()).hasSize(45);
        assertThat(event.userAgent()).hasSize(256);
        assertThat(new SecurityEvent(SecurityEventType.LOGIN_FAILED, null, "  ", null, NOW).ipAddress()).isNull();
        assertThat(new SecurityEvent(SecurityEventType.LOGIN_FAILED, null, "203.0.113.9", "Mozilla/5.0", NOW))
                .extracting(SecurityEvent::ipAddress, SecurityEvent::userAgent)
                .containsExactly("203.0.113.9", "Mozilla/5.0");
    }

    @Test
    void theTypeAndTimeAreRequired() {
        assertThatThrownBy(() -> new SecurityEvent(null, null, null, null, NOW)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new SecurityEvent(SecurityEventType.LOGIN_FAILED, null, null, null, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void anUnknownOriginHasNoAddressNorAgent() {
        assertThat(RequestOrigin.UNKNOWN.ipAddress()).isNull();
        assertThat(RequestOrigin.UNKNOWN.userAgent()).isNull();
    }
}
