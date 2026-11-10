package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.CancelEventCommand;

public interface CancelEventUseCase {

    void execute(CancelEventCommand command);
}

