package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.LoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;

public interface LoginUserUseCase {
    AuthSessionResponse execute(LoginCommand command);
}
