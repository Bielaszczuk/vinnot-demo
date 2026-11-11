package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.SkipTasteQuizCommand;

/** Skips the taste quiz (#541) without ever erasing a completed one. */
public interface SkipTasteQuizUseCase {
    void execute(SkipTasteQuizCommand command);
}
