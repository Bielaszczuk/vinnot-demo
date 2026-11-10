package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;

public interface RefreshTokenUseCase {
    AuthSessionResponse execute(RefreshTokenCommand command);
}
