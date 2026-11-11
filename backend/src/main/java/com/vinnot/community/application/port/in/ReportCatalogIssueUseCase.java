package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.ReportCatalogIssueCommand;

/**
 * Files a catalog quality report for moderators. It is idempotent while a report for the same wine pair is open, skips
 * wines that no longer exist and never changes catalog data.
 */
public interface ReportCatalogIssueUseCase {
    void execute(ReportCatalogIssueCommand command);
}
