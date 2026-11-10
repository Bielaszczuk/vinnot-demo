package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.ReauthenticateCommand;

public interface ReauthenticateUseCase {
    String execute(ReauthenticateCommand command);
}
