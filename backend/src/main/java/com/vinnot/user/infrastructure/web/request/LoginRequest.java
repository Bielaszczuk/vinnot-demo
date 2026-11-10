package com.vinnot.user.infrastructure.web.request;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String usernameOrEmail,
        @NotBlank String password,
        Boolean reactivate
) {
}
