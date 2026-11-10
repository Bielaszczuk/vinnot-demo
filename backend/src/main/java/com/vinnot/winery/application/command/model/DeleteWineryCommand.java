package com.vinnot.winery.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.util.UUID;

/**
 * Command to delete a winery.
 *
 * @param wineryId the winery ID to delete
 */
public record DeleteWineryCommand(UUID wineryId) implements Command<Void> {
}

