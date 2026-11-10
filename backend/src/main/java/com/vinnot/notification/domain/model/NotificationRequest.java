package com.vinnot.notification.domain.model;

import java.util.Map;
import java.util.Objects;
import java.util.HashMap;

/**
 * One logical notification. The dedupe key identifies the logical send: delivery is at-least-once,
 * so enqueueing the same key twice produces a single message.
 */
public record NotificationRequest(NotificationType type, NotificationRecipient recipient, NotificationLocale locale,
        Map<String, String> data, String dedupeKey, NotificationCategory category) {
    public static final int MAX_DEDUPE_KEY_LENGTH = 240;

    public NotificationRequest {
        Objects.requireNonNull(type, "Notification type cannot be null");
        Objects.requireNonNull(recipient, "Notification recipient cannot be null");
        Objects.requireNonNull(locale, "Notification locale cannot be null");
        data = Map.copyOf(Objects.requireNonNull(data, "Notification data cannot be null"));
        if (Objects.isNull(dedupeKey) || dedupeKey.isBlank() || dedupeKey.length() > MAX_DEDUPE_KEY_LENGTH) {
            throw new IllegalArgumentException("A notification needs a bounded dedupe key");
        }
        if (category != type.category()) {
            throw new IllegalArgumentException("Notification category does not match its type");
        }
    }

    public static NotificationRequest of(NotificationType type, NotificationRecipient recipient, NotificationLocale locale,
            Map<String, String> data, String dedupeKey) {
        return new NotificationRequest(type, recipient, locale, data, dedupeKey,
                Objects.requireNonNull(type, "Notification type cannot be null").category());
    }

    public NotificationRequest withData(String key, String value) {
        Map<String, String> extended = new HashMap<>(data);
        extended.put(key, value);
        return new NotificationRequest(type, recipient, locale, extended, dedupeKey, category);
    }

    public NotificationRequest withRecipient(NotificationRecipient resolved) {
        return new NotificationRequest(type, resolved, locale, data, dedupeKey, category);
    }

    @Override
    public String toString() {
        return "NotificationRequest[" + type + ", REDACTED]";
    }
}
