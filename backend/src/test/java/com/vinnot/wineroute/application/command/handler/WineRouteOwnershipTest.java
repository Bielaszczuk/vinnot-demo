package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.wineroute.application.command.model.AddRouteStopCommand;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WineRouteOwnershipTest {

    @Mock
    private WineRouteRepositoryPort repository;

    private WineRoute route;

    @BeforeEach
    void setUp() {
        route = WineRoute.create("Mendoza highlights", UUID.randomUUID());
        when(repository.findById(route.getId())).thenReturn(Optional.of(route));
    }

    @Test
    void rejectsAddingStopToAnotherUsersRoute() {
        AddRouteStopCommandHandler handler = new AddRouteStopCommandHandler(repository);

        assertThatThrownBy(() -> handler.execute(command(UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("WINE_ROUTE_OWNERSHIP");

        assertThat(route.getStops()).isEmpty();
        verify(repository, never()).save(route);
    }

    @Test
    void allowsAdministratorToAddRouteStop() {
        AddRouteStopCommandHandler handler = new AddRouteStopCommandHandler(repository);

        UUID stopId = handler.execute(command(null, true));

        assertThat(stopId).isNotNull();
        assertThat(route.getStops()).hasSize(1);
        verify(repository).save(route);
    }

    private AddRouteStopCommand command(UUID requestingUserId, boolean administrator) {
        return new AddRouteStopCommand(
                route.getId(),
                requestingUserId,
                administrator,
                "Winery stop",
                "Guided visit",
                "WINERY",
                "Mendoza",
                new BigDecimal("-32.9"),
                new BigDecimal("-68.8"),
                1,
                90);
    }
}
