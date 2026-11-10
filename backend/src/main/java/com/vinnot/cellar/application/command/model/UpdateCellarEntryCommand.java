package com.vinnot.cellar.application.command.model;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateCellarEntryCommand(
        UUID cellarWineId,
        UUID requestingUserId,
        BigDecimal rating,
        BigDecimal purchasePrice,
        String notes,
        Integer vintage,
        boolean clearVintage
) {
}
