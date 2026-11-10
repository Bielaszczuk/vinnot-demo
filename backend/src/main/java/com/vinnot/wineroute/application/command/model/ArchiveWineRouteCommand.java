package com.vinnot.wineroute.application.command.model;

import java.util.UUID;

/**
 * Command to archive a wine route.
 */
public record ArchiveWineRouteCommand(UUID routeId) {
}

