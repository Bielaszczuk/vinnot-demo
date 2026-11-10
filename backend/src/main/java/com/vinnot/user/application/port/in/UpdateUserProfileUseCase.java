package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import java.util.UUID;

public interface UpdateUserProfileUseCase {
    UUID execute(UpdateUserProfileCommand command);
}

