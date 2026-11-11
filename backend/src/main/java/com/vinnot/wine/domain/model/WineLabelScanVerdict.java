package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Arrays;
import java.util.Objects;
import java.util.UUID;

/**
 * What a member said about the result of one of their label scans: the scanned wine was right, it was another catalog
 * wine, or it is not in the catalog at all.
 */
public enum WineLabelScanVerdict {
    CONFIRMED(true),
    CORRECTED(true),
    NOT_IN_CATALOG(false);

    public static final String INVALID_FEEDBACK = "INVALID_SCAN_FEEDBACK";

    private final boolean namesWine;

    WineLabelScanVerdict(boolean namesWine) {
        this.namesWine = namesWine;
    }

    /** Reads a verdict sent by a client; anything other than the three names is invalid feedback. */
    public static WineLabelScanVerdict parse(String value) {
        return Arrays.stream(values())
                .filter(verdict -> verdict.name().equals(value))
                .findFirst()
                .orElseThrow(() -> new DomainException(INVALID_FEEDBACK,
                        "Scan feedback verdict must be CONFIRMED, CORRECTED or NOT_IN_CATALOG"));
    }

    /** CONFIRMED and CORRECTED name the wine the member chose; NOT_IN_CATALOG names none. */
    public void requireConsistentWine(UUID wineId) {
        if (namesWine && Objects.isNull(wineId)) {
            throw new DomainException(INVALID_FEEDBACK, "Scan feedback " + name() + " requires a wine");
        }
        if (!namesWine && Objects.nonNull(wineId)) {
            throw new DomainException(INVALID_FEEDBACK, "Scan feedback " + name() + " cannot name a wine");
        }
    }
}
