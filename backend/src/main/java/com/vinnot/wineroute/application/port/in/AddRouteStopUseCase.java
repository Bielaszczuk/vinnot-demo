package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.AddRouteStopCommand;

import java.util.UUID;

/**
 * Input port for adding a stop to a wine route.
 */
public interface AddRouteStopUseCase {

    UUID execute(AddRouteStopCommand command);
}

