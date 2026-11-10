package com.vinnot.wine.infrastructure.persistence.mapper;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import com.vinnot.wine.infrastructure.persistence.entity.WineSubmissionJpaEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public final class WineSubmissionPersistenceMapper {

    private static final int CONFIDENCE_SCALE = 4;

    private WineSubmissionPersistenceMapper() {
    }

    public static WineSubmissionJpaEntity toEntity(WineSubmission submission) {
        WineSubmissionJpaEntity entity = new WineSubmissionJpaEntity();
        entity.setId(submission.getId());
        entity.setSubmittedBy(submission.getSubmittedBy());
        entity.setWineName(submission.getWineName());
        entity.setWineryName(submission.getWineryName());
        entity.setWineType(submission.getWineType());
        entity.setVintage(submission.getVintage());
        entity.setGrapes(submission.getGrapes());
        entity.setCountry(submission.getCountry());
        entity.setRegion(submission.getRegion());
        WineSubmissionCatalogReferences references = submission.getCatalogReferences();
        entity.setWineryId(references.wineryId());
        entity.setCountryId(references.countryId());
        entity.setRegionId(references.regionId());
        entity.setProposedGrapes(references.proposedGrapes());
        entity.setAlcoholContent(submission.getAlcoholContent());
        entity.setNotes(submission.getNotes());
        entity.setImageUrl(submission.getImageUrl());
        entity.setStatus(submission.getStatus());
        entity.setReviewReason(submission.getReviewReason());
        entity.setReviewConfidence(toPersistenceConfidence(submission.getReviewConfidence()));
        entity.setMatchedWineId(submission.getMatchedWineId());
        entity.setCreatedWineId(submission.getCreatedWineId());
        entity.setReviewedBy(submission.getReviewedBy());
        entity.setReviewedAt(submission.getReviewedAt());
        entity.setImageQuarantined(submission.isImageQuarantined());
        entity.setCreatedAt(submission.getCreatedAt());
        entity.setUpdatedAt(submission.getUpdatedAt());
        return entity;
    }

    public static WineSubmission toDomain(WineSubmissionJpaEntity entity) {
        return WineSubmission.builder()
                .id(entity.getId())
                .submittedBy(entity.getSubmittedBy())
                .wineName(entity.getWineName())
                .wineryName(entity.getWineryName())
                .wineType(entity.getWineType())
                .vintage(entity.getVintage())
                .grapes(entity.getGrapes())
                .country(entity.getCountry())
                .region(entity.getRegion())
                .catalogReferences(new WineSubmissionCatalogReferences(
                        entity.getWineryId(), entity.getCountryId(), entity.getRegionId(),
                        entity.getProposedGrapes()))
                .alcoholContent(entity.getAlcoholContent())
                .notes(entity.getNotes())
                .imageUrl(entity.getImageUrl())
                .status(entity.getStatus())
                .reviewReason(entity.getReviewReason())
                .reviewConfidence(toDomainConfidence(entity.getReviewConfidence()))
                .matchedWineId(entity.getMatchedWineId())
                .createdWineId(entity.getCreatedWineId())
                .reviewedBy(entity.getReviewedBy())
                .reviewedAt(entity.getReviewedAt())
                .imageQuarantined(entity.isImageQuarantined())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static BigDecimal toPersistenceConfidence(Double confidence) {
        return Objects.nonNull(confidence)
                ? BigDecimal.valueOf(confidence).setScale(CONFIDENCE_SCALE, RoundingMode.HALF_UP)
                : null;
    }

    private static Double toDomainConfidence(BigDecimal confidence) {
        return Objects.nonNull(confidence) ? confidence.doubleValue() : null;
    }
}
