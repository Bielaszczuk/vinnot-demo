package com.vinnot.review.application.command.model;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateReviewCommand(
        UUID reviewId,
        UUID requestingUserId,
        boolean administrator,
        BigDecimal rating,
        String title,
        String comment,
        Integer vintage,
        boolean clearVintage
) {
}
