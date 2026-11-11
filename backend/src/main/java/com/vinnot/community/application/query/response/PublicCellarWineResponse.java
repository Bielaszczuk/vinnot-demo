package com.vinnot.community.application.query.response;

import com.vinnot.community.application.port.out.SocialQueryPort.CellarRow;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** A cellar entry as other members see it: never the private notes or the purchase price. */
public record PublicCellarWineResponse(UUID id, WineSummary wine, Integer vintage, BigDecimal rating, Instant addedAt) {
    public static PublicCellarWineResponse from(CellarRow row) {
        return new PublicCellarWineResponse(row.id(), WineSummary.from(row.wine()), row.vintage(), row.rating(),
                row.addedAt());
    }
}
