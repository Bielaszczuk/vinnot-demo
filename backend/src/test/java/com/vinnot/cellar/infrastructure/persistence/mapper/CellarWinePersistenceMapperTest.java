package com.vinnot.cellar.infrastructure.persistence.mapper;

import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.cellar.infrastructure.persistence.entity.CellarWineJpaEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CellarWinePersistenceMapperTest {

    private final CellarWinePersistenceMapper mapper = Mappers.getMapper(CellarWinePersistenceMapper.class);

    @Test
    void tastedVintageSurvivesTheRoundTripAndStaysEmptyWhenUnset() {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());
        entry.updateVintage(2018);

        CellarWineJpaEntity entity = mapper.toEntity(entry);
        assertThat(entity.getVintage()).isEqualTo(2018);
        assertThat(mapper.toDomain(entity).getVintage()).isEqualTo(2018);

        entity.setVintage(null);
        assertThat(mapper.toDomain(entity).getVintage()).isNull();
    }
}
