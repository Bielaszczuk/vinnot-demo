package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.in.DeliverNotificationUseCase;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.NotificationRendererPort;
import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Sends one stored email. An announcement's email (#490) is also counted against its announcement: sent once the
 * provider accepts it, failed when its address is suppressed or the outbox {@linkplain #gaveUp gives up} on it. Counting
 * is best-effort and never fails the job, which would send the email again.
 */
@Service
public class DeliverNotificationService implements DeliverNotificationUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(DeliverNotificationService.class);
    private final NotificationRecipientDirectoryPort directory;
    private final NotificationRendererPort renderer;
    private final NotificationDeliveryPort delivery;
    private final NotificationPreferenceRepositoryPort preferences;
    private final UnsubscribeLinkPort unsubscribeLinks;
    private final EmailSuppressionPort suppressions;
    private final AnnouncementStatsPort announcementStats;

    public DeliverNotificationService(NotificationRecipientDirectoryPort directory, NotificationRendererPort renderer,
            NotificationDeliveryPort delivery, NotificationPreferenceRepositoryPort preferences,
            UnsubscribeLinkPort unsubscribeLinks, EmailSuppressionPort suppressions,
            AnnouncementStatsPort announcementStats) {
        this.directory = directory;
        this.renderer = renderer;
        this.delivery = delivery;
        this.preferences = preferences;
        this.unsubscribeLinks = unsubscribeLinks;
        this.suppressions = suppressions;
        this.announcementStats = announcementStats;
    }

    @Override
    public void deliver(NotificationRequest request) {
        if (request.recipient().isAddress()) {
            send(request, request.recipient().email(), () -> renderer.render(request));
            return;
        }
        UUID userId = request.recipient().userId();
        resolve(request).ifPresent(resolved -> {
            NotificationCategory category = resolved.category();
            // Checked at delivery, so a choice made while the message waited in the outbox is respected.
            if (!category.transactional() && !preferences.load(userId).allows(category, NotificationChannel.EMAIL)) {
                LOGGER.info("Notification {} skipped by the recipient's preferences", resolved.type());
                return;
            }
            send(resolved, resolved.recipient().email(), () -> render(resolved, userId));
        });
    }

    @Override
    public void gaveUp(NotificationRequest request) {
        count(request, 0, 1);
    }

    /**
     * Every message, transactional ones included, skips an address that hard-bounced or complained: sending
     * there again hurts the sender reputation all mail depends on. It is checked before rendering, so a
     * suppressed promotional message never issues an unsubscribe link.
     */
    private void send(NotificationRequest request, String address, Supplier<RenderedNotification> message) {
        if (suppressions.isSuppressed(address)) {
            LOGGER.info("Notification {} skipped: the recipient address is suppressed", request.type());
            count(request, 0, 1);
            return;
        }
        delivery.send(request.type(), address, message.get());
        count(request, 1, 0);
    }

    /** Counts an announcement's email (#490); a failure is logged and never fails the job. */
    private void count(NotificationRequest request, int sent, int failed) {
        AnnouncementRef.of(request.dedupeKey()).ifPresent(announcement -> {
            try {
                announcementStats.recordEmail(announcement.announcementId(), sent, failed);
            } catch (RuntimeException failure) {
                LOGGER.warn("Could not count an announcement email", failure);
            }
        });
    }

    private RenderedNotification render(NotificationRequest request, UUID userId) {
        if (!request.category().promotional()) {
            return renderer.render(request);
        }
        UnsubscribeLinkPort.UnsubscribeLink link = unsubscribeLinks.issue(userId, request.category());
        Map<String, String> headers = new LinkedHashMap<>();
        // RFC 2369 and RFC 8058 one-click unsubscribe.
        headers.put("List-Unsubscribe", "<" + link.oneClickUrl() + ">");
        headers.put("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        return renderer.render(request.withData(NotificationType.UNSUBSCRIBE_URL, link.pageUrl())).withHeaders(headers);
    }

    /**
     * A user gets their current address and preferred language, falling back to the request's locale (types that
     * {@link NotificationType#keepsRequestLocale() keep it} always use it); a user deleted before delivery has nobody
     * left to notify, so the message is dropped.
     */
    private Optional<NotificationRequest> resolve(NotificationRequest request) {
        return directory.findUser(request.recipient().userId()).map(user -> new NotificationRequest(request.type(),
                user.recipient(), request.type().keepsRequestLocale() ? request.locale() : user.localeOr(request.locale()),
                request.data(), request.dedupeKey(), request.category()));
    }
}
