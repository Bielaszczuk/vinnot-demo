package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ReportCatalogIssueCommand;
import com.vinnot.community.application.port.in.ReportCatalogIssueUseCase;
import com.vinnot.community.application.port.out.CommunityReportRepositoryPort;
import com.vinnot.community.application.port.out.CommunityTargetPort;
import com.vinnot.community.domain.model.CommunityReport;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;

/**
 * The excerpt reads {@code matched → chosen} with no words, so the admin page can label both sides in the
 * moderator's language. Runs in its own transaction, so a failed report never rolls back the scan feedback that raised it, and a pair that
 * already has an open report (in either direction) is left alone.
 */
@Service
@RequiredArgsConstructor
public class ReportCatalogIssueCommandHandler implements ReportCatalogIssueUseCase {
    private final CommunityReportRepositoryPort reports;
    private final CommunityTargetPort targets;
    private final Clock clock;

    @Autowired
    public ReportCatalogIssueCommandHandler(CommunityReportRepositoryPort reports, CommunityTargetPort targets) {
        this(reports, targets, Clock.systemUTC());
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void execute(ReportCatalogIssueCommand command) {
        if (command.matchedWineId().equals(command.chosenWineId())
                || reports.hasOpenCatalogReport(command.matchedWineId(), command.chosenWineId())) {
            return;
        }
        Optional<String> matched = targets.describeCatalogWine(command.matchedWineId());
        Optional<String> chosen = targets.describeCatalogWine(command.chosenWineId());
        if (matched.isEmpty() || chosen.isEmpty()) {
            return;
        }
        reports.insertIfAbsent(CommunityReport.exactMatchCorrected(
                command.matchedWineId(),
                command.chosenWineId(),
                matched.get() + " → " + chosen.get(),
                clock.instant()));
    }
}
