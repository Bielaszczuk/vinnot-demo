package com.vinnot.payment.domain.model;

import java.time.Instant;
import java.util.Objects;

/** Server-only authorization. Never include this object in an API response or log. */
public record SellerCredentials(String sellerId, String accessToken, String refreshToken, Instant expiresAt) {
    public SellerCredentials {
        if (Objects.isNull(sellerId) || !sellerId.matches("[1-9][0-9]{0,19}")
                || Objects.isNull(accessToken) || accessToken.isBlank()
                || Objects.isNull(refreshToken) || refreshToken.isBlank()) {
            throw new IllegalArgumentException("Incomplete seller authorization");
        }
        Objects.requireNonNull(expiresAt, "expiresAt");
    }

    @Override
    public String toString() {
        return "SellerCredentials[REDACTED]";
    }
}
