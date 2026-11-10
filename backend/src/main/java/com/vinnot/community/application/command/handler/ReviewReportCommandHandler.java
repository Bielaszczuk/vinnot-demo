package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ReviewReportCommand;
import com.vinnot.community.application.port.in.ReviewReportUseCase;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.ReportOutcomeNotifier;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import org.springframework.beans.factory.annotation.Autowired;

@Service
@RequiredArgsConstructor
public class ReviewReportCommandHandler implements ReviewReportUseCase {
    private final CommunityReportRepositoryPort reports;
    private final ReportOutcomeNotifier notifier;
    private final Clock clock;

    @Autowired
    public ReviewReportCommandHandler(CommunityReportRepositoryPort reports, ReportOutcomeNotifier notifier) {
        this(reports, notifier, Clock.systemUTC());
    }

    @Override
    @Transactional
    public CommunityReport execute(ReviewReportCommand command) {
        var report =
                reports.findForUpdate(command.reportId())
                        .orElseThrow(
                                () -> new EntityNotFoundException("Report", command.reportId()));
        CommunityReport reviewed =
                reports.save(
                        report.review(
                                command.reviewerId(),
                                command.status(),
                                command.decision(),
                                clock.instant()));
        if (reviewed.status() == CommunityReport.Status.RESOLVED
                || reviewed.status() == CommunityReport.Status.DISMISSED) {
            notifier.reportClosed(reviewed, false);
        }
        return reviewed;
    }
}
