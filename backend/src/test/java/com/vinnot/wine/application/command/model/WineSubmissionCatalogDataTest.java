package com.vinnot.wine.application.command.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineSubmissionCatalogDataTest {

    private final UUID winery = UUID.randomUUID();
    private final UUID country = UUID.randomUUID();
    private final UUID region = UUID.randomUUID();
    private final WineSubmissionCatalogData submitted = new WineSubmissionCatalogData(
            "Reserva", "Catena Zapata", "RED", 2020, List.of("Malbec"), "Argentina", "Mendoza", null,
            winery, country, region);

    @Test
    void overridesWithoutTextKeepTheCatalogPicks() {
        var reviewed = submitted.overrideWith(
                new WineSubmissionCatalogData("Gran Reserva", null, null, null, null, null, null, null));

        assertThat(reviewed.wineName()).isEqualTo("Gran Reserva");
        assertThat(reviewed.wineryId()).isEqualTo(winery);
        assertThat(reviewed.countryId()).isEqualTo(country);
        assertThat(reviewed.regionId()).isEqualTo(region);
    }

    @Test
    void aTypedWineryOrRegionReplacesOnlyThatPick() {
        var reviewed = submitted.overrideWith(
                new WineSubmissionCatalogData(null, "Otra Bodega", null, null, null, null, "Luján", null));

        assertThat(reviewed.wineryId()).isNull();
        assertThat(reviewed.countryId()).isEqualTo(country);
        assertThat(reviewed.regionId()).isNull();
        assertThat(reviewed.region()).isEqualTo("Luján");
    }

    @Test
    void aTypedCountryAlsoDropsThePickedRegion() {
        var reviewed = submitted.overrideWith(
                new WineSubmissionCatalogData(null, null, null, null, null, "Chile", null, null));

        assertThat(reviewed.countryId()).isNull();
        assertThat(reviewed.regionId()).isNull();
        assertThat(reviewed.region()).isEqualTo("Mendoza");
        assertThat(reviewed.wineryId()).isEqualTo(winery);
    }
}
