package com.vinnot.winery.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command to update only the coordinates of a winery.
 * Used for persisting geocoded coordinates from the frontend.
 *
 * @param wineryId  the winery ID
 * @param latitude  latitude coordinate
 * @param longitude longitude coordinate
 * @param address   optional resolved address
 */
public record UpdateWineryCoordinatesCommand(
        UUID wineryId,
        BigDecimal latitude,
        BigDecimal longitude,
        String address
) implements Command<Void> {
}

