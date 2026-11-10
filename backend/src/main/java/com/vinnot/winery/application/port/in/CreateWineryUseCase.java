package com.vinnot.winery.application.port.in;

import com.vinnot.winery.application.command.model.CreateWineryCommand;

import java.util.UUID;

/**
 * Input port (driving) for creating a winery.
 * Implemented by {@link com.vinnot.winery.application.command.handler.CreateWineryCommandHandler}.
 */
public interface CreateWineryUseCase {

    /**
     * Executes the create winery command.
     *
     * @param command the create winery command
     * @return the ID of the created winery
     */
    UUID execute(CreateWineryCommand command);
}

