package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.util.UUID;

/**
 * Command to delete a wine.
 *
 * @param wineId the wine ID to delete
 */
public record DeleteWineCommand(UUID wineId) implements Command<Void> {
}

