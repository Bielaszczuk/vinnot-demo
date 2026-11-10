package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.SubmitWineCommand;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;

public interface SubmitWineUseCase {

    WineSubmissionResponse execute(SubmitWineCommand command);
}
