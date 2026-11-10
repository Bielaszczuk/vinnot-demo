package com.vinnot.user.infrastructure.web.request;

import jakarta.validation.constraints.Size;

public record DeleteOwnAccountRequest(
        @Size(max = 4096, message = "Apple authorization code is too long")
        String appleAuthorizationCode,

        @Size(max = 255, message = "Apple client ID is too long")
        String appleClientId,

        @Size(max = 2048, message = "Apple redirect URI is too long")
        String appleRedirectUri
) {
}
