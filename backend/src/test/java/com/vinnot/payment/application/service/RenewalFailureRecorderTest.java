package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.application.service.PaymentAccountNoticeService.ReconnectReason;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;
import com.vinnot.payment.domain.model.SellerCredentials;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RenewalFailureRecorderTest {
    final Instant now = Instant.parse("2026-10-15T12:00:00Z");
    final PaymentCredentialRenewalStore store = mock(PaymentCredentialRenewalStore.class);
    final PaymentAccountNoticeService notices = mock(PaymentAccountNoticeService.class);
    final RenewalFailureRecorder recorder = new RenewalFailureRecorder(store, notices);

    @Test
    void definitiveRevocationRequiresReconnectAndTellsTheOrganizer() {
        var claim = claim(now.plusSeconds(60));
        when(store.fail(claim, now, true)).thenReturn(true);
        when(store.markReconnectNotified(claim)).thenReturn(true);
        recorder.revoked(claim, now);
        verify(notices).reconnectRequired(claim.ownerId(), ReconnectReason.REVOKED, claim.credentials().expiresAt());
    }

    @Test
    void networkFailuresRetryQuietlyWhileTheConnectionIsStillValid() {
        var claim = claim(now.plusSeconds(60));
        when(store.fail(claim, now.plusSeconds(300), false)).thenReturn(true);
        recorder.unavailable(claim, now);
        verify(store).fail(claim, now.plusSeconds(300), false);
        verify(store, never()).markReconnectNotified(any());
        verifyNoInteractions(notices);
    }

    @Test
    void failuresAfterTheConnectionExpiredAskTheOrganizerToReconnectOnce() {
        var expired = claim(now);
        when(store.fail(expired, now.plusSeconds(300), false)).thenReturn(true);
        when(store.markReconnectNotified(expired)).thenReturn(true, false);
        recorder.unavailable(expired, now);
        recorder.unavailable(expired, now);
        verify(store, times(2)).fail(expired, now.plusSeconds(300), false);
        verify(notices, times(1)).reconnectRequired(expired.ownerId(), ReconnectReason.EXPIRED, now);
    }

    @Test
    void aLostLeaseNeverNotifies() {
        var expired = claim(now.minusSeconds(1));
        recorder.revoked(expired, now);
        recorder.unavailable(expired, now);
        verify(store).fail(expired, now, true);
        verify(store).fail(expired, now.plusSeconds(300), false);
        verify(store, never()).markReconnectNotified(any());
        verifyNoInteractions(notices);
    }

    private static CredentialRenewalClaim claim(Instant expiresAt) {
        return new CredentialRenewalClaim(UUID.randomUUID(), UUID.randomUUID(),
                new SellerCredentials("123", "access", "refresh", expiresAt));
    }
}
