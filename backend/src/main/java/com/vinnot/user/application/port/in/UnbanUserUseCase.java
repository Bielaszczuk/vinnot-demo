package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.UnbanUserCommand;

public interface UnbanUserUseCase {
    void execute(UnbanUserCommand command);
}

