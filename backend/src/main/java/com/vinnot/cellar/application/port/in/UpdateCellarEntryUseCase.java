package com.vinnot.cellar.application.port.in;

import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;

public interface UpdateCellarEntryUseCase {

    void execute(UpdateCellarEntryCommand command);
}

