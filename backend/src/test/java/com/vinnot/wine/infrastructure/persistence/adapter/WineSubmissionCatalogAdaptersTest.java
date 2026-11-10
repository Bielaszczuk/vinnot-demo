package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.region.domain.model.Country;
import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.CountryRepository;
import com.vinnot.region.domain.repository.RegionRepository;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;
import com.vinnot.wine.application.port.out.WineCatalogReferencePort.CatalogSelection;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineSubmissionCatalogAdaptersTest {

    private final CountryRepository countries = mock(CountryRepository.class);
    private final RegionRepository regions = mock(RegionRepository.class);
    private final WineryRepositoryPort wineries = mock(WineryRepositoryPort.class);
    private final GrapeTypeRepositoryPort grapes = mock(GrapeTypeRepositoryPort.class);
    private final Country argentina = new Country(UUID.randomUUID(), "AR", "Argentina", Instant.now());
    private final Country chile = new Country(UUID.randomUUID(), "CL", "Chile", Instant.now());
    private final Region mendoza = new Region(UUID.randomUUID(), "Mendoza", argentina.getId(), "AR", "Argentina", Instant.now());
    private final Region maipo = new Region(UUID.randomUUID(), "Maipo", chile.getId(), "CL", "Chile", Instant.now());
    private final Winery catena = Winery.create("Catena Zapata", argentina.getId());

    @Test
    void publishingUsesThePickedEntriesWithoutSearchingOrCreatingAWinery() {
        when(countries.findById(argentina.getId())).thenReturn(Optional.of(argentina));
        when(regions.findById(mendoza.getId())).thenReturn(Optional.of(mendoza));
        when(wineries.findById(catena.getId())).thenReturn(Optional.of(catena));
        var adapter = new WineCatalogReferenceAdapter(wineries, countries, regions);

        var reference = adapter.resolveOrCreate(new CatalogSelection(
                catena.getId(), "catena", argentina.getId(), "typo", mendoza.getId(), "typo")).orElseThrow();

        assertThat(reference.wineryId()).isEqualTo(catena.getId());
        assertThat(reference.countryId()).isEqualTo(argentina.getId());
        assertThat(reference.regionId()).isEqualTo(mendoza.getId());
        verify(wineries, never()).search(any(), any(), any(), any());
        verify(wineries, never()).save(any());
    }

    @Test
    void aStaleWineryPickOrARegionOfAnotherCountryFallsBackToTheNames() {
        when(countries.findById(argentina.getId())).thenReturn(Optional.of(argentina));
        when(regions.findById(maipo.getId())).thenReturn(Optional.of(maipo));
        when(regions.findByCountryId(argentina.getId())).thenReturn(List.of(mendoza));
        UUID stale = UUID.randomUUID();
        when(wineries.findById(stale)).thenReturn(Optional.empty());
        when(wineries.search(eq("Catena Zapata"), isNull(), isNull(), any()))
                .thenReturn(PageResult.of(List.of(catena), 0, 10, 1));
        var adapter = new WineCatalogReferenceAdapter(wineries, countries, regions);

        var reference = adapter.resolveOrCreate(new CatalogSelection(
                stale, "Catena Zapata", argentina.getId(), null, maipo.getId(), "Mendoza")).orElseThrow();

        assertThat(reference.wineryId()).isEqualTo(catena.getId());
        assertThat(reference.regionId()).isEqualTo(mendoza.getId());
    }

    @Test
    void lookupsLinkOnlyASingleMatchIgnoringCaseAndAccents() {
        when(countries.findAll()).thenReturn(List.of(argentina, chile));
        when(regions.findByCountryId(argentina.getId())).thenReturn(List.of(mendoza));
        Winery twin = Winery.create("catena zapata", argentina.getId());
        when(wineries.search(eq("CATENA ZAPATA"), isNull(), isNull(), any()))
                .thenReturn(PageResult.of(List.of(catena, twin), 0, 20, 2));
        when(grapes.findAllActive()).thenReturn(List.of(
                new GrapeTypeRepositoryPort.GrapeTypeData(UUID.randomUUID(), "Torrontes", "Torrontés", "WHITE")));
        var lookup = new WineSubmissionCatalogLookupAdapter(countries, regions, wineries, grapes);

        assertThat(lookup.matchCountry(" ar ").orElseThrow().id()).isEqualTo(argentina.getId());
        assertThat(lookup.matchRegion(argentina.getId(), "MENDOZÁ").orElseThrow().id()).isEqualTo(mendoza.getId());
        assertThat(lookup.matchWinery("CATENA ZAPATA")).as("two wineries share the name").isEmpty();
        assertThat(lookup.matchWinery("  ")).isEmpty();
        assertThat(lookup.matchGrape("torrontés")).contains("Torrontes");
        assertThat(lookup.matchGrape("Uva Nueva")).isEmpty();
    }
}
