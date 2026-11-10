package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.model.GetAllGrapeTypesQuery;
import com.vinnot.wine.application.query.model.GetFeaturedWinesQuery;
import com.vinnot.wine.application.query.model.GetMyWineSubmissionsQuery;
import com.vinnot.wine.application.query.model.GetPopularWinesQuery;
import com.vinnot.wine.application.query.model.GetRecentWinesQuery;
import com.vinnot.wine.application.query.model.GetRecommendedWinesQuery;
import com.vinnot.wine.application.query.model.GetSimilarWinesQuery;
import com.vinnot.wine.application.query.model.GetTopRatedWinesQuery;
import com.vinnot.wine.application.query.model.SearchWineSubmissionsQuery;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineCatalogQueryHandlersTest {

    @Test
    void mapsActiveGrapeReferenceData() {
        GrapeTypeRepositoryPort grapes = mock(GrapeTypeRepositoryPort.class);
        UUID grapeId = UUID.randomUUID();
        when(grapes.findAllActive()).thenReturn(List.of(
                new GrapeTypeRepositoryPort.GrapeTypeData(
                        grapeId, "Malbec", "Malbec", "RED")));

        var result = new GetAllGrapeTypesQueryHandler(grapes)
                .execute(new GetAllGrapeTypesQuery());

        assertThat(result).singleElement()
                .satisfies(grape -> assertThat(grape.id()).isEqualTo(grapeId));
    }

    @Test
    void delegatesCuratedWineCollectionsWithApplicationPaging() {
        WineRepositoryPort wines = mock(WineRepositoryPort.class);
        when(wines.findFeatured(any())).thenReturn(PageResult.empty());
        when(wines.findPopular(any())).thenReturn(PageResult.empty());
        when(wines.findRecent(any())).thenReturn(PageResult.empty());
        when(wines.findRecommended(any())).thenReturn(PageResult.empty());
        when(wines.findTopRated(any())).thenReturn(PageResult.empty());

        assertThat(new GetFeaturedWinesQueryHandler(wines)
                .execute(new GetFeaturedWinesQuery(0, 10)).content()).isEmpty();
        assertThat(new GetPopularWinesQueryHandler(wines)
                .execute(new GetPopularWinesQuery(0, 10)).content()).isEmpty();
        assertThat(new GetRecentWinesQueryHandler(wines)
                .execute(new GetRecentWinesQuery(0, 10)).content()).isEmpty();
        assertThat(new GetRecommendedWinesQueryHandler(wines)
                .execute(new GetRecommendedWinesQuery(0, 10)).content()).isEmpty();
        assertThat(new GetTopRatedWinesQueryHandler(wines)
                .execute(new GetTopRatedWinesQuery(0, 10)).content()).isEmpty();
    }

    @Test
    void mapsSimilarWinesAndRejectsAnUnknownSourceWine() {
        WineRepositoryPort wines = mock(WineRepositoryPort.class);
        Wine source = wine("Source");
        Wine similar = wine("Similar");
        when(wines.findById(source.getId())).thenReturn(Optional.of(source));
        when(wines.findSimilar(source.getWineType(), source.getId(), 3))
                .thenReturn(List.of(similar));
        GetSimilarWinesQueryHandler handler = new GetSimilarWinesQueryHandler(wines);

        assertThat(handler.execute(new GetSimilarWinesQuery(source.getId(), 3)))
                .singleElement()
                .satisfies(result -> assertThat(result.id()).isEqualTo(similar.getId()));

        UUID missing = UUID.randomUUID();
        when(wines.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetSimilarWinesQuery(missing, 3)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(wines).findSimilar(source.getWineType(), source.getId(), 3);
    }

    @Test
    void mapsOwnerAndAdministrativeSubmissionPagesWithDifferentVisibility() {
        WineSubmissionRepositoryPort submissions =
                mock(WineSubmissionRepositoryPort.class);
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Winery", "RED", 2022,
                List.of("Malbec"), "Argentina", "Mendoza", null, null);
        submission.requireReview("Review", 0.7, "quarantine://label.jpg");
        when(submissions.findBySubmittedBy(any(), any()))
                .thenReturn(PageResult.of(List.of(submission), 0, 10, 1));
        when(submissions.search(any(), any(), any()))
                .thenReturn(PageResult.of(List.of(submission), 0, 10, 1));

        var mine = new GetMyWineSubmissionsQueryHandler(submissions).execute(
                new GetMyWineSubmissionsQuery(submission.getSubmittedBy(), 0, 10));
        var admin = new SearchWineSubmissionsQueryHandler(submissions, mock(WineSubmissionAuthorQueryPort.class)).execute(
                new SearchWineSubmissionsQuery(
                        WineSubmissionStatus.NEEDS_REVIEW, "Reserva", 0, 10));

        assertThat(mine.content().getFirst().imageUrl()).isNull();
        assertThat(admin.content().getFirst().imageUrl())
                .isEqualTo("quarantine://label.jpg");
    }

    private Wine wine(String name) {
        return Wine.create(name, UUID.randomUUID(), WineType.RED, UUID.randomUUID());
    }
}
