package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.AdminRecipients;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Tells every administrator that a batch waits for approval (#489), the way the moderation digest does. The outbox
 * deduplicates on one global key, so the window start is suffixed with the recipient: one email per admin per batch.
 */
@Service
@RequiredArgsConstructor
public class SocialBatchNoticeService {
    static final String DEDUPE_PREFIX = "social-batch:";
    private final NotificationPort notifications;
    private final AdminRecipients admins;

    /** @return how many administrators were notified; none when no post is pending */
    public int send(int pendingPosts, LocalDate from, LocalDate to) {
        if (pendingPosts <= 0) {
            return 0;
        }
        Map<String, String> data = Map.of("count", Integer.toString(pendingPosts), "from", from.toString(), "to", to.toString());
        List<UUID> recipients = admins.admins();
        for (UUID admin : recipients) {
            notifications.enqueue(NotificationRequest.of(NotificationType.SOCIAL_BATCH_READY, NotificationRecipient.user(admin),
                    NotificationLocale.ES, data, DEDUPE_PREFIX + from + ":" + admin));
        }
        return recipients.size();
    }
}
