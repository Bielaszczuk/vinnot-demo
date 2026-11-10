package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.query.response.EventRegistrationResponse;

public interface RegisterForEventUseCase {

    EventRegistrationResponse execute(RegisterForEventCommand command);
}
