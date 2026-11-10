package com.vinnot.review.infrastructure.persistence.mapper;

import com.vinnot.review.domain.model.Review;
import com.vinnot.review.infrastructure.persistence.entity.ReviewJpaEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewPersistenceMapperTest {

    private final ReviewPersistenceMapper mapper = Mappers.getMapper(ReviewPersistenceMapper.class);

    @Test
    void tastedVintageSurvivesTheRoundTripAndStaysEmptyWhenUnset() {
        Review review = Review.create(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("4.0"));
        review.updateVintage(2018);

        ReviewJpaEntity entity = mapper.toEntity(review);
        assertThat(entity.getVintage()).isEqualTo(2018);
        assertThat(mapper.toDomain(entity).getVintage()).isEqualTo(2018);

        entity.setVintage(null);
        assertThat(mapper.toDomain(entity).getVintage()).isNull();
    }
}
