package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.AdjustTasteTraitsCommand;
import com.vinnot.community.application.port.in.AdjustTasteTraitsUseCase;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.domain.model.TasteAdjustment;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Validates the whole palate change before storing any of it (#541 S11); traits left out stay as they are. */
@Service
@RequiredArgsConstructor
public class AdjustTasteTraitsCommandHandler implements AdjustTasteTraitsUseCase {
    private final TasteAdjustmentRepositoryPort adjustments;

    @Override
    @Transactional
    public void execute(AdjustTasteTraitsCommand command) {
        adjustments.save(command.userId(), TasteAdjustment.of(command.structure()));
    }
}
