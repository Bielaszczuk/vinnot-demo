package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.domain.exception.DomainException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OnlineEventPaymentAvailabilityTest {
    private final UUID organizer = UUID.randomUUID();
    private final Instant deadline = Instant.now().plusSeconds(300);
    private final SellerCredentialReader accounts = mock(SellerCredentialReader.class);

    @Test void disabledIntegrationFailsBeforeReadingCredentials() {
        var availability = new OnlineEventPaymentAvailability(accounts, PaymentExecutionPolicy.sandbox(), false);
        assertThatThrownBy(() -> availability.requireAvailable(organizer, BigDecimal.TEN, "ARS", deadline))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("EVENT_PAYMENTS_UNAVAILABLE");
        verifyNoInteractions(accounts);
    }
    @Test void missingExpiredOrInsufficientCredentialsCannotAcceptPaidRegistration() {
        var availability = new OnlineEventPaymentAvailability(accounts, PaymentExecutionPolicy.sandbox(), true);
        for (var expiry : new Instant[]{deadline.minusSeconds(1), deadline}) {
            when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("123", "access", "refresh", expiry)));
            assertThatThrownBy(() -> availability.requireAvailable(organizer, BigDecimal.TEN, "ARS", deadline))
                    .isInstanceOf(DomainException.class).extracting("code").isEqualTo("EVENT_PAYMENTS_UNAVAILABLE");
        }
        when(accounts.findCredentials(organizer)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> availability.requireAvailable(organizer, BigDecimal.TEN, "ARS", deadline))
                .isInstanceOf(DomainException.class);
    }
    @Test void readinessPreservesCurrencySellerAndTotalPilotLimits() {
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("123", "access", "refresh", deadline.plusSeconds(1))));
        var availability = new OnlineEventPaymentAvailability(accounts,
                new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "999"), true);
        assertThatCode(() -> availability.requireAvailable(organizer, new BigDecimal("50"), "ARS", deadline)).doesNotThrowAnyException();
        assertThatThrownBy(() -> availability.requireAvailable(organizer, BigDecimal.TEN, "USD", deadline))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_CURRENCY_UNSUPPORTED");
        assertThatThrownBy(() -> availability.requireAvailable(organizer, new BigDecimal("50.01"), "ARS", deadline))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_PILOT_RESTRICTED");
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("456", "access", "refresh", deadline.plusSeconds(1))));
        assertThatThrownBy(() -> availability.requireAvailable(organizer, BigDecimal.TEN, "ARS", deadline))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_PILOT_RESTRICTED");
    }
}
