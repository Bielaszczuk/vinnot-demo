package com.vinnot.payment.infrastructure.config;

import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;

/**
 * Reads the current policy from {@code app.payments.commission.*}. It is built once, when the application starts,
 * so a rate whose basis points disagree with its policy name stops the start instead of pricing a checkout.
 */
public class ConfiguredCommissionPolicy implements CurrentCommissionPolicy {
    private final CommissionPolicy policy;

    public ConfiguredCommissionPolicy(int basisPoints, String policyId) {
        try {
            this.policy = new CommissionPolicy(basisPoints, policyId);
        } catch (IllegalArgumentException invalid) {
            throw new IllegalStateException("Invalid app.payments.commission settings: " + invalid.getMessage(), invalid);
        }
    }

    @Override
    public CommissionPolicy current() {
        return policy;
    }
}
