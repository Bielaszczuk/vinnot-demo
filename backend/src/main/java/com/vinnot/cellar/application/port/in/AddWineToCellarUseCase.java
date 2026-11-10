package com.vinnot.cellar.application.port.in;

import com.vinnot.cellar.application.command.model.AddWineToCellarCommand;

import java.util.UUID;

public interface AddWineToCellarUseCase {

    UUID execute(AddWineToCellarCommand command);
}

