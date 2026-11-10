package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.DeleteWineRouteCommand;

/**
 * Input port for deleting a wine route.
 */
public interface DeleteWineRouteUseCase {

    void execute(DeleteWineRouteCommand command);
}

