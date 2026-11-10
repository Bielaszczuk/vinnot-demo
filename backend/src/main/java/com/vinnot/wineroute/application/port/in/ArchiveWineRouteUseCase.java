package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.command.model.ArchiveWineRouteCommand;

/**
 * Input port for archiving a wine route.
 */
public interface ArchiveWineRouteUseCase {

    void execute(ArchiveWineRouteCommand command);
}

