package com.vinnot.wineroute.application.command.model;

import java.util.UUID;

/**
 * Command to delete a wine route.
 */
public record DeleteWineRouteCommand(UUID routeId) {
}

