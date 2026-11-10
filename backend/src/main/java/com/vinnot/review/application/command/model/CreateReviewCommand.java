package com.vinnot.review.application.command.model;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateReviewCommand(
        UUID wineId,
        UUID userId,
        BigDecimal rating,
        String title,
        String comment,
        Integer vintage
) {
}

