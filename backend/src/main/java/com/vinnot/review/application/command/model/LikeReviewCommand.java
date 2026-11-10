package com.vinnot.review.application.command.model;

import java.util.UUID;

public record LikeReviewCommand(UUID reviewId, UUID userId) {
}

