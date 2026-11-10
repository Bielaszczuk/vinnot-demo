package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.UpdateWineCommand;

/**
 * Input port (driving) for updating a wine.
 * Implemented by {@link com.vinnot.wine.application.command.handler.UpdateWineCommandHandler}.
 */
public interface UpdateWineUseCase {

    /**
     * Executes the update wine command.
     *
     * @param command the update wine command
     */
    void execute(UpdateWineCommand command);
}
