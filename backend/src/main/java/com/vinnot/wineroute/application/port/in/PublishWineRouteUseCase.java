package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.PublishWineRouteCommand;

/**
 * Input port for publishing a wine route.
 */
public interface PublishWineRouteUseCase {

    void execute(PublishWineRouteCommand command);
}

