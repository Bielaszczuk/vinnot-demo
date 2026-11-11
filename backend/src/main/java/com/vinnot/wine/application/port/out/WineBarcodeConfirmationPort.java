package com.vinnot.wine.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Which catalog wine members said a bottle barcode belongs to (#544): one confirmation per member and barcode. */
public interface WineBarcodeConfirmationPort {

    /**
     * The active wine confirmed for the barcode by at least {@code minimumMembers} distinct members and by more members
     * than any other active wine for the same barcode.
     */
    Optional<UUID> findCrowdConfirmedWine(String barcode, int minimumMembers);

    /** Stores the member's confirmation, replacing their earlier one for the same barcode. */
    void confirm(String barcode, UUID userId, UUID wineId, Instant confirmedAt);
}
