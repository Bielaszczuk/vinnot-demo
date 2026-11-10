package com.vinnot.winery.infrastructure.persistence.mapper;

import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.domain.valueobject.ContactInfo;
import com.vinnot.winery.domain.valueobject.Location;
import com.vinnot.winery.infrastructure.persistence.entity.WineryJpaEntity;

import java.util.Objects;

/**
 * Mapper between Winery domain model and JPA entity.
 */
public final class WineryPersistenceMapper {

    private WineryPersistenceMapper() {
        // Utility class
    }

    /**
     * Maps a JPA entity to a domain model.
     *
     * @param entity the JPA entity
     * @return the domain model
     */
    public static Winery toDomain(WineryJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        Coordinates coordinates = null;
        if (Objects.nonNull(entity.getLatitude()) && Objects.nonNull(entity.getLongitude())) {
            coordinates = Coordinates.of(entity.getLatitude(), entity.getLongitude());
        }

        Location location = Location.of(entity.getAddress(), coordinates);

        ContactInfo contactInfo = ContactInfo.of(
                entity.getEmail(),
                entity.getPhone(),
                entity.getWebsite()
        );

        Winery.Builder builder = Winery.builder()
                .id(entity.getId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .descriptionEs(entity.getDescriptionEs())
                .descriptionEn(entity.getDescriptionEn())
                .subregion(entity.getSubregion())
                .location(location)
                .contactInfo(contactInfo)
                .logoUrl(entity.getLogoUrl())
                .imageUrl(entity.getImageUrl())
                .establishedYear(entity.getEstablishedYear())
                .seoName(entity.getSeoName())
                .businessName(entity.getBusinessName())
                .wineryStatus(entity.getWineryStatus())
                .claimed(entity.getClaimed())
                .ratingsCount(entity.getRatingsCount())
                .ratingsAverage(entity.getRatingsAverage())
                .winesCount(entity.getWinesCount())
                .labelsCount(entity.getLabelsCount())
                .backgroundImageUrl(entity.getBackgroundImageUrl())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt());

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
     * Note: countryEntity and regionEntity FK references must be set
     * externally by the repository adapter after calling this method.
     *
     * @param winery the domain model
     * @return the JPA entity
     */
    public static WineryJpaEntity toEntity(Winery winery) {
        if (Objects.isNull(winery)) {
            return null;
        }

        WineryJpaEntity entity = new WineryJpaEntity();
        entity.setId(winery.getId());
        entity.setName(winery.getName());
        entity.setSlug(winery.getSlug());
        entity.setDescriptionEs(winery.getDescriptionEs());
        entity.setDescriptionEn(winery.getDescriptionEn());
        entity.setSubregion(winery.getSubregion());

        if (Objects.nonNull(winery.getLocation())) {
            entity.setAddress(winery.getLocation().getAddress());
            if (winery.getLocation().hasCoordinates()) {
                entity.setLatitude(winery.getLocation().getCoordinates().getLatitude());
                entity.setLongitude(winery.getLocation().getCoordinates().getLongitude());
            }
        }

        if (Objects.nonNull(winery.getContactInfo())) {
            entity.setEmail(winery.getContactInfo().getEmail());
            entity.setPhone(winery.getContactInfo().getPhone());
            entity.setWebsite(winery.getContactInfo().getWebsite());
        }

        entity.setLogoUrl(winery.getLogoUrl());
        entity.setImageUrl(winery.getImageUrl());
        entity.setEstablishedYear(winery.getEstablishedYear());
        entity.setSeoName(winery.getSeoName());
        entity.setBusinessName(winery.getBusinessName());
        entity.setWineryStatus(winery.getWineryStatus());
        entity.setClaimed(winery.getClaimed());
        entity.setRatingsCount(winery.getRatingsCount());
        entity.setRatingsAverage(winery.getRatingsAverage());
        entity.setWinesCount(winery.getWinesCount());
        entity.setLabelsCount(winery.getLabelsCount());
        entity.setBackgroundImageUrl(winery.getBackgroundImageUrl());
        entity.setActive(winery.isActive());
        entity.setCreatedAt(winery.getCreatedAt());
        entity.setUpdatedAt(winery.getUpdatedAt());

        // FK relationships are resolved in the PersistenceAdapter
        return entity;
    }
}

