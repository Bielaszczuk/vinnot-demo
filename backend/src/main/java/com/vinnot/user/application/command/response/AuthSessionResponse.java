package com.vinnot.user.application.command.response;

public record AuthSessionResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        AuthenticatedUserResponse user
) {
}
