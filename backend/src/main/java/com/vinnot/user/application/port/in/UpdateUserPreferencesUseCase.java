package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.UpdateUserPreferencesCommand;

import java.util.UUID;

public interface UpdateUserPreferencesUseCase {
    UUID execute(UpdateUserPreferencesCommand command);
}
