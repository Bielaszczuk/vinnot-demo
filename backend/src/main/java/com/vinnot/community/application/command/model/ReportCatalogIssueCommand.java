package com.vinnot.community.application.command.model;

import java.util.Objects;
import java.util.UUID;

/**
 * A member corrected an exact label scan match.
 *
 * @param matchedWineId the wine the scan returned as exact
 * @param chosenWineId  the wine the member picked instead
 */
public record ReportCatalogIssueCommand(UUID matchedWineId, UUID chosenWineId) {
    public ReportCatalogIssueCommand {
        Objects.requireNonNull(matchedWineId);
        Objects.requireNonNull(chosenWineId);
    }
}
