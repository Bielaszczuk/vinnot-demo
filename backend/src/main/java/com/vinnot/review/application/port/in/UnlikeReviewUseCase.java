package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.UnlikeReviewCommand;

public interface UnlikeReviewUseCase {

    void execute(UnlikeReviewCommand command);
}

