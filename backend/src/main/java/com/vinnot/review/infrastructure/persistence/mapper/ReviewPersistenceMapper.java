package com.vinnot.review.infrastructure.persistence.mapper;

import com.vinnot.review.domain.model.Review;
import com.vinnot.review.infrastructure.persistence.entity.ReviewJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct persistence mapper between {@link Review} and {@link ReviewJpaEntity}.
 * Field names map 1:1, so no explicit {@code @Mapping} is required.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ReviewPersistenceMapper {

    Review toDomain(ReviewJpaEntity entity);

    ReviewJpaEntity toEntity(Review review);
}

