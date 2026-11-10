package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.region.domain.model.Country;
import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.CountryRepository;
import com.vinnot.region.domain.repository.RegionRepository;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort;
import com.vinnot.wine.domain.service.CatalogNameNormalizer;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

/** Cross-module driven adapter: the wine module never sees region or winery domain types. */
@Component
@RequiredArgsConstructor
public class WineSubmissionCatalogLookupAdapter implements WineSubmissionCatalogLookupPort {

    private static final int WINERY_SEARCH_LIMIT = 20;

    private final CountryRepository countryRepository;
    private final RegionRepository regionRepository;
    private final WineryRepositoryPort wineryRepository;
    private final GrapeTypeRepositoryPort grapeTypeRepository;

    @Override
    public Optional<CatalogEntry> findCountry(UUID countryId) {
        return countryRepository.findById(countryId).map(WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<RegionEntry> findRegion(UUID regionId) {
        return regionRepository.findById(regionId).map(WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<CatalogEntry> findWinery(UUID wineryId) {
        return wineryRepository.findById(wineryId).map(WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<CatalogEntry> matchCountry(String name) {
        return single(countryRepository.findAll().stream()
                .filter(country -> CatalogNameNormalizer.sameName(name, country.getName())
                        || CatalogNameNormalizer.sameName(name, country.getCode()))
                .toList(), WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<RegionEntry> matchRegion(UUID countryId, String name) {
        return single(regionRepository.findByCountryId(countryId).stream()
                .filter(region -> CatalogNameNormalizer.sameName(name, region.getName()))
                .toList(), WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<CatalogEntry> matchWinery(String name) {
        if (CatalogNameNormalizer.normalize(name).isEmpty()) {
            return Optional.empty();
        }
        return single(wineryRepository.search(name, null, null, PageQuery.of(0, WINERY_SEARCH_LIMIT))
                .content().stream()
                .filter(winery -> CatalogNameNormalizer.sameName(name, winery.getName()))
                .toList(), WineSubmissionCatalogLookupAdapter::entry);
    }

    @Override
    public Optional<String> matchGrape(String name) {
        return grapeTypeRepository.findAllActive().stream()
                .filter(grape -> CatalogNameNormalizer.sameName(name, grape.name())
                        || CatalogNameNormalizer.sameName(name, grape.nameEs()))
                .map(GrapeTypeRepositoryPort.GrapeTypeData::name)
                .findFirst();
    }

    private static <T, R> Optional<R> single(List<T> matches, Function<T, R> mapper) {
        return matches.size() == 1 ? Optional.of(mapper.apply(matches.getFirst())) : Optional.empty();
    }

    private static CatalogEntry entry(Country country) {
        return new CatalogEntry(country.getId(), country.getName());
    }

    private static RegionEntry entry(Region region) {
        return new RegionEntry(region.getId(), region.getName(), region.getCountryId());
    }

    private static CatalogEntry entry(Winery winery) {
        return new CatalogEntry(winery.getId(), winery.getName());
    }
}
