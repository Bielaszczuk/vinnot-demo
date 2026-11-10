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
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class NotificationCommunityActivityNotifierTest {
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final NotificationCommunityActivityNotifier notifier = new NotificationCommunityActivityNotifier(notifications, pushes);

    @Test
    void aPublishedCommentIsQueuedOnceAsEmailAndPushForTheReviewAuthor() {
        UUID comment = UUID.randomUUID();
        UUID author = UUID.randomUUID();
        UUID wine = UUID.randomUUID();

        notifier.commentPublished(new CommunityActivityNotifier.CommentActivity(comment, author, "Lucía Pérez", wine, "Gran Malbec"));

        Map<String, String> data = Map.of("commenter", "Lucía Pérez", "wineId", wine.toString(), "wineName", "Gran Malbec");
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.REVIEW_COMMENT, NotificationRecipient.user(author),
                NotificationLocale.ES, data, "review-comment:" + comment));
        verify(pushes).push(new PushRequest(NotificationType.REVIEW_COMMENT, List.of(author), data, "review-comment:" + comment));
    }

    @Test
    void theDailyLikesSummaryIsAPushThatExpiresAndTheWeeklyOneAnEmail() {
        UUID author = UUID.randomUUID();
        UUID wine = UUID.randomUUID();
        Instant end = Instant.parse("2026-10-20T22:00:00Z");

        notifier.likesSummarized(new CommunityActivityNotifier.LikesSummary(LikeSummaryCadence.DAILY, author, 1, 1, wine,
                "Gran Malbec", "Carla Ruiz", end));
        notifier.likesSummarized(new CommunityActivityNotifier.LikesSummary(LikeSummaryCadence.WEEKLY, author, 5, 2, wine,
                "Gran Malbec", null, end));

        verify(pushes).push(new PushRequest(NotificationType.REVIEW_LIKES_DAILY, List.of(author), Map.of("likes", "1",
                "reviews", "1", "wineId", wine.toString(), "wineName", "Gran Malbec", "liker", "Carla Ruiz"),
                "review-likes:daily:" + author + ":" + end.toEpochMilli(), false, end.plus(Duration.ofDays(1))));
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.REVIEW_LIKES_WEEKLY, NotificationRecipient.user(author),
                NotificationLocale.ES, Map.of("likes", "5", "reviews", "2", "wineId", wine.toString(), "wineName", "Gran Malbec"),
                "review-likes:weekly:" + author + ":" + end.toEpochMilli()));
        verifyNoMoreInteractions(pushes, notifications);
    }
}
