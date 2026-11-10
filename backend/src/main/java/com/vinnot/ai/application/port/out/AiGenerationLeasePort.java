package com.vinnot.ai.application.port.out;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/** Coordinates paid AI generation across application instances. */
public interface AiGenerationLeasePort {

    Optional<Lease> tryAcquire(String key, Duration duration);

    void release(Lease lease);

    record Lease(String key, UUID ownerId) {
    }
}
