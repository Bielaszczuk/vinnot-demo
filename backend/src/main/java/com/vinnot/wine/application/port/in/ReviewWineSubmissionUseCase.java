package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.ReviewWineSubmissionCommand;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;

public interface ReviewWineSubmissionUseCase {
    WineSubmissionResponse execute(ReviewWineSubmissionCommand command);
}
