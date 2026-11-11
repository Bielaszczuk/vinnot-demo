package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.CreateReportCommand;
import com.vinnot.community.application.command.model.ReportCatalogIssueCommand;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.CommunityTargetPort;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ReportCatalogIssueCommandHandlerTest {
    private final UUID matched = UUID.randomUUID();
    private final UUID chosen = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-11-11T12:00:00Z");
    private final CommunityReportRepositoryPort reports = mock(CommunityReportRepositoryPort.class);
    private final CommunityTargetPort targets = mock(CommunityTargetPort.class);
    private final ReportCatalogIssueCommandHandler handler =
            new ReportCatalogIssueCommandHandler(reports, targets, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void aCorrectedExactMatchFilesOneSystemReportNamingBothWines() {
        when(targets.describeCatalogWine(matched)).thenReturn(Optional.of("Malbec 2020 (Bodega A)"));
        when(targets.describeCatalogWine(chosen)).thenReturn(Optional.of("Malbec 2020 (Bodega B)"));
        when(reports.insertIfAbsent(any())).thenReturn(true);

        handler.execute(new ReportCatalogIssueCommand(matched, chosen));

        ArgumentCaptor<CommunityReport> saved = ArgumentCaptor.forClass(CommunityReport.class);
        verify(reports).insertIfAbsent(saved.capture());
        CommunityReport report = saved.getValue();
        assertThat(report.reporterId()).isNull();
        assertThat(report.target()).isEqualTo(new ContentTarget(ContentTarget.Type.WINE, matched));
        assertThat(report.relatedTargetId()).isEqualTo(chosen);
        assertThat(report.reason()).isEqualTo(CommunityReport.Reason.CATALOG_QUALITY);
        assertThat(report.excerpt()).isEqualTo("Malbec 2020 (Bodega A) → Malbec 2020 (Bodega B)");
        assertThat(report.createdAt()).isEqualTo(now);
        verify(reports, never()).save(any());
    }

    @Test
    void anOpenReportForThePairMeansNothingMoreIsFiled() {
        when(reports.hasOpenCatalogReport(matched, chosen)).thenReturn(true);

        handler.execute(new ReportCatalogIssueCommand(matched, chosen));

        verify(reports, never()).insertIfAbsent(any());
        verifyNoInteractions(targets);
    }

    @Test
    void aWineThatIsGoneIsSkippedSilently() {
        when(targets.describeCatalogWine(matched)).thenReturn(Optional.of("Malbec (Bodega A)"));
        when(targets.describeCatalogWine(chosen)).thenReturn(Optional.empty());

        handler.execute(new ReportCatalogIssueCommand(matched, chosen));

        verify(reports, never()).insertIfAbsent(any());
    }

    @Test
    void theSameWineOnBothSidesIsNotACatalogIssue() {
        handler.execute(new ReportCatalogIssueCommand(matched, matched));

        verifyNoInteractions(reports, targets);
    }

    @Test
    void membersCannotReportWinesOrUseTheCatalogReason() {
        var create = new CreateReportCommandHandler(reports, targets, Clock.fixed(now, ZoneOffset.UTC));
        UUID member = UUID.randomUUID();

        assertThatThrownBy(() -> create.execute(new CreateReportCommand(member,
                new ContentTarget(ContentTarget.Type.WINE, matched), CommunityReport.Reason.SPAM, "")))
                .hasMessageContaining("Members cannot");
        assertThatThrownBy(() -> create.execute(new CreateReportCommand(member,
                new ContentTarget(ContentTarget.Type.REVIEW, matched), CommunityReport.Reason.CATALOG_QUALITY, "")))
                .hasMessageContaining("Members cannot");
        verifyNoInteractions(reports, targets);
    }
}
