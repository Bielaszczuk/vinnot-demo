package com.vinnot.cellar.application.command.model;

import java.math.BigDecimal;
import java.util.UUID;

public record AddWineToCellarCommand(
        UUID userId,
        UUID wineId,
        BigDecimal rating,
        BigDecimal purchasePrice,
        String notes,
        Integer vintage
) {
}

