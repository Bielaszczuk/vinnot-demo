package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.LikeReviewCommand;

public interface LikeReviewUseCase {

    void execute(LikeReviewCommand command);
}

