package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.CreateWineCommand;

import java.util.UUID;

/**
 * Input port (driving) for creating a wine.
 * Implemented by {@link com.vinnot.wine.application.command.handler.CreateWineCommandHandler}.
 */
public interface CreateWineUseCase {

    /**
     * Executes the create wine command.
     *
     * @param command the create wine command
     * @return the ID of the created wine
     */
    UUID execute(CreateWineCommand command);
}
