package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.service.PaymentExecutionPolicy.Environment;
import java.util.Objects;

/**
 * LIVE_PILOT is the historical real-money storage namespace, not the execution policy.
 * Keep it stable for existing ciphertext AAD, receipt links and unsettled payments.
 * Operational LIVE and LIVE_PILOT share real credentials; SANDBOX remains isolated.
 */
public final class PaymentStorageEnvironment {
    private PaymentStorageEnvironment() { }

    public static Environment resolve(Environment environment) {
        return Objects.requireNonNull(environment) == Environment.LIVE ? Environment.LIVE_PILOT : environment;
    }
}
