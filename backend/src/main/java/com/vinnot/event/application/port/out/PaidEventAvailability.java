package com.vinnot.event.application.port.out;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Local readiness check: no remote provider call while the event transaction is locked. */
public interface PaidEventAvailability {
    void requireAvailable(UUID organizerId, BigDecimal total, String currency, Instant requiredUntil);
}
