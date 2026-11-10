package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;

public interface DeleteReviewCommentUseCase {

    void execute(DeleteReviewCommentCommand command);
}

