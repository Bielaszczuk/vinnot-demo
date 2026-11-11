package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.CompleteTasteQuizCommand;

/** Completes or retakes the taste quiz (#541); invalid answers fail with {@code INVALID_TASTE_QUIZ}. */
public interface CompleteTasteQuizUseCase {
    void execute(CompleteTasteQuizCommand command);
}
