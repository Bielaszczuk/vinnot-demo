package com.vinnot.review.infrastructure.web.request;
import jakarta.validation.constraints.NotBlank;

public record AddReviewCommentRequest(
        @NotBlank String content
) {
}
