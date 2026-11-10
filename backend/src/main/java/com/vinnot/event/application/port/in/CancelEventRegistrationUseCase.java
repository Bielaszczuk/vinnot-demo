package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;

public interface CancelEventRegistrationUseCase {

    void execute(CancelEventRegistrationCommand command);
}

