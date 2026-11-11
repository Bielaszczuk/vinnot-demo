package com.vinnot.community.application.query.handler;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.vinnot.community.application.port.out.*;
import com.vinnot.community.domain.model.*;
import com.vinnot.shared.domain.valueobject.*;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.*;

class CommunityQueryHandlersTest {
    @Test
    void overviewUsesViewerScopedAggregatePorts() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var blocks = mock(UserBlockRepositoryPort.class);
        var handler = new GetCommunityQueryHandler(reports, blocks, mock(CommunityTargetPort.class));
        UUID user = UUID.randomUUID();
        var counts = new ReportCounts(23, 1, 1, 1);
        when(reports.countMine(user)).thenReturn(counts);
        when(blocks.countBlocked(user)).thenReturn(4L);
        when(reports.countForModeration(user)).thenReturn(counts);
        assertThat(handler.overview(user).reports()).isEqualTo(counts);
        assertThat(handler.overview(user).blockedUsers()).isEqualTo(4L);
        assertThat(handler.moderationOverview(user)).isEqualTo(counts);
        verify(reports).countForModeration(user);
    }

    @Test
    void receiptsArePrivateAndPagesAreBounded() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var blocks = mock(UserBlockRepositoryPort.class);
        var handler = new GetCommunityQueryHandler(reports, blocks, mock(CommunityTargetPort.class));
        UUID user = UUID.randomUUID();
        var report =
                CommunityReport.create(
                        user,
                        new ContentTarget(ContentTarget.Type.USER, UUID.randomUUID()),
                        UUID.randomUUID(),
                        CommunityReport.Reason.SPAM,
                        "private",
                        "excerpt",
                        Instant.now());
        when(reports.findMine(eq(user), any()))
                .thenReturn(PageResult.of(List.of(report), 0, 20, 1));
        when(blocks.findBlocked(eq(user), any())).thenReturn(PageResult.empty());
        when(reports.findForModeration(eq(user), eq(CommunityReport.Status.OPEN), any()))
                .thenReturn(PageResult.empty());
        assertThat(handler.reports(user, 0, 20).content())
                .singleElement()
                .satisfies(receipt -> assertThat(receipt.id()).isEqualTo(report.id()));
        assertThat(handler.blocks(user, 0, 20).isEmpty()).isTrue();
        assertThat(handler.moderation(user, CommunityReport.Status.OPEN, 0, 20).isEmpty()).isTrue();
        assertThatThrownBy(() -> handler.reports(user, 0, 51)).hasMessageContaining("limit");
    }

    @Test
    void moderationNamesAuthorsReviewersAndTargetsWithOneLookupPerPage() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var targets = mock(CommunityTargetPort.class);
        var handler =
                new GetCommunityQueryHandler(reports, mock(UserBlockRepositoryPort.class), targets);
        UUID moderator = UUID.randomUUID(), author = UUID.randomUUID();
        UUID reviewer = UUID.randomUUID(), gone = UUID.randomUUID();
        var review = new ContentTarget(ContentTarget.Type.REVIEW, UUID.randomUUID());
        var route = new ContentTarget(ContentTarget.Type.WINE_ROUTE, UUID.randomUUID());
        Instant now = Instant.parse("2026-10-25T10:00:00Z");
        var reviewed =
                new CommunityReport(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        review,
                        author,
                        CommunityReport.Reason.HATE,
                        "details",
                        "excerpt",
                        CommunityReport.Status.IN_REVIEW,
                        reviewer,
                        "checking",
                        now,
                        now,
                        null);
        var orphan =
                new CommunityReport(
                        UUID.randomUUID(),
                        null,
                        route,
                        gone,
                        CommunityReport.Reason.SPAM,
                        "",
                        "",
                        CommunityReport.Status.IN_REVIEW,
                        null,
                        null,
                        now,
                        now,
                        null);
        when(reports.findForModeration(
                        eq(moderator), eq(CommunityReport.Status.IN_REVIEW), any()))
                .thenReturn(PageResult.of(List.of(reviewed, orphan), 0, 20, 2));
        when(targets.describe(any(), any()))
                .thenReturn(
                        new CommunityTargetPort.ModerationNames(
                                Map.of(review, "Malbec Reserva"),
                                Map.of(author, "ana", reviewer, "mod")));

        var page = handler.moderation(moderator, CommunityReport.Status.IN_REVIEW, 0, 20);

        verify(targets, times(1)).describe(Set.of(review, route), Set.of(author, reviewer, gone));
        var first = page.content().get(0);
        assertThat(first.authorUsername()).isEqualTo("ana");
        assertThat(first.reviewerUsername()).isEqualTo("mod");
        assertThat(first.targetLabel()).isEqualTo("Malbec Reserva");
        // Existing fields stay exactly as the report holds them.
        assertThat(first.id()).isEqualTo(reviewed.id());
        assertThat(first.reporterId()).isEqualTo(reviewed.reporterId());
        assertThat(first.target()).isEqualTo(review);
        assertThat(first.authorId()).isEqualTo(author);
        assertThat(first.reason()).isEqualTo(CommunityReport.Reason.HATE);
        assertThat(first.description()).isEqualTo("details");
        assertThat(first.excerpt()).isEqualTo("excerpt");
        assertThat(first.status()).isEqualTo(CommunityReport.Status.IN_REVIEW);
        assertThat(first.reviewerId()).isEqualTo(reviewer);
        assertThat(first.decision()).isEqualTo("checking");
        assertThat(first.createdAt()).isEqualTo(now);
        assertThat(first.updatedAt()).isEqualTo(now);
        var second = page.content().get(1);
        assertThat(second.authorUsername()).isNull();
        assertThat(second.reviewerUsername()).isNull();
        assertThat(second.targetLabel()).isNull();
        assertThat(page.totalElements()).isEqualTo(2);
    }

    @Test
    void aCatalogQualityReportNamesBothWinesAndTheAutomaticReporter() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var targets = mock(CommunityTargetPort.class);
        var handler =
                new GetCommunityQueryHandler(reports, mock(UserBlockRepositoryPort.class), targets);
        UUID moderator = UUID.randomUUID(), matched = UUID.randomUUID(), chosen = UUID.randomUUID();
        var report = CommunityReport.exactMatchCorrected(matched, chosen, "Matched: A | Chosen: B", Instant.now());
        var matchedWine = new ContentTarget(ContentTarget.Type.WINE, matched);
        var chosenWine = new ContentTarget(ContentTarget.Type.WINE, chosen);
        when(reports.findForModeration(eq(moderator), eq(CommunityReport.Status.OPEN), any()))
                .thenReturn(PageResult.of(List.of(report), 0, 20, 1));
        when(targets.describe(any(), any()))
                .thenReturn(new CommunityTargetPort.ModerationNames(
                        Map.of(matchedWine, "Malbec A", chosenWine, "Malbec B"), Map.of()));

        var row = handler.moderation(moderator, CommunityReport.Status.OPEN, 0, 20).content().get(0);

        verify(targets).describe(Set.of(matchedWine, chosenWine), Set.of());
        assertThat(row.reporterId()).isNull();
        assertThat(row.reason()).isEqualTo(CommunityReport.Reason.CATALOG_QUALITY);
        assertThat(row.target()).isEqualTo(matchedWine);
        assertThat(row.targetLabel()).isEqualTo("Malbec A");
        assertThat(row.relatedTargetId()).isEqualTo(chosen);
        assertThat(row.relatedTargetLabel()).isEqualTo("Malbec B");
    }

    @Test
    void anEmptyModerationPageSkipsTheNameLookup() {
        var reports = mock(CommunityReportRepositoryPort.class);
        var targets = mock(CommunityTargetPort.class);
        var handler =
                new GetCommunityQueryHandler(reports, mock(UserBlockRepositoryPort.class), targets);
        UUID moderator = UUID.randomUUID();
        when(reports.findForModeration(eq(moderator), eq(CommunityReport.Status.OPEN), any()))
                .thenReturn(PageResult.empty());
        assertThat(handler.moderation(moderator, CommunityReport.Status.OPEN, 0, 20).isEmpty())
                .isTrue();
        verifyNoInteractions(targets);
    }

    @Test
    void profilesHonorBothDirectionsWithoutRestrictingAnonymousOrOwnAdminReads() {
        var access = mock(CommunityProfileAccessPort.class);
        var handler = new CheckCommunityProfileQueryHandler(access);
        UUID viewer = UUID.randomUUID(), author = UUID.randomUUID();
        handler.execute(null, author);
        verifyNoInteractions(access);
        handler.execute(viewer, author);
        when(access.blockedBetween(viewer, author)).thenReturn(true);
        assertThatThrownBy(() -> handler.execute(viewer, author)).hasMessageContaining("User");
    }
}
