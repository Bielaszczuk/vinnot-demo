package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.DeleteWineCommand;

/**
 * Input port (driving) for deleting a wine.
 * Implemented by {@link com.vinnot.wine.application.command.handler.DeleteWineCommandHandler}.
 */
public interface DeleteWineUseCase {

    /**
     * Executes the delete wine command.
     *
     * @param command the delete wine command
     */
    void execute(DeleteWineCommand command);
}
