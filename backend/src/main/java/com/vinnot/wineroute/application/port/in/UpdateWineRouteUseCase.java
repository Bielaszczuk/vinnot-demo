package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.UpdateWineRouteCommand;

/**
 * Input port for updating a wine route.
 */
public interface UpdateWineRouteUseCase {

    void execute(UpdateWineRouteCommand command);
}

