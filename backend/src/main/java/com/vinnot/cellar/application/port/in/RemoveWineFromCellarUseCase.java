package com.vinnot.cellar.application.port.in;

import com.vinnot.cellar.application.command.model.RemoveWineFromCellarCommand;

public interface RemoveWineFromCellarUseCase {

    void execute(RemoveWineFromCellarCommand command);
}

