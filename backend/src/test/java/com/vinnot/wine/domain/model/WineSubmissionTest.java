package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineSubmissionTest {

    @Test
    void recordsAdministratorAuditWhenApprovingAQuarantinedSubmission() {
        WineSubmission submission = pendingReview();
        UUID reviewerId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();

        submission.approveByAdmin(
                wineId, "/api/uploads/wine-labels/approved.jpg",
                reviewerId, "Verified wine and label");

        assertThat(submission.getStatus()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(submission.getCreatedWineId()).isEqualTo(wineId);
        assertThat(submission.getReviewedBy()).isEqualTo(reviewerId);
        assertThat(submission.getReviewedAt()).isNotNull();
        assertThat(submission.isImageQuarantined()).isFalse();
    }

    @Test
    void onlyAllowsAdministratorDecisionsFromNeedsReview() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Malbec", "Bodega", "RED", 2022,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);

        assertThatThrownBy(() -> submission.rejectByAdmin(
                UUID.randomUUID(), "Invalid label"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("pending-review");
    }

    @Test
    void requiresAnAuditableReasonForEveryAdministratorDecision() {
        WineSubmission submission = pendingReview();

        assertThatThrownBy(() -> submission.requestCorrections(UUID.randomUUID(), " "))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("reason");
    }

    @Test
    void keepsTheStoredAutomaticReasonTextAndExposesItAsAStableCode() {
        WineSubmission approved = created();
        approved.approve(UUID.randomUUID(), "/label.jpg", 0.9);
        WineSubmission duplicate = created();
        duplicate.markDuplicate(UUID.randomUUID(), 0.95);

        assertThat(approved.getReviewReason()).isEqualTo("Automatically approved");
        assertThat(approved.systemReason()).contains(WineSubmissionSystemReason.AUTO_APPROVED);
        assertThat(duplicate.getReviewReason()).isEqualTo("Existing catalog match");
        assertThat(duplicate.systemReason()).contains(WineSubmissionSystemReason.CATALOG_MATCH);
    }

    @Test
    void mapsEveryKnownAutomaticTextToItsCodeAndAnyOtherTextToAGenericContentReview() {
        for (WineSubmissionSystemReason reason : WineSubmissionSystemReason.values()) {
            if (reason != WineSubmissionSystemReason.CONTENT_REVIEW) {
                WineSubmission submission = created();
                submission.requireReview(reason.storedText(), 0.5, "quarantine://label.jpg");
                assertThat(submission.systemReason()).contains(reason);
            }
        }
        assertThat(pendingReview().systemReason()).contains(WineSubmissionSystemReason.CONTENT_REVIEW);
        assertThatThrownBy(WineSubmissionSystemReason.CONTENT_REVIEW::storedText)
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void administratorDecisionsAndMissingReasonsHaveNoSystemReason() {
        WineSubmission rejected = pendingReview();
        rejected.rejectByAdmin(UUID.randomUUID(), "Automatically approved");

        assertThat(rejected.systemReason()).isEmpty();
        assertThat(created().systemReason()).isEmpty();
    }

    private WineSubmission created() {
        return WineSubmission.create(
                UUID.randomUUID(), "Malbec", "Bodega", "RED", 2022,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
    }

    private WineSubmission pendingReview() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Malbec", "Bodega", "RED", 2022,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
        submission.requireReview(
                "Provider unavailable", 0.72, "quarantine://label.jpg");
        return submission;
    }

    @Test
    void keepsCatalogReferencesAndProposedGrapesSubmittedByTheUser() {
        UUID winery = UUID.randomUUID();
        UUID country = UUID.randomUUID();
        UUID region = UUID.randomUUID();
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Bodega", null, null,
                List.of("Malbec", "Uva Nueva"), "Argentina", "Mendoza", null, null,
                new WineSubmissionCatalogReferences(winery, country, region, List.of("Uva Nueva")));

        assertThat(submission.getCatalogReferences())
                .isEqualTo(new WineSubmissionCatalogReferences(winery, country, region, List.of("Uva Nueva")));
    }

    @Test
    void rejectsAProposedGrapeThatWasNotSubmitted() {
        assertThatThrownBy(() -> WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Bodega", null, null, List.of("Malbec"), null, null, null, null,
                new WineSubmissionCatalogReferences(null, null, null, List.of("Syrah"))))
                .isInstanceOf(DomainException.class)
                .hasMessage("Proposed grapes must be submitted grapes");
    }

    @Test
    void rejectsACatalogRegionWithoutItsCatalogCountry() {
        assertThatThrownBy(() -> new WineSubmissionCatalogReferences(null, null, UUID.randomUUID(), List.of()))
                .isInstanceOf(DomainException.class)
                .hasMessage("A catalog region requires its catalog country");
    }

    @Test
    void submissionsCreatedWithoutReferencesHaveNone() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Bodega", null, null, List.of("Malbec"), null, null, null, null);

        assertThat(submission.getCatalogReferences()).isEqualTo(WineSubmissionCatalogReferences.none());
    }

}
