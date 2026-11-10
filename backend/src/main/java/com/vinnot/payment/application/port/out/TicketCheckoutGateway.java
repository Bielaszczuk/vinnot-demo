package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import java.net.URI;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public interface TicketCheckoutGateway {
    int MAXIMUM_TITLE_LENGTH = 250;
    Checkout create(Request request, SellerCredentials credentials);

    /** All fields must come from a persisted server-side attempt, never from the buyer's request. */
    record Request(UUID attemptId, UUID registrationId, UUID eventId, String title,
                   TicketPaymentQuote quote, Instant expiresAt, boolean returnToApp) {
        public Request(UUID attemptId, UUID registrationId, UUID eventId, String title,
                       TicketPaymentQuote quote, Instant expiresAt) {
            this(attemptId, registrationId, eventId, title, quote, expiresAt, false);
        }
        public Request {
            Objects.requireNonNull(attemptId);
            Objects.requireNonNull(registrationId);
            Objects.requireNonNull(eventId);
            Objects.requireNonNull(quote);
            Objects.requireNonNull(expiresAt);
            if (Objects.isNull(title) || title.isBlank() || title.length() > MAXIMUM_TITLE_LENGTH) {
                throw new IllegalArgumentException("A checkout requires an event title");
            }
        }
    }

    record Checkout(String providerReference, URI checkoutUrl) { }
}
