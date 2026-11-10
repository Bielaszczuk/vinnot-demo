package com.vinnot.payment.domain.model;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class CheckoutAttemptTest {
    private final UUID id = UUID.randomUUID();
    private final Instant expires = Instant.parse("2026-10-14T12:00:00.123456789Z");
    private final TicketPaymentQuote quote = new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", CommissionPolicy.DEFAULT);
    private CheckoutSnapshot snapshot(UUID attempt, String seller, String title, TicketPaymentQuote price, Instant expiry) {
        return new CheckoutSnapshot(attempt, id, id, id, id, seller, title, price, expiry);
    }

    @Test
    void normalizesToDatabasePrecisionAndComparesAllImmutableTerms() {
        var original = snapshot(id, "123", "Cata", quote, expires);
        assertThat(original.expiresAt()).isEqualTo(Instant.parse("2026-10-14T12:00:00.123456Z"));
        assertThat(original.hasSameTerms(snapshot(UUID.randomUUID(), "123", "Cata", quote, expires))).isTrue();
        assertThat(original.hasSameTerms(snapshot(id, "456", "Cata", quote, expires))).isFalse();
        assertThat(original.hasSameTerms(snapshot(id, "123", "Otro", quote, expires))).isFalse();
        assertThat(original.hasSameTerms(snapshot(id, "123", "Cata", quote, expires.plusSeconds(1)))).isFalse();
        var otherPrice = new TicketPaymentQuote(BigDecimal.ONE, 1, "ARS", CommissionPolicy.DEFAULT);
        assertThat(original.hasSameTerms(snapshot(id, "123", "Cata", otherPrice, expires))).isFalse();
        for (int field = 0; field < 4; field++) {
            UUID different = UUID.randomUUID();
            var other = new CheckoutSnapshot(id, field == 0 ? different : id, field == 1 ? different : id,
                    field == 2 ? different : id, field == 3 ? different : id, "123", "Cata", quote, expires);
            assertThat(original.hasSameTerms(other)).isFalse();
        }
    }

    @Test
    void aStoredSnapshotWhoseAccountsWereDeletedKeepsItsTermsButIsNoLongerLinked() {
        var original = snapshot(id, "123", "Cata", quote, expires);
        assertThat(original.linked()).isTrue();
        for (int field = 0; field < 4; field++) {
            var unlinked = new CheckoutSnapshot(id, field == 0 ? null : id, field == 1 ? null : id,
                    field == 2 ? null : id, field == 3 ? null : id, "123", "Cata", quote, expires);
            assertThat(unlinked.linked()).isFalse();
            assertThat(unlinked.quote()).isEqualTo(quote);
            assertThat(original.hasSameTerms(unlinked)).isFalse();
            assertThat(unlinked.hasSameTerms(original)).isFalse();
        }
        var orphan = new CheckoutSnapshot(id, null, null, null, null, "123", "Cata", quote, expires);
        assertThat(orphan.hasSameTerms(new CheckoutSnapshot(UUID.randomUUID(), null, null, null, null, "123", "Cata", quote, expires))).isTrue();
    }

    @Test
    void rejectsInvalidSnapshotAndIncompleteOrUnsafeReadyResult() {
        for (String seller : new String[]{null, "", "0", "x", "1".repeat(21)})
            assertThatThrownBy(() -> snapshot(id, seller, "Cata", quote, expires)).isInstanceOf(IllegalArgumentException.class);
        for (String title : new String[]{null, " ", "x".repeat(251)})
            assertThatThrownBy(() -> snapshot(id, "123", title, quote, expires)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> snapshot(id, "123", "Cata", new TicketPaymentQuote(new BigDecimal("99999999999999999"), 20, "ARS", CommissionPolicy.DEFAULT), expires))
                .isInstanceOf(IllegalArgumentException.class);
        var valid = snapshot(id, "123", "Cata", quote, expires);
        for (String reference : new String[]{null, " ", "x".repeat(201)})
            assertThatThrownBy(() -> new CheckoutAttempt(valid, CheckoutAttempt.Status.READY, reference, URI.create("https://example.com")))
                    .isInstanceOf(IllegalArgumentException.class);
        for (URI url : new URI[]{null, URI.create("http://example.com"), URI.create("https:/relative"),
                URI.create("https://secret@example.com"), URI.create("https://example.com#fragment")})
            assertThatThrownBy(() -> new CheckoutAttempt(valid, CheckoutAttempt.Status.READY, "ref", url)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CheckoutAttempt(valid, CheckoutAttempt.Status.CREATING, "ref", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CheckoutAttempt(valid, CheckoutAttempt.Status.UNCERTAIN, null, URI.create("https://example.com"))).isInstanceOf(IllegalArgumentException.class);
        assertThat(new CheckoutAttempt(valid, CheckoutAttempt.Status.PREPARED, null, null).status()).isEqualTo(CheckoutAttempt.Status.PREPARED);
        assertThat(new CheckoutAttempt(valid, CheckoutAttempt.Status.READY, "ref", URI.create("https://example.com")).providerReference()).isEqualTo("ref");
    }
}
