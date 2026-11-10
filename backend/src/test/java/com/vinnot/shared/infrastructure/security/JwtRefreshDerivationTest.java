package com.vinnot.shared.infrastructure.security;

import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class JwtRefreshDerivationTest {
    @Test
    void recoveryIsDeterministicAndBoundToTheSecretTokenAndOperation() {
        var first = new JwtTokenService("test-signing-secret-of-at-least-thirty-two-bytes", 900_000, 604_800_000);
        var restarted = new JwtTokenService("test-signing-secret-of-at-least-thirty-two-bytes", 900_000, 604_800_000);
        var otherKey = new JwtTokenService("different-signing-secret-of-at-least-thirty-two-bytes", 900_000, 604_800_000);
        UUID operation = UUID.randomUUID();
        String result = first.deriveRefreshToken("original", operation);
        assertThat(result).matches("[A-Za-z0-9_-]{43}");
        assertThat(restarted.deriveRefreshToken("original", operation)).isEqualTo(result);
        assertThat(first.deriveRefreshToken("other", operation)).isNotEqualTo(result);
        assertThat(first.deriveRefreshToken("original", UUID.randomUUID())).isNotEqualTo(result);
        assertThat(otherKey.deriveRefreshToken("original", operation)).isNotEqualTo(result);
    }
}
