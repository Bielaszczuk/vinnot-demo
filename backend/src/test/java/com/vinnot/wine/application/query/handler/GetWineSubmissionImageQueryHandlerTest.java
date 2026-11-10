package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.domain.model.WineSubmission;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GetWineSubmissionImageQueryHandlerTest {

    @Test
    void loadsAQuarantinedImageOnlyForAnExistingSubmission() {
        UUID submissionId = UUID.randomUUID();
        WineSubmissionRepositoryPort repository =
                mock(WineSubmissionRepositoryPort.class);
        FileStoragePort storage = mock(FileStoragePort.class);
        WineSubmission submission = mock(WineSubmission.class);
        ByteArrayInputStream content = new ByteArrayInputStream(new byte[]{1, 2, 3});
        when(repository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(storage.loadQuarantinedWineLabel(submissionId))
                .thenReturn(new FileStoragePort.StoredFile(
                        content, "image/jpeg", 3));
        GetWineSubmissionImageQueryHandler handler =
                new GetWineSubmissionImageQueryHandler(repository, storage);

        var response = handler.execute(submissionId);

        assertThat(response.content()).isSameAs(content);
        assertThat(response.contentType()).isEqualTo("image/jpeg");
        assertThat(response.size()).isEqualTo(3);
    }

    @Test
    void rejectsUnknownSubmissionsBeforeTouchingPrivateStorage() {
        UUID submissionId = UUID.randomUUID();
        WineSubmissionRepositoryPort repository =
                mock(WineSubmissionRepositoryPort.class);
        FileStoragePort storage = mock(FileStoragePort.class);
        when(repository.findById(submissionId)).thenReturn(Optional.empty());
        GetWineSubmissionImageQueryHandler handler =
                new GetWineSubmissionImageQueryHandler(repository, storage);

        assertThatThrownBy(() -> handler.execute(submissionId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(storage, never()).loadQuarantinedWineLabel(submissionId);
    }
}
