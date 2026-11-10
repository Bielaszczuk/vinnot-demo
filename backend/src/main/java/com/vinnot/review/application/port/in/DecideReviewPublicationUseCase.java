package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.DecideReviewPublicationCommand;

public interface DecideReviewPublicationUseCase {
    void execute(DecideReviewPublicationCommand command);
}
