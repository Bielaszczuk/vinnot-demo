package com.vinnot.wine.infrastructure.community;

import com.vinnot.community.application.command.model.ReportCatalogIssueCommand;
import com.vinnot.community.application.port.in.ReportCatalogIssueUseCase;
import com.vinnot.wine.application.port.out.CatalogQualitySignalPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Turns catalog quality signals into community moderation reports; the catalog itself is never edited here. */
@Component
@RequiredArgsConstructor
public class CommunityCatalogQualitySignalAdapter implements CatalogQualitySignalPort {
    private final ReportCatalogIssueUseCase reports;

    @Override
    public void exactMatchCorrected(UUID matchedWineId, UUID chosenWineId) {
        reports.execute(new ReportCatalogIssueCommand(matchedWineId, chosenWineId));
    }
}
