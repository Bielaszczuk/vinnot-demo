package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.command.model.UpdateWineCommand;
import com.vinnot.wine.application.port.in.UpdateWineUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.service.RecommendWineService;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.WineType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import com.vinnot.shared.application.command.FieldUpdates;
import lombok.RequiredArgsConstructor;

/**
 * Handler for UpdateWineCommand.
 * Implements {@link UpdateWineUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class UpdateWineCommandHandler implements UpdateWineUseCase {

    private final WineRepositoryPort wineRepository;
    private final RecommendWineService recommendations;

    @Override
    @Transactional
    public void execute(UpdateWineCommand command) {
        Wine wine = wineRepository.findById(command.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", command.wineId()));
        final boolean wasShownAsFeatured = wine.isFeatured() && wine.isActive();

        FieldUpdates updates = new FieldUpdates(command.clearFields(), Set.of(
                "vintage", "style", "descriptionEs", "descriptionEn", "alcoholContent",
                "servingTempMin", "servingTempMax", "priceMin", "priceMax", "imageUrl",
                "acidityScore", "tanninScore", "bodyScore", "sweetnessScore"));
        wine.updateBasicInfo(
                command.name(),
                updates.resolve("vintage", command.vintage(), wine.getVintage()),
                updates.resolve("style", command.style(), wine.getStyle()),
                updates.resolve("descriptionEs", command.descriptionEs(), wine.getDescriptionEs()));
        wine.replaceDescriptions(wine.getDescriptionEs(),
                updates.resolve("descriptionEn", command.descriptionEn(), wine.getDescriptionEn()));

        ServingTemperature currentTemperature = wine.getServingTemperature();
        PriceRange currentPrice = wine.getPriceRange();
        wine.updateServingInfo(
                updates.resolve("alcoholContent", command.alcoholContent(), wine.getAlcoholContent()),
                ServingTemperature.of(
                        updates.resolve("servingTempMin", command.servingTempMin(),
                                Objects.isNull(currentTemperature) ? null : currentTemperature.getMinTemp()),
                        updates.resolve("servingTempMax", command.servingTempMax(),
                                Objects.isNull(currentTemperature) ? null : currentTemperature.getMaxTemp())),
                PriceRange.of(
                        updates.resolve("priceMin", command.priceMin(),
                                Objects.isNull(currentPrice) ? null : currentPrice.getMinPrice()),
                        updates.resolve("priceMax", command.priceMax(),
                                Objects.isNull(currentPrice) ? null : currentPrice.getMaxPrice())));
        if (Objects.nonNull(command.grapes())) {
            wine.updateGrapes(command.grapes());
        }
        if (Objects.nonNull(command.allergens())) {
            wine.updateAllergens(command.allergens());
        }
        wine.updateImageUrl(updates.resolve("imageUrl", command.imageUrl(), wine.getImageUrl()));

        // Handle optional admin fields
        if (Objects.nonNull(command.wineryId())) {
            wine.updateWineryId(command.wineryId());
        }
        if (Objects.nonNull(command.wineType())) {
            wine.updateWineType(WineType.valueOf(command.wineType().toUpperCase()));
        }
        if (Objects.nonNull(command.isFeatured())) {
            if (command.isFeatured() != wine.isFeatured()) {
                wine.toggleFeatured();
            }
        }
        if (Objects.nonNull(command.isActive())) {
            if (command.isActive()) {
                wine.activate();
            } else {
                wine.deactivate();
            }
        }

        if (updates.changes("acidityScore", command.acidityScore())
                || updates.changes("tanninScore", command.tanninScore())
                || updates.changes("bodyScore", command.bodyScore())
                || updates.changes("sweetnessScore", command.sweetnessScore())) {
            var existing = wine.getTasteProfile();
            wine.updateTasteProfile(
                    updates.resolve("acidityScore", command.acidityScore(), Objects.isNull(existing) ? null : existing.getAcidity()),
                    updates.resolve("tanninScore", command.tanninScore(), Objects.isNull(existing) ? null : existing.getTannin()),
                    updates.resolve("bodyScore", command.bodyScore(), Objects.isNull(existing) ? null : existing.getBody()),
                    updates.resolve("sweetnessScore", command.sweetnessScore(), Objects.isNull(existing) ? null : existing.getSweetness()));
        }

        wineRepository.save(wine);
        if (!wasShownAsFeatured && wine.isFeatured()) {
            recommendations.recommend(wine, Instant.now());
        }
    }
}
