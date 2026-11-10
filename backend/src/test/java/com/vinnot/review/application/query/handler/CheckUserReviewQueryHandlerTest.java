package com.vinnot.review.application.query.handler;

import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CheckUserReviewQueryHandlerTest {

    @Test
    void delegatesUniqueReviewLookup() {
        ReviewRepositoryPort repository = mock(ReviewRepositoryPort.class);
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(repository.existsByWineIdAndUserId(wineId, userId)).thenReturn(true);

        assertThat(new CheckUserReviewQueryHandler(repository).execute(wineId, userId)).isTrue();
        verify(repository).existsByWineIdAndUserId(wineId, userId);
    }
}
