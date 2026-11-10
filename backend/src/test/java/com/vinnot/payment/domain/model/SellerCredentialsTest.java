package com.vinnot.payment.domain.model;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SellerCredentialsTest {
    @Test
    void validatesRequiredAuthorizationAndRedactsAccidentalLogging() {
        Instant expiry = Instant.parse("2026-11-01T00:00:00Z");
        var credentials = new SellerCredentials("123", "access-secret", "refresh-secret", expiry);
        assertThat(credentials.toString()).isEqualTo("SellerCredentials[REDACTED]");
        assertThat(credentials.sellerId()).isEqualTo("123");
        assertThat(credentials.accessToken()).isEqualTo("access-secret");
        assertThat(credentials.refreshToken()).isEqualTo("refresh-secret");
        assertThat(credentials.expiresAt()).isEqualTo(expiry);
        for (String id : new String[]{null, "", "0", "abc", "123456789012345678901"}) {
            assertThatThrownBy(() -> new SellerCredentials(id, "a", "r", expiry)).isInstanceOf(IllegalArgumentException.class);
        }
        for (String secret : new String[]{null, "", " "}) {
            assertThatThrownBy(() -> new SellerCredentials("123", secret, "r", expiry)).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new SellerCredentials("123", "a", secret, expiry)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> new SellerCredentials("123", "a", "r", null)).isInstanceOf(NullPointerException.class);
    }
}
