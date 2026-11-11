package com.vinnot.community.infrastructure.notification;

import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class EmailReportOutcomeNotifierTest {
    @Test
    void theReporterIsToldTheOutcomeWithoutTheAuthor() {
        NotificationPort notifications = mock(NotificationPort.class);
        UUID reporter = UUID.randomUUID();
        UUID author = UUID.randomUUID();
        CommunityReport report = CommunityReport.create(reporter, new ContentTarget(ContentTarget.Type.COMMENT, UUID.randomUUID()),
                author, CommunityReport.Reason.HATE, "", "excerpt", Instant.now());
        var dismissed = report.review(UUID.randomUUID(), CommunityReport.Status.DISMISSED, "No breach", Instant.now());
        var notifier = new EmailReportOutcomeNotifier(notifications);

        notifier.reportClosed(dismissed, false);
        notifier.reportClosed(dismissed, true);

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(sent.capture());
        assertThat(sent.getAllValues()).extracting(NotificationRequest::data).containsExactly(
                Map.of("outcome", "DISMISSED", "targetType", "COMMENT", "reason", "HATE"),
                Map.of("outcome", "REMOVED", "targetType", "COMMENT", "reason", "HATE"));
        assertThat(sent.getValue().type()).isEqualTo(NotificationType.REPORT_OUTCOME);
        assertThat(sent.getValue().recipient()).isEqualTo(NotificationRecipient.user(reporter));
        assertThat(sent.getValue().dedupeKey()).isEqualTo("report-outcome:" + report.id() + ":REMOVED");
        assertThat(sent.getAllValues()).allSatisfy(request -> assertThat(request.data().values()).doesNotContain(author.toString()));
    }

    @Test
    void aCatalogQualityReportHasNobodyToEmail() {
        NotificationPort notifications = mock(NotificationPort.class);
        CommunityReport resolved = CommunityReport.exactMatchCorrected(UUID.randomUUID(), UUID.randomUUID(), "", Instant.now())
                .review(UUID.randomUUID(), CommunityReport.Status.RESOLVED, "Fixed the winery by hand", Instant.now());

        new EmailReportOutcomeNotifier(notifications).reportClosed(resolved, false);

        verifyNoInteractions(notifications);
    }

    @Test
    void aReporterWhoDeletedTheirAccountIsNotWritten() {
        NotificationPort notifications = mock(NotificationPort.class);
        CommunityReport report = CommunityReport.create(UUID.randomUUID(), new ContentTarget(ContentTarget.Type.REVIEW, UUID.randomUUID()),
                UUID.randomUUID(), CommunityReport.Reason.SPAM, "", "excerpt", Instant.now());
        CommunityReport orphan = new CommunityReport(report.id(), null, report.target(), report.authorId(), report.reason(),
                report.description(), report.excerpt(), CommunityReport.Status.DISMISSED, null, "No breach",
                report.createdAt(), report.updatedAt(), null);

        new EmailReportOutcomeNotifier(notifications).reportClosed(orphan, false);

        verifyNoInteractions(notifications);
    }
}
