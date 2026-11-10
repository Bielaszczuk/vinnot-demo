package com.vinnot.event.infrastructure.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewEventRegistrationRequest(
        @NotBlank String action,
        String paymentMethod,
        @Size(max = 1000) String organizerNote
) {
}
