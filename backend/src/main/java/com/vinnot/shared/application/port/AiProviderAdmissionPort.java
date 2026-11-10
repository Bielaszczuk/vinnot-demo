package com.vinnot.shared.application.port;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/** Admission for one paid provider attempt; cache hits do not acquire permits. */
public interface AiProviderAdmissionPort {

    Permit acquire(String model, BigDecimal maximumCostUsd);

    /** Empty cost means unknown billing: retain the reservation, release execution capacity. */
    void complete(Permit permit, Optional<BigDecimal> observedCostUsd);

    record Permit(UUID reservationId, String leaseKey, UUID leaseOwnerId) {
    }
}
