package com.vinnot.wineroute.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.port.out.WineryQueryPort;
import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetWineRouteByIdQueryHandlerTest {
    @Test
    void onlyPublishedRoutesArePublicAndOwnersOrStaffKeepDraftAccess() {
        var repository = mock(WineRouteRepositoryPort.class);
        var wineries = mock(WineryQueryPort.class);
        var route = WineRoute.create("Route", UUID.randomUUID());
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
        var handler = new GetWineRouteByIdQueryHandler(repository, wineries);
        var publicQuery = new GetWineRouteByIdQuery(route.getId());
        assertThatThrownBy(() -> handler.execute(publicQuery)).isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(wineries);
        assertThat(handler.execute(new GetWineRouteByIdQuery(route.getId(), ResourceReader.staff())).id()).isEqualTo(route.getId());
        assertThat(handler.execute(new GetWineRouteByIdQuery(route.getId(), new ResourceReader(route.getCreatedBy(), false))).id()).isEqualTo(route.getId());
        route.replaceStops(List.of(RouteStop.create("Stop", 1)));
        route.publish();
        assertThat(handler.execute(publicQuery).id()).isEqualTo(route.getId());
        route.archive();
        assertThatThrownBy(() -> handler.execute(publicQuery)).isInstanceOf(EntityNotFoundException.class);
    }
}
