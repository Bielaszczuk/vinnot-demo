package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.infrastructure.persistence.jpa.ReviewJpaRepository;
import com.vinnot.review.infrastructure.persistence.mapper.ReviewPersistenceMapper;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ReviewPersistenceAdapterTest {
    @Test
    void mapsOneOwnerScopedIdProjectionWithoutLoadingReviewEntities() {
        var repository = mock(ReviewJpaRepository.class);
        var mapper = mock(ReviewPersistenceMapper.class);
        var adapter = new ReviewPersistenceAdapter(repository, mapper);
        UUID owner = UUID.randomUUID();
        UUID wine = UUID.randomUUID();
        UUID anotherWine = UUID.randomUUID();
        UUID review = UUID.randomUUID();
        var projection = mock(ReviewJpaRepository.WineReviewIdProjection.class);
        when(projection.getWineId()).thenReturn(wine);
        when(projection.getReviewId()).thenReturn(review);
        when(repository.findIdsByUserIdAndWineIds(owner, List.of(wine, anotherWine)))
                .thenReturn(List.of(projection));
        assertThat(adapter.findIdsByUserIdAndWineIds(owner, List.of(wine, anotherWine)))
                .isEqualTo(Map.of(wine, review));
        verify(repository).findIdsByUserIdAndWineIds(owner, List.of(wine, anotherWine));
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(mapper);
    }

    @Test
    void anEmptyCellarDoesNotIssueAnEmptyInQuery() {
        var repository = mock(ReviewJpaRepository.class);
        var adapter = new ReviewPersistenceAdapter(repository, mock(ReviewPersistenceMapper.class));
        assertThat(adapter.findIdsByUserIdAndWineIds(UUID.randomUUID(), List.of())).isEmpty();
        verifyNoInteractions(repository);
    }
}
