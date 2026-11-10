package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.ChangeUserBlockCommand;

public interface ChangeUserBlockUseCase {
    void execute(ChangeUserBlockCommand command);
}
