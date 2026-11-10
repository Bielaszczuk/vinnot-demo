package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.AttachWineLabelImageCommand;
import com.vinnot.wine.application.query.response.WineLabelImageAttachmentResponse;

public interface AttachWineLabelImageUseCase {
    WineLabelImageAttachmentResponse execute(AttachWineLabelImageCommand command);
}
