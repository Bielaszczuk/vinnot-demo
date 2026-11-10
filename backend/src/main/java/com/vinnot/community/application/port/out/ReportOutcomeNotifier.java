package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.CommunityReport;

/** Tells reporters how their report ended (#307). Queued in the caller's transaction; the author is never named. */
public interface ReportOutcomeNotifier {
    /**
     * @param report         the report, already RESOLVED or DISMISSED
     * @param contentRemoved whether the reported content was removed
     */
    void reportClosed(CommunityReport report, boolean contentRemoved);
}
