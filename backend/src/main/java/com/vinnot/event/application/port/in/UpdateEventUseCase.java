package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.UpdateEventCommand;

public interface UpdateEventUseCase {

    void execute(UpdateEventCommand command);
}

