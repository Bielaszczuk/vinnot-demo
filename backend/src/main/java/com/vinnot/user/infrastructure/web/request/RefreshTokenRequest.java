package com.vinnot.user.infrastructure.web.request;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record RefreshTokenRequest(
        @NotBlank String refreshToken,
        UUID rotationId
) {
    public RefreshTokenRequest(String refreshToken) {
        this(refreshToken, null);
    }
}
