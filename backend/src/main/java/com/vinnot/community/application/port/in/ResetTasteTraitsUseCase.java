package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.ResetTasteTraitsCommand;

/** Clears every manual value of the member's palate (#541 S11); clearing nothing succeeds too. */
public interface ResetTasteTraitsUseCase {
    void execute(ResetTasteTraitsCommand command);
}
