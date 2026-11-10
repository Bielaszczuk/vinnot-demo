package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ChangePasswordCommand;

public interface ChangePasswordUseCase {
    void execute(ChangePasswordCommand command);
}

