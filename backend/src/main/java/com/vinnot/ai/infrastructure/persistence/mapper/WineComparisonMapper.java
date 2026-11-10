package com.vinnot.ai.infrastructure.persistence.mapper;

import com.vinnot.ai.domain.model.WineComparison;
import com.vinnot.ai.infrastructure.persistence.entity.WineComparisonJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct persistence mapper between {@link WineComparison} and {@link WineComparisonJpaEntity}.
 * The entity id is database-generated, so it is ignored when mapping to the entity.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WineComparisonMapper {

    WineComparison toDomain(WineComparisonJpaEntity entity);

    @Mapping(target = "id", ignore = true)
    WineComparisonJpaEntity toEntity(WineComparison domain);
}

