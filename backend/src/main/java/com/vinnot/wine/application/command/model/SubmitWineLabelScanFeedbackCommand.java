package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;

import java.util.Objects;
import java.util.UUID;

/**
 * A member's verdict on one of their own label scans. {@code wineId} is the wine they chose (required for CONFIRMED
 * and CORRECTED, absent for NOT_IN_CATALOG).
 */
public record SubmitWineLabelScanFeedbackCommand(
        UUID userId,
        UUID scanId,
        WineLabelScanVerdict verdict,
        UUID wineId
) implements Command<Void> {

    public SubmitWineLabelScanFeedbackCommand {
        Objects.requireNonNull(userId, "userId is required");
        Objects.requireNonNull(scanId, "scanId is required");
        Objects.requireNonNull(verdict, "verdict is required");
        verdict.requireConsistentWine(wineId);
    }
}
