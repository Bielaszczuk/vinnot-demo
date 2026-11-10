package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.ToggleWineActiveCommand;

/**
 * Input port (driving) for toggling the active status of a wine.
 * Implemented by {@link com.vinnot.wine.application.command.handler.ToggleWineActiveCommandHandler}.
 */
public interface ToggleWineActiveUseCase {

    /**
     * Executes the toggle wine active command.
     *
     * @param command the toggle wine active command
     */
    void execute(ToggleWineActiveCommand command);
}
