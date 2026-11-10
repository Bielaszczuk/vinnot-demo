package com.vinnot.payment.application.service;

import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Local readiness check; never performs provider HTTP calls inside an event transaction. */
public final class OnlineEventPaymentAvailability implements PaidEventAvailability {
    private final SellerCredentialReader accounts;
    private final PaymentExecutionPolicy policy;
    private final boolean enabled;

    public OnlineEventPaymentAvailability(SellerCredentialReader accounts, PaymentExecutionPolicy policy, boolean enabled) {
        this.accounts = accounts;
        this.policy = policy;
        this.enabled = enabled;
    }

    @Override
    public void requireAvailable(UUID organizer, BigDecimal total, String currency, Instant requiredUntil) {
        if (!enabled) { throw unavailable(); }
        var seller = accounts.findCredentials(organizer)
                .filter(credentials -> credentials.expiresAt().isAfter(requiredUntil))
                .orElseThrow(OnlineEventPaymentAvailability::unavailable);
        if (!"ARS".equals(currency)) {
            throw new BusinessRuleViolationException("PAYMENT_CURRENCY_UNSUPPORTED",
                    "Los pagos con Mercado Pago están disponibles en pesos argentinos.");
        }
        policy.requireAmount(seller.sellerId(), total, currency);
    }

    private static BusinessRuleViolationException unavailable() {
        return new BusinessRuleViolationException("EVENT_PAYMENTS_UNAVAILABLE",
                "El organizador debe habilitar Mercado Pago antes de recibir inscripciones pagas.");
    }
}
