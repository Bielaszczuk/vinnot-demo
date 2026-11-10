package com.vinnot.region.application.query;

import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.RegionRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GetRegionsByCountryQueryHandlerTest {

    @Test
    void filtersThroughRepositoryThenMapsAndSortsRegions() {
        RegionRepository repository = mock(RegionRepository.class);
        UUID countryId = UUID.randomUUID();
        when(repository.findByCountryId(countryId)).thenReturn(List.of(
                region("Uco", countryId), region("Cafayate", countryId)));

        var result = new GetRegionsByCountryQueryHandler(repository)
                .getRegionsByCountry(countryId);

        assertThat(result).extracting("name")
                .containsExactly("Cafayate", "Uco");
        verify(repository).findByCountryId(countryId);
    }

    private Region region(String name, UUID countryId) {
        return new Region(UUID.randomUUID(), name, countryId,
                "ar", "Argentina", Instant.now());
    }
}
