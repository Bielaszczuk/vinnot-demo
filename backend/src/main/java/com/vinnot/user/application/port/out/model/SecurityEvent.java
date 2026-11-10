package com.vinnot.user.application.port.out.model;

import com.vinnot.user.domain.valueobject.SecurityEventType;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * One row of {@code security_events}. The address and user agent are cut to their column sizes, because they come
 * from request headers anyone can fill.
 */
public record SecurityEvent(SecurityEventType type, UUID userId, String ipAddress, String userAgent, Instant occurredAt) {
    public static final int MAX_IP_ADDRESS_LENGTH = 45;
    public static final int MAX_USER_AGENT_LENGTH = 256;

    public SecurityEvent {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(occurredAt, "occurredAt");
        ipAddress = truncate(ipAddress, MAX_IP_ADDRESS_LENGTH);
        userAgent = truncate(userAgent, MAX_USER_AGENT_LENGTH);
    }

    private static String truncate(String value, int maxLength) {
        if (Objects.isNull(value) || value.isBlank()) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
