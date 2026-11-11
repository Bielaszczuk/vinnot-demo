package com.vinnot.wine.application.command.exception;

import com.vinnot.shared.domain.exception.DomainException;

/** The scan or the chosen wine of a scan feedback does not exist for this member; answered as 404. */
public final class WineLabelScanFeedbackNotFoundException extends DomainException {

    private WineLabelScanFeedbackNotFoundException(String code, String message) {
        super(code, message);
    }

    /** An unknown scan, or a scan of another member (which is not revealed). */
    public static WineLabelScanFeedbackNotFoundException scan() {
        return new WineLabelScanFeedbackNotFoundException("SCAN_NOT_FOUND", "Label scan not found");
    }

    /** An unknown or inactive wine. */
    public static WineLabelScanFeedbackNotFoundException wine() {
        return new WineLabelScanFeedbackNotFoundException("WINE_NOT_FOUND", "Wine not found");
    }
}
