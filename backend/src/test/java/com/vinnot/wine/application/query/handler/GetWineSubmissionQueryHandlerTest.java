package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.model.GetWineSubmissionQuery;
import com.vinnot.wine.domain.model.WineSubmission;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

class GetWineSubmissionQueryHandlerTest {

    private final WineSubmissionRepositoryPort repository =
            mock(WineSubmissionRepositoryPort.class);
    private final WineSubmissionAuthorQueryPort authors =
            mock(WineSubmissionAuthorQueryPort.class);
    private final GetWineSubmissionQueryHandler handler =
            new GetWineSubmissionQueryHandler(repository, authors);

    @Test
    void rejectsAUserReadingAnotherUsersSubmission() {
        WineSubmission submission = reviewSubmission();
        when(repository.findById(submission.getId())).thenReturn(Optional.of(submission));

        assertThatThrownBy(() -> handler.execute(new GetWineSubmissionQuery(
                submission.getId(), UUID.randomUUID(), false)))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("SUBMISSION_ACCESS_DENIED"));
    }

    @Test
    void hidesQuarantinedImageLocationFromOwnerButExposesAvailability() {
        WineSubmission submission = reviewSubmission();
        when(repository.findById(submission.getId())).thenReturn(Optional.of(submission));

        var response = handler.execute(new GetWineSubmissionQuery(
                submission.getId(), submission.getSubmittedBy(), false));

        assertThat(response.submittedByUsername()).isNull();
        verifyNoInteractions(authors);
        assertThat(response.imageUrl()).isNull();
        assertThat(response.imageAvailable()).isTrue();
    }

    @Test
    void allowsAdministratorToInspectQuarantinedImageReference() {
        WineSubmission submission = reviewSubmission();
        when(repository.findById(submission.getId())).thenReturn(Optional.of(submission));

        var response = handler.execute(new GetWineSubmissionQuery(
                submission.getId(), UUID.randomUUID(), true));

        assertThat(response.imageUrl()).isEqualTo("quarantine://label.jpg");
        assertThat(response.submittedByUsername()).isNull();
        when(authors.findAllByIds(List.of(submission.getSubmittedBy())))
                .thenReturn(List.of(new WineSubmissionAuthorQueryPort.Author(
                        submission.getSubmittedBy(), "wine.author")));
        assertThat(handler.execute(new GetWineSubmissionQuery(submission.getId(), UUID.randomUUID(), true))
                .submittedByUsername()).isEqualTo("wine.author");
    }

    private WineSubmission reviewSubmission() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Bodega Norte", "RED",
                2024, List.of("Malbec"), "Argentina", "Mendoza",
                null, null);
        submission.requireReview("Ambiguous duplicate", 0.72, "quarantine://label.jpg");
        return submission;
    }
}
