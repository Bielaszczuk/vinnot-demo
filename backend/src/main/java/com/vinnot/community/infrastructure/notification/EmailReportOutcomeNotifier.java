package com.vinnot.community.infrastructure.notification;

import com.vinnot.community.application.port.out.ReportOutcomeNotifier;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

/**
 * Queues the reporter's email, unless their account was deleted since; their language and address are resolved at delivery,
 * Spanish is only the fallback.
 */
@Component
@RequiredArgsConstructor
public class EmailReportOutcomeNotifier implements ReportOutcomeNotifier {
    private final NotificationPort notifications;

    @Override
    public void reportClosed(CommunityReport report, boolean contentRemoved) {
        if (Objects.isNull(report.reporterId())) {
            return;
        }
        String outcome = contentRemoved ? "REMOVED" : report.status().name();
        notifications.enqueue(NotificationRequest.of(NotificationType.REPORT_OUTCOME, NotificationRecipient.user(report.reporterId()),
                NotificationLocale.ES, Map.of("outcome", outcome, "targetType", report.target().type().name(),
                        "reason", report.reason().name()),
                "report-outcome:" + report.id() + ":" + outcome));
    }
}
