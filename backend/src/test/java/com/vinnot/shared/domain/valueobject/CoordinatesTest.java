package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CoordinatesTest {

    @Test
    void calculatesHaversineDistanceBetweenArgentineCities() {
        Coordinates buenosAires = Coordinates.of(-34.6037, -58.3816);
        Coordinates mendoza = Coordinates.of(-32.8895, -68.8458);

        assertThat(buenosAires.distanceToKm(mendoza)).isBetween(980.0, 990.0);
        assertThat(buenosAires.distanceToKm(buenosAires)).isZero();
    }

    @Test
    void rejectsCoordinatesOutsideGeographicBounds() {
        assertThatThrownBy(() -> Coordinates.of(90.1, 0))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_LATITUDE");
        assertThatThrownBy(() -> Coordinates.of(0, -180.1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_LONGITUDE");
    }
}
