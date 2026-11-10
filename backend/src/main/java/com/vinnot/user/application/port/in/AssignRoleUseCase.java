package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.AssignRoleCommand;

public interface AssignRoleUseCase {
    void execute(AssignRoleCommand command);
}

