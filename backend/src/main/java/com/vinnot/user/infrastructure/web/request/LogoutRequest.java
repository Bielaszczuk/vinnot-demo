package com.vinnot.user.infrastructure.web.request;

public record LogoutRequest(
        String refreshToken,
        String pushToken
) {
    public LogoutRequest(String refreshToken) {
        this(refreshToken, null);
    }
}
