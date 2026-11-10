package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.ToggleWineFeaturedCommand;

/**
 * Input port (driving) for toggling the featured status of a wine.
 * Implemented by {@link com.vinnot.wine.application.command.handler.ToggleWineFeaturedCommandHandler}.
 */
public interface ToggleWineFeaturedUseCase {

    /**
     * Executes the toggle wine featured command.
     *
     * @param command the toggle wine featured command
     */
    void execute(ToggleWineFeaturedCommand command);
}
