package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.command.exception.WineLabelScanFeedbackNotFoundException;
import com.vinnot.wine.application.command.model.SubmitWineLabelScanFeedbackCommand;
import com.vinnot.wine.application.port.in.SubmitWineLabelScanFeedbackUseCase;
import com.vinnot.wine.application.port.out.CatalogQualitySignalPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort.RecordedScan;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.service.WineLabelScanRecorder;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Stores a member's verdict on one of their own label scans (#544). A correction of an exact match to another wine is
 * also signalled to catalog moderation, after the feedback is stored; that signal never fails the feedback.
 */
@Service
@RequiredArgsConstructor
public class SubmitWineLabelScanFeedbackCommandHandler implements SubmitWineLabelScanFeedbackUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(SubmitWineLabelScanFeedbackCommandHandler.class);

    private final WineLabelScanHistoryPort history;
    private final WineRepositoryPort wineRepository;
    private final WineLabelScanRecorder recorder;
    private final CatalogQualitySignalPort catalogQualitySignals;

    @Override
    public void execute(SubmitWineLabelScanFeedbackCommand command) {
        RecordedScan scan = history.findOwnedBy(command.scanId(), command.userId())
                .orElseThrow(WineLabelScanFeedbackNotFoundException::scan);
        if (command.verdict() == WineLabelScanVerdict.CONFIRMED && !confirmsExactMatch(scan, command)) {
            throw new DomainException("INVALID_SCAN_FEEDBACK", "Only the exactly matched wine can be confirmed");
        }
        if (Objects.nonNull(command.wineId())) {
            wineRepository.findById(command.wineId())
                    .filter(Wine::isActive)
                    .orElseThrow(WineLabelScanFeedbackNotFoundException::wine);
        }
        recorder.recordFeedback(scan, command.userId(), command.verdict(), command.wineId());
        if (contradictsExactMatch(scan, command)) {
            signalCorrectedExactMatch(scan, command);
        }
    }

    private boolean confirmsExactMatch(RecordedScan scan, SubmitWineLabelScanFeedbackCommand command) {
        return scan.outcome() == WineLabelScanResponse.Outcome.EXACT_MATCH
                && Objects.nonNull(scan.wineId())
                && scan.wineId().equals(command.wineId());
    }

    private boolean contradictsExactMatch(RecordedScan scan, SubmitWineLabelScanFeedbackCommand command) {
        return command.verdict() == WineLabelScanVerdict.CORRECTED
                && scan.outcome() == WineLabelScanResponse.Outcome.EXACT_MATCH
                && Objects.nonNull(scan.wineId())
                && !scan.wineId().equals(command.wineId());
    }

    private void signalCorrectedExactMatch(RecordedScan scan, SubmitWineLabelScanFeedbackCommand command) {
        try {
            catalogQualitySignals.exactMatchCorrected(scan.wineId(), command.wineId());
        } catch (RuntimeException failure) {
            LOG.warn("Could not signal the corrected exact match of scan {}: {}",
                    scan.id(), failure.getClass().getSimpleName());
        }
    }
}
