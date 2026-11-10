package com.vinnot.wineroute.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.port.out.WineryQueryPort;
import com.vinnot.wineroute.application.query.model.GetRouteCountriesQuery;
import com.vinnot.wineroute.application.query.model.GetRouteHierarchyQuery;
import com.vinnot.wineroute.application.query.model.GetRouteRegionsQuery;
import com.vinnot.wineroute.application.query.model.GetRouteSubregionsQuery;
import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.application.query.model.SearchAllWineRoutesQuery;
import com.vinnot.wineroute.application.query.model.SearchWineRoutesQuery;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class WineRouteQueryHandlersTest {

    private WineRouteRepositoryPort repository;
    private WineryQueryPort wineries;

    @BeforeEach
    void setUp() {
        repository = mock(WineRouteRepositoryPort.class);
        wineries = mock(WineryQueryPort.class);
    }

    @Test
    void resolvesUniqueWineryStopsBestEffort() {
        WineRoute route = WineRoute.create("Mendoza", UUID.randomUUID());
        route.replaceStops(List.of(
                stop("Bodega Uno", "winery", 1),
                stop("BODEGA UNO", "WINERY", 2),
                stop("Lunch", "restaurant", 3),
                stop("Unavailable", "winery", 4)));
        route.publish();
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
        when(wineries.findByExactNames(List.of("Bodega Uno", "Unavailable"))).thenReturn(List.of(
                new WineryQueryPort.WineryDetailData(UUID.randomUUID(), "Bodega Uno",
                        "Argentina", "Mendoza", "Luján", "Historic", "https://winery.test",
                        null, 1900, "hello@winery.test", "+54", "Address")));

        var response = new GetWineRouteByIdQueryHandler(repository, wineries)
                .execute(new GetWineRouteByIdQuery(route.getId()));

        assertThat(response.wineries()).singleElement()
                .satisfies(winery -> assertThat(winery.name()).isEqualTo("Bodega Uno"));
        assertThat(response.stops()).hasSize(4);
        verify(wineries).findByExactNames(List.of("Bodega Uno", "Unavailable"));
        verifyNoMoreInteractions(wineries);
    }

    @Test
    void returnsStopsWhenOptionalWineryEnrichmentIsUnavailable() {
        WineRoute route = WineRoute.create("Route", UUID.randomUUID());
        route.replaceStops(List.of(stop("Unavailable", "winery", 1)));
        route.publish();
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
        when(wineries.findByExactNames(List.of("Unavailable")))
                .thenThrow(new IllegalStateException("offline"));

        var response = new GetWineRouteByIdQueryHandler(repository, wineries)
                .execute(new GetWineRouteByIdQuery(route.getId()));
        assertThat(response.stops()).hasSize(1);
        assertThat(response.wineries()).isEmpty();
    }

    @Test
    void keepsStopOrderWhenTheBatchReturnsWineriesInCatalogueOrder() {
        WineRoute route = WineRoute.create("Route", UUID.randomUUID());
        route.replaceStops(List.of(stop("Z Winery", "winery", 1), stop("A Winery", "winery", 2),
                stop("z winery", "winery", 3)));
        route.publish();
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
        var first = new WineryQueryPort.WineryDetailData(UUID.randomUUID(), "A Winery",
                null, null, null, null, null, null, null, null, null, null);
        var last = new WineryQueryPort.WineryDetailData(UUID.randomUUID(), "Z Winery",
                null, null, null, null, null, null, null, null, null, null);
        when(wineries.findByExactNames(List.of("Z Winery", "A Winery"))).thenReturn(List.of(first, last));

        var response = new GetWineRouteByIdQueryHandler(repository, wineries)
                .execute(new GetWineRouteByIdQuery(route.getId()));
        assertThat(response.wineries()).extracting(value -> value.name()).containsExactly("Z Winery", "A Winery");
        verify(wineries).findByExactNames(List.of("Z Winery", "A Winery"));
        verifyNoMoreInteractions(wineries);
    }

    @Test
    void passesTheDifficultyWithTheOtherFiltersAndThePage() {
        WineRoute route = WineRoute.create("Route", UUID.randomUUID());
        when(repository.search(any(), any(), any(), any(), any()))
                .thenReturn(PageResult.of(List.of(route), 2, 10, 21));
        when(repository.getStopCounts(List.of(route.getId()))).thenReturn(Map.of());

        var page = new SearchWineRoutesQueryHandler(repository).execute(
                new SearchWineRoutesQuery("malbec", "Argentina", "Mendoza", RouteDifficulty.SHORT, 2, 10));

        assertThat(page.content()).singleElement().satisfies(summary -> assertThat(summary.stopCount()).isZero());
        verify(repository).search("malbec", "Argentina", "Mendoza", RouteDifficulty.SHORT, PageQuery.bounded(2, 10, 100));
    }

    @Test
    void reportsMissingRoute() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new GetWineRouteByIdQueryHandler(repository, wineries)
                .execute(new GetWineRouteByIdQuery(id)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void buildsCompleteHierarchyAndNormalizesMissingSubregions() {
        when(repository.findDistinctCountries()).thenReturn(List.of("Argentina"));
        when(repository.findDistinctRegionsByCountry("Argentina"))
                .thenReturn(List.of("Mendoza", "Salta"));
        when(repository.findDistinctSubregionsByCountryAndRegion("Argentina", "Mendoza"))
                .thenReturn(List.of("Uco Valley"));
        when(repository.findDistinctSubregionsByCountryAndRegion("Argentina", "Salta"))
                .thenReturn(null);

        var response = new GetRouteHierarchyQueryHandler(repository)
                .execute(new GetRouteHierarchyQuery());

        assertThat(response.hierarchy().get("Argentina").get("Mendoza"))
                .containsExactly("Uco Valley");
        assertThat(response.hierarchy().get("Argentina").get("Salta")).isEmpty();
    }

    @Test
    void delegatesCatalogAndFilterQueries() {
        WineRoute route = WineRoute.create("Route", UUID.randomUUID());
        when(repository.search(any(), any(), any(), any(), any()))
                .thenReturn(PageResult.of(List.of(route), 0, 10, 1));
        when(repository.getStopCounts(List.of(route.getId())))
                .thenReturn(Map.of(route.getId(), new WineRouteRepositoryPort.StopCounts(3, 2)));
        when(repository.searchAll(any(), any()))
                .thenReturn(PageResult.of(List.of(route), 0, 10, 1));
        when(repository.findDistinctCountries()).thenReturn(List.of("Argentina"));
        when(repository.findDistinctRegionsByCountry("Argentina")).thenReturn(List.of("Mendoza"));
        when(repository.findDistinctSubregionsByCountryAndRegion("Argentina", "Mendoza"))
                .thenReturn(List.of("Uco"));

        assertThat(new SearchWineRoutesQueryHandler(repository).execute(
                new SearchWineRoutesQuery("wine", "Argentina", "Mendoza", null, 0, 10)).content())
                .hasSize(1);
        verify(repository).search("wine", "Argentina", "Mendoza", null, PageQuery.bounded(0, 10, 100));
        assertThat(new SearchAllWineRoutesQueryHandler(repository).execute(
                new SearchAllWineRoutesQuery("wine", 0, 10)).content()).singleElement()
                .satisfies(summary -> {
                    assertThat(summary.stopCount()).isEqualTo(3);
                    assertThat(summary.wineryCount()).isEqualTo(2);
                });
        assertThat(new GetRouteCountriesQueryHandler(repository).execute(
                new GetRouteCountriesQuery())).containsExactly("Argentina");
        assertThat(new GetRouteRegionsQueryHandler(repository).execute(
                new GetRouteRegionsQuery("Argentina"))).containsExactly("Mendoza");
        assertThat(new GetRouteSubregionsQueryHandler(repository).execute(
                new GetRouteSubregionsQuery("Argentina", "Mendoza"))).containsExactly("Uco");
    }

    private RouteStop stop(String name, String type, int order) {
        return RouteStop.create(name, null, type, null,
                BigDecimal.ZERO, BigDecimal.ZERO, order, 30);
    }
}
