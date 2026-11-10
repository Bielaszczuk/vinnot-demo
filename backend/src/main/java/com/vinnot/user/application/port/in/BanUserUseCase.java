package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.BanUserCommand;

public interface BanUserUseCase {
    void execute(BanUserCommand command);
}

