package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.query.response.ReviewResponse;

public interface UpdateReviewUseCase {

    ReviewResponse execute(UpdateReviewCommand command);
}

