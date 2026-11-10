package com.vinnot.wine.application.query.response;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineSubmissionDetailsResponseTest {

    @Test
    void exposesWhichValuesAreCatalogEntriesAndWhichGrapesAreProposed() {
        UUID winery = UUID.randomUUID();
        UUID country = UUID.randomUUID();
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Catena Zapata", "RED", 2020,
                List.of("Malbec", "Uva Nueva"), "Argentina", "Valle Oculto", null, null,
                new WineSubmissionCatalogReferences(winery, country, null, List.of("Uva Nueva")));

        var response = WineSubmissionDetailsResponse.fromDomain(submission, true);

        assertThat(response.wineryId()).isEqualTo(winery);
        assertThat(response.countryId()).isEqualTo(country);
        assertThat(response.regionId()).as("the region is a proposal").isNull();
        assertThat(response.region()).isEqualTo("Valle Oculto");
        assertThat(response.grapes()).as("every grape is still listed").containsExactly("Malbec", "Uva Nueva");
        assertThat(response.proposedGrapes()).containsExactly("Uva Nueva");
    }

    @Test
    void exposesTheAutomaticReasonAsAStableCodeTheAppsTranslate() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Catena Zapata", "RED", 2020,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
        submission.requireReview(
                WineSubmissionSystemReason.MODERATION_UNAVAILABLE.storedText(), 0.0, "quarantine://label.jpg");

        var response = WineSubmissionDetailsResponse.fromDomain(submission, false);

        assertThat(response.reasonCode()).isEqualTo("MODERATION_UNAVAILABLE");
        assertThat(response.reviewReason()).isEqualTo("Content moderation was unavailable");
    }

    @Test
    void keepsTheModeratorsOwnTextWithoutACode() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Catena Zapata", "RED", 2020,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
        submission.requireReview("Manual review", 0.5, "quarantine://label.jpg");
        submission.requestCorrections(UUID.randomUUID(), "Subí una foto más nítida");

        var response = WineSubmissionDetailsResponse.fromDomain(submission, false);

        assertThat(response.reasonCode()).isNull();
        assertThat(response.reviewReason()).isEqualTo("Subí una foto más nítida");
    }
}
