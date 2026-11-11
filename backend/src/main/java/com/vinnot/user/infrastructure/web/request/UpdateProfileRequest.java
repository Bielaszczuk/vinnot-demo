package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 3, max = 40, message = "Username must be between 3 and 40 characters")
        String username,

        @Size(max = 100, message = "First name must be at most 100 characters")
        String firstName,

        @Size(max = 100, message = "Last name must be at most 100 characters")
        String lastName,

        // Kept temporarily for backward compatibility with older mobile clients.
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        @Size(max = 50) String phoneNumber,

        // Validated by the domain (BIO_TOO_LONG) so the client gets one stable error code.
        String bio,

        // PUBLIC, FOLLOWERS or PRIVATE; validated by the domain (INVALID_CELLAR_VISIBILITY).
        String cellarVisibility
) {
}
