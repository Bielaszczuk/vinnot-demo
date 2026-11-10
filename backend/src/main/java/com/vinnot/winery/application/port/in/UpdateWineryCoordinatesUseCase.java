package com.vinnot.winery.application.port.in;

import com.vinnot.winery.application.command.model.UpdateWineryCoordinatesCommand;

/**
 * Input port (driving) for updating only the coordinates of a winery.
 * Implemented by {@link com.vinnot.winery.application.command.handler.UpdateWineryCoordinatesCommandHandler}.
 */
public interface UpdateWineryCoordinatesUseCase {

    /**
     * Executes the update winery coordinates command.
     *
     * @param command the update winery coordinates command
     */
    void execute(UpdateWineryCoordinatesCommand command);
}

