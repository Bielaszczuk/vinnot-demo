package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.DeleteOwnAccountCommand;

public interface DeleteOwnAccountUseCase {
    void execute(DeleteOwnAccountCommand command);
}
