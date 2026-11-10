package com.vinnot.ai.infrastructure.persistence.mapper;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.infrastructure.persistence.entity.WineAiProfileJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct persistence mapper between {@link WineAiProfile} and {@link WineAiProfileJpaEntity}.
 * The entity id is database-generated, so it is ignored when mapping to the entity.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WineAiProfileMapper {

    WineAiProfile toDomain(WineAiProfileJpaEntity entity);

    @Mapping(target = "id", ignore = true)
    WineAiProfileJpaEntity toEntity(WineAiProfile domain);
}

