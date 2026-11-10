package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * An announcement ready to be tested or sent (#310): its kind, the language versions written (Spanish, English or
 * both), the audience and where its push opens. Each recipient gets their language when it was written, otherwise
 * the other one.
 */
public record Announcement(AnnouncementKind kind, Map<NotificationLocale, AnnouncementContent> versions,
        AnnouncementAudience audience, AnnouncementDestination destination) {
    public Announcement {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(audience, "audience");
        Objects.requireNonNull(destination, "destination");
        if (Objects.isNull(versions) || versions.isEmpty()) {
            throw new DomainException("ANNOUNCEMENT_CONTENT_REQUIRED", "Write the announcement in Spanish, English or both");
        }
        versions = Map.copyOf(new EnumMap<>(versions));
    }

    /** The version a recipient with this preferred language reads. */
    public Map.Entry<NotificationLocale, AnnouncementContent> versionFor(NotificationLocale preferred) {
        if (versions.containsKey(preferred)) {
            return Map.entry(preferred, versions.get(preferred));
        }
        NotificationLocale other = preferred == NotificationLocale.ES ? NotificationLocale.EN : NotificationLocale.ES;
        return Map.entry(other, versions.get(other));
    }

    /** The title shown in the audit: the Spanish one, or the English one when only English was written. */
    public String headline() {
        return versions.getOrDefault(NotificationLocale.ES, versions.get(NotificationLocale.EN)).title();
    }

    /** The notification data of one version: its title, body and the in-app path its push opens. */
    public Map<String, String> data(AnnouncementContent version) {
        return Map.of(NotificationType.SUBJECT, version.title(), NotificationType.BODY, version.body(),
                NotificationType.ROUTE, destination.route());
    }
}
