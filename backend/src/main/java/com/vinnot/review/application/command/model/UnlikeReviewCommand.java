package com.vinnot.review.application.command.model;

import java.util.UUID;

public record UnlikeReviewCommand(UUID reviewId, UUID userId) {
}

