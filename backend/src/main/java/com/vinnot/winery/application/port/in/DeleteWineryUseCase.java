package com.vinnot.winery.application.port.in;

import com.vinnot.winery.application.command.model.DeleteWineryCommand;

/**
 * Input port (driving) for deleting a winery.
 * Implemented by {@link com.vinnot.winery.application.command.handler.DeleteWineryCommandHandler}.
 */
public interface DeleteWineryUseCase {

    /**
     * Executes the delete winery command.
     *
     * @param command the delete winery command
     */
    void execute(DeleteWineryCommand command);
}

