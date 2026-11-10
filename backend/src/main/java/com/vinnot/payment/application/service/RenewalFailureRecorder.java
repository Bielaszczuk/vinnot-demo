package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.application.service.PaymentAccountNoticeService.ReconnectReason;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;

import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Records a failed renewal together with the reconnection notice it calls for. The failure, the mark that the
 * connection was noticed, and the queued email and push commit in one transaction: either the organizer is told
 * and later runs stay quiet, or nothing is recorded, the lease expires and a later run tries again. Only a
 * failure recorded under the claim's lease notifies, so a reconnection that won the race is never contradicted.
 */
public class RenewalFailureRecorder {
    private static final Duration RETRY_DELAY = Duration.ofMinutes(5);
    private final PaymentCredentialRenewalStore store;
    private final PaymentAccountNoticeService notices;

    public RenewalFailureRecorder(PaymentCredentialRenewalStore store, PaymentAccountNoticeService notices) {
        this.store = store;
        this.notices = notices;
    }

    /** Mercado Pago withdrew the grant: renewal stops until the organizer connects again. */
    @Transactional
    public void revoked(CredentialRenewalClaim claim, Instant now) {
        if (store.fail(claim, now, true)) {
            notifyOnce(claim, ReconnectReason.REVOKED);
        }
    }

    /** Renewal is retried shortly; once the connection has expired the organizer is asked to reconnect. */
    @Transactional
    public void unavailable(CredentialRenewalClaim claim, Instant now) {
        if (store.fail(claim, now.plus(RETRY_DELAY), false) && !claim.credentials().expiresAt().isAfter(now)) {
            notifyOnce(claim, ReconnectReason.EXPIRED);
        }
    }

    private void notifyOnce(CredentialRenewalClaim claim, ReconnectReason reason) {
        if (store.markReconnectNotified(claim)) {
            notices.reconnectRequired(claim.ownerId(), reason, claim.credentials().expiresAt());
        }
    }
}
