package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Arrays;

/**
 * The two kinds of manual announcement (#310). News is promotional: it only reaches accounts with marketing consent
 * that keep the channel on, and carries an unsubscribe link. A service notice is transactional: it reaches every
 * active account and must not carry commercial content.
 */
public enum AnnouncementKind {
    NEWS(NotificationType.NEWSLETTER),
    SERVICE(NotificationType.SERVICE_NOTICE);

    private final NotificationType type;

    AnnouncementKind(NotificationType type) {
        this.type = type;
    }

    /** The kind named {@code value}; anything else is refused. */
    public static AnnouncementKind parse(String value) {
        return Arrays.stream(values()).filter(kind -> kind.name().equals(value)).findFirst()
                .orElseThrow(() -> new DomainException("INVALID_ANNOUNCEMENT_KIND", "Unknown announcement kind: " + value));
    }

    public NotificationType type() {
        return type;
    }

    public boolean promotional() {
        return type.category().promotional();
    }
}
