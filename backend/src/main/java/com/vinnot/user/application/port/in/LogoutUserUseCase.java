package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.LogoutCommand;

public interface LogoutUserUseCase {
    void execute(LogoutCommand command);
}

