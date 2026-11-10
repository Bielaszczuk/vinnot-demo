package com.vinnot.user.infrastructure.web.request;

import com.vinnot.user.domain.valueobject.SocialProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SocialLoginRequest(
        @NotNull SocialProvider provider,
        @NotBlank @Size(max = 10000) String token,
        @Size(max = 512) String nonce,
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        Boolean reactivate
) {
}
