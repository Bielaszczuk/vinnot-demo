package com.vinnot.wineroute.domain.model;

import com.vinnot.shared.domain.valueobject.Coordinates;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RouteStopTest {

    @Test
    void createsACompleteStopAndAllowsRouteEditing() {
        RouteStop stop = RouteStop.create(
                "Bodega Uno", "Visita", "WINERY", "Mendoza",
                new BigDecimal("-32.9"), new BigDecimal("-68.8"), 2, 90);

        stop.updateDetails("Bodega Dos", "Degustación", "WINERY", "Luján");
        stop.updateCoordinates(Coordinates.of(-33.0, -68.9));
        stop.updateStopOrder(1);
        stop.updateDuration(120);

        assertThat(stop.getName()).isEqualTo("Bodega Dos");
        assertThat(stop.getAddress()).isEqualTo("Luján");
        assertThat(stop.getCoordinates()).isEqualTo(Coordinates.of(-33.0, -68.9));
        assertThat(stop.getStopOrder()).isOne();
        assertThat(stop.getEstimatedDurationMinutes()).isEqualTo(120);
    }

    @Test
    void omitsCoordinatesUnlessBothComponentsArePresent() {
        RouteStop stop = RouteStop.create(
                "Stop", null, null, null, BigDecimal.ONE, null, 1, null);

        assertThat(stop.getCoordinates()).isNull();
    }
}
