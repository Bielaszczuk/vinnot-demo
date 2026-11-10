package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.RequestOriginPort;
import com.vinnot.user.application.port.out.SecurityEventPort;
import com.vinnot.user.application.port.out.model.RequestOrigin;
import com.vinnot.user.application.port.out.model.SecurityEvent;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Objects;
import java.util.UUID;

/**
 * Records security events with the address and browser of the current request (#482). Recording is best effort: a
 * failure is logged and never fails the action that produced the event.
 */
@Service
public class SecurityEventRecorder {
    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityEventRecorder.class);

    private final SecurityEventPort events;
    private final RequestOriginPort origins;
    private final Clock clock;

    @Autowired
    public SecurityEventRecorder(SecurityEventPort events, RequestOriginPort origins) {
        this(events, origins, Clock.systemUTC());
    }

    SecurityEventRecorder(SecurityEventPort events, RequestOriginPort origins, Clock clock) {
        this.events = events;
        this.origins = origins;
        this.clock = clock;
    }

    /** @param userId the account concerned, or null when the attempt named no existing account */
    public void record(SecurityEventType type, UUID userId) {
        try {
            RequestOrigin origin = Objects.requireNonNullElse(origins.current(), RequestOrigin.UNKNOWN);
            events.record(new SecurityEvent(type, userId, origin.ipAddress(), origin.userAgent(), clock.instant()));
        } catch (RuntimeException failure) {
            LOGGER.error("Security event could not be recorded: type={} userId={}", type, userId, failure);
        }
    }
}
