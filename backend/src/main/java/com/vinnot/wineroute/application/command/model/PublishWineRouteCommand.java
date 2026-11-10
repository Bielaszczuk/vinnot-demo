package com.vinnot.wineroute.application.command.model;

import java.util.UUID;

/**
 * Command to publish a wine route.
 */
public record PublishWineRouteCommand(UUID routeId) {
}

