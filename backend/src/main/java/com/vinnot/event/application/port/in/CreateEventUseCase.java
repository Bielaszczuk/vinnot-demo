package com.vinnot.event.application.port.in;

import com.vinnot.event.application.command.model.CreateEventCommand;

import java.util.UUID;

public interface CreateEventUseCase {

    UUID execute(CreateEventCommand command);
}

