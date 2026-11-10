package com.vinnot.wine.infrastructure.persistence.mapper;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.infrastructure.persistence.entity.WineSubmissionJpaEntity;
import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineSubmissionPersistenceMapperTest {

    @Test
    void mapsConfidenceToTheNumericDatabaseContract() {
        WineSubmission submission = submissionWithConfidence(0.91234);

        WineSubmissionJpaEntity entity =
                WineSubmissionPersistenceMapper.toEntity(submission);
        WineSubmission restored =
                WineSubmissionPersistenceMapper.toDomain(entity);

        assertThat(entity.getReviewConfidence())
                .isEqualByComparingTo(new BigDecimal("0.9123"));
        assertThat(restored.getReviewConfidence()).isEqualTo(0.9123);
    }

    @Test
    void declaresTheSamePrecisionAndScaleAsTheMigration() throws Exception {
        Field field = WineSubmissionJpaEntity.class
                .getDeclaredField("reviewConfidence");
        Column column = field.getAnnotation(Column.class);

        assertThat(field.getType()).isEqualTo(BigDecimal.class);
        assertThat(column.precision()).isEqualTo(5);
        assertThat(column.scale()).isEqualTo(4);
    }

    @Test
    void roundTripsCatalogReferencesAndProposedGrapes() {
        var references = new WineSubmissionCatalogReferences(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), List.of("Malbec"));
        WineSubmission submission = WineSubmission.builder()
                .id(UUID.randomUUID()).submittedBy(UUID.randomUUID())
                .wineName("Reserva").wineryName("Vinnot").grapes(List.of("Malbec"))
                .catalogReferences(references).status(WineSubmissionStatus.NEEDS_REVIEW)
                .createdAt(Instant.now()).updatedAt(Instant.now()).build();

        WineSubmissionJpaEntity entity = WineSubmissionPersistenceMapper.toEntity(submission);

        assertThat(entity.getWineryId()).isEqualTo(references.wineryId());
        assertThat(entity.getCountryId()).isEqualTo(references.countryId());
        assertThat(entity.getRegionId()).isEqualTo(references.regionId());
        assertThat(entity.getProposedGrapes()).containsExactly("Malbec");
        assertThat(WineSubmissionPersistenceMapper.toDomain(entity).getCatalogReferences()).isEqualTo(references);
    }

    private WineSubmission submissionWithConfidence(double confidence) {
        Instant now = Instant.now();
        return WineSubmission.builder()
                .id(UUID.randomUUID())
                .submittedBy(UUID.randomUUID())
                .wineName("Reserva")
                .wineryName("Vinnot")
                .grapes(List.of("Malbec"))
                .status(WineSubmissionStatus.APPROVED)
                .reviewConfidence(confidence)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }
}
