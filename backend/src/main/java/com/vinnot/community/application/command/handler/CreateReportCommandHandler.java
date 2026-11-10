package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.CreateReportCommand;
import com.vinnot.community.application.port.in.CreateReportUseCase;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.CommunityTargetPort;
import com.vinnot.community.application.query.response.ReportReceipt;
import com.vinnot.community.domain.model.CommunityReport;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;

@Service
@RequiredArgsConstructor
public class CreateReportCommandHandler implements CreateReportUseCase {
    private final CommunityReportRepositoryPort reports;
    private final CommunityTargetPort targets;
    private final Clock clock;

    @Autowired
    public CreateReportCommandHandler(
            CommunityReportRepositoryPort reports, CommunityTargetPort targets) {
        this(reports, targets, Clock.systemUTC());
    }

    @Override
    @Transactional
    public ReportReceipt execute(CreateReportCommand command) {
        reports.lockReporter(command.reporterId());
        var existing = reports.findOpen(command.reporterId(), command.target());
        if (existing.isPresent()) {
            return ReportReceipt.from(existing.get());
        }
        Instant now = clock.instant();
        if (reports.countSince(command.reporterId(), now.minus(Duration.ofDays(1))) >= 10) {
            throw new BusinessRuleViolationException("REPORT_LIMIT", "Daily report limit reached");
        }
        var target =
                targets.findPublic(command.target())
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Content", command.target().id()));
        return ReportReceipt.from(
                reports.save(
                        CommunityReport.create(
                                command.reporterId(),
                                command.target(),
                                target.authorId(),
                                command.reason(),
                                command.description(),
                                target.excerpt(),
                                now)));
    }
}
