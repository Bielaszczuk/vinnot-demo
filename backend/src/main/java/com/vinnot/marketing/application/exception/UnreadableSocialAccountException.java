package com.vinnot.marketing.application.exception;

import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.Objects;

/**
 * The stored tokens of a connected account cannot be decrypted (#510 S5), for example after the encryption key was rotated.
 * The account was already marked REFRESH_FAILED with {@value #CODE}; {@link #newlyFailed()} is true only when this read
 * moved it from CONNECTED, so the admins are asked to reconnect it once. Its message never carries a token or the cause.
 */
public class UnreadableSocialAccountException extends RuntimeException {
    public static final String CODE = "TOKEN_UNREADABLE";
    private final SocialNetwork network;
    private final boolean newlyFailed;

    public UnreadableSocialAccountException(SocialNetwork network, boolean newlyFailed) {
        super("The stored " + Objects.requireNonNull(network, "network") + " tokens cannot be read");
        this.network = network;
        this.newlyFailed = newlyFailed;
    }

    public SocialNetwork network() {
        return network;
    }

    public boolean newlyFailed() {
        return newlyFailed;
    }
}
