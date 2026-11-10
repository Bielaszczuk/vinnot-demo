package com.vinnot.user.application.command.model;

import java.util.UUID;

public record RefreshTokenCommand(String refreshToken, UUID rotationId) {
    public RefreshTokenCommand(String refreshToken) {
        this(refreshToken, null);
    }
}
