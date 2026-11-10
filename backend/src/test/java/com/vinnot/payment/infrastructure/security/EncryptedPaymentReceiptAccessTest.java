package com.vinnot.payment.infrastructure.security;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.Duration;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
class EncryptedPaymentReceiptAccessTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"),ZoneOffset.UTC);
    private final PaymentCredentialCipher cipher = new PaymentCredentialCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    @Test void scopedExpiringCapabilityRejectsForgeryAndOtherEnvironments() {
        var access = new EncryptedPaymentReceiptAccess(cipher,clock,"SANDBOX");
        var id = UUID.randomUUID(); var token = access.issue(id);
        assertThat(access.verify(token)).contains(id);
        assertThat(token).doesNotContain(id.toString());
        assertThat(access.verify(token.substring(1))).isEmpty();
        assertThat(access.verify("not-a-token")).isEmpty();
        assertThat(access.verify(null)).isEmpty();
        assertThat(access.verify(" ")).isEmpty();
        assertThat(access.verify("x".repeat(513))).isEmpty();
        assertThat(new EncryptedPaymentReceiptAccess(cipher,clock,"LIVE_PILOT").verify(token)).isEmpty();
        assertThat(new EncryptedPaymentReceiptAccess(cipher,Clock.offset(clock,Duration.ofDays(7)),"SANDBOX").verify(token)).isEmpty();
        assertThat(new EncryptedPaymentReceiptAccess(cipher,Clock.offset(clock,Duration.ofSeconds(-1)),"SANDBOX").verify(token)).isEmpty();
    }
}
