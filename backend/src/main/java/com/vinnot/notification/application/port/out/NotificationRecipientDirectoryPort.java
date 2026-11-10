package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Looks up a user's current address, display name and preferred language at delivery time. */
public interface NotificationRecipientDirectoryPort {
    Optional<DirectoryUser> findUser(UUID userId);

    /** {@code preferredLocale} is null when the account has no stored language. */
    record DirectoryUser(NotificationRecipient recipient, NotificationLocale preferredLocale) {
        public DirectoryUser {
            Objects.requireNonNull(recipient, "Directory recipient cannot be null");
        }

        public NotificationLocale localeOr(NotificationLocale fallback) {
            return Objects.requireNonNullElse(preferredLocale, fallback);
        }
    }
}
