package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.RegisterUserCommand;
import java.util.UUID;

public interface RegisterUserUseCase {
    UUID execute(RegisterUserCommand command);
}

