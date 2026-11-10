package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.DeliverAnnouncementsUseCase;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Queues one batch of the oldest pending announcement per run (#310), in the language each account prefers when it
 * was written. Emails go one per account; pushes go as one request per language version. Preferences, consent,
 * suppressions, quiet hours and the daily cap are applied again at delivery, so a change after the send still counts.
 * A service notice's push waits out quiet hours too: it is never urgent.
 */
@Service
@RequiredArgsConstructor
public class DeliverAnnouncementsService implements DeliverAnnouncementsUseCase {
    static final int BATCH_SIZE = 500;
    private final AnnouncementStorePort store;
    private final AnnouncementAudiencePort audiences;
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;

    @Override
    @Transactional
    public int execute(Instant now) {
        return store.lockNextPending().map(pending -> deliver(pending, now)).orElse(0);
    }

    private int deliver(AnnouncementStorePort.Pending pending, Instant now) {
        Announcement announcement = pending.announcement();
        List<AnnouncementAudiencePort.Recipient> batch = audiences.after(announcement.audience(),
                announcement.kind().promotional(), pending.lastUserId(), BATCH_SIZE);
        Map<NotificationLocale, List<UUID>> pushed = new EnumMap<>(NotificationLocale.class);
        for (AnnouncementAudiencePort.Recipient recipient : batch) {
            Map.Entry<NotificationLocale, AnnouncementContent> version = announcement.versionFor(recipient.language());
            if (recipient.email() && announcement.audience().email()) {
                notifications.enqueue(NotificationRequest.of(announcement.kind().type(),
                        NotificationRecipient.user(recipient.userId()), version.getKey(),
                        announcement.data(version.getValue()), AnnouncementRef.email(pending.id(), recipient.userId())));
            }
            if (recipient.push() && announcement.audience().push()) {
                pushed.computeIfAbsent(version.getKey(), ignored -> new ArrayList<>()).add(recipient.userId());
            }
        }
        pushed.forEach((locale, users) -> PushRequest.batches(announcement.kind().type(), users,
                        announcement.data(announcement.versions().get(locale)),
                        AnnouncementRef.push(pending.id(), locale, users.get(0)), true)
                .forEach(pushes::push));
        UUID last = batch.isEmpty() ? pending.lastUserId() : batch.get(batch.size() - 1).userId();
        store.advance(pending.id(), last, batch.size() < BATCH_SIZE ? now : null);
        return batch.size();
    }
}
