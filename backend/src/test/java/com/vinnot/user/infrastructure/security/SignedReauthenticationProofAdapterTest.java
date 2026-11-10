package com.vinnot.user.infrastructure.security;

import com.vinnot.shared.infrastructure.security.JwtTokenService;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SignedReauthenticationProofAdapterTest {
    private static final String SECRET = "a-dedicated-test-secret-longer-than-thirty-two-bytes";

    @Test
    void proofIsBoundToUserAndSessionExpiresAndCannotAuthenticateAsAnAccessToken() {
        var now = Instant.now();
        var proofs = new SignedReauthenticationProofAdapter(SECRET, Clock.fixed(now, ZoneOffset.UTC));
        UUID user = UUID.randomUUID();
        String binding = SignedReauthenticationProofAdapter.sessionBinding("Bearer access");
        String proof = proofs.issue(user, binding);
        assertThat(proofs.permits(proof, user, binding)).isTrue();
        assertThat(proofs.permits(proof, UUID.randomUUID(), binding)).isFalse();
        assertThat(proofs.permits(proof, user, "another-session")).isFalse();
        assertThat(proofs.permits(null, user, binding)).isFalse();
        assertThat(proofs.permits(" ", user, binding)).isFalse();
        assertThat(proofs.permits("invalid", user, binding)).isFalse();
        assertThat(new SignedReauthenticationProofAdapter(SECRET, Clock.fixed(now.plusSeconds(301), ZoneOffset.UTC))
                .permits(proof, user, binding)).isFalse();
        var access = new JwtTokenService(SECRET, 900000, 604800000);
        assertThat(access.validateToken(proof)).isFalse();
        assertThat(new SignedReauthenticationProofAdapter(SECRET).permits(proof, user, binding)).isTrue();
    }
}
