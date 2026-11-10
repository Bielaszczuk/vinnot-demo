package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Application intent for one label scan. The image is never stored; the scan of a signed-in member ({@code userId})
 * is recorded with its outcome (#455).
 */
public record ScanWineLabelCommand(
        byte[] imageBytes,
        String contentType,
        List<String> observedText,
        UUID userId
) implements Command<WineLabelScanResponse> {

    /** A scan nobody is recorded for. */
    public ScanWineLabelCommand(byte[] imageBytes, String contentType, List<String> observedText) {
        this(imageBytes, contentType, observedText, null);
    }

    public ScanWineLabelCommand {
        Objects.requireNonNull(imageBytes, "imageBytes is required");
        Objects.requireNonNull(contentType, "contentType is required");
        observedText = Objects.nonNull(observedText)
                ? List.copyOf(observedText) : List.of();
    }
}
