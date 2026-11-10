package com.vinnot.wine.infrastructure.notification;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.wine.application.port.out.WineSubmissionNotificationPort;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * The contributor's address and preferred language are resolved by the notification module at delivery
 * time; Spanish is only the fallback. Automatic review reasons travel as codes so the email shows localized
 * copy instead of the stored text, while an administrator's reason is sent as written.
 */
@Component
@RequiredArgsConstructor
public class EmailWineSubmissionNotificationAdapter implements WineSubmissionNotificationPort {
    private final NotificationPort notifications;

    @Override
    public void notifyStatusChanged(WineSubmission submission) {
        Optional<WineSubmissionSystemReason> systemReason = submission.systemReason();
        Map<String, String> data = new HashMap<>(Map.of("wineName", submission.getWineName(),
                "status", submission.getStatus().name(),
                "reason", systemReason.isPresent() ? "" : Objects.requireNonNullElse(submission.getReviewReason(), "")));
        systemReason.ifPresent(reason -> data.put("reasonCode", reason.name()));
        notifications.enqueue(NotificationRequest.of(NotificationType.WINE_SUBMISSION_STATUS,
                NotificationRecipient.user(submission.getSubmittedBy()), NotificationLocale.ES, data,
                "submission:" + submission.getId() + ":" + submission.getUpdatedAt()));
    }
}
