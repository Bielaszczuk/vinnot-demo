package com.vinnot.wine.infrastructure.ai;

import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Without a moderation provider the submission waits for a person under a reason the apps can translate. */
class UnavailableWineSubmissionModerationAdapterTest {

    @Test
    void recordsTheModerationUnavailableReasonSoUsersSeeLocalizedCopy() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Catena Zapata", "RED", 2020,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);

        WineContentSafetyReview review = new UnavailableWineSubmissionModerationAdapter()
                .reviewSafety(submission, new byte[] {1}, "image/jpeg");
        submission.requireReview(review.reason(), 0.0, "quarantine://label.jpg");

        assertThat(review.completed()).isFalse();
        assertThat(review.safe()).isFalse();
        assertThat(submission.systemReason()).contains(WineSubmissionSystemReason.MODERATION_UNAVAILABLE);
    }
}
