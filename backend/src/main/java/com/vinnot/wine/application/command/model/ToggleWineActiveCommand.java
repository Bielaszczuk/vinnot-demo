package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.util.UUID;

/**
 * Command to toggle the active status of a wine.
 *
 * @param wineId the wine ID
 */
public record ToggleWineActiveCommand(UUID wineId) implements Command<Void> {
}

