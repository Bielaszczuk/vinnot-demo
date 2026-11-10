package com.vinnot.notification.application.service;

import com.vinnot.notification.application.model.AnnouncementPreview;
import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.in.ComposeAnnouncementUseCase;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.port.out.NotificationRendererPort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Composes administrators' announcements (#310) with the same templates delivery uses, so the preview and the test
 * are exactly what recipients get. News carries a placeholder unsubscribe link there; real ones are issued per
 * recipient at delivery.
 */
@Service
public class AnnouncementService implements ComposeAnnouncementUseCase {
    private final NotificationRendererPort emails;
    private final PushRendererPort pushes;
    private final NotificationRecipientDirectoryPort directory;
    private final NotificationPort notifications;
    private final PushNotificationPort pushNotifications;
    private final PushDeviceRepositoryPort devices;
    private final AnnouncementStorePort store;
    private final EmailSuppressionPort suppressions;
    private final String website;
    private final Clock clock;

    @Autowired
    public AnnouncementService(NotificationRendererPort emails, PushRendererPort pushes,
            NotificationRecipientDirectoryPort directory, NotificationPort notifications,
            PushNotificationPort pushNotifications, PushDeviceRepositoryPort devices, AnnouncementStorePort store,
            EmailSuppressionPort suppressions, @Value("${app.auth.frontend-base-url}") String website) {
        this(emails, pushes, directory, notifications, pushNotifications, devices, store, suppressions, website,
                Clock.systemUTC());
    }

    AnnouncementService(NotificationRendererPort emails, PushRendererPort pushes,
            NotificationRecipientDirectoryPort directory, NotificationPort notifications,
            PushNotificationPort pushNotifications, PushDeviceRepositoryPort devices, AnnouncementStorePort store,
            EmailSuppressionPort suppressions, String website, Clock clock) {
        this.emails = emails;
        this.pushes = pushes;
        this.directory = directory;
        this.notifications = notifications;
        this.pushNotifications = pushNotifications;
        this.devices = devices;
        this.store = store;
        this.suppressions = suppressions;
        this.website = website.replaceAll("/+$", "");
        this.clock = clock;
    }

    @Override
    public AnnouncementPreview preview(AnnouncementKind kind, NotificationLocale locale, AnnouncementContent content,
            UUID adminId) {
        NotificationRecipient admin = administrator(adminId).recipient();
        Map<String, String> data = Map.of(NotificationType.SUBJECT, content.title(), NotificationType.BODY, content.body());
        RenderedNotification email = emails.render(NotificationRequest.of(kind.type(),
                NotificationRecipient.address(admin.email(), admin.displayName()), locale, emailData(kind, data),
                "announcement-preview"));
        PushContent push = pushes.render(kind.type(), locale, data);
        return new AnnouncementPreview(email.subject(), email.html(), email.text(), push.title(), push.body());
    }

    @Override
    @Transactional
    public AnnouncementReach sendTest(Announcement announcement, UUID adminId) {
        NotificationRecipient admin = administrator(adminId).recipient();
        UUID id = UUID.randomUUID();
        boolean email = announcement.audience().email() && !suppressions.isSuppressed(admin.email());
        boolean push = announcement.audience().push() && !devices.findByUsers(List.of(adminId)).isEmpty();
        if (!email && !push) {
            throw new DomainException("ANNOUNCEMENT_TEST_UNREACHABLE",
                    "Your account cannot receive this test: no deliverable email or push device for the chosen channels");
        }
        announcement.versions().forEach((locale, version) -> {
            Map<String, String> data = new HashMap<>(announcement.data(version));
            data.put(NotificationType.KIND, announcement.kind().name());
            String key = AnnouncementRef.test(id, locale);
            if (email) {
                notifications.enqueue(NotificationRequest.of(NotificationType.ANNOUNCEMENT_TEST,
                        NotificationRecipient.user(adminId), locale, emailData(announcement.kind(), data), key));
            }
            if (push) {
                pushNotifications.push(new PushRequest(NotificationType.ANNOUNCEMENT_TEST, List.of(adminId), data, key));
            }
        });
        store.save(id, announcement, true, 1, new AnnouncementStorePort.Sender(adminId, admin.email()), clock.instant());
        return new AnnouncementReach(email ? 1 : 0, push ? 1 : 0, 1);
    }

    private NotificationRecipientDirectoryPort.DirectoryUser administrator(UUID adminId) {
        return directory.findUser(adminId)
                .orElseThrow(() -> new DomainException("ADMIN_NOT_FOUND", "The administrator account was not found"));
    }

    private Map<String, String> emailData(AnnouncementKind kind, Map<String, String> data) {
        if (!kind.promotional()) {
            return data;
        }
        Map<String, String> withLink = new HashMap<>(data);
        withLink.put(NotificationType.UNSUBSCRIBE_URL, website + "/unsubscribe");
        return withLink;
    }
}
