package com.vinnot.wine.infrastructure.web.request;

import java.util.UUID;

/**
 * A member's verdict on one of their label scans: {@code CONFIRMED}, {@code CORRECTED} or {@code NOT_IN_CATALOG},
 * with the chosen wine for the first two.
 */
public record WineLabelScanFeedbackRequest(String verdict, UUID wineId) {
}
