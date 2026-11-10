package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.DeleteUserAdminCommand;

public interface DeleteUserAdminUseCase {
    void execute(DeleteUserAdminCommand command);
}

