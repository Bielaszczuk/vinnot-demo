package com.vinnot.review.application.command.model;

import java.util.UUID;

public record AddReviewCommentCommand(UUID reviewId, UUID userId, String content) {
}

