package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.CreateWineRouteCommand;

import java.util.UUID;

/**
 * Input port for creating a wine route.
 */
public interface CreateWineRouteUseCase {

    UUID execute(CreateWineRouteCommand command);
}

