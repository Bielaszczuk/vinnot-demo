package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.community.domain.model.ReportCounts;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface CommunityReportRepositoryPort {
    ReportCounts countMine(UUID reporter);

    ReportCounts countForModeration(UUID moderator);

    /** Serializes creation per reporter, including rate and duplicate checks. */
    void lockReporter(UUID reporter);

    Optional<CommunityReport> findOpen(UUID reporter, ContentTarget target);

    long countSince(UUID reporter, Instant since);

    CommunityReport save(CommunityReport report);

    /** Whether a catalog quality report about these two wines, in either order, is still open or in review. */
    boolean hasOpenCatalogReport(UUID wineId, UUID otherWineId);

    /**
     * Stores a new report unless an open one already covers the same catalog wine pair; concurrent duplicates are
     * dropped by the database instead of failing.
     *
     * @return whether the report was stored
     */
    boolean insertIfAbsent(CommunityReport report);

    Optional<CommunityReport> findForUpdate(UUID id);

    PageResult<CommunityReport> findMine(UUID reporter, PageQuery page);

    PageResult<CommunityReport> findForModeration(
            UUID moderator, CommunityReport.Status status, PageQuery page);
}
