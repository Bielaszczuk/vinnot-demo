package com.vinnot.wine.infrastructure.community;

import com.vinnot.community.application.command.model.ReportCatalogIssueCommand;
import com.vinnot.community.application.port.in.ReportCatalogIssueUseCase;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class CommunityCatalogQualitySignalAdapterTest {
    @Test
    void aCorrectedExactMatchIsHandedToCommunityModeration() {
        ReportCatalogIssueUseCase reports = mock(ReportCatalogIssueUseCase.class);
        UUID matched = UUID.randomUUID();
        UUID chosen = UUID.randomUUID();

        new CommunityCatalogQualitySignalAdapter(reports).exactMatchCorrected(matched, chosen);

        verify(reports).execute(new ReportCatalogIssueCommand(matched, chosen));
    }
}
