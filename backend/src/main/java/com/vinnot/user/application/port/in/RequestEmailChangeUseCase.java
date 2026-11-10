package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.RequestEmailChangeCommand;

public interface RequestEmailChangeUseCase {
    void execute(RequestEmailChangeCommand command);
}
