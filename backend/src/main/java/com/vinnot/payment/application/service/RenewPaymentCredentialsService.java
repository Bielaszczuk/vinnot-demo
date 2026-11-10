package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.RenewPaymentCredentialsUseCase;
import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.application.port.out.SellerCredentialRenewalGateway;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;
import com.vinnot.payment.domain.model.PaymentAuthorizationRevokedException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/**
 * Renew a day early. Short leases fence concurrent workers and manual reconnections. Failures, and the
 * reconnection notice they may call for, are recorded by {@link RenewalFailureRecorder}; one organizer whose
 * renewal cannot be recorded never stops the rest of the batch.
 */
public class RenewPaymentCredentialsService implements RenewPaymentCredentialsUseCase {
    private static final Logger LOG = LoggerFactory.getLogger(RenewPaymentCredentialsService.class);
    private static final int MAX_BATCH_SIZE = 20;
    private final PaymentCredentialRenewalStore store;
    private final SellerCredentialRenewalGateway gateway;
    private final RenewalFailureRecorder failures;
    private final Clock clock;

    public RenewPaymentCredentialsService(
            PaymentCredentialRenewalStore store,
            SellerCredentialRenewalGateway gateway,
            RenewalFailureRecorder failures,
            Clock clock) {
        this.store = store;
        this.gateway = gateway;
        this.failures = failures;
        this.clock = clock;
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public void execute(int limit) {
        if (limit < 1 || limit > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("Invalid renewal batch");
        }
        for (int index = 0; index < limit; index++) {
            var claimed = store.claim(clock.instant(), clock.instant().plus(Duration.ofDays(1)));
            if (claimed.isEmpty()) {
                return;
            }
            try {
                renew(claimed.get());
            } catch (RuntimeException failure) {
                // Nothing about this organizer was half-recorded; the lease expires and a later run retries.
                LOG.warn("Payment credential renewal could not be recorded: {}", failure.getClass().getSimpleName());
            }
        }
    }

    private void renew(CredentialRenewalClaim claim) {
        try {
            var renewed = gateway.renew(claim.credentials());
            if (!renewed.sellerId().equals(claim.credentials().sellerId())
                    || !renewed.expiresAt().isAfter(clock.instant())) {
                throw new PaymentAuthorizationRevokedException();
            }
            store.complete(claim, renewed);
        } catch (PaymentAuthorizationRevokedException revoked) {
            failures.revoked(claim, clock.instant());
        } catch (RuntimeException unavailable) {
            failures.unavailable(claim, clock.instant());
        }
    }
}
