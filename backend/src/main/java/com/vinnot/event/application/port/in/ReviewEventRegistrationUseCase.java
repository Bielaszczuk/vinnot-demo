package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.query.response.EventRegistrationResponse;

public interface ReviewEventRegistrationUseCase {

    EventRegistrationResponse execute(ReviewEventRegistrationCommand command);
}
