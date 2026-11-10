package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.query.response.ReviewResponse;

public interface CreateReviewUseCase {

    ReviewResponse execute(CreateReviewCommand command);
}

