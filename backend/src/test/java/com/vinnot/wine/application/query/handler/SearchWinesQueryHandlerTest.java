package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.query.model.SearchWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SearchWinesQueryHandlerTest {

    private static final int FIRST_PAGE = 0;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int TOTAL_RESULTS = 1;
    private static final int RATING_COUNT = 12;
    private static final String SEARCH_TERM = "malbec";
    private static final String WINE_TYPE = "RED";
    private static final String COUNTRY = "Argentina";
    private static final String REGION = "Mendoza";
    private static final String GRAPE = "Malbec";
    private static final String WINERY_NAME = "Bodega Vinnot";
    private static final Instant CREATED_AT = Instant.parse("2026-01-01T00:00:00Z");
    private static final BigDecimal RATING_AVERAGE = new BigDecimal("4.50");

    private final WineRepositoryPort wineRepository = mock(WineRepositoryPort.class);
    private final WineryQueryPort wineryQueryPort = mock(WineryQueryPort.class);
    private final SearchWinesQueryHandler handler =
            new SearchWinesQueryHandler(wineRepository, wineryQueryPort);

    @Test
    void executeDelegatesFiltersAndPaginationToRepository() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = wine(UUID.randomUUID(), wineryId, "Vinnot Malbec");
        SearchWinesQuery query = new SearchWinesQuery(
                SEARCH_TERM,
                WINE_TYPE,
                wineryId,
                COUNTRY,
                REGION,
                GRAPE,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                FIRST_PAGE,
                DEFAULT_PAGE_SIZE
        );

        when(wineRepository.searchAdvanced(
                eq(SEARCH_TERM),
                eq(WINE_TYPE),
                eq(wineryId),
                eq(COUNTRY),
                eq(REGION),
                eq(GRAPE),
                eq(PageQuery.of(FIRST_PAGE, DEFAULT_PAGE_SIZE)),
                eq(false)
        )).thenReturn(PageResult.of(List.of(wine), FIRST_PAGE, DEFAULT_PAGE_SIZE, TOTAL_RESULTS));
        when(wineryQueryPort.findAllByIds(List.of(wineryId)))
                .thenReturn(List.of(winery(wineryId)));

        PageResult<WineSummaryResponse> result = handler.execute(query);

        assertThat(result.content()).hasSize(TOTAL_RESULTS);
        assertThat(result.content().getFirst().name()).isEqualTo("Vinnot Malbec");
        assertThat(result.content().getFirst().wineryName()).isEqualTo(WINERY_NAME);
        assertThat(result.content().getFirst().region()).isEqualTo(REGION);
        assertThat(result.content().getFirst().country()).isEqualTo(COUNTRY);
    }

    @Test
    void executeDeduplicatesWineryIdsBeforeLoadingWineryData() {
        UUID wineryId = UUID.randomUUID();
        Wine firstWine = wine(UUID.randomUUID(), wineryId, "Vinnot Malbec");
        Wine secondWine = wine(UUID.randomUUID(), wineryId, "Vinnot Cabernet");
        SearchWinesQuery query = new SearchWinesQuery(null, null, null, FIRST_PAGE, DEFAULT_PAGE_SIZE);

        when(wineRepository.searchAdvanced(
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(PageQuery.of(FIRST_PAGE, DEFAULT_PAGE_SIZE)),
                eq(false)
        )).thenReturn(PageResult.of(List.of(firstWine, secondWine), FIRST_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE));
        when(wineryQueryPort.findAllByIds(anyList()))
                .thenReturn(List.of(winery(wineryId)));

        handler.execute(query);

        verify(wineryQueryPort).findAllByIds(List.of(wineryId));
    }

    @Test
    void executeReturnsEmptyPageWhenRepositoryHasNoMatches() {
        SearchWinesQuery query = new SearchWinesQuery("unknown", null, null, FIRST_PAGE, DEFAULT_PAGE_SIZE);
        when(wineRepository.searchAdvanced(
                eq("unknown"),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(PageQuery.of(FIRST_PAGE, DEFAULT_PAGE_SIZE)),
                eq(false)
        )).thenReturn(PageResult.empty());
        when(wineryQueryPort.findAllByIds(List.of())).thenReturn(List.of());

        PageResult<WineSummaryResponse> result = handler.execute(query);

        assertThat(result.isEmpty()).isTrue();
        assertThat(result.totalElements()).isZero();
    }

    @Test
    void executeForwardsIncludeInactiveForStaffListings() {
        SearchWinesQuery query = new SearchWinesQuery(
                null, null, null, FIRST_PAGE, DEFAULT_PAGE_SIZE, true);
        when(wineRepository.searchAdvanced(
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(PageQuery.of(FIRST_PAGE, DEFAULT_PAGE_SIZE)),
                eq(true)
        )).thenReturn(PageResult.empty());
        when(wineryQueryPort.findAllByIds(List.of())).thenReturn(List.of());

        assertThat(handler.execute(query).isEmpty()).isTrue();
        verify(wineRepository).searchAdvanced(
                null, null, null, null, null, null,
                PageQuery.of(FIRST_PAGE, DEFAULT_PAGE_SIZE), true);
    }

    private static Wine wine(UUID wineId, UUID wineryId, String name) {
        return Wine.builder()
                .id(wineId)
                .name(name)
                .wineryId(wineryId)
                .wineType(WineType.RED)
                .grapes(List.of(GRAPE))
                .rating(Rating.of(RATING_AVERAGE, RATING_COUNT))
                .createdAt(CREATED_AT)
                .updatedAt(CREATED_AT)
                .active(true)
                .build();
    }

    private static WineryQueryPort.WineryData winery(UUID wineryId) {
        return new WineryQueryPort.WineryData(
                wineryId,
                WINERY_NAME,
                COUNTRY,
                REGION,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
