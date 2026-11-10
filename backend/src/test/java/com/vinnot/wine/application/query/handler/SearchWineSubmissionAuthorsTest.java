package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.model.SearchWineSubmissionsQuery;
import com.vinnot.wine.domain.model.WineSubmission;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SearchWineSubmissionAuthorsTest {
    @Test
    void resolvesDistinctAuthorsInOneBatchAndKeepsMissingAccountsReadable() {
        var repository = mock(WineSubmissionRepositoryPort.class);
        var authors = mock(WineSubmissionAuthorQueryPort.class);
        var userId = UUID.randomUUID();
        var missing = UUID.randomUUID();
        var rows = List.of(submission(userId), submission(userId), submission(missing));
        when(repository.search(any(), any(), any())).thenReturn(PageResult.of(rows, 1, 3, 6));
        when(authors.findAllByIds(List.of(userId, missing)))
                .thenReturn(List.of(new WineSubmissionAuthorQueryPort.Author(userId, "contributor")));
        var page = new SearchWineSubmissionsQueryHandler(repository, authors)
                .execute(new SearchWineSubmissionsQuery(null, null, 1, 3));
        assertThat(page.content()).extracting("submittedByUsername")
                .containsExactly("contributor", "contributor", null);
        assertThat(page.totalElements()).isEqualTo(6);
        verify(authors).findAllByIds(List.of(userId, missing));
        verifyNoMoreInteractions(authors);
    }

    private WineSubmission submission(UUID userId) {
        return WineSubmission.create(userId, "Wine", "Winery", "RED", 2024,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
    }
}
