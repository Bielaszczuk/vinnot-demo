package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.CompleteUserOnboardingCommand;

import java.util.UUID;

public interface CompleteUserOnboardingUseCase {
    UUID execute(CompleteUserOnboardingCommand command);
}
