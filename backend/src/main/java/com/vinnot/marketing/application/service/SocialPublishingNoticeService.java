package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.AdminRecipients;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.PostPublishing;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Tells every administrator what publishing needs from them (#510), the way the batch notice does (#489): one email and
 * push per admin, deduplicated by the outbox. A failed post is announced once per publishing run (its finish time is in
 * the key, so a retried post that fails again is announced again), a TikTok draft once per post and an account to
 * reconnect once per network and day.
 */
@Service
@RequiredArgsConstructor
public class SocialPublishingNoticeService implements SocialPublishingNotices {
    static final String FAILED_PREFIX = "social-failed:";
    static final String DRAFT_PREFIX = "social-tiktok-draft:";
    static final String RECONNECT_PREFIX = "social-reconnect:";
    private static final String ANY_NETWORK = "ALL";
    private final NotificationPort notifications;
    private final AdminRecipients admins;

    @Override
    public void postFailed(SocialPost post, SocialNetwork network, String errorCode) {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("postId", post.id().toString());
        if (Objects.nonNull(network)) {
            data.put("network", network.name());
        }
        data.put("error", errorCode);
        PostPublishing publishing = post.publishing();
        long run = Objects.isNull(publishing) || Objects.isNull(publishing.finishedAt()) ? 0 : publishing.finishedAt().toEpochMilli();
        send(NotificationType.SOCIAL_POST_FAILED, data, FAILED_PREFIX + post.id() + ":"
                + (Objects.isNull(network) ? ANY_NETWORK : network.name()) + ":" + run);
    }

    @Override
    public void tiktokDraftWaiting(SocialPost post) {
        send(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, Map.of("postId", post.id().toString()), DRAFT_PREFIX + post.id());
    }

    @Override
    public void accountNeedsReconnect(SocialNetwork network) {
        send(NotificationType.SOCIAL_ACCOUNT_RECONNECT, Map.of("network", network.name()),
                RECONNECT_PREFIX + network.name() + ":" + LocalDate.now(ZoneOffset.UTC));
    }

    /** The outbox deduplicates on one global key, so the key is suffixed with each recipient. */
    private void send(NotificationType type, Map<String, String> data, String key) {
        for (UUID admin : admins.admins()) {
            notifications.enqueue(NotificationRequest.of(type, NotificationRecipient.user(admin), NotificationLocale.ES, Map.copyOf(data),
                    key + ":" + admin));
        }
    }
}
