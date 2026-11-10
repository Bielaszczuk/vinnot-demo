package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ConfirmEmailChangeCommand;

public interface ConfirmEmailChangeUseCase {
    void execute(ConfirmEmailChangeCommand command);
}
