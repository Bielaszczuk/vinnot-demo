package com.vinnot.region.application.query;

import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.RegionRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GetAllRegionsQueryHandlerTest {

    @Test
    void mapsAndSortsRegionsCaseInsensitively() {
        RegionRepository repository = mock(RegionRepository.class);
        UUID countryId = UUID.randomUUID();
        when(repository.findAll()).thenReturn(List.of(
                region("Salta", countryId), region("mendoza", countryId)));

        var result = new GetAllRegionsQueryHandler(repository)
                .getAllRegions();

        assertThat(result).extracting("name")
                .containsExactly("mendoza", "Salta");
    }

    private Region region(String name, UUID countryId) {
        return new Region(UUID.randomUUID(), name, countryId,
                "ar", "Argentina", Instant.now());
    }
}
