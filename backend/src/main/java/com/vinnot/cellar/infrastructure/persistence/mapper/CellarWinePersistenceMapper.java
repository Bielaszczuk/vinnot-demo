package com.vinnot.cellar.infrastructure.persistence.mapper;

import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.cellar.infrastructure.persistence.entity.CellarWineJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct persistence mapper between {@link CellarWine} and {@link CellarWineJpaEntity}.
 * Field names map 1:1, so no explicit {@code @Mapping} is required.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CellarWinePersistenceMapper {

    CellarWine toDomain(CellarWineJpaEntity entity);

    CellarWineJpaEntity toEntity(CellarWine cellarWine);
}

