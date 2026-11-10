package com.vinnot.wine.infrastructure.persistence.mapper;

import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.TasteProfile;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.wine.infrastructure.persistence.entity.WineJpaEntity;

import java.util.ArrayList;
import java.util.Objects;

/**
 * Persistence mapper: translates between {@link Wine} domain model and {@link WineJpaEntity} JPA entity.
 * Pure infrastructure concern — never exposed outside the persistence layer.
 */
public final class WinePersistenceMapper {

    private WinePersistenceMapper() {

    }

    /**
     * Maps a JPA entity to a domain model.
     *
     * @param entity the JPA entity
     * @return the domain model
     */
    public static Wine toDomain(WineJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        ServingTemperature servingTemp = ServingTemperature.of(
                entity.getServingTempMin(),
                entity.getServingTempMax()
        );

        PriceRange priceRange = PriceRange.of(
                entity.getPriceMin(),
                entity.getPriceMax()
        );

        Rating rating = Rating.of(
                entity.getRatingAverage(),
                entity.getRatingCount()
        );

        Wine.Builder builder = Wine.builder()
                .id(entity.getId())
                .revision(entity.getRevision())
                .wineryId(entity.getWineryId())
                .name(entity.getName())
                .vintage(entity.getVintage())
                .wineType(WineType.valueOf(entity.getWineType().name()))
                .style(entity.getStyle())
                .grapes(Objects.nonNull(entity.getGrapes()) ? entity.getGrapes() : new ArrayList<>())
                .allergens(Objects.nonNull(entity.getAllergens()) ? entity.getAllergens() : new ArrayList<>())
                .descriptionEs(entity.getDescriptionEs())
                .descriptionEn(entity.getDescriptionEn())
                .alcoholContent(entity.getAlcoholContent())
                .servingTemperature(servingTemp)
                .priceRange(priceRange)
                .imageUrl(entity.getImageUrl())
                .rating(rating)
                .featured(entity.isFeatured())
                .active(entity.isActive())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .natural(entity.getNatural())
                .labelsCount(entity.getLabelsCount())
                .vintagesCount(entity.getVintagesCount())
                .bestVintageYear(entity.getBestVintageYear())
                .bestVintageRating(entity.getBestVintageRating())
                .bottleImageUrl(entity.getBottleImageUrl())
                .externalUrl(entity.getExternalUrl())
                .foodPairing(entity.getFoodPairing())
                .seoName(entity.getSeoName())
                .tasteProfile(TasteProfile.of(
                        entity.getAcidityScore(),
                        entity.getTanninScore(),
                        entity.getBodyScore(),
                        entity.getSweetnessScore()));

        if (Objects.nonNull(entity.getRegionEntity())) {
            builder.regionId(entity.getRegionEntity().getId());
            builder.regionName(entity.getRegionEntity().getName());
        }

        if (Objects.nonNull(entity.getCountryEntity())) {
            builder.countryId(entity.getCountryEntity().getId());
            builder.countryCode(entity.getCountryEntity().getCode());
            builder.countryName(entity.getCountryEntity().getName());
        }

        return builder.build();
    }

    /**
     * Maps a domain model to a JPA entity.
     *
     * @param wine the domain model
     * @return the JPA entity
     */
    public static WineJpaEntity toEntity(Wine wine) {
        if (Objects.isNull(wine)) {
            return null;
        }

        WineJpaEntity entity = new WineJpaEntity();
        entity.setId(wine.getId());
        entity.setRevision(wine.getRevision());
        entity.setWineryId(wine.getWineryId());
        entity.setName(wine.getName());
        entity.setVintage(wine.getVintage());
        entity.setWineType(WineJpaEntity.WineTypeEnum.valueOf(wine.getWineType().name()));
        entity.setStyle(wine.getStyle());
        entity.setGrapes(new ArrayList<>(wine.getGrapes()));
        entity.setAllergens(new ArrayList<>(wine.getAllergens()));
        entity.setDescriptionEs(wine.getDescriptionEs());
        entity.setDescriptionEn(wine.getDescriptionEn());
        entity.setAlcoholContent(wine.getAlcoholContent());

        if (Objects.nonNull(wine.getServingTemperature())) {
            entity.setServingTempMin(wine.getServingTemperature().getMinTemp());
            entity.setServingTempMax(wine.getServingTemperature().getMaxTemp());
        }

        if (Objects.nonNull(wine.getPriceRange())) {
            entity.setPriceMin(wine.getPriceRange().getMinPrice());
            entity.setPriceMax(wine.getPriceRange().getMaxPrice());
        }

        entity.setImageUrl(wine.getImageUrl());
        entity.setRatingAverage(wine.getRating().getAverage());
        entity.setRatingCount(wine.getRating().getCount());
        entity.setFeatured(wine.isFeatured());
        entity.setActive(wine.isActive());
        entity.setCreatedBy(wine.getCreatedBy());
        entity.setCreatedAt(wine.getCreatedAt());
        entity.setUpdatedAt(wine.getUpdatedAt());
        entity.setNatural(wine.isNatural());
        entity.setLabelsCount(wine.getLabelsCount());
        entity.setVintagesCount(wine.getVintagesCount());
        entity.setBestVintageYear(wine.getBestVintageYear());
        entity.setBestVintageRating(wine.getBestVintageRating());
        entity.setBottleImageUrl(wine.getBottleImageUrl());
        entity.setExternalUrl(wine.getExternalUrl());
        entity.setFoodPairing(wine.getFoodPairing());
        entity.setSeoName(wine.getSeoName());
        if (Objects.nonNull(wine.getTasteProfile())) {
            entity.setAcidityScore(wine.getTasteProfile().getAcidity());
            entity.setTanninScore(wine.getTasteProfile().getTannin());
            entity.setBodyScore(wine.getTasteProfile().getBody());
            entity.setSweetnessScore(wine.getTasteProfile().getSweetness());
        }

        return entity;
    }
}
