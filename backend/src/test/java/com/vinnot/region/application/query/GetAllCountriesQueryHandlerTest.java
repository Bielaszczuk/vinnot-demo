package com.vinnot.region.application.query;

import com.vinnot.region.domain.model.Country;
import com.vinnot.region.domain.repository.CountryRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GetAllCountriesQueryHandlerTest {

    @Test
    void mapsAndSortsCountriesCaseInsensitively() {
        CountryRepository repository = mock(CountryRepository.class);
        when(repository.findAll()).thenReturn(List.of(
                new Country(UUID.randomUUID(), "uy", "uruguay", Instant.now()),
                new Country(UUID.randomUUID(), "ar", "Argentina", Instant.now())));

        var result = new GetAllCountriesQueryHandler(repository)
                .getAllCountries();

        assertThat(result).extracting("name")
                .containsExactly("Argentina", "uruguay");
    }
}
