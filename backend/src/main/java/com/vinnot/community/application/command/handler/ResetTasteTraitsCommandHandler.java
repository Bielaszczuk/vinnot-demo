package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ResetTasteTraitsCommand;
import com.vinnot.community.application.port.in.ResetTasteTraitsUseCase;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Puts the member's palate back to its computed values (#541 S11). */
@Service
@RequiredArgsConstructor
public class ResetTasteTraitsCommandHandler implements ResetTasteTraitsUseCase {
    private final TasteAdjustmentRepositoryPort adjustments;

    @Override
    @Transactional
    public void execute(ResetTasteTraitsCommand command) {
        adjustments.clear(command.userId());
    }
}
