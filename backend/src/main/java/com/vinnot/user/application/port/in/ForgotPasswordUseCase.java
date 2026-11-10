package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ForgotPasswordCommand;

public interface ForgotPasswordUseCase {
    void execute(ForgotPasswordCommand command);
}
