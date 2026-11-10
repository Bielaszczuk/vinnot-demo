package com.vinnot.admin.infrastructure.web.request;
import jakarta.validation.constraints.Size;

/**
 * {@code reasonCode} is one of SPAM, HARASSMENT, FRAUD, IMPERSONATION, TERMS_VIOLATION or OTHER and is told to the
 * account holder; {@code reason} is the administrator's detail, shared only with OTHER.
 */
public record BanUserRequest(
        @Size(max = 30) String reasonCode,
        @Size(max = 255) String reason
) {
}
