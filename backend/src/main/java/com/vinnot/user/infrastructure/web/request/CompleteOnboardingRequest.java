package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.Size;

public record CompleteOnboardingRequest(
        @Size(min = 3, max = 40, message = "Username must be between 3 and 40 characters")
        String username
) {
}
