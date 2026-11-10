package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.query.model.GetWineHighlightsQuery;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;
import java.util.UUID;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class GetWineHighlightsQueryHandlerTest {
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final GetWineHighlightsQueryHandler handler = new GetWineHighlightsQueryHandler(wines);

    @Test
    void projectsTheBoundedRepositoryOrderWithoutSearchingOrCountingTheCatalog() {
        Wine first = Wine.builder().id(UUID.randomUUID()).name("First").wineType(WineType.RED).build();
        Wine second = Wine.builder().id(UUID.randomUUID()).name("Second").wineType(WineType.RED).build();
        when(wines.findHighlights(4)).thenReturn(List.of(first, second));
        assertThat(handler.execute(new GetWineHighlightsQuery(4)))
                .extracting(WineSummaryResponse::id)
                .containsExactly(first.getId(), second.getId());
        verify(wines).findHighlights(4);
    }

    @Test
    void capsTheCollectionAndDoesNotFillAnEmptyCollectionWithUnratedWines() {
        when(wines.findHighlights(10)).thenReturn(List.of());
        assertThat(handler.execute(new GetWineHighlightsQuery(Integer.MAX_VALUE))).isEmpty();
        verify(wines).findHighlights(10);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, Integer.MIN_VALUE})
    void rejectsInvalidLimitsBeforePersistence(int limit) {
        assertThatThrownBy(() -> handler.execute(new GetWineHighlightsQuery(limit)))
                .isInstanceOf(DomainException.class)
                .hasMessage("Result limit must be greater than zero");
        verifyNoInteractions(wines);
    }
}
