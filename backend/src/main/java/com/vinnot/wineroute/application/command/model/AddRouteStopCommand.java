package com.vinnot.wineroute.application.command.model;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command to add a stop to a wine route.
 */
public record AddRouteStopCommand(
        UUID routeId,
        UUID requestingUserId,
        boolean administrator,
        String name,
        String description,
        String type,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        int stopOrder,
        Integer estimatedDurationMinutes
) {
}
