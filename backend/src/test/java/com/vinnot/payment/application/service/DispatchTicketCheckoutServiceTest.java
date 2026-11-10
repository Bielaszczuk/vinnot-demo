package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.CheckoutEligibility;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.domain.model.CheckoutAttempt;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DispatchTicketCheckoutServiceTest {
    private final CheckoutAttemptStore store = mock(CheckoutAttemptStore.class);
    private final SellerCredentialReader accounts = mock(SellerCredentialReader.class);
    private final TicketCheckoutGateway gateway = mock(TicketCheckoutGateway.class);
    private final CheckoutEligibility eligibility = mock(CheckoutEligibility.class);
    private final Instant now = Instant.parse("2026-10-14T12:00:00Z");
    private final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            UUID.randomUUID(), UUID.randomUUID(), "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", CommissionPolicy.DEFAULT), now.plusSeconds(600));
    private final SellerCredentials seller = new SellerCredentials("123", "access", "refresh", now.plusSeconds(3600));
    private final URI url = URI.create("https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test");
    private final DispatchTicketCheckoutService service = new DispatchTicketCheckoutService(store, accounts, gateway, Clock.fixed(now, ZoneOffset.UTC), eligibility);

    @BeforeEach
    void prepared() {
        when(store.find(snapshot.id(), snapshot.buyerId())).thenReturn(Optional.of(attempt(CheckoutAttempt.Status.PREPARED)));
        when(accounts.findCredentials(snapshot.organizerId())).thenReturn(Optional.of(seller));
        when(store.claim(snapshot.id(), snapshot.buyerId(), now)).thenReturn(Optional.of(snapshot));
        when(gateway.create(any(), eq(seller))).thenReturn(new TicketCheckoutGateway.Checkout("preference", url));
        when(store.complete(any())).thenReturn(true);
    }

    @Test
    void commitsClaimBeforeProviderAndReturnsOnlyPersistedResult() {
        assertThat(execute()).contains(url);
        var ordered = inOrder(store, gateway);
        ordered.verify(store).find(snapshot.id(), snapshot.buyerId());
        ordered.verify(store).claim(snapshot.id(), snapshot.buyerId(), now);
        ordered.verify(gateway).create(new TicketCheckoutGateway.Request(snapshot.id(), snapshot.registrationId(),
                snapshot.eventId(), "Cata", snapshot.quote(), snapshot.expiresAt()), seller);
        ordered.verify(store).complete(new CheckoutAttempt(snapshot, CheckoutAttempt.Status.READY, "preference", url));
        verify(store, never()).markUncertain(any());
    }

    @Test
    void repeatedReadyRequestReturnsSameLinkWithoutAnotherProviderCall() {
        when(store.find(snapshot.id(), snapshot.buyerId())).thenReturn(Optional.of(new CheckoutAttempt(snapshot,
                CheckoutAttempt.Status.READY, "preference", url)));
        assertThat(execute()).contains(url);
        verifyNoInteractions(accounts, gateway);
        verify(store, never()).claim(any(), any(), any());
    }

    @Test
    void otherBuyerAndExpiredSnapshotsCannotStartOrReuseCheckout() {
        assertThatThrownBy(() -> service.execute(snapshot.id(), UUID.randomUUID())).isInstanceOf(BusinessRuleViolationException.class);
        var expiredService = new DispatchTicketCheckoutService(store, accounts, gateway, Clock.fixed(snapshot.expiresAt(), ZoneOffset.UTC), eligibility);
        assertThatThrownBy(() -> expiredService.execute(snapshot.id(), snapshot.buyerId())).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(gateway);
    }

    @Test
    void aCheckoutWhoseOrganizerAccountWasDeletedCannotStart() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, null, snapshot.buyerId(), null, "123", "Cata",
                snapshot.quote(), snapshot.expiresAt());
        when(store.find(snapshot.id(), snapshot.buyerId()))
                .thenReturn(Optional.of(new CheckoutAttempt(unlinked, CheckoutAttempt.Status.PREPARED, null, null)));
        assertThatThrownBy(this::execute).isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("PAYMENT_CHECKOUT_NOT_FOUND");
        verifyNoInteractions(eligibility, accounts, gateway);
        verify(store, never()).claim(any(), any(), any());
    }

    @Test
    void inFlightUncertainAndLostClaimNeverRetryCreation() {
        for (var state : new CheckoutAttempt.Status[]{CheckoutAttempt.Status.CREATING, CheckoutAttempt.Status.UNCERTAIN}) {
            when(store.find(snapshot.id(), snapshot.buyerId())).thenReturn(Optional.of(attempt(state)));
            assertThat(execute()).isEmpty();
        }
        when(store.find(snapshot.id(), snapshot.buyerId())).thenReturn(Optional.of(attempt(CheckoutAttempt.Status.PREPARED)));
        when(store.claim(snapshot.id(), snapshot.buyerId(), now)).thenReturn(Optional.empty());
        assertThat(execute()).isEmpty();
        verifyNoInteractions(gateway);
    }

    @Test
    void missingChangedOrExpiringSellerCannotRedirectFunds() {
        for (var value : new SellerCredentials[]{null, new SellerCredentials("456", "a", "r", seller.expiresAt()),
                new SellerCredentials("123", "a", "r", snapshot.expiresAt())}) {
            when(accounts.findCredentials(snapshot.organizerId())).thenReturn(Optional.ofNullable(value));
            assertThatThrownBy(this::execute).isInstanceOf(BusinessRuleViolationException.class);
        }
        verify(store, never()).claim(any(), any(), any());
        verifyNoInteractions(gateway);
    }

    @Test
    void providerTimeoutOrPersistenceFailureStaysUncertainWithoutLeakingSecrets() {
        when(gateway.create(any(), any())).thenThrow(new IllegalStateException("secret provider response"));
        assertUncertain();
        verify(store).markUncertain(snapshot.id());
        doReturn(new TicketCheckoutGateway.Checkout("preference", url)).when(gateway).create(any(), any());
        when(store.complete(any())).thenThrow(new IllegalStateException("database unavailable"));
        assertUncertain();
    }

    @Test
    void failedAcknowledgementAndUnavailableDatabaseRemainRecoverable() {
        when(store.complete(any())).thenReturn(false);
        doThrow(new IllegalStateException("database unavailable")).when(store).markUncertain(snapshot.id());
        assertUncertain();
    }

    @Test
    void cancelledReservationCannotReuseLinkOrReachProvider() {
        doThrow(new BusinessRuleViolationException("PAYMENT_RESERVATION_UNAVAILABLE", "Cancelled")).when(eligibility).verify(snapshot);
        assertThatThrownBy(this::execute).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(gateway);
    }

    @Test
    void cancellationAfterClaimOrProviderResponseNeverReturnsCheckoutLink() {
        doNothing().doThrow(new BusinessRuleViolationException("PAYMENT_RESERVATION_UNAVAILABLE", "Cancelled"))
                .when(eligibility).verify(snapshot);
        assertUncertain();
        verifyNoInteractions(gateway);
        doNothing().doNothing().doThrow(new BusinessRuleViolationException("PAYMENT_RESERVATION_UNAVAILABLE", "Cancelled"))
                .when(eligibility).verify(snapshot);
        assertUncertain();
        verify(store).complete(any());
    }

    private Optional<URI> execute() { return service.execute(snapshot.id(), snapshot.buyerId()); }
    private CheckoutAttempt attempt(CheckoutAttempt.Status state) { return new CheckoutAttempt(snapshot, state, null, null); }
    private void assertUncertain() {
        assertThatThrownBy(this::execute).isInstanceOf(ExternalServiceUnavailableException.class)
                .hasMessageNotContaining("secret").hasNoCause();
    }
}
