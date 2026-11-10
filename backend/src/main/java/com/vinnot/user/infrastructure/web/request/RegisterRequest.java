package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.vinnot.legal.infrastructure.web.AcceptanceRequest;
import jakarta.validation.Valid;

public record RegisterRequest(
        @NotBlank
        @Size(min = 3, max = 40, message = "Username must be between 3 and 40 characters")
        String username,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 100) String name,
        @Valid AcceptanceRequest termsAcceptance
) {
}
