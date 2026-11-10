package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.application.port.out.SellerCredentialRenewalGateway;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;
import com.vinnot.payment.domain.model.PaymentAuthorizationRevokedException;
import com.vinnot.payment.domain.model.SellerCredentials;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RenewPaymentCredentialsServiceTest {
    final Instant now = Instant.parse("2026-10-15T12:00:00Z");
    final PaymentCredentialRenewalStore store = mock(PaymentCredentialRenewalStore.class);
    final SellerCredentialRenewalGateway gateway = mock(SellerCredentialRenewalGateway.class);
    final RenewalFailureRecorder failures = mock(RenewalFailureRecorder.class);
    final RenewPaymentCredentialsService service =
            new RenewPaymentCredentialsService(store, gateway, failures, Clock.fixed(now, ZoneOffset.UTC));
    final CredentialRenewalClaim claim = claim(now.plusSeconds(60));

    @Test
    void rotatesCredentialsAndStopsWhenNoMoreClaims() {
        var next = new SellerCredentials("123", "rotated", "rotated-refresh", now.plusSeconds(3600));
        when(store.claim(any(), any())).thenReturn(Optional.of(claim), Optional.empty());
        when(gateway.renew(claim.credentials())).thenReturn(next);
        service.execute(10);
        verify(store).complete(claim, next);
        verify(gateway, times(1)).renew(any());
        verifyNoInteractions(failures);
    }

    @Test
    void definitiveRevocationIsRecordedAsRevoked() {
        when(store.claim(any(), any())).thenReturn(Optional.of(claim), Optional.empty());
        when(gateway.renew(any())).thenThrow(new PaymentAuthorizationRevokedException());
        service.execute(1);
        verify(failures).revoked(claim, now);
        verify(failures, never()).unavailable(any(), any());
    }

    @Test
    void networkFailuresAreRecordedAsUnavailable() {
        when(store.claim(any(), any())).thenReturn(Optional.of(claim));
        when(gateway.renew(any())).thenThrow(new IllegalStateException("transient"));
        service.execute(1);
        verify(failures).unavailable(claim, now);
        verify(failures, never()).revoked(any(), any());
    }

    @Test
    void oneOrganizerWhoseFailureCannotBeRecordedDoesNotStopTheBatch() {
        var next = claim(now.plusSeconds(120));
        var rotated = new SellerCredentials("123", "rotated", "rotated-refresh", now.plusSeconds(3600));
        when(store.claim(any(), any())).thenReturn(Optional.of(claim), Optional.of(next), Optional.empty());
        when(gateway.renew(claim.credentials())).thenThrow(new PaymentAuthorizationRevokedException());
        when(gateway.renew(next.credentials())).thenReturn(rotated);
        doThrow(new IllegalStateException("outbox down")).when(failures).revoked(claim, now);
        service.execute(5);
        verify(store).complete(next, rotated);
    }

    @Test
    void refusesDifferentSellerExpiredTokensAndUnboundedBatches() {
        when(store.claim(any(), any())).thenReturn(Optional.of(claim));
        when(gateway.renew(any())).thenReturn(
                new SellerCredentials("456", "a", "r", now.plusSeconds(3600)), new SellerCredentials("123", "a", "r", now));
        service.execute(2);
        verify(failures, times(2)).revoked(claim, now);
        verify(store, never()).complete(any(), any());
        assertThatThrownBy(() -> service.execute(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.execute(21)).isInstanceOf(IllegalArgumentException.class);
    }

    private static CredentialRenewalClaim claim(Instant expiresAt) {
        return new CredentialRenewalClaim(UUID.randomUUID(), UUID.randomUUID(),
                new SellerCredentials("123", "access", "refresh", expiresAt));
    }
}
