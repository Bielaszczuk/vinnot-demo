package com.vinnot.user.application.command.model;

/** {@code pushToken}, when given, is this device's push token: forgotten for the session's account, live or expired, or on its own without a known session. */
public record LogoutCommand(String refreshToken, String pushToken) {
    public LogoutCommand(String refreshToken) {
        this(refreshToken, null);
    }
}

