package com.vinnot.user.application.port.in;

import com.vinnot.user.application.command.model.UploadUserAvatarCommand;

public interface UploadUserAvatarUseCase {
    String execute(UploadUserAvatarCommand command);
}
