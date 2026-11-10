package com.vinnot.winery.domain.valueobject;

import com.vinnot.shared.domain.valueobject.Coordinates;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LocationTest {

    @Test
    void representsAddressCoordinatesAndEmptyLocationConsistently() {
        Coordinates coordinates = Coordinates.of(-32.9, -68.8);
        Location full = Location.of("Mendoza", coordinates);

        assertThat(full.hasAddress()).isTrue();
        assertThat(full.hasCoordinates()).isTrue();
        assertThat(full.toString()).contains("Mendoza", "-32.9", "-68.8");
        assertThat(Location.of(null, null)).isNull();
        assertThat(Location.ofAddress(" ").hasAddress()).isFalse();
        assertThat(Location.ofCoordinates(coordinates).toString())
                .isEqualTo(coordinates.toString());
    }
}
