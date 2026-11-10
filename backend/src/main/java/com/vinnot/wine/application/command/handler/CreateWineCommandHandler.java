package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.command.model.CreateWineCommand;
import com.vinnot.wine.application.port.in.CreateWineUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.WineType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.wine.application.service.RecommendWineService;
import java.time.Instant;

/**
 * Handler for CreateWineCommand.
 * Implements {@link CreateWineUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class CreateWineCommandHandler implements CreateWineUseCase {

    private final WineRepositoryPort wineRepository;
    private final RecommendWineService recommendations;

    @Override
    @Transactional
    public UUID execute(CreateWineCommand command) {
        WineType wineType = WineType.valueOf(command.wineType().toUpperCase());

        Wine wine = Wine.create(
                command.name(),
                command.wineryId(),
                wineType,
                command.createdBy()
        );

        wine.updateBasicInfo(
                command.name(),
                command.vintage(),
                command.style(),
                command.descriptionEs()
        );

        ServingTemperature servingTemp = ServingTemperature.of(
                command.servingTempMin(),
                command.servingTempMax()
        );

        PriceRange priceRange = PriceRange.of(
                command.priceMin(),
                command.priceMax()
        );

        wine.updateServingInfo(command.alcoholContent(), servingTemp, priceRange);
        wine.updateGrapes(command.grapes());
        wine.updateAllergens(command.allergens());
        wine.updateImageUrl(command.imageUrl());
        wine.replaceDescriptions(command.descriptionEs(), command.descriptionEn());
        wine.updateTasteProfile(command.acidityScore(), command.tanninScore(), command.bodyScore(), command.sweetnessScore());
        if (Boolean.FALSE.equals(command.isActive())) {
            wine.deactivate();
        }

        if (command.isFeatured()) {
            wine.toggleFeatured();
        }

        Wine savedWine = wineRepository.save(wine);
        recommendations.recommend(savedWine, Instant.now());

        return savedWine.getId();
    }
}
