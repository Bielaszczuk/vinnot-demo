package com.vinnot.wineroute.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineRouteTest {

    @Test
    void requiresStopsToPublishAndMaintainsContiguousStopOrder() {
        WineRoute route = WineRoute.create("Ruta de Mendoza", UUID.randomUUID());

        assertThatThrownBy(route::publish)
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CANNOT_PUBLISH");

        RouteStop second = RouteStop.create("Second", 20);
        RouteStop first = RouteStop.create("First", 10);
        route.replaceStops(List.of(second, first));
        route.reorderStops();
        route.publish();

        assertThat(route.getStops())
                .extracting(RouteStop::getName)
                .containsExactly("First", "Second");
        assertThat(route.getStops())
                .extracting(RouteStop::getStopOrder)
                .containsExactly(1, 2);
        assertThat(route.getStatus()).isEqualTo(RouteStatus.PUBLISHED);
    }

    @Test
    void copiesRecommendedTypesAndSupportsLifecycleChanges() {
        WineRoute route = WineRoute.create("Patagonia", UUID.randomUUID());
        List<String> types = new ArrayList<>(List.of("RED"));

        route.updateRecommendedWineTypes(types);
        types.add("WHITE");
        route.archive();

        assertThat(route.getRecommendedWineTypes()).containsExactly("RED");
        assertThat(route.getStatus()).isEqualTo(RouteStatus.ARCHIVED);

        route.setToDraft();
        assertThat(route.getStatus()).isEqualTo(RouteStatus.DRAFT);
    }
}
