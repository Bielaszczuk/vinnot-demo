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

    Optional<CommunityReport> findForUpdate(UUID id);

    PageResult<CommunityReport> findMine(UUID reporter, PageQuery page);

    PageResult<CommunityReport> findForModeration(
            UUID moderator, CommunityReport.Status status, PageQuery page);
}
