package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ResendVerificationCommand;

public interface ResendVerificationUseCase {
    void execute(ResendVerificationCommand command);
}
