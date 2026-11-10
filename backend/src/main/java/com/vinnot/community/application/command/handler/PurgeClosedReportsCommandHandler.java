package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.port.in.PurgeClosedReportsUseCase;
import com.vinnot.community.application.port.out.ClosedReportRetentionPort;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class PurgeClosedReportsCommandHandler implements PurgeClosedReportsUseCase {
    private static final Duration RETENTION = Duration.ofDays(90);
    private static final int BATCH_SIZE = 500;
    private final ClosedReportRetentionPort reports;
    private final Clock clock;

    @Autowired
    public PurgeClosedReportsCommandHandler(ClosedReportRetentionPort reports) {
        this(reports, Clock.systemUTC());
    }

    @Override
    @Transactional
    public int execute() {
        return reports.deleteClosedBefore(clock.instant().minus(RETENTION), BATCH_SIZE);
    }
}
