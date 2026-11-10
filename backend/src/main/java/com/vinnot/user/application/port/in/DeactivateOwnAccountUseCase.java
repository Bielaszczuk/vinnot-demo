package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.DeactivateOwnAccountCommand;

public interface DeactivateOwnAccountUseCase {
    void execute(DeactivateOwnAccountCommand command);
}
