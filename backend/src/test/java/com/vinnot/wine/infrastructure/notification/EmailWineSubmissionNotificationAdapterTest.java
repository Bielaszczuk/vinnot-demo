package com.vinnot.wine.infrastructure.notification;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class EmailWineSubmissionNotificationAdapterTest {
    private static final UUID SUBMITTER = UUID.randomUUID();

    private final NotificationPort notifications = mock(NotificationPort.class);
    private final EmailWineSubmissionNotificationAdapter adapter = new EmailWineSubmissionNotificationAdapter(notifications);

    @Test
    void sendsAnAdministratorReasonAsWrittenToTheSubmitterKeyedByTheTransition() {
        WineSubmission submission = pendingReview();
        submission.rejectByAdmin(UUID.randomUUID(), "Falta la etiqueta");
        adapter.notifyStatusChanged(submission);
        var request = captured();
        assertThat(request.type()).isEqualTo(NotificationType.WINE_SUBMISSION_STATUS);
        assertThat(request.category()).isEqualTo(NotificationCategory.SUBMISSIONS);
        assertThat(request.recipient()).isEqualTo(NotificationRecipient.user(SUBMITTER));
        // Spanish is only the fallback: delivery switches to the submitter's current preferred language.
        assertThat(request.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(request.data()).containsEntry("wineName", "Malbec").containsEntry("status", "REJECTED")
                .containsEntry("reason", "Falta la etiqueta").doesNotContainKey("reasonCode");
        assertThat(request.dedupeKey()).isEqualTo("submission:" + submission.getId() + ":" + submission.getUpdatedAt());
    }

    @Test
    void sendsAutomaticReasonsAsCodesInsteadOfTheirStoredEnglishText() {
        WineSubmission approved = submission();
        approved.approve(UUID.randomUUID(), "/label.jpg", 0.9);
        adapter.notifyStatusChanged(approved);
        assertThat(captured().data()).containsEntry("status", "APPROVED").containsEntry("reason", "")
                .containsEntry("reasonCode", "AUTO_APPROVED");
        assertThat(approved.getReviewReason()).isEqualTo("Automatically approved");
    }

    @Test
    void neverForwardsAModerationProvidersOwnExplanation() {
        WineSubmission flagged = submission();
        flagged.requireReview("Flagged: violence/graphic", 0.0, "quarantine://label.jpg");
        adapter.notifyStatusChanged(flagged);
        assertThat(captured().data()).containsEntry("status", "NEEDS_REVIEW").containsEntry("reason", "")
                .containsEntry("reasonCode", "CONTENT_REVIEW").doesNotContainValue("Flagged: violence/graphic");
    }

    @Test
    void keepsTheEmptyReasonPreviouslySentForSubmissionsWithoutOne() {
        WineSubmission withoutReason = WineSubmission.builder().id(UUID.randomUUID()).submittedBy(SUBMITTER)
                .wineName("Malbec").wineryName("Bodega").status(WineSubmissionStatus.APPROVED)
                .updatedAt(Instant.parse("2026-10-17T10:00:00Z")).build();
        adapter.notifyStatusChanged(withoutReason);
        assertThat(captured().data()).containsEntry("reason", "").doesNotContainKey("reasonCode");
    }

    private NotificationRequest captured() {
        var request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        return request.getValue();
    }

    private static WineSubmission pendingReview() {
        WineSubmission submission = submission();
        submission.requireReview("La validación automática no está disponible", 0.0, "quarantine://label.jpg");
        return submission;
    }

    private static WineSubmission submission() {
        return WineSubmission.create(SUBMITTER, "Malbec", "Bodega Norte", "RED", 2022, List.of("Malbec"),
                "Argentina", "Mendoza", null, null);
    }
}
