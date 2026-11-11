package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.ChangeFollowCommand;

public interface ChangeFollowUseCase {
    void execute(ChangeFollowCommand command);
}
