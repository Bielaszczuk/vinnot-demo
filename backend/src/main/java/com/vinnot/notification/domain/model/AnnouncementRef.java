package com.vinnot.notification.domain.model;

import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The announcement an email or push belongs to (#490). Every dedupe key of an announcement's messages starts with
 * {@code announcement:<id>:} for a send or {@code announcement-test:<id>:} for a test, and a push carries its key as the
 * {@code ref} the app reports when it is opened. So deliveries, late receipts and opens are attributed to their
 * announcement without anything new in the payload. {@code prefix} is the part every key of that announcement shares.
 */
public record AnnouncementRef(UUID announcementId, String prefix) {
    /** The notification types announcements are delivered with. */
    public static final Set<NotificationType> TYPES = Set.of(NotificationType.NEWSLETTER, NotificationType.SERVICE_NOTICE,
            NotificationType.ANNOUNCEMENT_TEST);
    private static final String SEND = "announcement:";
    private static final String TEST = "announcement-test:";
    private static final int ID_LENGTH = 36;

    public AnnouncementRef {
        Objects.requireNonNull(announcementId, "announcementId");
        Objects.requireNonNull(prefix, "prefix");
    }

    /** The key of the email one account gets. */
    public static String email(UUID announcementId, UUID userId) {
        return SEND + announcementId + ":" + userId;
    }

    /** The key of the push one language version sends to a batch of accounts, named after its first account. */
    public static String push(UUID announcementId, NotificationLocale locale, UUID firstUserId) {
        return SEND + announcementId + ":" + locale.language() + ":" + firstUserId;
    }

    /** The key of one language version of a test, by email and by push. */
    public static String test(UUID announcementId, NotificationLocale locale) {
        return TEST + announcementId + ":" + locale.language();
    }

    /** The announcement a dedupe key or push ref belongs to; empty for every other message. */
    public static Optional<AnnouncementRef> of(String key) {
        if (Objects.isNull(key)) {
            return Optional.empty();
        }
        String start = key.startsWith(SEND) ? SEND : key.startsWith(TEST) ? TEST : null;
        if (Objects.isNull(start) || key.length() < start.length() + ID_LENGTH + 1
                || key.charAt(start.length() + ID_LENGTH) != ':') {
            return Optional.empty();
        }
        String id = key.substring(start.length(), start.length() + ID_LENGTH);
        try {
            UUID parsed = UUID.fromString(id);
            return parsed.toString().equals(id)
                    ? Optional.of(new AnnouncementRef(parsed, key.substring(0, start.length() + ID_LENGTH + 1)))
                    : Optional.empty();
        } catch (IllegalArgumentException notAnId) {
            return Optional.empty();
        }
    }
}
