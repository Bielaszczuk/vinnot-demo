package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ValidateActionTokenRequest(
        @NotBlank @Size(max = 512) String token
) {
}
