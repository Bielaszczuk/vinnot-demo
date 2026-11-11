package com.vinnot.community.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CatalogQualityReportTest {
    private final UUID matched = UUID.randomUUID();
    private final UUID chosen = UUID.randomUUID();
    private final Instant now = Instant.parse("2026-11-11T00:00:00Z");

    @Test
    void aCorrectedExactMatchBecomesAnOpenSystemReportOnTheMatchedWine() {
        CommunityReport report = CommunityReport.exactMatchCorrected(matched, chosen, "Malbec (Bodega A) | Malbec (Bodega B)", now);

        assertThat(report.reporterId()).isNull();
        assertThat(report.authorId()).isNull();
        assertThat(report.target()).isEqualTo(new ContentTarget(ContentTarget.Type.WINE, matched));
        assertThat(report.relatedTargetId()).isEqualTo(chosen);
        assertThat(report.reason()).isEqualTo(CommunityReport.Reason.CATALOG_QUALITY);
        assertThat(report.description())
                .isEqualTo("Scan exact match corrected by a member: possible duplicate, wrong winery or wrong image");
        assertThat(report.excerpt()).isEqualTo("Malbec (Bodega A) | Malbec (Bodega B)");
        assertThat(report.status()).isEqualTo(CommunityReport.Status.OPEN);
        assertThat(report.createdAt()).isEqualTo(now);
    }

    @Test
    void aSystemReportNeedsTwoDifferentWines() {
        assertThatThrownBy(() -> CommunityReport.exactMatchCorrected(matched, matched, "x", now))
                .hasMessageContaining("two different wines");
    }

    @Test
    void anyModeratorCanDecideASystemReport() {
        UUID moderator = UUID.randomUUID();
        CommunityReport resolved = CommunityReport.exactMatchCorrected(matched, chosen, "x", now)
                .review(moderator, CommunityReport.Status.RESOLVED, "Merged the duplicate by hand", now.plusSeconds(5));

        assertThat(resolved.status()).isEqualTo(CommunityReport.Status.RESOLVED);
        assertThat(resolved.reviewerId()).isEqualTo(moderator);
        assertThat(resolved.relatedTargetId()).isEqualTo(chosen);
    }

    @Test
    void membersCannotFileCatalogQualityReportsOrReportWines() {
        UUID reporter = UUID.randomUUID();
        assertThatThrownBy(() -> CommunityReport.create(reporter, new ContentTarget(ContentTarget.Type.WINE, matched), null,
                CommunityReport.Reason.SPAM, "", "", now)).hasMessageContaining("Members cannot");
        assertThatThrownBy(() -> CommunityReport.create(reporter, new ContentTarget(ContentTarget.Type.REVIEW, matched), null,
                CommunityReport.Reason.CATALOG_QUALITY, "", "", now)).hasMessageContaining("Members cannot");
        assertThat(CommunityReport.create(reporter, new ContentTarget(ContentTarget.Type.REVIEW, matched), null,
                CommunityReport.Reason.SPAM, "", "", now).relatedTargetId()).isNull();
    }
}
