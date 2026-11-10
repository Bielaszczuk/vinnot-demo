package com.vinnot.user.application.service;

import org.junit.jupiter.api.Test;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mockStatic;

class RefreshTokenHasherTest {

    @Test
    void createsADeterministicNonReversibleSha256Representation() {
        String hash = RefreshTokenHasher.hash("refresh-token");

        assertThat(hash)
                .hasSize(64)
                .isEqualTo(RefreshTokenHasher.hash("refresh-token"))
                .isNotEqualTo(RefreshTokenHasher.hash("different-token"))
                .doesNotContain("refresh-token");
    }

    @Test
    void failsClosedIfSha256IsUnavailable() {
        try (var digest = mockStatic(MessageDigest.class)) {
            digest.when(() -> MessageDigest.getInstance("SHA-256"))
                    .thenThrow(new NoSuchAlgorithmException("missing"));

            assertThatThrownBy(() -> RefreshTokenHasher.hash("refresh-token"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("SHA-256");
        }
    }
}
