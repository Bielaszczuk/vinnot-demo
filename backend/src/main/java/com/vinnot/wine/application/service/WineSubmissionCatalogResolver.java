package com.vinnot.wine.application.service;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort.CatalogEntry;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort.RegionEntry;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Links submitted values to the catalog. Picked IDs must exist and agree with each other; free text from older
 * app versions or label recognition is linked only when exactly one catalog entry has that name.
 */
@Service
@RequiredArgsConstructor
public class WineSubmissionCatalogResolver {

    static final String INVALID_REFERENCE = "INVALID_SUBMISSION_CATALOG_REFERENCE";

    private final WineSubmissionCatalogLookupPort lookup;

    public Resolution resolve(Input input) {
        Optional<CatalogEntry> winery = Objects.nonNull(input.wineryId())
                ? Optional.of(lookup.findWinery(input.wineryId())
                        .orElseThrow(() -> invalid("The selected winery does not exist")))
                : lookup.matchWinery(input.wineryName());
        Optional<RegionEntry> pickedRegion = Objects.nonNull(input.regionId())
                ? Optional.of(lookup.findRegion(input.regionId())
                        .orElseThrow(() -> invalid("The selected region does not exist")))
                : Optional.empty();
        UUID countryId = Objects.nonNull(input.countryId())
                ? input.countryId() : pickedRegion.map(RegionEntry::countryId).orElse(null);
        Optional<CatalogEntry> country = Objects.nonNull(countryId)
                ? Optional.of(lookup.findCountry(countryId)
                        .orElseThrow(() -> invalid("The selected country does not exist")))
                : lookup.matchCountry(input.country());
        if (pickedRegion.isPresent() && !pickedRegion.get().countryId().equals(countryId)) {
            throw invalid("The selected region does not belong to the selected country");
        }
        Optional<RegionEntry> region = pickedRegion.isPresent() || country.isEmpty()
                ? pickedRegion
                : lookup.matchRegion(country.get().id(), input.region());

        List<String> grapes = new ArrayList<>();
        List<String> proposedGrapes = new ArrayList<>();
        for (String submitted : Objects.requireNonNullElse(input.grapes(), List.<String>of())) {
            Optional<String> known = lookup.matchGrape(submitted);
            String value = known.orElse(submitted.trim());
            if (grapes.contains(value)) {
                continue;
            }
            grapes.add(value);
            if (known.isEmpty()) {
                proposedGrapes.add(value);
            }
        }
        return new Resolution(
                winery.map(CatalogEntry::name).orElse(input.wineryName()),
                country.map(CatalogEntry::name).orElse(input.country()),
                region.map(RegionEntry::name).orElse(input.region()),
                List.copyOf(grapes),
                new WineSubmissionCatalogReferences(
                        winery.map(CatalogEntry::id).orElse(null),
                        country.map(CatalogEntry::id).orElse(null),
                        region.map(RegionEntry::id).orElse(null),
                        proposedGrapes));
    }

    private static DomainException invalid(String message) {
        return new DomainException(INVALID_REFERENCE, message);
    }

    public record Input(
            UUID wineryId, String wineryName,
            UUID countryId, String country,
            UUID regionId, String region,
            List<String> grapes) {
    }

    /** Catalog names replace the submitted text for linked values; the rest is kept as entered. */
    public record Resolution(
            String wineryName, String country, String region, List<String> grapes,
            WineSubmissionCatalogReferences references) {
    }
}
