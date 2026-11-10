package com.vinnot.winery.application.port.in;

import com.vinnot.winery.application.command.model.UpdateWineryCommand;

/**
 * Input port (driving) for updating a winery.
 * Implemented by {@link com.vinnot.winery.application.command.handler.UpdateWineryCommandHandler}.
 */
public interface UpdateWineryUseCase {

    /**
     * Executes the update winery command.
     *
     * @param command the update winery command
     */
    void execute(UpdateWineryCommand command);
}

