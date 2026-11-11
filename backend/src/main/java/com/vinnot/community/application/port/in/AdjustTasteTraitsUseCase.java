package com.vinnot.community.application.port.in;

import com.vinnot.community.application.command.model.AdjustTasteTraitsCommand;

/** Adjusts the member's own palate (#541 S11); an invalid change fails with {@code INVALID_TASTE_ADJUSTMENT}. */
public interface AdjustTasteTraitsUseCase {
    void execute(AdjustTasteTraitsCommand command);
}
