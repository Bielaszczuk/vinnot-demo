package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.AddReviewCommentCommand;
import com.vinnot.review.application.query.response.ReviewCommentResponse;

public interface AddReviewCommentUseCase {

    ReviewCommentResponse execute(AddReviewCommentCommand command);
}

