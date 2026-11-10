package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ReviewReportCommand;
import com.vinnot.community.application.port.in.RemoveReportedContentUseCase;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.ReportOutcomeNotifier;
import com.vinnot.community.application.port.out.ReportedContentRemovalPort;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class RemoveReportedContentCommandHandler implements RemoveReportedContentUseCase {
    private final CommunityReportRepositoryPort reports;
    private final ReportedContentRemovalPort content;
    private final ReportOutcomeNotifier notifier;

    @Override
    @Transactional
    public CommunityReport execute(ReviewReportCommand command) {
        CommunityReport report =
                reports.findForUpdate(command.reportId())
                        .orElseThrow(
                                () -> new EntityNotFoundException("Report", command.reportId()));
        if (report.target().type() != ContentTarget.Type.REVIEW
                && report.target().type() != ContentTarget.Type.COMMENT) {
            throw new BusinessRuleViolationException(
                    "REPORT_REMOVAL_TARGET",
                    "Use the dedicated administration flow for this content");
        }
        CommunityReport resolved =
                report.review(
                        command.reviewerId(),
                        CommunityReport.Status.RESOLVED,
                        command.decision(),
                        Instant.now());
        content.remove(report.target(), command.reviewerId(), report.reason().name());
        CommunityReport saved = reports.save(resolved);
        notifier.reportClosed(saved, true);
        return saved;
    }
}
