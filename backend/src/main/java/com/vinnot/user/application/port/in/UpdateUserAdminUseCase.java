package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.UpdateUserAdminCommand;

public interface UpdateUserAdminUseCase {
    void execute(UpdateUserAdminCommand command);
}

