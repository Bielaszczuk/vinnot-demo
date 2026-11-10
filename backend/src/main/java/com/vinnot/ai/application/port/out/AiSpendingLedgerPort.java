package com.vinnot.ai.application.port.out;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Atomic, durable budget reservation; never hold a transaction during an external call. */
public interface AiSpendingLedgerPort {

    UUID reserve(String model, BigDecimal maximumCostUsd, List<Window> windows);

    void complete(UUID reservationId, Optional<BigDecimal> observedCostUsd);

    /** Spent plus currently reserved amount of one window; zero when the window has no activity yet. */
    BigDecimal committedUsd(String windowKey);

    record Window(String key, BigDecimal limitUsd) {
    }

    class BudgetExceededException extends RuntimeException {
        public BudgetExceededException() {
            super("The configured AI spending budget has been reached");
        }
    }
}
