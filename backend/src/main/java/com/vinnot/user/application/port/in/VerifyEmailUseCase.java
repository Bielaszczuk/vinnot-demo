package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.VerifyEmailCommand;

public interface VerifyEmailUseCase {
    void execute(VerifyEmailCommand command);
}
