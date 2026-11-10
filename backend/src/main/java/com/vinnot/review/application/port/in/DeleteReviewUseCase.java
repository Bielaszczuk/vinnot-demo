package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.DeleteReviewCommand;

public interface DeleteReviewUseCase {

    void execute(DeleteReviewCommand command);
}

