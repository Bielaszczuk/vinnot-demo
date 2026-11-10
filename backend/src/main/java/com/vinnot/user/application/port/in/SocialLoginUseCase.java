package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.SocialLoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;

public interface SocialLoginUseCase {
    AuthSessionResponse execute(SocialLoginCommand command);
}
