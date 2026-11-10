package com.vinnot.community.application.query.response;

import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;

import java.time.Instant;
import java.util.UUID;

/** Never includes moderator notes, author identity or other reporters. */
public record ReportReceipt(
        UUID id, ContentTarget target, CommunityReport.Status status, Instant createdAt) {
    public static ReportReceipt from(CommunityReport report) {
        return new ReportReceipt(report.id(), report.target(), report.status(), report.createdAt());
    }
}
