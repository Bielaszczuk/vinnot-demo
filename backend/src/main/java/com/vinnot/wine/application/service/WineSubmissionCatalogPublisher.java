package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineCatalogReferencePort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class WineSubmissionCatalogPublisher {

    private final WineCatalogReferencePort catalogReferencePort;
    private final WineRepositoryPort wineRepository;
    private final RecommendWineService recommendations;

    public Optional<PublicationResult> publish(
            WineSubmissionCatalogData data, UUID createdBy, String imageUrl) {
        return publish(data, createdBy, () -> imageUrl);
    }

    public Optional<PublicationResult> publish(
            WineSubmissionCatalogData data, UUID createdBy, Supplier<String> imageUrlSupplier) {
        Optional<WineType> wineType = resolveWineType(data.wineType());
        if (wineType.isEmpty()) {
            return Optional.empty();
        }
        Optional<WineCatalogReferencePort.CatalogReference> reference =
                catalogReferencePort.resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(
                        data.wineryId(), data.wineryName(),
                        data.countryId(), data.country(),
                        data.regionId(), data.region()));
        if (reference.isEmpty()) {
            return Optional.empty();
        }
        WineCatalogReferencePort.CatalogReference catalog = reference.get();
        Wine wine = Wine.create(
                data.wineName(), catalog.wineryId(), wineType.get(), createdBy);
        wine.updateBasicInfo(data.wineName(), data.vintage(), null, null);
        wine.updateGrapes(data.grapes());
        wine.updateServingInfo(data.alcoholContent(), null, null);
        wine.updateOrigin(catalog.countryId(), catalog.regionId());
        String resolvedImageUrl = imageUrlSupplier.get();
        if (hasText(resolvedImageUrl)) {
            wine.updateImageUrl(resolvedImageUrl);
        }
        Wine saved = wineRepository.save(wine);
        recommendations.recommend(saved, Instant.now());
        WineSummaryResponse summary = WineSummaryResponse.fromDomain(
                saved, catalog.wineryName(), catalog.regionName(), catalog.countryName());
        return Optional.of(new PublicationResult(saved, summary));
    }

    private Optional<WineType> resolveWineType(String value) {
        if (!hasText(value)) {
            return Optional.empty();
        }
        try {
            return Optional.of(WineType.valueOf(value.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    public record PublicationResult(Wine wine, WineSummaryResponse summary) {
    }
}
