package com.vinnot.notification.domain.model;

import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Either a concrete address or a user whose current address is looked up at delivery time.
 * Addresses cannot contain whitespace, so they can never smuggle extra email headers.
 */
public record NotificationRecipient(String email, String displayName, UUID userId) {
    /** As permissive as account emails (a dotless domain is valid there); only whitespace and extra '@' are refused. */
    private static final Pattern ADDRESS = Pattern.compile("[^\\s@]+@[^\\s@]+");

    public NotificationRecipient {
        if (Objects.isNull(email) == Objects.isNull(userId)) {
            throw new IllegalArgumentException("A notification recipient is either an address or a user");
        }
        if (Objects.nonNull(email) && !ADDRESS.matcher(email).matches()) {
            throw new IllegalArgumentException("Invalid notification recipient address");
        }
    }

    public static NotificationRecipient address(String email, String displayName) {
        return new NotificationRecipient(Objects.requireNonNull(email, "Recipient address cannot be null"), displayName, null);
    }

    public static NotificationRecipient user(UUID userId) {
        return new NotificationRecipient(null, null, Objects.requireNonNull(userId, "User id cannot be null"));
    }

    public boolean isAddress() {
        return Objects.nonNull(email);
    }

    @Override
    public String toString() {
        return "NotificationRecipient[REDACTED]";
    }
}
