package com.vinnot.shared.application.port;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/** Admission for one paid provider attempt; cache hits do not acquire permits. */
public interface AiProviderAdmissionPort {

    /** Background admission: fails fast when every shared slot is busy. */
    Permit acquire(String model, BigDecimal maximumCostUsd);

    /**
     * Admission for a request someone is waiting on, such as a label scan. It may use the slot kept for interactive
     * requests and waits up to {@code wait} (capped by policy) for a free slot instead of failing at once.
     */
    default Permit acquireInteractive(String model, BigDecimal maximumCostUsd, Duration wait) {
        return acquire(model, maximumCostUsd);
    }

    /** Empty cost means unknown billing: retain the reservation, release execution capacity. */
    void complete(Permit permit, Optional<BigDecimal> observedCostUsd);

    record Permit(UUID reservationId, String leaseKey, UUID leaseOwnerId) {
    }
}
