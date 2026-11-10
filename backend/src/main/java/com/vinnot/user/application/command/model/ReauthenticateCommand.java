package com.vinnot.user.application.command.model;

import com.vinnot.user.domain.valueobject.SocialProvider;

import java.util.UUID;

/** Confirms the current account holder with exactly one credential: a password or a fresh provider token. */
public record ReauthenticateCommand(UUID userId, String sessionBinding, String password,
                                    SocialProvider provider, String providerToken, String nonce) {

    public ReauthenticateCommand(UUID userId, String sessionBinding, String password) {
        this(userId, sessionBinding, password, null, null, null);
    }

    public static ReauthenticateCommand withProvider(UUID userId, String sessionBinding,
            SocialProvider provider, String providerToken, String nonce) {
        return new ReauthenticateCommand(userId, sessionBinding, null, provider, providerToken, nonce);
    }

    /** Credentials never reach logs. */
    @Override
    public String toString() {
        return "ReauthenticateCommand[userId=" + userId + ", provider=" + provider + "]";
    }
}
