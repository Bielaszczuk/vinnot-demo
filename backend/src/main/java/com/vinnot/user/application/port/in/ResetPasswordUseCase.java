package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ResetPasswordCommand;

public interface ResetPasswordUseCase {
    void execute(ResetPasswordCommand command);
}
