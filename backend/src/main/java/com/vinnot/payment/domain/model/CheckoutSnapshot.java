package com.vinnot.payment.domain.model;

import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.time.temporal.ChronoUnit;

/**
 * Server-owned, immutable terms captured while the registration and its capacity hold are locked.
 * <p>
 * The registration, event, buyer and organizer are links, not terms: they are null once that account, registration or
 * event was deleted, and the attempt stays as the financial history of the operation. A new checkout is always
 * {@link #linked()}; only stored ones can lose their links.
 */
public record CheckoutSnapshot(UUID id, UUID registrationId, UUID eventId, UUID buyerId, UUID organizerId,
        String sellerId, String title, TicketPaymentQuote quote, Instant expiresAt, boolean returnToApp) {
    private static final int MAXIMUM_TITLE_LENGTH = 250;
    private static final int MAXIMUM_AMOUNT_PRECISION = 19;

    public CheckoutSnapshot(UUID id, UUID registrationId, UUID eventId, UUID buyerId, UUID organizerId,
            String sellerId, String title, TicketPaymentQuote quote, Instant expiresAt) {
        this(id, registrationId, eventId, buyerId, organizerId, sellerId, title, quote, expiresAt, false);
    }

    public CheckoutSnapshot {
        Objects.requireNonNull(id);
        Objects.requireNonNull(quote);
        Objects.requireNonNull(expiresAt);
        expiresAt = expiresAt.truncatedTo(ChronoUnit.MICROS);
        if (Objects.isNull(sellerId) || !sellerId.matches("[1-9][0-9]{0,19}")
                || Objects.isNull(title) || title.isBlank() || title.length() > MAXIMUM_TITLE_LENGTH
                || quote.total().precision() > MAXIMUM_AMOUNT_PRECISION) {
            throw new IllegalArgumentException("Invalid checkout snapshot");
        }
    }

    /** Whether the registration, its event, the buyer and the organizer still exist. */
    public boolean linked() {
        return Objects.nonNull(registrationId) && Objects.nonNull(eventId) && Objects.nonNull(buyerId)
                && Objects.nonNull(organizerId);
    }

    /** A retry may suggest a new UUID, but must never replace the original commercial terms. */
    public boolean hasSameTerms(CheckoutSnapshot other) {
        return Objects.equals(registrationId, other.registrationId) && Objects.equals(eventId, other.eventId)
                && Objects.equals(buyerId, other.buyerId) && Objects.equals(organizerId, other.organizerId)
                && sellerId.equals(other.sellerId) && title.equals(other.title)
                && quote.equals(other.quote) && expiresAt.equals(other.expiresAt);
    }
}
