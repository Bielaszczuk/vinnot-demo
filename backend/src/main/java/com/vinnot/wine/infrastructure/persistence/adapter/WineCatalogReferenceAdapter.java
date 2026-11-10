package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.region.domain.model.Country;
import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.CountryRepository;
import com.vinnot.region.domain.repository.RegionRepository;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.wine.application.port.out.WineCatalogReferencePort;
import com.vinnot.wine.domain.service.CatalogNameNormalizer;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

/**
 * Cross-module driven adapter. Wine application code remains independent of
 * winery and region domain types.
 */
@Component
@RequiredArgsConstructor
public class WineCatalogReferenceAdapter implements WineCatalogReferencePort {

    private static final int WINERY_SEARCH_LIMIT = 10;
    private static final double WINERY_REUSE_THRESHOLD = 0.88;

    private final WineryRepositoryPort wineryRepository;
    private final CountryRepository countryRepository;
    private final RegionRepository regionRepository;

    @Override
    public Optional<CatalogReference> resolveOrCreate(CatalogSelection selection) {
        String wineryName = selection.wineryName();
        Optional<Country> country = byId(selection.countryId(), countryRepository::findById)
                .or(() -> resolveCountry(selection.countryName()));
        if (country.isEmpty()) {
            return Optional.empty();
        }
        Optional<Region> region = byId(selection.regionId(), regionRepository::findById)
                .filter(picked -> country.get().getId().equals(picked.getCountryId()))
                .or(() -> resolveRegion(selection.regionName(), country.get()));
        Winery winery = byId(selection.wineryId(), wineryRepository::findById)
                .or(() -> resolveWinery(wineryName))
                .orElseGet(() -> createWinery(
                        wineryName, country.get(), region.orElse(null)));
        return Optional.of(new CatalogReference(
                winery.getId(),
                winery.getName(),
                country.get().getId(),
                country.get().getName(),
                region.map(Region::getId).orElse(null),
                region.map(Region::getName).orElse(null)));
    }

    private static <T> Optional<T> byId(UUID id, Function<UUID, Optional<T>> finder) {
        return Objects.nonNull(id) ? finder.apply(id) : Optional.empty();
    }

    private Optional<Country> resolveCountry(String value) {
        if (!hasText(value)) {
            return Optional.empty();
        }
        String normalized = CatalogNameNormalizer.normalize(value);
        return countryRepository.findAll().stream()
                .filter(country -> CatalogNameNormalizer.normalize(country.getName()).equals(normalized)
                        || CatalogNameNormalizer.normalize(country.getCode()).equals(normalized))
                .findFirst();
    }

    private Optional<Region> resolveRegion(String value, Country country) {
        if (!hasText(value)) {
            return Optional.empty();
        }
        String normalized = CatalogNameNormalizer.normalize(value);
        return regionRepository.findByCountryId(country.getId()).stream()
                .filter(region -> CatalogNameNormalizer.normalize(region.getName()).equals(normalized))
                .findFirst();
    }

    private Optional<Winery> resolveWinery(String wineryName) {
        List<Winery> candidates = wineryRepository.search(
                        wineryName, null, null, PageQuery.of(0, WINERY_SEARCH_LIMIT))
                .content();
        return candidates.stream()
                .map(winery -> new ScoredWinery(
                        winery,
                        Math.max(
                                WineLabelMatchScorer.textSimilarity(
                                        wineryName, winery.getName()),
                                Math.max(
                                        WineLabelMatchScorer.textSimilarity(
                                                wineryName, winery.getBusinessName()),
                                        WineLabelMatchScorer.textSimilarity(
                                                wineryName, winery.getSeoName())))))
                .filter(candidate -> candidate.score() >= WINERY_REUSE_THRESHOLD)
                .max((left, right) -> Double.compare(left.score(), right.score()))
                .map(ScoredWinery::winery);
    }

    private Winery createWinery(String wineryName, Country country, Region region) {
        Winery winery = Winery.create(wineryName, country.getId());
        winery.updateBasicInfo(
                wineryName,
                null,
                country.getId(),
                Objects.nonNull(region) ? region.getId() : null,
                null);
        return wineryRepository.save(winery);
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private record ScoredWinery(Winery winery, double score) {
    }
}
