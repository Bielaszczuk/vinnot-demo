package com.vinnot.review.infrastructure.notification;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.review.application.port.out.CommunityActivityNotifier;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Queues the community notices as an email and a push. The member's community preference is checked per channel at
 * delivery, and the language there too; Spanish is only the fallback.
 */
@Component
@RequiredArgsConstructor
public class NotificationCommunityActivityNotifier implements CommunityActivityNotifier {
    private static final Duration DAILY_SUMMARY_LIFETIME = Duration.ofDays(1);
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;

    @Override
    public void commentPublished(CommentActivity activity) {
        Map<String, String> data = Map.of("commenter", activity.commenterName(), "wineId", activity.wineId().toString(),
                "wineName", activity.wineName());
        String key = "review-comment:" + activity.commentId();
        notifications.enqueue(NotificationRequest.of(NotificationType.REVIEW_COMMENT,
                NotificationRecipient.user(activity.reviewAuthorId()), NotificationLocale.ES, data, key));
        pushes.push(new PushRequest(NotificationType.REVIEW_COMMENT, List.of(activity.reviewAuthorId()), data, key));
    }

    /** The daily summary is a push that is dropped if it cannot be shown within a day; the weekly one is an email. */
    @Override
    public void likesSummarized(LikesSummary summary) {
        Map<String, String> data = new HashMap<>(Map.of("likes", Integer.toString(summary.likes()),
                "reviews", Integer.toString(summary.reviews()), "wineId", summary.wineId().toString(),
                "wineName", summary.wineName()));
        if (Objects.nonNull(summary.likerName())) {
            data.put("liker", summary.likerName());
        }
        String key = "review-likes:" + summary.cadence().name().toLowerCase(Locale.ROOT) + ":" + summary.authorId() + ":"
                + summary.windowEnd().toEpochMilli();
        if (summary.cadence() == LikeSummaryCadence.DAILY) {
            pushes.push(new PushRequest(NotificationType.REVIEW_LIKES_DAILY, List.of(summary.authorId()), data, key, false,
                    summary.windowEnd().plus(DAILY_SUMMARY_LIFETIME)));
        } else {
            notifications.enqueue(NotificationRequest.of(NotificationType.REVIEW_LIKES_WEEKLY,
                    NotificationRecipient.user(summary.authorId()), NotificationLocale.ES, data, key));
        }
    }
}
