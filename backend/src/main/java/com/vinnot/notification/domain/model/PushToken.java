package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;
import java.util.regex.Pattern;

/** An Expo push token, such as {@code ExponentPushToken[xxxxxxxx]}. Anything else is rejected before it is stored. */
public record PushToken(String value) {
    private static final Pattern FORMAT = Pattern.compile("^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]{1,200}]$");

    public PushToken {
        if (Objects.isNull(value) || !FORMAT.matcher(value).matches()) {
            throw new DomainException("INVALID_PUSH_TOKEN", "The push token is not a valid Expo push token");
        }
    }

    @Override
    public String toString() {
        // Tokens address a device; keep them out of logs.
        return "PushToken[redacted]";
    }
}
