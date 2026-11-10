package com.vinnot.notification.application.port.out;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.NotificationLocale;

import java.util.List;
import java.util.UUID;

/**
 * The accounts an announcement reaches (#310): active and unsuspended, matching the segment. By email, a verified
 * address that is not suppressed; by push, at least one device. Promotional ones also need marketing consent and
 * the newsletter turned on for that channel.
 */
public interface AnnouncementAudiencePort {
    AnnouncementReach count(AnnouncementAudience audience, boolean promotional);

    /** The next accounts by id after {@code after} (all when empty), with the channels each one is reached by. */
    List<Recipient> after(AnnouncementAudience audience, boolean promotional, UUID after, int limit);

    record Recipient(UUID userId, NotificationLocale language, boolean email, boolean push) {
    }
}
