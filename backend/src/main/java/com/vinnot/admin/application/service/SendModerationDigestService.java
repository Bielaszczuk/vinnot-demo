package com.vinnot.admin.application.service;

import com.vinnot.admin.application.port.in.SendModerationDigestUseCase;
import com.vinnot.admin.application.port.out.ModerationQueueDigest;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * One email per staff member with the moderation work that arrived since the previous run: a single item is named,
 * several are counted. The cursor moves and the emails are queued in one transaction, so a failure leaves the window
 * for the next run. A window ends a few minutes before the run, like the likes summary, so a row stamped before its
 * transaction committed is reported by the next digest instead of falling outside every window.
 */
@Service
@RequiredArgsConstructor
public class SendModerationDigestService implements SendModerationDigestUseCase {
    private static final Duration SETTLING_TIME = Duration.ofMinutes(5);
    private final ModerationQueueDigest queue;
    private final NotificationPort notifications;

    @Override
    @Transactional
    public int execute(Instant now) {
        ModerationQueueDigest.Window window = queue.claim(now.minus(SETTLING_TIME));
        ModerationQueueDigest.NewWork work = queue.newWork(window);
        if (work.isEmpty()) {
            return 0;
        }
        Map<String, String> data = new HashMap<>(Map.of("submissions", Integer.toString(work.submissions()),
                "reports", Integer.toString(work.reports())));
        if (Objects.nonNull(work.wineName())) {
            data.put("wineName", work.wineName());
        }
        if (Objects.nonNull(work.reportReason())) {
            data.put("reportReason", work.reportReason());
        }
        List<UUID> staff = queue.staff();
        for (UUID member : staff) {
            notifications.enqueue(NotificationRequest.of(NotificationType.MODERATION_QUEUE_DIGEST, NotificationRecipient.user(member),
                    NotificationLocale.ES, data, "moderation-digest:" + member + ":" + window.to().toEpochMilli()));
        }
        return staff.size();
    }
}
