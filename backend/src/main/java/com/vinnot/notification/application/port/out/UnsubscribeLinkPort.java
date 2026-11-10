package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationCategory;

import java.util.Optional;
import java.util.UUID;

/** Signed links that turn off one promotional category for one user, without signing in. */
public interface UnsubscribeLinkPort {

    UnsubscribeLink issue(UUID userId, NotificationCategory category);

    /** Empty for a forged, altered or unreadable token. */
    Optional<UnsubscribeTarget> verify(String token);

    /** {@code pageUrl} opens the web confirmation page; {@code oneClickUrl} accepts the RFC 8058 POST. */
    record UnsubscribeLink(String pageUrl, String oneClickUrl) {
    }

    record UnsubscribeTarget(UUID userId, NotificationCategory category) {
    }
}
